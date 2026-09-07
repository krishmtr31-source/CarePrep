import mongoose, { Schema, Document } from 'mongoose';

export interface IPrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface IPrescription extends Document {
  prescriptionId: string;
  patientId: string;
  doctorId: string;
  consultationId?: string;
  medicines: IPrescriptionMedicine[];
  instructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionSchema: Schema = new Schema(
  {
    prescriptionId: {
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
    consultationId: {
      type: String,
      index: true
    },
    medicines: [
      {
        name: { type: String, required: true },
        dosage: { type: String, default: '' },
        frequency: { type: String, default: '' },
        duration: { type: String, default: '' },
        instructions: { type: String, default: '' }
      }
    ],
    instructions: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const Prescription = mongoose.models.Prescription || mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
