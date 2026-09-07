import mongoose, { Schema, Document } from 'mongoose';

export interface IFacilityLocation {
  latitude: number;
  longitude: number;
}

export interface IFacility extends Document {
  facilityId: string;
  name: string;
  type: 'HOSPITAL' | 'CLINIC' | 'DIAGNOSTIC_LAB' | 'COMMUNITY_HEALTH_CENTER';
  ownership: 'GOVERNMENT' | 'PRIVATE' | 'TRUST_NGO';
  specialties: string[];
  location: IFacilityLocation;
  address: {
    street?: string;
    city: string;
    state: string;
    pincode?: string;
    landmark?: string;
  };
  contact: {
    phone: string;
    emergencyPhone?: string;
    email?: string;
    website?: string;
  };
  pricing: {
    generalOpdFee: number;
    specialistConsultationFee: number;
    bedChargesPerDay?: number;
    emergencyFee?: number;
    isGovernmentSubsidized: boolean;
  };
  schemeEligibility: {
    pmjayAyushmanBharat: boolean;
    cghs: boolean;
    echs: boolean;
    esic: boolean;
    stateBimaYojana?: string;
  };
  rating?: number;
  availableBeds?: number;
  isOpen24x7: boolean;
  distanceKm?: number;
  createdAt: Date;
  updatedAt: Date;
}

const FacilitySchema: Schema = new Schema(
  {
    facilityId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['HOSPITAL', 'CLINIC', 'DIAGNOSTIC_LAB', 'COMMUNITY_HEALTH_CENTER'],
      default: 'HOSPITAL',
      index: true
    },
    ownership: {
      type: String,
      enum: ['GOVERNMENT', 'PRIVATE', 'TRUST_NGO'],
      default: 'GOVERNMENT',
      index: true
    },
    specialties: {
      type: [String],
      default: []
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    address: {
      street: { type: String },
      city: { type: String, required: true, index: true },
      state: { type: String, required: true },
      pincode: { type: String },
      landmark: { type: String }
    },
    contact: {
      phone: { type: String, required: true },
      emergencyPhone: { type: String },
      email: { type: String },
      website: { type: String }
    },
    pricing: {
      generalOpdFee: { type: Number, default: 0 },
      specialistConsultationFee: { type: Number, default: 0 },
      bedChargesPerDay: { type: Number, default: 0 },
      emergencyFee: { type: Number, default: 0 },
      isGovernmentSubsidized: { type: Boolean, default: false }
    },
    schemeEligibility: {
      pmjayAyushmanBharat: { type: Boolean, default: true },
      cghs: { type: Boolean, default: false },
      echs: { type: Boolean, default: false },
      esic: { type: Boolean, default: false },
      stateBimaYojana: { type: String }
    },
    rating: { type: Number, default: 4.5 },
    availableBeds: { type: Number, default: 20 },
    isOpen24x7: { type: Boolean, default: true }
  },
  {
    timestamps: true
  }
);

// Helpful index on city and location coordinates
FacilitySchema.index({ 'location.latitude': 1, 'location.longitude': 1 });

export const Facility = mongoose.models.Facility || mongoose.model<IFacility>('Facility', FacilitySchema);
