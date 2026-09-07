import mongoose, { Schema, Document, Model } from 'mongoose';
import { IntakeMode, IntakeStepType } from '../../data-models/intake';
import { LanguageCode } from './Patient.model';

export interface IIntakeAnswer {
  questionId: string;
  step: IntakeStepType;
  selectedOptionIds?: string[];
  customText?: string;
  rawPatientResponse?: string;
  audioProvenance?: 'VOICE' | 'TYPED' | 'TOUCH_CHIP';
  structuredInterpretation?: {
    detectedChiefComplaint?: string;
    detectedDuration?: string;
    detectedSeverity?: string;
    detectedBodySite?: string;
    detectedAssociatedSymptoms?: string[];
    detectedMedications?: string[];
  };
  timestamp: Date;
}

export interface IDoctorReview {
  reviewedAt: Date;
  doctorName: string;
  doctorAdminId?: mongoose.Types.ObjectId;
  status: 'ACCEPTED' | 'MODIFIED' | 'REJECTED';
  doctorNotes: string;
}

export interface ICase extends Document {
  caseId: string;
  patientId: string;
  patientDocId?: mongoose.Types.ObjectId;
  hospitalId?: mongoose.Types.ObjectId;
  mode: IntakeMode;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'RED_FLAG_TRIAGE' | 'REVIEWED_BY_DOCTOR';
  chiefComplaint: string;
  answers: IIntakeAnswer[];
  startedAt: Date;
  completedAt?: Date;
  redFlagsDetected: string[];
  language: LanguageCode;
  doctorReview?: IDoctorReview;
  createdAt: Date;
  updatedAt: Date;
}

const IntakeAnswerSchema = new Schema<IIntakeAnswer>({
  questionId: { type: String, required: true },
  step: { type: String, required: true },
  selectedOptionIds: { type: [String], default: [] },
  customText: { type: String },
  rawPatientResponse: { type: String },
  audioProvenance: {
    type: String,
    enum: ['VOICE', 'TYPED', 'TOUCH_CHIP'],
    default: 'TYPED'
  },
  structuredInterpretation: {
    detectedChiefComplaint: String,
    detectedDuration: String,
    detectedSeverity: String,
    detectedBodySite: String,
    detectedAssociatedSymptoms: [String],
    detectedMedications: [String]
  },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const DoctorReviewSchema = new Schema<IDoctorReview>({
  reviewedAt: { type: Date, default: Date.now },
  doctorName: { type: String, required: true },
  doctorAdminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
  status: {
    type: String,
    enum: ['ACCEPTED', 'MODIFIED', 'REJECTED'],
    required: true
  },
  doctorNotes: { type: String, default: '' }
}, { _id: false });

const CaseSchema = new Schema<ICase>({
  caseId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  patientId: {
    type: String,
    required: true,
    index: true
  },
  patientDocId: {
    type: Schema.Types.ObjectId,
    ref: 'Patient',
    index: true
  },
  hospitalId: {
    type: Schema.Types.ObjectId,
    ref: 'Hospital',
    index: true
  },
  mode: {
    type: String,
    enum: ['GENERAL_CLINICAL', 'AYUSH'],
    required: true,
    default: 'GENERAL_CLINICAL'
  },
  status: {
    type: String,
    enum: ['IN_PROGRESS', 'COMPLETED', 'RED_FLAG_TRIAGE', 'REVIEWED_BY_DOCTOR'],
    default: 'IN_PROGRESS',
    index: true
  },
  chiefComplaint: {
    type: String,
    required: true,
    trim: true
  },
  answers: {
    type: [IntakeAnswerSchema],
    default: []
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  redFlagsDetected: {
    type: [String],
    default: []
  },
  language: {
    type: String,
    enum: ['en', 'hi', 'ta'],
    default: 'en'
  },
  doctorReview: {
    type: DoctorReviewSchema
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export const Case: Model<ICase> = mongoose.models.Case || mongoose.model<ICase>('Case', CaseSchema);
export default Case;

