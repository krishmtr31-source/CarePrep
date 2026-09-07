import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  patientId: string;
  fullName: string;
  email: string;
  mobile: string;
  age?: number;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  abhaId?: string;
  city?: string;
  preferredLanguage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema: Schema = new Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      index: true
    },
    mobile: {
      type: String,
      trim: true,
      index: true
    },
    age: {
      type: Number,
      min: 0,
      max: 125
    },
    dateOfBirth: {
      type: String,
      trim: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other'
    },
    abhaId: {
      type: String,
      trim: true,
      sparse: true,
      index: true
    },
    city: {
      type: String,
      trim: true
    },
    preferredLanguage: {
      type: String,
      default: 'en'
    }
  },
  {
    timestamps: true
  }
);

export const Patient = mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);
