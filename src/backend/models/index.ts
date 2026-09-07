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

