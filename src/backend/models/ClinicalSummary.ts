import mongoose, { Schema, Document } from 'mongoose';
import { 
  IStructuredClinicalSummary, 
  DoctorReviewStatus, 
  DoctorDecisionType, 
  SummaryAuditEntry 
} from '../../shared/types/clinicalSummaryTypes';

export interface IClinicalSummaryDocument extends Document {
  summaryId: string;
  patientId: string;
  consultationId?: string;
  assessmentId?: string;
  sourceDataHash?: string;
  modelUsed: string;
  status: 'READY' | 'FAILED' | 'PENDING';
  reviewStatus: DoctorReviewStatus;
  doctorDecision: DoctorDecisionType;
  doctorNotes: string;
  aiGeneratedSummary: IStructuredClinicalSummary;
  doctorEditedSummary?: IStructuredClinicalSummary;
  reviewedBy?: {
    doctorId: string;
    doctorName: string;
  };
  generatedAt: Date;
  reviewedAt?: Date;
  confirmedAt?: Date;
  summaryVersion: number;
  auditTrail: SummaryAuditEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const ClinicalSummarySchema: Schema = new Schema(
  {
    summaryId: {
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
    consultationId: {
      type: String,
      index: true
    },
    assessmentId: {
      type: String,
      index: true
    },
    sourceDataHash: {
      type: String,
      index: true
    },
    modelUsed: {
      type: String,
      required: true,
      default: 'gemini-3.6-flash'
    },
    status: {
      type: String,
      enum: ['READY', 'FAILED', 'PENDING'],
      default: 'READY',
      index: true
    },
    reviewStatus: {
      type: String,
      enum: ['DRAFT', 'AI_GENERATED', 'UNDER_REVIEW', 'DOCTOR_EDITED', 'DOCTOR_CONFIRMED'],
      default: 'AI_GENERATED',
      index: true
    },
    doctorDecision: {
      type: String,
      enum: ['ACCEPTED', 'MODIFIED', 'REJECTED', 'FLAGGED', 'PENDING'],
      default: 'PENDING'
    },
    doctorNotes: {
      type: String,
      default: ''
    },
    aiGeneratedSummary: {
      type: Schema.Types.Mixed,
      required: true
    },
    doctorEditedSummary: {
      type: Schema.Types.Mixed,
      default: null
    },
    reviewedBy: {
      doctorId: { type: String },
      doctorName: { type: String }
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    reviewedAt: {
      type: Date
    },
    confirmedAt: {
      type: Date
    },
    summaryVersion: {
      type: Number,
      default: 1
    },
    auditTrail: {
      type: Array,
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast lookup by patient and data hash
ClinicalSummarySchema.index({ patientId: 1, createdAt: -1 });
ClinicalSummarySchema.index({ patientId: 1, sourceDataHash: 1 });

export const ClinicalSummary = mongoose.model<IClinicalSummaryDocument>(
  'ClinicalSummary',
  ClinicalSummarySchema
);
