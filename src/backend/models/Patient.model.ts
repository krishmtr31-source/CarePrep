import mongoose, { Schema, Document, Model } from 'mongoose';

export type LanguageCode = 'en' | 'hi' | 'ta';
export type GenderType = 'male' | 'female' | 'other';
export type BloodGroupType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'UNKNOWN';

export interface IConsentScope {
  symptomCollection: boolean;
  aiHistoryDrafting: boolean;
  physicianReviewOnly: boolean;
  anonymousQualityAudit: boolean;
}

export interface IPatientConsent {
  hasConsented: boolean;
  timestamp: Date;
  scope: IConsentScope;
  disclaimerAcknowledged: boolean;
  version: string;
}

export interface IPatientAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface IEmergencyContact {
  name: string;
  phoneNumber: string;
  relationship?: string;
}

export interface IAyushProfile {
  prakriti?: string;
  vikriti?: string;
  agni?: string;
  koshtha?: string;
  satva?: string;
  aharaShakti?: string;
  vyayamaShakti?: string;
  notes?: string;
}

export interface IPatientMedicalProfile {
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  pastSurgeries: Array<{
    procedure: string;
    year?: number;
    hospital?: string;
  }>;
  familyHistory: string[];
  ayushProfile?: IAyushProfile;
}

export interface IPatient extends Document {
  patientId: string; // e.g. pat-seed-001 or UUID
  abhaId?: string;   // e.g. 91-4562-7819-2041
  fullName: string;
  age: number;
  gender: GenderType;
  dateOfBirth?: Date;
  phoneNumber: string;
  email?: string;
  bloodGroup: BloodGroupType;
  address?: IPatientAddress;
  emergencyContact?: IEmergencyContact;
  preferredLanguage: LanguageCode;
  hospitalId?: mongoose.Types.ObjectId;
  assignedDoctorId?: mongoose.Types.ObjectId;
  consents: IPatientConsent[];
  medicalProfile: IPatientMedicalProfile;
  caseIds: mongoose.Types.ObjectId[];
  documents: Array<Record<string, unknown>>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ConsentScopeSchema = new Schema<IConsentScope>({
  symptomCollection: { type: Boolean, default: true },
  aiHistoryDrafting: { type: Boolean, default: true },
  physicianReviewOnly: { type: Boolean, default: true },
  anonymousQualityAudit: { type: Boolean, default: false }
}, { _id: false });

const PatientConsentSchema = new Schema<IPatientConsent>({
  hasConsented: { type: Boolean, required: true, default: false },
  timestamp: { type: Date, default: Date.now },
  scope: { type: ConsentScopeSchema, default: () => ({}) },
  disclaimerAcknowledged: { type: Boolean, default: false },
  version: { type: String, default: 'v1.0' }
}, { _id: false });

const PatientAddressSchema = new Schema<IPatientAddress>({
  street: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  country: { type: String, default: 'India', trim: true }
}, { _id: false });

const EmergencyContactSchema = new Schema<IEmergencyContact>({
  name: { type: String, required: true, trim: true },
  phoneNumber: { type: String, required: true, trim: true },
  relationship: { type: String, trim: true }
}, { _id: false });

const AyushProfileSchema = new Schema<IAyushProfile>({
  prakriti: { type: String, trim: true },
  vikriti: { type: String, trim: true },
  agni: { type: String, trim: true },
  koshtha: { type: String, trim: true },
  satva: { type: String, trim: true },
  aharaShakti: { type: String, trim: true },
  vyayamaShakti: { type: String, trim: true },
  notes: { type: String, trim: true }
}, { _id: false });

const PatientMedicalProfileSchema = new Schema<IPatientMedicalProfile>({
  allergies: { type: [String], default: [] },
  chronicConditions: { type: [String], default: [] },
  currentMedications: { type: [String], default: [] },
  pastSurgeries: [{
    procedure: { type: String, required: true },
    year: { type: Number },
    hospital: { type: String }
  }],
  familyHistory: { type: [String], default: [] },
  ayushProfile: { type: AyushProfileSchema, default: () => ({}) }
}, { _id: false });

const PatientSchema = new Schema<IPatient>({
  patientId: {
    type: String,
    required: [true, 'Patient identifier is required'],
    unique: true,
    trim: true,
    index: true
  },
  abhaId: {
    type: String,
    trim: true,
    sparse: true,
    unique: true,
    index: true,
    match: [/^\d{2}-\d{4}-\d{4}-\d{4}$/, 'ABHA ID must match format: XX-XXXX-XXXX-XXXX']
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    index: true
  },
  age: {
    type: Number,
    required: [true, 'Age is required'],
    min: [0, 'Age cannot be negative'],
    max: [130, 'Age exceeds standard human threshold']
  },
  gender: {
    type: String,
    required: [true, 'Gender is required'],
    enum: ['male', 'female', 'other']
  },
  dateOfBirth: {
    type: Date
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    index: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'],
    default: 'UNKNOWN'
  },
  address: {
    type: PatientAddressSchema
  },
  emergencyContact: {
    type: EmergencyContactSchema
  },
  preferredLanguage: {
    type: String,
    enum: ['en', 'hi', 'ta'],
    default: 'en'
  },
  hospitalId: {
    type: Schema.Types.ObjectId,
    ref: 'Hospital',
    index: true
  },
  assignedDoctorId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    index: true
  },
  consents: {
    type: [PatientConsentSchema],
    default: []
  },
  medicalProfile: {
    type: PatientMedicalProfileSchema,
    default: () => ({
      allergies: [],
      chronicConditions: [],
      currentMedications: [],
      pastSurgeries: [],
      familyHistory: []
    })
  },
  caseIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Case'
  }],
  documents: [{
    type: Schema.Types.Mixed
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for searching
PatientSchema.index({ fullName: 'text', phoneNumber: 1 });

export const Patient: Model<IPatient> = mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);
export default Patient;
