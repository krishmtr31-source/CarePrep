import mongoose, { Schema, Document } from 'mongoose';

export interface IConditionItem {
  id?: string;
  name: string;
  since?: string;
  status: 'Ongoing' | 'Managed' | 'Resolved';
  notes?: string;
}

export interface ISurgeryItem {
  id?: string;
  procedure: string;
  year?: string;
  hospital?: string;
}

export interface IHospitalizationItem {
  id?: string;
  reason: string;
  year?: string;
  hospital?: string;
}

export interface IAllergyItem {
  id?: string;
  allergen: string;
  category: 'Drug' | 'Food' | 'Environmental' | 'Other';
  reaction?: string;
  severity?: 'Mild' | 'Moderate' | 'Severe';
}

export interface IMedicationItem {
  id?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  reason?: string;
  startDate?: string;
  prescribedBy?: string;
  instructions?: string;
}

export interface IFamilyHistoryItem {
  id?: string;
  relationship: 'Father' | 'Mother' | 'Sibling' | 'Grandparent' | 'Other';
  condition: string;
}

export interface ILifestyle {
  smoking?: string;
  alcohol?: string;
  physicalActivity?: string;
  diet?: string;
  sleepHours?: string;
  occupation?: string;
}

export interface IVitals {
  bloodPressure?: string;
  heartRate?: string;
  weight?: string;
  height?: string;
  bmi?: string;
  spo2?: string;
  temperature?: string;
  recordedAt?: Date;
}

export interface IMedicalHistory extends Document {
  patientId: string;
  conditionsList: IConditionItem[];
  surgeriesList: ISurgeryItem[];
  hospitalizationsList: IHospitalizationItem[];
  allergiesList: IAllergyItem[];
  noKnownAllergies?: boolean;
  currentMedications: IMedicationItem[];
  familyHistoryList: IFamilyHistoryItem[];
  lifestyle: ILifestyle;
  vitals: IVitals;
  otherRelevantHistory?: string;
  // Legacy string array fallbacks
  existingConditions: string[];
  previousSurgeries: string[];
  allergies: string[];
  familyHistory: string[];
  updatedAt: Date;
}

const MedicalHistorySchema: Schema = new Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    conditionsList: [
      {
        name: { type: String, required: true },
        since: { type: String, default: '' },
        status: { type: String, enum: ['Ongoing', 'Managed', 'Resolved'], default: 'Ongoing' },
        notes: { type: String, default: '' }
      }
    ],
    surgeriesList: [
      {
        procedure: { type: String, required: true },
        year: { type: String, default: '' },
        hospital: { type: String, default: '' }
      }
    ],
    hospitalizationsList: [
      {
        reason: { type: String, required: true },
        year: { type: String, default: '' },
        hospital: { type: String, default: '' }
      }
    ],
    allergiesList: [
      {
        allergen: { type: String, required: true },
        category: { type: String, enum: ['Drug', 'Food', 'Environmental', 'Other'], default: 'Drug' },
        reaction: { type: String, default: '' },
        severity: { type: String, enum: ['Mild', 'Moderate', 'Severe'], default: 'Mild' }
      }
    ],
    noKnownAllergies: {
      type: Boolean,
      default: false
    },
    currentMedications: [
      {
        name: { type: String, required: true },
        dosage: { type: String, default: '' },
        frequency: { type: String, default: '' },
        reason: { type: String, default: '' },
        startDate: { type: String, default: '' },
        prescribedBy: { type: String, default: '' },
        instructions: { type: String, default: '' }
      }
    ],
    familyHistoryList: [
      {
        relationship: { type: String, required: true },
        condition: { type: String, required: true }
      }
    ],
    lifestyle: {
      smoking: { type: String, default: '' },
      alcohol: { type: String, default: '' },
      physicalActivity: { type: String, default: '' },
      diet: { type: String, default: '' },
      sleepHours: { type: String, default: '' },
      occupation: { type: String, default: '' }
    },
    vitals: {
      bloodPressure: { type: String, default: '' },
      heartRate: { type: String, default: '' },
      weight: { type: String, default: '' },
      height: { type: String, default: '' },
      bmi: { type: String, default: '' },
      spo2: { type: String, default: '' },
      temperature: { type: String, default: '' },
      recordedAt: { type: Date }
    },
    otherRelevantHistory: {
      type: String,
      default: ''
    },
    // Backwards compatibility legacy fields
    existingConditions: { type: [String], default: [] },
    previousSurgeries: { type: [String], default: [] },
    allergies: { type: [String], default: [] },
    familyHistory: { type: [String], default: [] }
  },
  {
    timestamps: true
  }
);

export const MedicalHistory = mongoose.models.MedicalHistory || mongoose.model<IMedicalHistory>('MedicalHistory', MedicalHistorySchema);
