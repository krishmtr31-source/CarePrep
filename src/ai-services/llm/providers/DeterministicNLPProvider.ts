import { ILLMProvider } from './ILLMProvider';
import { PatientInterpretationSchema, DocumentInterpretationSchema } from '../llmTypes';
import { conversationService } from '../../conversation/ConversationService';
import { classifyDocumentText } from '../../../document-intelligence/parsers/documentClassifier';
import { parsePrescriptionText } from '../../../document-intelligence/parsers/prescriptionParser';
import { parseLabReportText } from '../../../document-intelligence/parsers/labReportParser';
import { parseDischargeSummaryText } from '../../../document-intelligence/parsers/dischargeSummaryParser';

/**
 * Deterministic NLP Provider.
 * Offline-capable, rule-based clinical parameter extractor using regex,
 * dictionary lookups, and keyword mappings.
 * 
 * Safety: Deterministic, offline capable; no generative LLM currently active.
 */
export class DeterministicNLPProvider implements ILLMProvider {
  public getProviderName(): string {
    return 'DETERMINISTIC_NLP';
  }

  public getModelName(): string {
    return 'rule-based-v1.0';
  }

  public async testConnection(): Promise<boolean> {
    return true; // Always connected locally
  }

  public async interpretPatientUtterance(
    text: string,
    language: 'en' | 'hi' | 'ta'
  ): Promise<PatientInterpretationSchema> {
    const parsed = conversationService.parsePatientUtterance(text, language);

    const isAmbiguous = Boolean(
      parsed.requiresVerificationNotes && parsed.requiresVerificationNotes.length > 0
    );

    const medications = (parsed.detectedMedications || []).map(med => ({
      name: med,
      isUncertain: false
    }));

    return {
      complaint: parsed.detectedChiefComplaint || 'Not provided.',
      duration: parsed.detectedDuration || 'Not provided.',
      location: parsed.detectedBodySite || 'Not provided.',
      character: 'Not provided.',
      severity: parsed.detectedSeverity || 'Not provided.',
      associatedSymptoms: parsed.detectedAssociatedSymptoms || [],
      detectedMedications: medications,
      uncertainty: isAmbiguous ? 'AMBIGUOUS' : 'CLEAR',
      requiresClarification: isAmbiguous,
      sourceText: text,
      extractedAt: new Date().toISOString()
    };
  }

  public async interpretPatientResponse(
    text: string,
    language: 'en' | 'hi' | 'ta'
  ): Promise<any> {
    const res = await this.interpretPatientUtterance(text, language);
    return {
      detectedChiefComplaint: res.complaint !== 'Not provided.' ? res.complaint : undefined,
      detectedDuration: res.duration !== 'Not provided.' ? res.duration : undefined,
      detectedSeverity: res.severity !== 'Not provided.' ? res.severity : undefined,
      detectedBodySite: res.location !== 'Not provided.' ? res.location : undefined,
      detectedAssociatedSymptoms: res.associatedSymptoms.length > 0 ? res.associatedSymptoms : undefined,
      detectedMedications: res.detectedMedications?.map(m => m.name),
      requiresVerificationNotes: res.requiresClarification ? ['Language interpretation marked as ambiguous; clinician verification suggested.'] : undefined,
      providerUsed: 'DETERMINISTIC_NLP'
    };
  }

  public async interpretDocument(
    rawText: string,
    fileName: string = 'document'
  ): Promise<DocumentInterpretationSchema> {
    const classificationRes = classifyDocumentText(rawText);
    const docType = classificationRes.classification;
    const docId = `doc-nlp-${Date.now()}`;

    if (docType === 'PRESCRIPTION') {
      const rx = parsePrescriptionText(rawText, docId, fileName);
      return {
        documentType: 'PRESCRIPTION',
        doctorName: rx.doctorName || null,
        medications: rx.medications.map(m => ({
          name: m.name,
          dose: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          evidence: m.evidence.snippet,
          page: m.evidence.pageNumber,
          confidence: m.evidence.confidenceScore,
          requiresVerification: m.evidence.requiresVerification,
          isAyushMedicine: m.isAyushMedicine
        })),
        diagnoses: rx.diagnoses.map(d => ({
          name: d.conditionName,
          evidence: d.evidence.snippet,
          page: d.evidence.pageNumber,
          confidence: d.evidence.confidenceScore
        })),
        labs: [],
        confidence: classificationRes.confidence,
        requiresVerification: rx.unreliableFields.length > 0,
        unreliableFields: rx.unreliableFields
      };
    } else if (docType === 'LAB_REPORT') {
      const lab = parseLabReportText(rawText, docId, fileName);
      return {
        documentType: 'LAB_REPORT',
        facilityName: lab.facilityName || null,
        documentDate: lab.reportDate || null,
        medications: [],
        diagnoses: [],
        labs: lab.labResults.map(l => ({
          testName: l.testName,
          value: l.resultValue,
          unit: l.unit,
          referenceRange: l.sourceReferenceRange.raw,
          flag: l.flag,
          evidence: l.evidence.snippet,
          page: l.evidence.pageNumber,
          confidence: l.evidence.confidenceScore,
          requiresVerification: l.evidence.requiresVerification
        })),
        confidence: classificationRes.confidence,
        requiresVerification: lab.unreliableFields.length > 0,
        unreliableFields: lab.unreliableFields
      };
    } else if (docType === 'DISCHARGE_SUMMARY') {
      const dis = parseDischargeSummaryText(rawText, docId, fileName);
      return {
        documentType: 'DISCHARGE_SUMMARY',
        facilityName: dis.facilityName || null,
        documentDate: dis.dischargeDate || dis.admissionDate || null,
        summaryNote: dis.summaryNote || null,
        medications: dis.medications.map(m => ({
          name: m.name,
          dose: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          evidence: m.evidence.snippet,
          page: m.evidence.pageNumber,
          confidence: m.evidence.confidenceScore,
          requiresVerification: m.evidence.requiresVerification,
          isAyushMedicine: m.isAyushMedicine
        })),
        diagnoses: dis.diagnoses.map(d => ({
          name: d.conditionName,
          evidence: d.evidence.snippet,
          page: d.evidence.pageNumber,
          confidence: d.evidence.confidenceScore
        })),
        labs: [],
        confidence: classificationRes.confidence,
        requiresVerification: dis.unreliableFields.length > 0,
        unreliableFields: dis.unreliableFields
      };
    }

    return {
      documentType: 'OTHER',
      medications: [],
      diagnoses: [],
      labs: [],
      confidence: 0.50,
      requiresVerification: true,
      unreliableFields: ['Degraded scan or unstandardized layout: manual clinician verification required']
    };
  }
}
