import mongoose, { Schema, Document } from 'mongoose';

export interface IAssessment extends Document {
  assessmentId: string;
  patientId: string;
  chiefComplaint: string;
  symptoms: string[];
  symptomDuration?: string;
  socratesData?: Record<string, any>;
  ayushData?: Record<string, any>;
  lifestyleData?: Record<string, any>;
  triageStatus: 'NORMAL' | 'ELEVATED' | 'RED_FLAG_TRIAGE';
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENT';
  status: 'IN_PROGRESS' | 'SUBMITTED_TO_DOCTOR' | 'COMPLETED' | 'REVIEWED_BY_DOCTOR';
  tokenNumber?: string;
  queuePosition?: number;
  redFlagsDetected: string[];
  answers: any[];
  language: string;
  orchestratorSessionId?: string;
  agentActivityLogs?: Array<{
    agentName: string;
    timestamp: string;
    action: string;
    status: 'SUCCESS' | 'IN_PROGRESS' | 'WARNING' | 'ERROR';
    details?: string;
  }>;
  evidenceTrail?: Array<{
    id: string;
    sourceType: string;
    sourceName: string;
    rawSnippet: string;
    structuredField: string;
    timestamp: string;
    confidence?: number;
    documentPage?: number;
  }>;
  doctorReview?: {
    reviewedAt: Date;
    doctorId: string;
    doctorName: string;
    status: 'ACCEPTED' | 'MODIFIED' | 'REJECTED';
    doctorNotes: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AssessmentSchema: Schema = new Schema(
  {
    assessmentId: {
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
    chiefComplaint: {
      type: String,
      required: true,
      trim: true
    },
    symptoms: {
      type: [String],
      default: []
    },
    symptomDuration: {
      type: String,
      default: ''
    },
    socratesData: {
      type: Schema.Types.Mixed,
      default: {}
    },
    ayushData: {
      type: Schema.Types.Mixed,
      default: {}
    },
    lifestyleData: {
      type: Schema.Types.Mixed,
      default: {}
    },
    triageStatus: {
      type: String,
      enum: ['NORMAL', 'ELEVATED', 'RED_FLAG_TRIAGE'],
      default: 'NORMAL',
      index: true
    },
    priority: {
      type: String,
      enum: ['ROUTINE', 'URGENT', 'EMERGENT'],
      default: 'ROUTINE'
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'SUBMITTED_TO_DOCTOR', 'COMPLETED', 'REVIEWED_BY_DOCTOR'],
      default: 'SUBMITTED_TO_DOCTOR',
      index: true
    },
    tokenNumber: {
      type: String
    },
    queuePosition: {
      type: Number
    },
    redFlagsDetected: {
      type: [String],
      default: []
    },
    answers: {
      type: [Schema.Types.Mixed],
      default: []
    },
    language: {
      type: String,
      default: 'en'
    },
    orchestratorSessionId: {
      type: String,
      index: true
    },
    agentActivityLogs: {
      type: [Schema.Types.Mixed],
      default: []
    },
    evidenceTrail: {
      type: [Schema.Types.Mixed],
      default: []
    },
    doctorReview: {
      reviewedAt: { type: Date },
      doctorId: { type: String },
      doctorName: { type: String },
      status: { type: String, enum: ['ACCEPTED', 'MODIFIED', 'REJECTED'] },
      doctorNotes: { type: String }
    }
  },
  {
    timestamps: true
  }
);

export const Assessment = mongoose.models.Assessment || mongoose.model<IAssessment>('Assessment', AssessmentSchema);
