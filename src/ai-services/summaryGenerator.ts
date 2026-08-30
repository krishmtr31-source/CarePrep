import { PatientIdentity } from '../data-models/patient';
import { PatientCaseRecord } from '../data-models/intake';
import { DoctorSummaryDraft, MedicationConflict, SummaryVersion, SummaryAuditEntry } from '../data-models/doctorSummary';
import { checkRedFlags } from '../clinical-rules/redFlags';
import { RedFlagAlert } from '../data-models/redFlag';
import { ExtractedDocumentData, TimelineEvent } from '../document-intelligence/models/document';
import { buildDocumentTimelineEvents } from '../document-intelligence/parsers/documentPipeline';

/**
 * Deterministic Clinical Summary Generator.
 * 
 * Synthesizes patient interview data, speech transcripts, modality metadata, 
 * Phase 2 extracted documents, lab abnormality flags, timeline events, and deterministic red flags 
 * into a structured, evidence-traceable physician intake summary draft.
 * 
 * Safety Rule: Does NOT invent symptoms, negative findings, reference ranges, or diagnoses.
 */
export function generateDoctorSummaryDraft(
  patient: PatientIdentity,
  caseRecord: PatientCaseRecord,
  documents: ExtractedDocumentData[] = []
): DoctorSummaryDraft {
  const verificationItems: string[] = [];
  const provisionalTags: string[] = [];

  // 1. Patient Verbatim Statements & Modalities
  const patientVerbatimStatements = caseRecord.answers
    .filter(a => a.rawPatientResponse || a.customText || (a.selectedOptionIds && a.selectedOptionIds.length > 0))
    .map(a => ({
      step: a.step,
      rawText: a.rawPatientResponse || a.customText || (a.selectedOptionIds?.join(', ') || ''),
      modality: a.audioProvenance || (a.customText ? 'TYPED' : 'TOUCH_CHIP')
    }));

  // 2. Chief Complaint Extraction & Provenance
  const firstAns = caseRecord.answers.find(a => a.step === 'CHIEF_COMPLAINT') || caseRecord.answers[0];
  const rawChiefComplaint = firstAns?.rawPatientResponse || firstAns?.customText || caseRecord.chiefComplaint || 'Not provided.';
  const detectedInterpretation = firstAns?.structuredInterpretation?.detectedChiefComplaint;
  
  const chiefComplaint = {
    normalizedText: detectedInterpretation || rawChiefComplaint,
    rawPatientVerbatim: rawChiefComplaint,
    isAiNormalized: Boolean(detectedInterpretation && detectedInterpretation !== rawChiefComplaint),
    provenanceTag: (detectedInterpretation && detectedInterpretation !== rawChiefComplaint) 
      ? 'AI_INTERPRETED_VERIFY' as const 
      : 'PATIENT_REPORTED' as const
  };

  // 3. Structured HPI Synthesis (Never invent missing information)
  const hpiStructured = {
    onset: 'Not provided.',
    duration: 'Not provided.',
    location: 'Not provided.',
    character: 'Not provided.',
    severity: 'Not provided.',
    aggravatingFactors: 'Not provided.',
    relievingFactors: 'Not provided.',
    associatedSymptoms: 'Not provided.'
  };

  caseRecord.answers.forEach(ans => {
    const textVal = ans.rawPatientResponse || ans.customText || ans.selectedOptionIds?.join(', ');
    if (!textVal) return;

    if (ans.structuredInterpretation?.detectedDuration && hpiStructured.duration === 'Not provided.') {
      hpiStructured.duration = ans.structuredInterpretation.detectedDuration;
    }
    if (ans.structuredInterpretation?.detectedSeverity && hpiStructured.severity === 'Not provided.') {
      hpiStructured.severity = ans.structuredInterpretation.detectedSeverity;
    }
    if (ans.structuredInterpretation?.detectedBodySite && hpiStructured.location === 'Not provided.') {
      hpiStructured.location = ans.structuredInterpretation.detectedBodySite;
    }

    switch (ans.step) {
      case 'SOCRATES_SITE':
        hpiStructured.location = textVal;
        break;
      case 'SOCRATES_ONSET':
        hpiStructured.onset = textVal;
        break;
      case 'SOCRATES_CHARACTER':
        hpiStructured.character = textVal;
        break;
      case 'SOCRATES_ASSOCIATION':
        hpiStructured.associatedSymptoms = textVal;
        break;
      case 'SOCRATES_EXACERBATING':
        hpiStructured.aggravatingFactors = textVal;
        break;
      case 'SOCRATES_SEVERITY':
        hpiStructured.severity = textVal;
        break;
    }
  });

  // 4. Extracted Document Intelligence (Medications, Diagnoses, Labs)
  const extractedMedications = documents.flatMap(d => d.medications || []);
  const previousDiagnoses = documents.flatMap(d => d.diagnoses || []);
  const investigationResults = documents.flatMap(d => d.labResults || []);
  const abnormalLabFindings = investigationResults.filter(l => l.isAbnormal);

  // Document quality warnings
  documents.forEach(doc => {
    if (doc.unreliableFields && doc.unreliableFields.length > 0) {
      doc.unreliableFields.forEach(u => verificationItems.push(`[${doc.fileName}]: ${u}`));
    }
  });

  // 5. Medication Conflict Detection
  const medicationConflicts: MedicationConflict[] = [];
  const patientStatedMeds = caseRecord.answers
    .map(a => a.structuredInterpretation?.detectedMedications || [])
    .flat();

  extractedMedications.forEach(docMed => {
    // Normalize document medication root token (e.g. "Tab. Metformin 500mg" -> "metformin")
    const cleanDocMedName = docMed.name.toLowerCase().replace(/^(?:tab|cap|syp|inj|tablet|capsule|syrup)\.?\s+/i, '').trim();
    const docRootToken = cleanDocMedName.split(/\s+/)[0];

    patientStatedMeds.forEach(patMedStr => {
      const cleanPatStr = patMedStr.toLowerCase();
      // Check if same medication is referenced
      if (cleanPatStr.includes(cleanDocMedName) || (docRootToken.length > 3 && cleanPatStr.includes(docRootToken))) {
        const patDosageMatch = patMedStr.match(/(\d+(?:\.\d+)?\s*(?:mg|milligrams|g|mcg|tablets?|pills?))/i);
        const docDosageMatch = docMed.dosage.match(/(\d+(?:\.\d+)?\s*(?:mg|milligrams|g|mcg|tablets?|pills?))/i);

        // ONLY trigger dosage conflict if patient EXPLICITLY provided a dosage quantity that contradicts the document
        if (patDosageMatch && docDosageMatch) {
          const patNorm = patDosageMatch[1].toLowerCase().replace(/\s+/g, '');
          const docNorm = docDosageMatch[1].toLowerCase().replace(/\s+/g, '');

          if (patNorm !== docNorm) {
            medicationConflicts.push({
              medicationName: docMed.name,
              patientStatement: patMedStr,
              documentStatement: `${docMed.name} ${docMed.dosage} (${docMed.frequency})`,
              sourceDocument: docMed.evidence?.documentName || 'Prescription',
              conflictType: 'DOSAGE_MISMATCH',
              actionRequired: 'Clinician verification required to clarify active dosage.'
            });
            verificationItems.push(`Medication dosage conflict for ${docMed.name}: Patient stated ${patDosageMatch[1]} vs. Document states ${docDosageMatch[1]}`);
          }
        }
      }
    });
  });

  // 6. Chronological Medical Timeline Synthesis
  const docTimelineEvents = buildDocumentTimelineEvents(documents);
  const intakeTimelineEvent: TimelineEvent = {
    id: `tl-intake-${caseRecord.caseId}`,
    date: caseRecord.startedAt.split('T')[0],
    title: `Chief Complaint: ${chiefComplaint.normalizedText}`,
    category: 'INTAKE_COMPLAINT',
    description: `Pre-consultation intake recorded via ${caseRecord.mode === 'AYUSH' ? 'AYUSH Dashavidha' : 'SOCRATES clinical flow'}.`,
    provenance: 'PATIENT_REPORTED'
  };

  const timelineEvents: TimelineEvent[] = [
    intakeTimelineEvent,
    ...docTimelineEvents
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 7. AYUSH Dashavidha Assessment (if applicable)
  let ayushAssessment: DoctorSummaryDraft['ayushAssessment'] = undefined;
  if (caseRecord.mode === 'AYUSH') {
    let prakriti = 'Not provided.';
    let vikriti = 'Not provided.';
    let agni = 'Not provided.';
    let koshtha = 'Not provided.';
    let aharaShakti = 'Not provided.';
    let vyayamaShakti = 'Not provided.';

    caseRecord.answers.forEach(ans => {
      const val = ans.rawPatientResponse || ans.customText || ans.selectedOptionIds?.join(', ') || 'Not provided.';
      if (ans.step === 'AYUSH_PRAKRITI') prakriti = val;
      else if (ans.step === 'AYUSH_VIKRITI') vikriti = val;
      else if (ans.step === 'AYUSH_AGNI') agni = val;
      else if (ans.step === 'AYUSH_KOSHTHA') koshtha = val;
      else if (ans.step === 'AYUSH_AHARA_SHAKTI') aharaShakti = val;
      else if (ans.step === 'AYUSH_VYAYAMA_SHAKTI') vyayamaShakti = val;
    });

    ayushAssessment = {
      prakriti,
      vikriti,
      agni,
      koshtha,
      aharaShakti,
      vyayamaShakti,
      patientReportedNotes: 'Dashavidha Pariksha parameters provided directly by patient. Requires clinician Nadi & Sparshana assessment.'
    };
    provisionalTags.push('AYUSH Dashavidha Intake');
  } else {
    provisionalTags.push('Clinical SOCRATES Intake');
  }

  // 8. Deterministic Red-Flag Safety Screening
  const allTexts = caseRecord.answers
    .map(a => `${a.selectedOptionIds?.join(', ') || ''} ${a.customText || ''} ${a.rawPatientResponse || ''}`)
    .join(' ');
  const fullTextToInspect = `${chiefComplaint.rawPatientVerbatim} ${allTexts}`;
  const matchedRedFlagRules = checkRedFlags(fullTextToInspect);

  const redFlagAlerts: RedFlagAlert[] = matchedRedFlagRules.map(rule => ({
    ruleId: rule.id,
    ruleTitle: rule.title,
    severity: rule.severity,
    matchedTrigger: rule.description,
    timestamp: new Date().toISOString(),
    actionMessage: rule.immediateActionNotice.en
  }));

  const redFlagTriage = {
    hasTriggered: redFlagAlerts.length > 0,
    status: (redFlagAlerts.length > 0 ? 'RED' : 'GREEN') as 'GREEN' | 'RED',
    alerts: redFlagAlerts,
    statusNotice: redFlagAlerts.length > 0
      ? '🔴 Potential urgent presentation detected — Human clinical triage required.'
      : '🟢 No prototype red-flag rule triggered during intake.'
  };

  if (redFlagAlerts.length > 0) {
    provisionalTags.push('URGENT TRIAGE ALERT');
  }
  if (abnormalLabFindings.length > 0) {
    provisionalTags.push(`${abnormalLabFindings.length} Abnormal Lab Finding(s)`);
  }

  // 9. Initial Versioning & Audit Trail
  const initialVersion: SummaryVersion = {
    versionNumber: 1,
    createdAt: new Date().toISOString(),
    authoredBy: 'AI_DRAFT',
    status: 'DRAFT',
    physicianNotes: ''
  };

  const initialAudit: SummaryAuditEntry = {
    timestamp: new Date().toISOString(),
    action: 'GENERATED',
    details: `AI Draft Version 1 synthesized from ${caseRecord.answers.length} intake steps and ${documents.length} medical document(s).`
  };

  return {
    caseId: caseRecord.caseId,
    patientId: patient.id,
    patientName: patient.fullName,
    age: patient.age,
    gender: patient.gender,
    abhaId: patient.abhaId,
    selectedLanguage: caseRecord.language || 'en',
    mode: caseRecord.mode,
    dateGenerated: new Date().toISOString(),
    chiefComplaint,
    hpiStructured,
    patientVerbatimStatements,
    extractedMedications,
    medicationConflicts,
    previousDiagnoses,
    investigationResults,
    abnormalLabFindings,
    timelineEvents,
    ayushAssessment,
    redFlagTriage,
    verificationItems,
    provisionalTags,
    clinicalDisclaimer: 'AI-GENERATED INTAKE DRAFT: Synthesized automatically from patient interview and prior medical documents. It does NOT constitute a diagnosis or treatment recommendation. Clinician verification, physical exam, and formal sign-off are required.',
    currentVersionNumber: 1,
    versions: [initialVersion],
    auditTrail: [initialAudit],
    doctorEdits: {
      physicianNotes: '',
      status: 'DRAFT'
    }
  };
}
