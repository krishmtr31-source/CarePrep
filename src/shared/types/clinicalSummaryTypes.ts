/**
 * CarePrep (SIH26047) - Canonical Clinical Summary Types
 * Represents the structured data model for AI-assisted clinical summaries and doctor-in-the-loop reviews.
 */

export type DoctorReviewStatus = 
  | 'DRAFT' 
  | 'AI_GENERATED' 
  | 'UNDER_REVIEW' 
  | 'DOCTOR_EDITED' 
  | 'DOCTOR_CONFIRMED';

export type DoctorDecisionType = 
  | 'ACCEPTED' 
  | 'MODIFIED' 
  | 'REJECTED' 
  | 'FLAGGED' 
  | 'PENDING';

export type UrgencyLevel = 'routine' | 'priority' | 'urgent' | 'emergency';

export interface SummaryAuditEntry {
  timestamp: string;
  action: 'GENERATED' | 'EDITED' | 'REVIEWED' | 'CONFIRMED' | 'REJECTED' | 'FLAGGED';
  performedBy: {
    userId: string;
    role: 'ai' | 'doctor' | 'system';
    name?: string;
  };
  notes?: string;
}

export interface PatientOverviewSummary {
  age?: number | string;
  gender?: string;
  abhaId?: string | null;
  keyContext: string[];
}

export interface HistoryOfPresentIllnessSummary {
  summary: string;
  duration: string;
  severity: string;
  associatedSymptoms: string[];
  triggers: string[];
  relievingFactors: string[];
}

export interface DocumentFindingSummary {
  documentName: string;
  documentDate?: string | null;
  documentType?: string;
  findingType: 'LAB_RESULT' | 'MEDICATION' | 'DIAGNOSIS' | 'NOTE';
  entityName: string;
  value?: string;
  unit?: string;
  referenceRange?: string;
  flag?: string;
  evidenceSnippet?: string;
}

export interface RedFlagSummaryItem {
  ruleId: string;
  ruleTitle: string;
  severity: 'CRITICAL_EMERGENCY' | 'HIGH_RISK' | 'MODERATE' | 'INFO';
  matchedTrigger: string;
  recommendedEscalation: string;
}

export interface UrgencyAssessment {
  level: UrgencyLevel;
  reason: string;
}

export interface PatientPreparationSummary {
  whatToTellDoctor: string[];
  importantSymptoms: string[];
  currentMedicines: string[];
  allergies: string[];
  relevantHistory: string[];
  reportsToDiscuss: string[];
  questionsToAsk: string[];
  missingInfo: string[];
}

export interface SummarySourceTransparency {
  preConsultation: boolean;
  medicalHistory: boolean;
  medications: boolean;
  reports: boolean;
  vitals: boolean;
  lifestyle: boolean;
}

/**
 * Strict canonical schema returned by Gemini clinical summary model.
 */
export interface IStructuredClinicalSummary {
  summaryVersion: string;
  patientOverview: PatientOverviewSummary;
  chiefComplaint: string;
  historyOfPresentIllness: HistoryOfPresentIllnessSummary;
  medicalHistory: string[];
  medications: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    reason?: string;
  }>;
  allergies: Array<{
    allergen: string;
    category?: string;
    reaction?: string;
    severity?: string;
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
  documentFindings: DocumentFindingSummary[];
  redFlags: RedFlagSummaryItem[];
  clinicalHighlights: string[];
  missingImportantInformation: string[];
  questionsForClinician: string[];
  urgency: UrgencyAssessment;
  aiDisclaimer: string;

  // Exact Phase 4 fields for Doctor & Patient Views
  caseOverview?: string;
  symptomSummary?: string;
  relevantMedicalHistory?: string[];
  currentMedications?: Array<string | { name: string; dosage?: string; frequency?: string; reason?: string }>;
  relevantVitals?: string[];
  relevantReports?: string[];
  redFlagStatus?: string;
  importantPointsForDoctor?: string[];
  patientQuestionsToAsk?: string[];
  missingInformation?: string[];
  preConsultationSummary?: string;

  // Dedicated Patient Preparation & Transparency
  patientPreparation?: PatientPreparationSummary;
  sourcesUsed?: SummarySourceTransparency;
}

/**
 * Complete persisted Clinical Summary state including both AI and Doctor versions.
 */
export interface IClinicalSummaryRecord {
  summaryId: string;
  consultationId?: string;
  assessmentId?: string;
  patientId: string;
  reviewStatus: DoctorReviewStatus;
  aiGeneratedSummary: IStructuredClinicalSummary;
  doctorEditedSummary?: IStructuredClinicalSummary;
  doctorNotes: string;
  doctorDecision: DoctorDecisionType;
  reviewedBy?: {
    doctorId: string;
    doctorName: string;
  };
  generatedAt: string;
  reviewedAt?: string;
  confirmedAt?: string;
  modelUsed: string;
  summaryVersion: number;
  auditTrail: SummaryAuditEntry[];
  sourceDataHash?: string;
  isCached?: boolean;
}
