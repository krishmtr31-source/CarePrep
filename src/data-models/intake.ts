export type IntakeMode = 'GENERAL_CLINICAL' | 'AYUSH';

export type IntakeStepType = 
  | 'CHIEF_COMPLAINT'
  | 'SOCRATES_SITE'
  | 'SOCRATES_ONSET'
  | 'SOCRATES_CHARACTER'
  | 'SOCRATES_RADIATION'
  | 'SOCRATES_ASSOCIATION'
  | 'SOCRATES_TIMING'
  | 'SOCRATES_EXACERBATING'
  | 'SOCRATES_SEVERITY'
  | 'AYUSH_PRAKRITI'
  | 'AYUSH_VIKRITI'
  | 'AYUSH_AGNI'
  | 'AYUSH_KOSHTHA'
  | 'AYUSH_SATVA'
  | 'AYUSH_AHARA_SHAKTI'
  | 'AYUSH_VYAYAMA_SHAKTI'
  | 'PAST_HISTORY'
  | 'MEDICATIONS'
  | 'ALLERGIES'
  | 'SUMMARY_REVIEW';

export interface IntakeQuestion {
  id: string;
  step: IntakeStepType;
  mode: IntakeMode;
  questionText: {
    en: string;
    hi: string;
    ta: string;
  };
  explanation?: {
    en: string;
    hi: string;
    ta: string;
  };
  inputType: 'chips_and_text' | 'chips_only' | 'text_only' | 'scale_rating';
  options?: Array<{
    id: string;
    label: {
      en: string;
      hi: string;
      ta: string;
    };
    category?: string;
  }>;
  placeholder?: {
    en: string;
    hi: string;
    ta: string;
  };
  minChars?: number;
}

export interface IntakeAnswer {
  questionId: string;
  step: IntakeStepType;
  selectedOptionIds?: string[];
  customText?: string;
  rawPatientResponse?: string;
  audioProvenance?: 'VOICE' | 'TYPED' | 'TOUCH_CHIP';
  structuredInterpretation?: {
    detectedChiefComplaint?: string;
    detectedDuration?: string;
    detectedSeverity?: string;
    detectedBodySite?: string;
    detectedAssociatedSymptoms?: string[];
    detectedMedications?: string[];
  };
  timestamp: string;
}

export interface PatientCaseRecord {
  caseId: string;
  patientId: string;
  mode: IntakeMode;
  status: 'IN_PROGRESS' | 'SUBMITTED_TO_DOCTOR' | 'COMPLETED' | 'RED_FLAG_TRIAGE' | 'REVIEWED_BY_DOCTOR';
  chiefComplaint: string;
  answers: IntakeAnswer[];
  startedAt: string;
  completedAt?: string;
  tokenNumber?: string;
  queuePosition?: number;
  redFlagsDetected: string[];
  language: 'en' | 'hi' | 'ta';
  doctorReview?: {
    reviewedAt: string;
    doctorName: string;
    status: 'ACCEPTED' | 'MODIFIED' | 'REJECTED';
    doctorNotes: string;
  };
}
