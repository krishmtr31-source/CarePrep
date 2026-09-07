export type DocumentClassification = 
  | 'PRESCRIPTION'
  | 'LAB_REPORT'
  | 'DISCHARGE_SUMMARY'
  | 'OTHER';

export interface SourceEvidence {
  documentId: string;
  documentName: string;
  pageNumber: number;
  snippet: string;
  confidenceScore: number; // 0.0 to 1.0
  extractionMethod?: 'PDF_TEXT' | 'OCR' | 'SAMPLE';
  requiresVerification?: boolean;
}

export interface ExtractedMedication {
  id: string;
  name: string;
  dosage: string; // e.g. "500 mg" or "Not found / Requires verification"
  frequency: string; // e.g. "Twice daily (BD)" or "Not found / Requires verification"
  duration: string; // e.g. "30 days" or "Not found / Requires verification"
  instructions?: string;
  evidence: SourceEvidence;
  isAyushMedicine?: boolean;
}

export interface ExtractedLabResult {
  id: string;
  testName: string;
  resultValue: string; // e.g. "8.4" or "162"
  numericValue?: number;
  value?: number | string;
  unit: string; // e.g. "%" or "mg/dL"
  sourceReferenceRange: {
    raw: string; // e.g. "4.0 - 5.6"
    min?: number;
    max?: number;
    hasSourceRange: boolean;
  };
  referenceRange?: string;
  flag: 'HIGH' | 'LOW' | 'NORMAL' | 'INDETERMINATE';
  status?: string;
  isAbnormal: boolean;
  source?: string;
  evidence: SourceEvidence;
}

export interface ExtractedDiagnosis {
  id: string;
  conditionName: string;
  status: 'ACTIVE' | 'RESOLVED' | 'PROVISIONAL';
  date?: string;
  evidence: SourceEvidence;
}

export interface GeminiLabResult {
  test_name: string;
  testName?: string;
  value: string | number;
  unit: string;
  reference_range?: string;
  referenceRange?: string;
  status: 'normal' | 'high' | 'low' | 'abnormal' | 'borderline' | 'unknown';
  source?: string;
}

export interface GeminiMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface GeminiMedicalDocumentAnalysis {
  document: {
    document_type: string;
    document_date: string;
    hospital_or_lab: string;
    doctor_name: string;
  };
  patient: {
    name: string;
    age: number | null;
    gender: string;
    patient_id: string;
  };
  summary: {
    main_purpose: string;
    key_findings: string[];
    important_observations: string[];
  };
  laboratory_results: GeminiLabResult[];
  medications: GeminiMedication[];
  diagnoses_or_conditions_mentioned: string[];
  symptoms_mentioned: string[];
  allergies_mentioned: string[];
  procedures_or_treatments: string[];
  follow_up_information: string[];
  missing_or_unclear_information: string[];
  document_quality: {
    readability: string;
    possible_ocr_errors: string[];
    confidence_notes: string[];
  };
  patient_friendly_summary: string;
  doctor_review_summary: string;
}

export interface ExtractedDocumentData {
  documentId: string;
  patientId?: string;
  caseId?: string;
  fileName: string;
  fileType: 'pdf' | 'image' | 'sample';
  fileSize?: number;
  uploadedAt: string;
  classification: DocumentClassification;
  classificationConfidence: number;
  detectedDate?: string;
  facilityName?: string;
  doctorName?: string;
  rawText: string;
  pagesCount: number;
  medications: ExtractedMedication[];
  labResults: ExtractedLabResult[];
  diagnoses: ExtractedDiagnosis[];
  summaryNote?: string;
  unreliableFields: string[]; // Fields that could not be reliably extracted
  previewUrl?: string; // Base64 or Blob / Sample SVG
  originalFileUrl?: string; // Stored original file data URL (for PDF / Image viewing)
  classificationConflict?: boolean;
  textQuality?: 'VALID' | 'DEGRADED' | 'UNUSABLE';
  geminiAnalyzed?: boolean;
  geminiAnalysis?: GeminiMedicalDocumentAnalysis;
  evidenceValidated?: boolean;
}

export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  category: 'MEDICATION' | 'LAB_RESULT' | 'DIAGNOSIS' | 'HOSPITALIZATION' | 'INTAKE_COMPLAINT';
  description: string;
  provenance: 'AI_EXTRACTED_DOC' | 'PATIENT_REPORTED' | 'CLINICIAN_VERIFIED';
  documentId?: string;
  documentName?: string;
  flag?: 'HIGH' | 'LOW' | 'NORMAL' | 'CRITICAL';
}
