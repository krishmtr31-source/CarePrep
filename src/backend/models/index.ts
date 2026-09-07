// Central barrel export for all CarePrep MongoDB Models and Database Utilities

export { connectDB, disconnectDB, getConnectionStatus, getMongoUri } from '../config/database';

// Hospital Model & Types
export { Hospital, default as HospitalModel } from './Hospital.model';
export type {
  IHospital,
  IHospitalAddress,
  IHospitalInfrastructure,
  HospitalType,
  HospitalStatus
} from './Hospital.model';

// Admin Model & Types
export { Admin, default as AdminModel } from './Admin.model';
export type {
  IAdmin,
  AdminRole,
  AdminPermission
} from './Admin.model';

// Patient Model & Types
export { Patient, default as PatientModel } from './Patient.model';
export type {
  IPatient,
  IPatientConsent,
  IConsentScope,
  IPatientAddress,
  IEmergencyContact,
  IPatientMedicalProfile,
  IAyushProfile,
  BloodGroupType,
  GenderType,
  LanguageCode
} from './Patient.model';

// Case Model & Types
export { Case, default as CaseModel } from './Case.model';
export type {
  ICase,
  IIntakeAnswer,
  IDoctorReview
} from './Case.model';

// DoctorSummary Model & Types
export { DoctorSummary, default as DoctorSummaryModel } from './DoctorSummary.model';
export type {
  IDoctorSummary
} from './DoctorSummary.model';

// ─────────────────────────────────────────────────────────────
// CarePrep Phase 1–6 Models
// ─────────────────────────────────────────────────────────────

// Patient (Phase 1 — simple intake identity model, aliased to avoid clash with Patient.model.ts)
export { Patient as PatientIntake } from './Patient';
export type { IPatient as IPatientIntake } from './Patient';

// Medical History (Phase 2–4)
export { MedicalHistory } from './MedicalHistory';
export type {
  IMedicalHistory,
  IConditionItem,
  ISurgeryItem,
  IHospitalizationItem,
  IAllergyItem,
  IMedicationItem,
  IFamilyHistoryItem,
  ILifestyle,
  IVitals
} from './MedicalHistory';

// Assessment (Phase 2 — Red-Flag Detection)
export { Assessment } from './Assessment';
export type { IAssessment } from './Assessment';

// Clinical Summary (Phase 4 — AI Summary)
export { ClinicalSummary } from './ClinicalSummary';
export type { IClinicalSummaryDocument } from './ClinicalSummary';

// Medical Document (Phase 3 — Document Digitization)
export { MedicalDocument } from './MedicalDocument';
export type {
  IMedicalDocument,
  ILabResultEntry,
  IMedicationEntry,
  MedicalDocumentType
} from './MedicalDocument';

// Medical Report
export { MedicalReport } from './MedicalReport';
export type { IMedicalReport, ILabResultItem, IMedicationReportItem } from './MedicalReport';

// Consultation
export { Consultation } from './Consultation';
export type { IConsultation } from './Consultation';

// Prescription
export { Prescription } from './Prescription';
export type { IPrescription, IPrescriptionMedicine } from './Prescription';

// Facility (Phase 5 — Healthcare Discovery)
export { Facility } from './Facility';
export type { IFacility, IFacilityLocation } from './Facility';

// Consent (Phase 6 — FHIR / ABDM Interoperability)
export { Consent } from './Consent';
export type { IConsent, ConsentScope, ConsentStatus } from './Consent';
