/**
 * CarePrep (SIH26047) - Canonical Clinical Summary Service
 * Aggregates intake (Phase 1), red-flag detections (Phase 2), document findings (Phase 3),
 * EHR medical history and vitals into a structured, clinician-facing and patient-facing summary.
 * Powered strictly by Gemini 3.6 Flash.
 */

import crypto from 'crypto';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import { getGeminiModelName, getGeminiApiKey, isGeminiMockMode } from '../config/geminiConfig';
import { classifyGeminiError } from '../utils/geminiErrorHandler';
import { 
  IStructuredClinicalSummary, 
  IClinicalSummaryRecord,
  DoctorReviewStatus,
  DoctorDecisionType,
  SummarySourceTransparency,
  PatientPreparationSummary
} from '../../shared/types/clinicalSummaryTypes';
import { Patient, MedicalHistory, Assessment, MedicalDocument, Consultation, ClinicalSummary } from '../models';
import { checkRedFlags } from '../../clinical-rules/redFlags';

const isDbConnected = () => mongoose.connection.readyState === 1;

// Global fallback in-memory store for detached execution
export const inMemorySummaryStore = new Map<string, IClinicalSummaryRecord>();

export interface GenerateSummaryParams {
  patientId: string;
  assessmentId?: string;
  caseId?: string;
  consultationId?: string;
  forceRegenerate?: boolean;
  directContext?: Partial<ClinicalContextData>;
}

export interface ClinicalContextData {
  patient: {
    fullName: string;
    age?: number;
    gender?: string;
    abhaId?: string;
    city?: string;
    mobile?: string;
  };
  intake: {
    chiefComplaint: string;
    duration?: string;
    severity?: string;
    symptoms: string[];
    socratesData?: Record<string, any>;
    ayushData?: Record<string, any>;
    lifestyleData?: Record<string, any>;
    answers?: Array<{ step?: string; rawPatientResponse?: string; customText?: string; selectedOptionIds?: string[] }>;
  };
  medicalHistory: {
    conditions: string[];
    surgeries: string[];
    hospitalizations: string[];
  };
  medications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    reason?: string;
  }>;
  allergies: Array<{
    allergen: string;
    category?: string;
    severity?: string;
    reaction?: string;
  }>;
  familyHistory: string[];
  lifestyle: {
    smoking?: string;
    alcohol?: string;
    physicalActivity?: string;
    diet?: string;
    sleepHours?: string;
    occupation?: string;
  };
  vitals: {
    bloodPressure?: string;
    heartRate?: string;
    weight?: string;
    height?: string;
    bmi?: string;
    spo2?: string;
    temperature?: string;
  };
  documents: Array<{
    fileName: string;
    documentType: string;
    documentDate?: string | null;
    summary?: string;
    labResults?: Array<{ testName: string; value: string; unit: string; referenceRange?: string; flag?: string }>;
    medications?: Array<{ name: string; dosage?: string; frequency?: string }>;
    diagnosesMentioned?: string[];
    importantNotes?: string[];
  }>;
  redFlags: Array<{
    ruleId: string;
    ruleTitle: string;
    severity: 'CRITICAL_EMERGENCY' | 'HIGH_RISK' | 'MODERATE' | 'INFO';
    matchedTrigger: string;
    actionMessage: string;
  }>;
  sourcesUsed: SummarySourceTransparency;
  sourceDataHash: string;
}

export class ClinicalSummaryService {
  private aiClient: GoogleGenAI | null = null;

  public getModelName(): string {
    return getGeminiModelName();
  }

  public isConfigured(): boolean {
    return Boolean(getGeminiApiKey());
  }

  private getClient(): GoogleGenAI | null {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return null;
    if (!this.aiClient) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey });
      } catch (err) {
        console.warn('[ClinicalSummaryService] Gemini client initialization error:', err);
      }
    }
    return this.aiClient;
  }

  /**
   * Aggregates patient demographic, intake, history, and document data.
   */
  public async buildClinicalContext(params: GenerateSummaryParams): Promise<ClinicalContextData> {
    const { patientId, assessmentId, caseId, directContext } = params;

    let patientData: any = null;
    let historyData: any = null;
    let assessmentData: any = null;
    let docsData: any[] = [];

    if (isDbConnected()) {
      try {
        patientData = await Patient.findOne({ patientId });
      } catch {}

      try {
        historyData = await MedicalHistory.findOne({ patientId });
      } catch {}

      try {
        if (assessmentId || caseId) {
          assessmentData = await Assessment.findOne({
            $or: [{ assessmentId: assessmentId || caseId }, { caseId: assessmentId || caseId }]
          });
        }
      } catch {}

      try {
        docsData = await MedicalDocument.find({ patientId });
      } catch {}
    }

    // Merge symptoms from intake & SOCRATES answers
    const aggregatedSymptoms: string[] = [
      ...(directContext?.intake?.symptoms || []),
      ...(assessmentData?.symptoms || [])
    ];

    if (assessmentData?.answers) {
      assessmentData.answers.forEach((ans: any) => {
        if (ans.customText && ans.customText.length > 2) {
          aggregatedSymptoms.push(ans.customText);
        }
        if (Array.isArray(ans.selectedOptionIds)) {
          aggregatedSymptoms.push(...ans.selectedOptionIds);
        }
      });
    }

    const uniqueSymptoms = Array.from(new Set(aggregatedSymptoms.filter(Boolean)));

    // Evaluate Phase 2 Red Flags deterministically
    const textToScan = [directContext?.intake?.chiefComplaint, ...uniqueSymptoms].filter(Boolean).join(' ');
    const detectedRules = checkRedFlags(textToScan);

    const medicationsList = directContext?.medications || (historyData?.currentMedications || []).map((m: any) => ({
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      reason: m.reason
    }));

    const allergiesList = directContext?.allergies || (historyData?.allergies || []).map((a: any) => {
      if (typeof a === 'string') return { allergen: a, category: 'General' };
      return { allergen: a.allergen || a.name || 'Unknown', category: a.category, severity: a.severity, reaction: a.reaction };
    });

    const vitalsData = {
      bloodPressure: directContext?.vitals?.bloodPressure || historyData?.vitals?.bloodPressure || 'Not recorded',
      heartRate: directContext?.vitals?.heartRate || historyData?.vitals?.heartRate || 'Not recorded',
      weight: directContext?.vitals?.weight || historyData?.vitals?.weight || 'Not recorded',
      height: directContext?.vitals?.height || historyData?.vitals?.height || 'Not recorded',
      bmi: directContext?.vitals?.bmi || historyData?.vitals?.bmi || 'Not recorded',
      spo2: directContext?.vitals?.spo2 || historyData?.vitals?.spo2 || 'Not recorded',
      temperature: directContext?.vitals?.temperature || historyData?.vitals?.temperature || 'Not recorded'
    };

    const documentsList = directContext?.documents || docsData.map((d: any) => ({
      fileName: d.fileName,
      documentType: d.documentType,
      documentDate: d.documentDate,
      summary: d.summary,
      labResults: d.labResults || [],
      medications: d.medications || [],
      diagnosesMentioned: d.diagnosesMentioned || [],
      importantNotes: d.importantNotes || []
    }));

    const conditionsList = directContext?.medicalHistory?.conditions || historyData?.existingConditions || [];
    const surgeriesList = directContext?.medicalHistory?.surgeries || (historyData?.surgeries || []).map((s: any) => s.procedure || s.name || String(s));
    const hospList = directContext?.medicalHistory?.hospitalizations || (historyData?.hospitalizations || []).map((h: any) => h.reason || String(h));

    // Source Transparency
    const sourcesUsed: SummarySourceTransparency = {
      preConsultation: Boolean(uniqueSymptoms.length > 0 || directContext?.intake?.chiefComplaint || assessmentData?.chiefComplaint),
      medicalHistory: Boolean(conditionsList.length > 0 || surgeriesList.length > 0 || hospList.length > 0),
      medications: Boolean(medicationsList.length > 0),
      reports: Boolean(documentsList.length > 0),
      vitals: Boolean(Object.values(vitalsData).some(v => v && v !== 'Not recorded')),
      lifestyle: Boolean(
        directContext?.lifestyle?.smoking || 
        directContext?.lifestyle?.alcohol || 
        directContext?.lifestyle?.diet || 
        historyData?.lifestyle?.smoking
      )
    };

    // Calculate SHA-256 hash of contributing clinical facts to power caching
    const hashPayload = JSON.stringify({
      patientId,
      chiefComplaint: directContext?.intake?.chiefComplaint || assessmentData?.chiefComplaint || 'Consultation assessment',
      duration: directContext?.intake?.duration || assessmentData?.duration,
      symptoms: uniqueSymptoms.sort(),
      conditions: conditionsList.sort(),
      medications: medicationsList.map((m: any) => m.name).sort(),
      allergies: allergiesList.map((a: any) => a.allergen).sort(),
      vitals: vitalsData,
      docs: documentsList.map((d: any) => ({ name: d.fileName, type: d.documentType, count: d.labResults?.length || 0 })),
      redFlags: detectedRules.map(r => r.id).sort()
    });
    const sourceDataHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

    const context: ClinicalContextData = {
      patient: {
        fullName: directContext?.patient?.fullName || patientData?.fullName || 'Patient',
        age: directContext?.patient?.age || patientData?.age,
        gender: directContext?.patient?.gender || patientData?.gender || 'Not recorded',
        abhaId: directContext?.patient?.abhaId || patientData?.abhaId,
        city: directContext?.patient?.city || patientData?.city,
        mobile: directContext?.patient?.mobile || patientData?.mobile
      },
      intake: {
        chiefComplaint: directContext?.intake?.chiefComplaint || assessmentData?.chiefComplaint || 'Consultation assessment',
        duration: directContext?.intake?.duration || assessmentData?.duration || 'Not recorded',
        severity: directContext?.intake?.severity || assessmentData?.severity || 'Not recorded',
        symptoms: uniqueSymptoms,
        socratesData: directContext?.intake?.socratesData || assessmentData?.socratesData,
        ayushData: directContext?.intake?.ayushData || assessmentData?.ayushData,
        lifestyleData: directContext?.intake?.lifestyleData,
        answers: directContext?.intake?.answers || assessmentData?.answers
      },
      medicalHistory: {
        conditions: conditionsList,
        surgeries: surgeriesList,
        hospitalizations: hospList
      },
      medications: medicationsList,
      allergies: allergiesList,
      familyHistory: directContext?.familyHistory || (historyData?.familyHistory || []).map((f: any) => f.condition || String(f)),
      lifestyle: {
        smoking: directContext?.lifestyle?.smoking || historyData?.lifestyle?.smoking || 'Not recorded',
        alcohol: directContext?.lifestyle?.alcohol || historyData?.lifestyle?.alcohol || 'Not recorded',
        physicalActivity: directContext?.lifestyle?.physicalActivity || historyData?.lifestyle?.physicalActivity || 'Not recorded',
        diet: directContext?.lifestyle?.diet || historyData?.lifestyle?.diet || 'Not recorded',
        sleepHours: directContext?.lifestyle?.sleepHours || historyData?.lifestyle?.sleepHours || 'Not recorded',
        occupation: directContext?.lifestyle?.occupation || historyData?.lifestyle?.occupation || 'Not recorded'
      },
      vitals: vitalsData,
      documents: documentsList,
      redFlags: directContext?.redFlags || detectedRules.map(r => ({
        ruleId: r.id,
        ruleTitle: r.title,
        severity: (r.severity === 'CRITICAL' ? 'CRITICAL_EMERGENCY' : r.severity === 'URGENT' ? 'HIGH_RISK' : 'MODERATE') as ('CRITICAL_EMERGENCY' | 'HIGH_RISK' | 'MODERATE' | 'INFO'),
        matchedTrigger: r.description,
        actionMessage: r.immediateActionNotice.en
      })),
      sourcesUsed,
      sourceDataHash
    };

    return context;
  }

  /**
   * Retrieves an existing cached summary for the given patient ID.
   */
  public async getCachedSummary(patientId: string, requiredHash?: string): Promise<IClinicalSummaryRecord | null> {
    // 1. Check in-memory store
    for (const record of inMemorySummaryStore.values()) {
      if (record.patientId === patientId) {
        if (!requiredHash || record.sourceDataHash === requiredHash) {
          return { ...record, isCached: true };
        }
      }
    }

    // 2. Check MongoDB Atlas if connected
    if (isDbConnected()) {
      try {
        const query: any = { patientId };
        if (requiredHash) query.sourceDataHash = requiredHash;
        const doc = await ClinicalSummary.findOne(query).sort({ createdAt: -1 });
        if (doc) {
          return {
            summaryId: doc.summaryId,
            consultationId: doc.consultationId,
            assessmentId: doc.assessmentId,
            patientId: doc.patientId,
            reviewStatus: doc.reviewStatus,
            aiGeneratedSummary: doc.aiGeneratedSummary,
            doctorEditedSummary: doc.doctorEditedSummary,
            doctorNotes: doc.doctorNotes,
            doctorDecision: doc.doctorDecision,
            reviewedBy: doc.reviewedBy,
            generatedAt: doc.generatedAt.toISOString(),
            reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : undefined,
            confirmedAt: doc.confirmedAt ? doc.confirmedAt.toISOString() : undefined,
            modelUsed: doc.modelUsed,
            summaryVersion: doc.summaryVersion,
            auditTrail: doc.auditTrail || [],
            sourceDataHash: doc.sourceDataHash,
            isCached: true
          };
        }
      } catch (err) {
        console.warn('[ClinicalSummaryService] Cache lookup error:', err);
      }
    }

    return null;
  }

  /**
   * Generates a structured Smart Clinical Summary using Gemini 3.6 Flash.
   * Leverages caching to avoid repeated API requests when source data is unchanged.
   */
  public async generateSummary(params: GenerateSummaryParams): Promise<IClinicalSummaryRecord> {
    const context = await this.buildClinicalContext(params);

    // Caching check: if not forceRegenerate, check if a matching hash already exists
    if (!params.forceRegenerate) {
      const existing = await this.getCachedSummary(params.patientId, context.sourceDataHash);
      if (existing) {
        return existing;
      }
    }

    const summaryId = `sum-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;
    let structuredSummary: IStructuredClinicalSummary;
    let modelIdentifier = this.getModelName();

    // Mock Mode check for testing & quota protection
    if (isGeminiMockMode()) {
      structuredSummary = this.generateMockSummary(context);
      modelIdentifier = `${this.getModelName()} (MOCK_MODE)`;
    } else {
      const client = this.getClient();
      if (!client) {
        throw new Error('Gemini API key is not configured on server (GEMINI_API_KEY).');
      }

      const systemInstruction = `You are CarePrep's Clinical Summary Assistant, an assistive AI designed to prepare structured pre-consultation summaries for patients and doctors.

CRITICAL CLINICAL SAFETY RULES:
1. You are an ASSISTIVE TOOL ONLY. You do NOT diagnose medical conditions.
2. You do NOT prescribe medications, alter dosages, or recommend drug treatments.
3. You NEVER invent or fabricate symptoms, lab values, vitals, or clinical history.
4. If an attribute was not explicitly provided, write "Not provided" or "Not recorded".
5. Preserve patient-reported statements as verbatim statements, NOT as medical diagnoses.
6. Phase 2 Red Flags represent high-risk safety alerts: NEVER ignore, overwrite, or downgrade them.
7. If red flags are present, urgency MUST reflect priority or emergency escalation.
8. Output strict JSON conforming exactly to the requested schema.`;

      const userPrompt = `PATIENT CONTEXT DATA:
"""
PATIENT: ${context.patient.fullName}, Age: ${context.patient.age || 'Not recorded'}, Gender: ${context.patient.gender}
ABHA ID: ${context.patient.abhaId || 'Not linked'}

CHIEF COMPLAINT & INTAKE:
Chief Complaint: ${context.intake.chiefComplaint}
Duration: ${context.intake.duration}
Severity: ${context.intake.severity}
Symptoms: ${context.intake.symptoms.join(', ') || 'None listed'}
Intake Answers: ${JSON.stringify(context.intake.answers || [])}

MEDICAL HISTORY:
Prior Conditions: ${context.medicalHistory.conditions.join(', ') || 'None recorded'}
Surgeries: ${context.medicalHistory.surgeries.join(', ') || 'None recorded'}
Hospitalizations: ${context.medicalHistory.hospitalizations.join(', ') || 'None recorded'}

CURRENT MEDICATIONS:
${JSON.stringify(context.medications, null, 2)}

ALLERGIES:
${JSON.stringify(context.allergies, null, 2)}

FAMILY HISTORY:
${context.familyHistory.join('; ') || 'None recorded'}

LIFESTYLE:
${JSON.stringify(context.lifestyle, null, 2)}

VITALS:
${JSON.stringify(context.vitals, null, 2)}

EXTRACTED MEDICAL DOCUMENTS:
${JSON.stringify(context.documents, null, 2)}

PHASE 2 DETECTED RED FLAGS:
${JSON.stringify(context.redFlags, null, 2)}
"""

Synthesize a structured clinical summary strictly matching this JSON schema:
{
  "summaryVersion": "1.0",
  "caseOverview": "High-level factual 2-sentence overview of presenting case",
  "chiefComplaint": "Patient-reported chief complaint",
  "symptomSummary": "Factual description of reported symptoms without diagnosing",
  "relevantMedicalHistory": ["Confirmed past medical conditions or 'None recorded'"],
  "currentMedications": ["Active medications with dosages"],
  "allergies": ["Known allergies or 'None recorded'"],
  "relevantVitals": ["Available vitals or 'Not recorded'"],
  "relevantReports": ["Summarized laboratory or imaging reports"],
  "redFlagStatus": "Emergency status or 'None detected'",
  "importantPointsForDoctor": ["3-5 clinical points for the doctor"],
  "patientQuestionsToAsk": ["2-3 practical questions the patient can ask their doctor"],
  "missingInformation": ["List of unrecorded clinical parameters"],
  "preConsultationSummary": "Plain-language summary for the patient to review",
  "patientPreparation": {
    "whatToTellDoctor": ["Clear points the patient should communicate"],
    "importantSymptoms": ["Key symptoms to emphasize"],
    "currentMedicines": ["List of medicines patient is taking"],
    "allergies": ["Allergies to notify doctor about"],
    "relevantHistory": ["History points to mention"],
    "reportsToDiscuss": ["Reports/documents to bring up"],
    "questionsToAsk": ["Questions patient may ask"],
    "missingInfo": ["Information the patient should verify before visit"]
  },
  "patientOverview": {
    "age": ${context.patient.age || '"Not recorded"'},
    "gender": "${context.patient.gender}",
    "abhaId": ${context.patient.abhaId ? `"${context.patient.abhaId}"` : 'null'},
    "keyContext": ["Bullet points of critical patient background"]
  },
  "historyOfPresentIllness": {
    "summary": "Coherent, chronological clinical narrative of presenting complaint without diagnosing",
    "duration": "${context.intake.duration}",
    "severity": "${context.intake.severity}",
    "associatedSymptoms": ["List of associated symptoms"],
    "triggers": ["Triggers or aggravating factors"],
    "relievingFactors": ["Relieving factors"]
  },
  "medicalHistory": ["Confirmed past medical conditions"],
  "medications": [
    {
      "name": "Medication name",
      "dosage": "Dosage",
      "frequency": "Frequency",
      "reason": "Indication"
    }
  ],
  "allergies": [
    {
      "allergen": "Allergen",
      "category": "Drug | Food | Environmental",
      "severity": "Mild | Moderate | Severe",
      "reaction": "Observed reaction"
    }
  ],
  "familyHistory": ["Family history notes"],
  "lifestyle": {
    "smoking": "${context.lifestyle.smoking}",
    "alcohol": "${context.lifestyle.alcohol}",
    "physicalActivity": "${context.lifestyle.physicalActivity}",
    "diet": "${context.lifestyle.diet}",
    "sleepHours": "${context.lifestyle.sleepHours}",
    "occupation": "${context.lifestyle.occupation}"
  },
  "vitals": {
    "bloodPressure": "${context.vitals.bloodPressure}",
    "heartRate": "${context.vitals.heartRate}",
    "weight": "${context.vitals.weight}",
    "height": "${context.vitals.height}",
    "bmi": "${context.vitals.bmi}",
    "spo2": "${context.vitals.spo2}",
    "temperature": "${context.vitals.temperature}"
  },
  "documentFindings": [
    {
      "documentName": "Source file name",
      "documentDate": "Date or null",
      "documentType": "LAB_REPORT | PRESCRIPTION | DISCHARGE_SUMMARY | OTHER",
      "findingType": "LAB_RESULT | MEDICATION | DIAGNOSIS | NOTE",
      "entityName": "Entity name (e.g. HbA1c, Metformin)",
      "value": "Value string or null",
      "unit": "Unit or null",
      "referenceRange": "Reference range or null",
      "flag": "HIGH | LOW | NORMAL | UNCLEAR | null",
      "evidenceSnippet": "Verbatim quote from document"
    }
  ],
  "redFlags": [
    {
      "ruleId": "Rule ID",
      "ruleTitle": "Rule Title",
      "severity": "CRITICAL_EMERGENCY | HIGH_RISK | MODERATE | INFO",
      "matchedTrigger": "Trigger description",
      "recommendedEscalation": "Escalation action"
    }
  ],
  "clinicalHighlights": ["3-5 high-priority points the physician should review immediately"],
  "missingImportantInformation": ["Any clinical gaps e.g. unrecorded vitals, unknown allergies, missing duration"],
  "questionsForClinician": ["Suggested targeted follow-up questions the doctor may ask during physical examination"],
  "urgency": {
    "level": "${context.redFlags.length > 0 ? (context.redFlags.some(r => r.severity === 'CRITICAL_EMERGENCY') ? 'emergency' : 'urgent') : 'routine'}",
    "reason": "Clinical rationale for urgency level based on symptoms & red flags"
  },
  "aiDisclaimer": "AI-assisted clinical preparation — not a medical diagnosis."
}`;

      try {
        const response = await client.models.generateContent({
          model: this.getModelName(),
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        });

        const rawJson = response.text || '{}';
        let parsed: any;
        try {
          parsed = JSON.parse(rawJson);
        } catch {
          const match = rawJson.match(/```json([\s\S]*?)```/) || rawJson.match(/\{[\s\S]*\}/);
          if (match) {
            parsed = JSON.parse(match[1] || match[0]);
          } else {
            console.warn('[ClinicalSummaryService] Malformed JSON received from Gemini; using fallback normalizer.');
            parsed = {};
          }
        }

        structuredSummary = this.sanitizeSummaryResult(parsed, context);
      } catch (err: any) {
        const classified = classifyGeminiError(err);
        console.warn(`[ClinicalSummaryService] Generation error: [${classified.code}] ${classified.sanitizedDiagnostic}`);
        const customErr: any = new Error(classified.message);
        customErr.code = classified.code;
        customErr.status = classified.httpStatus;
        customErr.sanitizedDiagnostic = classified.sanitizedDiagnostic;
        throw customErr;
      }
    }

    const initialAudit: any = {
      timestamp: new Date().toISOString(),
      action: 'GENERATED',
      performedBy: {
        userId: 'system_gemini',
        role: 'ai',
        name: modelIdentifier
      },
      notes: `Smart Clinical Summary generated via ${modelIdentifier}.`
    };

    const record: IClinicalSummaryRecord = {
      summaryId,
      consultationId: params.consultationId,
      assessmentId: params.assessmentId || params.caseId,
      patientId: params.patientId,
      reviewStatus: 'AI_GENERATED',
      aiGeneratedSummary: structuredSummary,
      doctorEditedSummary: undefined,
      doctorNotes: '',
      doctorDecision: 'PENDING',
      generatedAt: new Date().toISOString(),
      modelUsed: modelIdentifier,
      summaryVersion: 1,
      auditTrail: [initialAudit],
      sourceDataHash: context.sourceDataHash,
      isCached: false
    };

    // 1. Persist to memory store
    inMemorySummaryStore.set(summaryId, record);
    inMemorySummaryStore.set(params.patientId, record);
    if (params.consultationId) inMemorySummaryStore.set(params.consultationId, record);
    if (params.assessmentId) inMemorySummaryStore.set(params.assessmentId, record);

    // 2. Persist to dedicated ClinicalSummary model in MongoDB
    if (isDbConnected()) {
      try {
        await ClinicalSummary.findOneAndUpdate(
          { summaryId },
          {
            summaryId,
            patientId: record.patientId,
            consultationId: record.consultationId,
            assessmentId: record.assessmentId,
            sourceDataHash: record.sourceDataHash,
            modelUsed: record.modelUsed,
            status: 'READY',
            reviewStatus: record.reviewStatus,
            doctorDecision: record.doctorDecision,
            doctorNotes: record.doctorNotes,
            aiGeneratedSummary: record.aiGeneratedSummary,
            generatedAt: new Date(record.generatedAt),
            summaryVersion: record.summaryVersion,
            auditTrail: record.auditTrail
          },
          { upsert: true, new: true }
        );
      } catch (dbErr) {
        console.warn('[ClinicalSummaryService] ClinicalSummary model save warning:', dbErr);
      }

      // Link to Consultation if available
      if (params.consultationId) {
        try {
          await Consultation.findOneAndUpdate(
            { consultationId: params.consultationId },
            {
              clinicalSummary: record,
              reviewStatus: 'AI_GENERATED',
              status: 'ACTIVE'
            },
            { new: true }
          );
        } catch (dbErr) {
          console.warn('[ClinicalSummaryService] Consultation update warning:', dbErr);
        }
      }
    }

    return record;
  }

  /**
   * Sanitizes and validates the AI JSON output against missing or malformed fields.
   */
  public sanitizeSummaryResult(raw: any, context: ClinicalContextData): IStructuredClinicalSummary {
    const rawHpi = raw?.historyOfPresentIllness || {};
    const rawUrgency = raw?.urgency || {};

    // Safety rule: Red flags cannot be downgraded
    let urgencyLevel = (rawUrgency.level || 'routine').toLowerCase();
    if (context.redFlags.length > 0) {
      if (context.redFlags.some(r => r.severity === 'CRITICAL_EMERGENCY')) {
        urgencyLevel = 'emergency';
      } else if (urgencyLevel === 'routine') {
        urgencyLevel = 'urgent';
      }
    }

    const chiefComplaint = String(raw?.chiefComplaint || context.intake.chiefComplaint || 'Not recorded');
    const symptomSummary = String(raw?.symptomSummary || `Patient reports ${chiefComplaint} with symptoms: ${context.intake.symptoms.join(', ') || 'as described'}.`);
    const redFlagStatus = context.redFlags.length > 0 
      ? `HIGH URGENCY: ${context.redFlags.map(r => r.ruleTitle).join('; ')}`
      : 'No emergency red flags identified';

    // Build patient preparation fallback
    const rawPrep = raw?.patientPreparation || {};
    const patientPreparation: PatientPreparationSummary = {
      whatToTellDoctor: Array.isArray(rawPrep.whatToTellDoctor) && rawPrep.whatToTellDoctor.length > 0
        ? rawPrep.whatToTellDoctor.map(String)
        : [
            `Tell the doctor you are experiencing: ${chiefComplaint}`,
            `Mention that symptoms started ${context.intake.duration !== 'Not recorded' ? context.intake.duration : 'recently'}`,
            `Report any worsening factors or fever`
          ],
      importantSymptoms: Array.isArray(rawPrep.importantSymptoms) && rawPrep.importantSymptoms.length > 0
        ? rawPrep.importantSymptoms.map(String)
        : (context.intake.symptoms.length > 0 ? context.intake.symptoms : [chiefComplaint]),
      currentMedicines: Array.isArray(rawPrep.currentMedicines) && rawPrep.currentMedicines.length > 0
        ? rawPrep.currentMedicines.map(String)
        : (context.medications.length > 0 ? context.medications.map(m => `${m.name} ${m.dosage || ''} ${m.frequency || ''}`.trim()) : ['No active medicines recorded']),
      allergies: Array.isArray(rawPrep.allergies) && rawPrep.allergies.length > 0
        ? rawPrep.allergies.map(String)
        : (context.allergies.length > 0 ? context.allergies.map(a => `${a.allergen} (${a.reaction || 'allergic'})`) : ['No allergies recorded']),
      relevantHistory: Array.isArray(rawPrep.relevantHistory) && rawPrep.relevantHistory.length > 0
        ? rawPrep.relevantHistory.map(String)
        : (context.medicalHistory.conditions.length > 0 ? context.medicalHistory.conditions : ['No past chronic conditions recorded']),
      reportsToDiscuss: Array.isArray(rawPrep.reportsToDiscuss) && rawPrep.reportsToDiscuss.length > 0
        ? rawPrep.reportsToDiscuss.map(String)
        : (context.documents.length > 0 ? context.documents.map(d => d.fileName) : ['No recent reports uploaded']),
      questionsToAsk: Array.isArray(rawPrep.questionsToAsk) && rawPrep.questionsToAsk.length > 0
        ? rawPrep.questionsToAsk.map(String)
        : [
            'What is causing my current symptoms?',
            'Do I need any additional blood tests or scans?',
            'What should I do if my symptoms become worse?'
          ],
      missingInfo: Array.isArray(rawPrep.missingInfo) && rawPrep.missingInfo.length > 0
        ? rawPrep.missingInfo.map(String)
        : [
            context.vitals.bloodPressure === 'Not recorded' ? 'Recent Blood Pressure reading' : null,
            context.allergies.length === 0 ? 'Confirmation of drug allergies' : null
          ].filter(Boolean) as string[]
    };

    return {
      summaryVersion: '1.0',
      caseOverview: String(raw?.caseOverview || `${context.patient.fullName}, ${context.patient.age ? context.patient.age + 'y/o ' : ''}${context.patient.gender}, presents with ${chiefComplaint}.`),
      chiefComplaint,
      symptomSummary,
      relevantMedicalHistory: Array.isArray(raw?.relevantMedicalHistory) ? raw.relevantMedicalHistory.map(String) : context.medicalHistory.conditions,
      currentMedications: Array.isArray(raw?.currentMedications) ? raw.currentMedications : context.medications,
      allergies: Array.isArray(raw?.allergies) ? raw.allergies : context.allergies,
      relevantVitals: Array.isArray(raw?.relevantVitals) 
        ? raw.relevantVitals.map(String)
        : [
            `BP: ${context.vitals.bloodPressure}`,
            `HR: ${context.vitals.heartRate}`,
            `SpO2: ${context.vitals.spo2}`,
            `Temp: ${context.vitals.temperature}`
          ],
      relevantReports: Array.isArray(raw?.relevantReports)
        ? raw.relevantReports.map(String)
        : context.documents.map(d => `${d.fileName} (${d.documentType})`),
      redFlagStatus,
      importantPointsForDoctor: Array.isArray(raw?.importantPointsForDoctor)
        ? raw.importantPointsForDoctor.map(String)
        : [
            `Chief complaint: ${chiefComplaint}`,
            context.redFlags.length > 0 ? `Alert: ${context.redFlags[0].ruleTitle}` : 'No emergency flags triggered',
            `Medications recorded: ${context.medications.length}`
          ],
      patientQuestionsToAsk: Array.isArray(raw?.patientQuestionsToAsk)
        ? raw.patientQuestionsToAsk.map(String)
        : patientPreparation.questionsToAsk,
      missingInformation: Array.isArray(raw?.missingInformation)
        ? raw.missingInformation.map(String)
        : (patientPreparation.missingInfo.length > 0 ? patientPreparation.missingInfo : ['None identified']),
      preConsultationSummary: String(raw?.preConsultationSummary || `Your intake for ${chiefComplaint} has been processed and organized for your doctor visit.`),
      patientPreparation,
      sourcesUsed: context.sourcesUsed,

      patientOverview: {
        age: raw?.patientOverview?.age ?? context.patient.age ?? 'Not recorded',
        gender: String(raw?.patientOverview?.gender || context.patient.gender || 'Not recorded'),
        abhaId: context.patient.abhaId || null,
        keyContext: Array.isArray(raw?.patientOverview?.keyContext) 
          ? raw.patientOverview.keyContext.map(String) 
          : [context.intake.chiefComplaint]
      },
      historyOfPresentIllness: {
        summary: String(rawHpi.summary || `Patient presents with ${context.intake.chiefComplaint}.`),
        duration: String(rawHpi.duration || context.intake.duration || 'Not recorded'),
        severity: String(rawHpi.severity || context.intake.severity || 'Not recorded'),
        associatedSymptoms: Array.isArray(rawHpi.associatedSymptoms) ? rawHpi.associatedSymptoms.map(String) : context.intake.symptoms,
        triggers: Array.isArray(rawHpi.triggers) ? rawHpi.triggers.map(String) : [],
        relievingFactors: Array.isArray(rawHpi.relievingFactors) ? rawHpi.relievingFactors.map(String) : []
      },
      medicalHistory: Array.isArray(raw?.medicalHistory) ? raw.medicalHistory.map(String) : context.medicalHistory.conditions,
      medications: Array.isArray(raw?.medications) ? raw.medications : context.medications,
      familyHistory: Array.isArray(raw?.familyHistory) ? raw.familyHistory.map(String) : context.familyHistory,
      lifestyle: {
        smoking: String(raw?.lifestyle?.smoking || context.lifestyle.smoking || 'Not recorded'),
        alcohol: String(raw?.lifestyle?.alcohol || context.lifestyle.alcohol || 'Not recorded'),
        physicalActivity: String(raw?.lifestyle?.physicalActivity || context.lifestyle.physicalActivity || 'Not recorded'),
        diet: String(raw?.lifestyle?.diet || context.lifestyle.diet || 'Not recorded'),
        sleepHours: String(raw?.lifestyle?.sleepHours || context.lifestyle.sleepHours || 'Not recorded'),
        occupation: String(raw?.lifestyle?.occupation || context.lifestyle.occupation || 'Not recorded')
      },
      vitals: {
        bloodPressure: String(raw?.vitals?.bloodPressure || context.vitals.bloodPressure || 'Not recorded'),
        heartRate: String(raw?.vitals?.heartRate || context.vitals.heartRate || 'Not recorded'),
        weight: String(raw?.vitals?.weight || context.vitals.weight || 'Not recorded'),
        height: String(raw?.vitals?.height || context.vitals.height || 'Not recorded'),
        bmi: String(raw?.vitals?.bmi || context.vitals.bmi || 'Not recorded'),
        spo2: String(raw?.vitals?.spo2 || context.vitals.spo2 || 'Not recorded'),
        temperature: String(raw?.vitals?.temperature || context.vitals.temperature || 'Not recorded')
      },
      documentFindings: Array.isArray(raw?.documentFindings) ? raw.documentFindings : [],
      redFlags: context.redFlags.map(r => ({
        ruleId: r.ruleId,
        ruleTitle: r.ruleTitle,
        severity: r.severity,
        matchedTrigger: r.matchedTrigger,
        recommendedEscalation: r.actionMessage
      })),
      clinicalHighlights: Array.isArray(raw?.clinicalHighlights) ? raw.clinicalHighlights.map(String) : [],
      missingImportantInformation: Array.isArray(raw?.missingImportantInformation) ? raw.missingImportantInformation.map(String) : [],
      questionsForClinician: Array.isArray(raw?.questionsForClinician) ? raw.questionsForClinician.map(String) : [],
      urgency: {
        level: urgencyLevel as any,
        reason: String(rawUrgency.reason || (context.redFlags.length > 0 ? 'High-risk red-flag rule triggered during intake screening.' : 'Routine outpatient evaluation.'))
      },
      aiDisclaimer: 'AI-assisted clinical preparation — not a medical diagnosis.'
    };
  }

  /**
   * Deterministic mock generator for tests and development without consuming API quota.
   */
  public generateMockSummary(context: ClinicalContextData): IStructuredClinicalSummary {
    const isEmergency = context.redFlags.some(r => r.severity === 'CRITICAL_EMERGENCY');
    const isUrgent = context.redFlags.length > 0;

    const docFindings: any[] = [];
    context.documents.forEach(d => {
      (d.labResults || []).forEach(l => {
        docFindings.push({
          documentName: d.fileName,
          documentDate: d.documentDate,
          documentType: d.documentType,
          findingType: 'LAB_RESULT',
          entityName: l.testName,
          value: l.value,
          unit: l.unit,
          referenceRange: l.referenceRange,
          flag: l.flag || 'NORMAL',
          evidenceSnippet: `${l.testName}: ${l.value} ${l.unit}`
        });
      });
      (d.medications || []).forEach(m => {
        docFindings.push({
          documentName: d.fileName,
          documentDate: d.documentDate,
          documentType: d.documentType,
          findingType: 'MEDICATION',
          entityName: m.name,
          value: m.dosage,
          evidenceSnippet: `${m.name} ${m.dosage || ''}`
        });
      });
    });

    const chiefComplaint = context.intake.chiefComplaint || 'General health consultation';
    const patientPreparation: PatientPreparationSummary = {
      whatToTellDoctor: [
        `Explain your chief complaint: ${chiefComplaint}`,
        `Duration: ${context.intake.duration !== 'Not recorded' ? context.intake.duration : 'recently'}`,
        `Severity level: ${context.intake.severity !== 'Not recorded' ? context.intake.severity : 'moderate'}`
      ],
      importantSymptoms: context.intake.symptoms.length > 0 ? context.intake.symptoms : [chiefComplaint],
      currentMedicines: context.medications.length > 0 ? context.medications.map(m => `${m.name} ${m.dosage || ''}`.trim()) : ['No active medicines recorded'],
      allergies: context.allergies.length > 0 ? context.allergies.map(a => a.allergen) : ['No allergies recorded'],
      relevantHistory: context.medicalHistory.conditions.length > 0 ? context.medicalHistory.conditions : ['No chronic history recorded'],
      reportsToDiscuss: context.documents.length > 0 ? context.documents.map(d => d.fileName) : ['No recent reports attached'],
      questionsToAsk: [
        'What could be the primary cause of my symptoms?',
        'Do I need any follow-up tests or medication changes?'
      ],
      missingInfo: [
        context.vitals.bloodPressure === 'Not recorded' ? 'Blood Pressure reading' : null,
        context.allergies.length === 0 ? 'Allergy confirmation' : null
      ].filter(Boolean) as string[]
    };

    return {
      summaryVersion: '1.0',
      caseOverview: `${context.patient.fullName}, ${context.patient.age ? context.patient.age + 'y/o ' : ''}${context.patient.gender}, presents for clinical consultation with complaint of ${chiefComplaint}.`,
      chiefComplaint,
      symptomSummary: `Patient presents with ${chiefComplaint}. Duration is recorded as ${context.intake.duration}, with self-reported severity ${context.intake.severity}.`,
      relevantMedicalHistory: context.medicalHistory.conditions,
      currentMedications: context.medications,
      allergies: context.allergies,
      relevantVitals: [
        `BP: ${context.vitals.bloodPressure}`,
        `HR: ${context.vitals.heartRate}`,
        `SpO2: ${context.vitals.spo2}`,
        `Temp: ${context.vitals.temperature}`
      ],
      relevantReports: context.documents.map(d => `${d.fileName} (${d.documentType})`),
      redFlagStatus: isEmergency ? 'CRITICAL EMERGENCY DETECTED' : (isUrgent ? 'URGENT ATTENTION REQUIRED' : 'No emergency red flags'),
      importantPointsForDoctor: [
        `Chief complaint: ${chiefComplaint}`,
        isEmergency ? 'CRITICAL EMERGENCY: Red-flag triage triggered' : (isUrgent ? 'PRIORITY: Red-flag symptoms identified' : 'Routine outpatient evaluation'),
        `${docFindings.length} medical document finding(s) cross-referenced`
      ],
      patientQuestionsToAsk: patientPreparation.questionsToAsk,
      missingInformation: patientPreparation.missingInfo,
      preConsultationSummary: `Your pre-consultation summary for ${chiefComplaint} is prepared and ready for your doctor to review.`,
      patientPreparation,
      sourcesUsed: context.sourcesUsed,

      patientOverview: {
        age: context.patient.age || 'Not recorded',
        gender: context.patient.gender || 'Not recorded',
        abhaId: context.patient.abhaId || null,
        keyContext: [
          `Intake for: ${chiefComplaint}`,
          `Recorded conditions: ${context.medicalHistory.conditions.join(', ') || 'None'}`,
          `Active medications: ${context.medications.length}`
        ]
      },
      historyOfPresentIllness: {
        summary: `Patient presents with ${chiefComplaint}. Duration is recorded as ${context.intake.duration}, with self-reported severity ${context.intake.severity}.`,
        duration: context.intake.duration || 'Not recorded',
        severity: context.intake.severity || 'Not recorded',
        associatedSymptoms: context.intake.symptoms,
        triggers: [],
        relievingFactors: []
      },
      medicalHistory: context.medicalHistory.conditions,
      medications: context.medications,
      familyHistory: context.familyHistory,
      lifestyle: context.lifestyle,
      vitals: context.vitals,
      documentFindings: docFindings,
      redFlags: context.redFlags.map(r => ({
        ruleId: r.ruleId,
        ruleTitle: r.ruleTitle,
        severity: r.severity,
        matchedTrigger: r.matchedTrigger,
        recommendedEscalation: r.actionMessage
      })),
      clinicalHighlights: [
        `Chief complaint: ${chiefComplaint}`,
        isEmergency ? 'CRITICAL EMERGENCY: Red-flag triage triggered' : (isUrgent ? 'PRIORITY: Red-flag symptoms identified' : 'Routine outpatient evaluation'),
        `${docFindings.length} medical document finding(s) cross-referenced`
      ],
      missingImportantInformation: patientPreparation.missingInfo,
      questionsForClinician: [
        'Confirm duration and progression of current chief complaint.',
        'Review active medications and check for dosage compliance.'
      ],
      urgency: {
        level: isEmergency ? 'emergency' : (isUrgent ? 'urgent' : 'routine'),
        reason: isEmergency 
          ? 'Emergency triage rule triggered during pre-consultation intake.' 
          : (isUrgent ? 'Urgent symptom criteria identified.' : 'Routine clinical presentation.')
      },
      aiDisclaimer: 'AI-assisted clinical preparation — not a medical diagnosis.'
    };
  }
}

export const clinicalSummaryService = new ClinicalSummaryService();
