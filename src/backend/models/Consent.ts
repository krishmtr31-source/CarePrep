import mongoose, { Schema, Document } from 'mongoose';

/**
 * CarePrep Patient Consent Model (Phase 6 — FHIR Interoperability)
 *
 * Records patient consent for data sharing, FHIR export, and clinical data access.
 * Consent is ALWAYS patient-initiated. Revocation takes immediate effect.
 *
 * This is a preparatory consent infrastructure — not a live ABDM consent gateway.
 */

export type ConsentScope = 'fhir_export' | 'doctor_review' | 'research' | 'facility_transfer';
export type ConsentStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface IConsent extends Document {
  consentId: string;
  /** The patient who is granting or revoking consent */
  patientId: string;
  /**
   * Recipient identifier — can be a doctorId, facilityId, or 'SELF' for personal export.
   * NEVER set programmatically — must come from patient action.
   */
  grantedTo: string;
  /** What the consent covers */
  scope: ConsentScope;
  status: ConsentStatus;
  /** When this consent becomes effective */
  grantedAt: Date;
  /** When this consent was revoked (if applicable) */
  revokedAt?: Date;
  /** When this consent expires — optional; null means no expiry */
  expiresAt?: Date;
  /** Free text note from the patient */
  patientNote?: string;
  /** Audit: who processed this consent (system or patient) */
  processedBy: 'PATIENT_SELF' | 'ADMIN';
  createdAt: Date;
  updatedAt: Date;
}

const ConsentSchema: Schema = new Schema(
  {
    consentId: {
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
    grantedTo: {
      type: String,
      required: true,
      trim: true
    },
    scope: {
      type: String,
      enum: ['fhir_export', 'doctor_review', 'research', 'facility_transfer'],
      required: true
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REVOKED', 'EXPIRED'],
      default: 'ACTIVE',
      index: true
    },
    grantedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    revokedAt: {
      type: Date
    },
    expiresAt: {
      type: Date
    },
    patientNote: {
      type: String,
      maxlength: 500,
      default: ''
    },
    processedBy: {
      type: String,
      enum: ['PATIENT_SELF', 'ADMIN'],
      default: 'PATIENT_SELF'
    }
  },
  {
    timestamps: true
  }
);

// Fast lookup: active consents for a patient
ConsentSchema.index({ patientId: 1, status: 1 });
// Quickly find all active consents for a specific recipient
ConsentSchema.index({ patientId: 1, grantedTo: 1, status: 1 });

export const Consent = mongoose.models.Consent || mongoose.model<IConsent>('Consent', ConsentSchema);
