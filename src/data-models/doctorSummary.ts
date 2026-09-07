import { IntakeMode } from './intake';
import { RedFlagAlert } from './redFlag';
import { TimelineEvent, ExtractedMedication, ExtractedLabResult, ExtractedDiagnosis } from '../document-intelligence/models/document';

export interface MedicationConflict {
  medicationName: string;
  patientStatement: string;
  documentStatement: string;
  sourceDocument: string;
  conflictType: 'DOSAGE_MISMATCH' | 'FREQUENCY_MISMATCH' | 'DISCONTINUED_CONTRADICTION';
  actionRequired: string;
}

export interface SummaryAuditEntry {
  timestamp: string;
  action: 'GENERATED' | 'OPENED' | 'EDITED' | 'ACCEPTED' | 'REJECTED';
  doctorName?: string;
  details?: string;
}

export interface SummaryVersion {
  versionNumber: number;
  createdAt: string;
  authoredBy: 'AI_DRAFT' | 'PHYSICIAN';
  status: 'DRAFT' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED';
  physicianNotes?: string;
  doctorName?: string;
  summaryTextSnapshot?: string;
}

export interface DoctorSummaryDraft {
  caseId: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  abhaId?: string;
  selectedLanguage: 'en' | 'hi' | 'ta';
  mode: IntakeMode;
  dateGenerated: string;
  
  // 1. Chief Complaint & Provenance
  chiefComplaint: {
    normalizedText: string;
    rawPatientVerbatim: string;
    isAiNormalized: boolean;
    provenanceTag: 'PATIENT_REPORTED' | 'AI_INTERPRETED_VERIFY';
  };

  // 2. Structured HPI (Missing fields remain "Not provided.")
  hpiStructured: {
    onset: string;
    duration: string;
    location: string;
    character: string;
    severity: string;
    aggravatingFactors: string;
    relievingFactors: string;
    associatedSymptoms: string;
  };

  // 3. Verbatim Patient Responses with Modality
  patientVerbatimStatements: Array<{
    step: string;
    rawText: string;
    modality: 'VOICE' | 'TYPED' | 'TOUCH_CHIP';
  }>;

  // 4. Medications & Extracted Evidence
  extractedMedications: ExtractedMedication[];
  medicationConflicts: MedicationConflict[];

  // 5. Previous Documented Diagnoses (Separated from current complaint)
  previousDiagnoses: ExtractedDiagnosis[];

  // 6. Investigation Results & Abnormal Findings
  investigationResults: ExtractedLabResult[];
  abnormalLabFindings: ExtractedLabResult[];

  // 7. Chronological Medical Timeline
  timelineEvents: TimelineEvent[];

  // 8. AYUSH Dashavidha Assessment (if AYUSH mode)
  ayushAssessment?: {
    prakriti: string;
    vikriti: string;
    agni: string;
    koshtha: string;
    aharaShakti: string;
    vyayamaShakti: string;
    patientReportedNotes: string;
  };

  // 9. Red Flag / Safety Triage
  redFlagTriage: {
    hasTriggered: boolean;
    status: 'GREEN' | 'RED';
    alerts: RedFlagAlert[];
    statusNotice: string;
  };

  // 10. Information Requiring Verification
  verificationItems: string[];

  // 11. Clinical Disclaimers & Tags
  provisionalTags: string[];
  clinicalDisclaimer: string;

  // 12. Versioning & Physician Review
  currentVersionNumber: number;
  versions: SummaryVersion[];
  auditTrail: SummaryAuditEntry[];
  doctorEdits?: {
    physicianNotes: string;
    status: 'DRAFT' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED';
    verifiedByDoctorName?: string;
  };
}
