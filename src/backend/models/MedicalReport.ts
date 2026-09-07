import mongoose, { Schema, Document } from 'mongoose';

export interface ILabResultItem {
  testName: string;
  value: string;
  numericValue?: number;
  unit: string;
  referenceRange?: string;
  status: string; // 'normal' | 'high' | 'low' | 'abnormal' | 'unknown'
  isAbnormal: boolean;
}

export interface IMedicationReportItem {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
}

export interface IMedicalReport extends Document {
  reportId: string;
  patientId: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  uploadedAt: Date;
  processingStatus: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  extractedData?: Record<string, any>;
  labResults: ILabResultItem[];
  medications: IMedicationReportItem[];
  diagnoses: string[];
  hospitalDetails?: {
    facilityName?: string;
    doctorName?: string;
    reportDate?: string;
  };
  aiSummary?: {
    mainPurpose?: string;
    keyFindings?: string[];
    importantObservations?: string[];
    patientFriendlySummary?: string;
    doctorReviewSummary?: string;
  };
  sourceDocumentReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicalReportSchema: Schema = new Schema(
  {
    reportId: {
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
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: Number
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    processingStatus: {
      type: String,
      enum: ['PENDING', 'ANALYZING', 'COMPLETED', 'FAILED'],
      default: 'COMPLETED',
      index: true
    },
    extractedData: {
      type: Schema.Types.Mixed,
      default: {}
    },
    labResults: [
      {
        testName: { type: String, required: true },
        value: { type: String, required: true },
        numericValue: { type: Number },
        unit: { type: String, default: '' },
        referenceRange: { type: String, default: '' },
        status: { type: String, default: 'normal' },
        isAbnormal: { type: Boolean, default: false }
      }
    ],
    medications: [
      {
        name: { type: String, required: true },
        dosage: { type: String, default: '' },
        frequency: { type: String, default: '' },
        duration: { type: String, default: '' }
      }
    ],
    diagnoses: {
      type: [String],
      default: []
    },
    hospitalDetails: {
      facilityName: { type: String },
      doctorName: { type: String },
      reportDate: { type: String }
    },
    aiSummary: {
      mainPurpose: { type: String },
      keyFindings: { type: [String], default: [] },
      importantObservations: { type: [String], default: [] },
      patientFriendlySummary: { type: String },
      doctorReviewSummary: { type: String }
    },
    sourceDocumentReference: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const MedicalReport = mongoose.models.MedicalReport || mongoose.model<IMedicalReport>('MedicalReport', MedicalReportSchema);
