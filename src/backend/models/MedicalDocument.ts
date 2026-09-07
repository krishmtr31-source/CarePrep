import mongoose, { Schema, Document } from 'mongoose';

export type MedicalDocumentType = 
  | 'LAB_REPORT'
  | 'PRESCRIPTION'
  | 'DISCHARGE_SUMMARY'
  | 'CONSULTATION_NOTE'
  | 'RADIOLOGY_REPORT'
  | 'ECG_REPORT'
  | 'MEDICAL_CERTIFICATE'
  | 'OTHER';

export interface ILabResultEntry {
  testName: string;
  value: string;
  unit: string;
  referenceRange?: string;
  flag?: string; // 'NORMAL' | 'HIGH' | 'LOW' | 'ABNORMAL' | null
}

export interface IMedicationEntry {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
}

export interface IMedicalDocument extends Document {
  documentId: string;
  patientId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileData?: string; // Base64 Data URL for viewing original document
  documentType: MedicalDocumentType;
  documentTitle: string;
  documentDate?: string;
  patientName?: string;
  doctorName?: string;
  hospitalName?: string;
  summary: string;
  labResults: ILabResultEntry[];
  medications: IMedicationEntry[];
  diagnosesMentioned: string[];
  proceduresMentioned: string[];
  importantNotes: string[];
  extractionWarnings: string[];
  extractionStatus: 'PENDING' | 'PROCESSED' | 'FAILED';
  aiModel?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalDocumentSchema: Schema = new Schema(
  {
    documentId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    patientId: {
      type: String,
      required: true,
      index: true
    },
    fileName: {
      type: String,
      required: true,
      trim: true
    },
    mimeType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number,
      required: true
    },
    fileData: {
      type: String,
      select: true
    },
    documentType: {
      type: String,
      enum: [
        'LAB_REPORT',
        'PRESCRIPTION',
        'DISCHARGE_SUMMARY',
        'CONSULTATION_NOTE',
        'RADIOLOGY_REPORT',
        'ECG_REPORT',
        'MEDICAL_CERTIFICATE',
        'OTHER'
      ],
      default: 'OTHER',
      index: true
    },
    documentTitle: {
      type: String,
      default: 'Medical Document'
    },
    documentDate: {
      type: String,
      default: null
    },
    patientName: {
      type: String,
      default: null
    },
    doctorName: {
      type: String,
      default: null
    },
    hospitalName: {
      type: String,
      default: null
    },
    summary: {
      type: String,
      default: ''
    },
    labResults: [
      {
        testName: { type: String, required: true },
        value: { type: String, required: true },
        unit: { type: String, default: '' },
        referenceRange: { type: String, default: '' },
        flag: { type: String, default: 'NORMAL' }
      }
    ],
    medications: [
      {
        name: { type: String, required: true },
        dosage: { type: String, default: '' },
        frequency: { type: String, default: '' },
        duration: { type: String, default: '' },
        route: { type: String, default: '' }
      }
    ],
    diagnosesMentioned: [{ type: String }],
    proceduresMentioned: [{ type: String }],
    importantNotes: [{ type: String }],
    extractionWarnings: [{ type: String }],
    extractionStatus: {
      type: String,
      enum: ['PENDING', 'PROCESSED', 'FAILED'],
      default: 'PROCESSED',
      index: true
    },
    aiModel: {
      type: String,
      default: 'gemini'
    },
    processedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound index for patient document queries sorted newest first
MedicalDocumentSchema.index({ patientId: 1, createdAt: -1 });

export const MedicalDocument = mongoose.models.MedicalDocument || 
  mongoose.model<IMedicalDocument>('MedicalDocument', MedicalDocumentSchema);
