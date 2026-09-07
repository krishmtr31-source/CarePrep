import mongoose, { Schema, Document } from 'mongoose';

export interface IConsultation extends Document {
  consultationId: string;
  patientId: string;
  doctorId: string;
  assessmentId?: string;
  doctorNotes: string;
  doctorDecision: 'ACCEPTED' | 'MODIFIED' | 'REFERRED' | 'PENDING';
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  reviewStatus?: 'DRAFT' | 'AI_GENERATED' | 'UNDER_REVIEW' | 'DOCTOR_EDITED' | 'DOCTOR_CONFIRMED';
  clinicalSummary?: any;
  scheduledAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConsultationSchema: Schema = new Schema(
  {
    consultationId: {
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
    doctorId: {
      type: String,
      required: true,
      index: true
    },
    assessmentId: {
      type: String,
      index: true
    },
    doctorNotes: {
      type: String,
      default: ''
    },
    doctorDecision: {
      type: String,
      enum: ['ACCEPTED', 'MODIFIED', 'REFERRED', 'PENDING'],
      default: 'PENDING'
    },
    status: {
      type: String,
      enum: ['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true
    },
    reviewStatus: {
      type: String,
      enum: ['DRAFT', 'AI_GENERATED', 'UNDER_REVIEW', 'DOCTOR_EDITED', 'DOCTOR_CONFIRMED'],
      default: 'DRAFT',
      index: true
    },
    clinicalSummary: {
      type: Schema.Types.Mixed,
      default: null
    },
    scheduledAt: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

export const Consultation = mongoose.models.Consultation || mongoose.model<IConsultation>('Consultation', ConsultationSchema);
