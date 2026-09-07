import mongoose, { Schema, Document, Model } from 'mongoose';

export type HospitalType = 
  | 'GOVERNMENT'
  | 'PRIVATE'
  | 'AYUSH_HOSPITAL'
  | 'CLINIC'
  | 'COMMUNITY_HEALTH_CENTER'
  | 'MULTI_SPECIALTY';

export type HospitalStatus = 
  | 'ACTIVE'
  | 'INACTIVE'
  | 'PENDING_VERIFICATION'
  | 'SUSPENDED';

export interface IHospitalAddress {
  street?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IHospitalInfrastructure {
  totalBeds: number;
  availableBeds: number;
  icuBeds: number;
  hasAmbulanceService: boolean;
  hasEmergency24x7: boolean;
  hasPharmacy: boolean;
  hasLaboratory: boolean;
}

export interface IHospital extends Document {
  hospitalId: string;
  name: string;
  registrationNumber: string;
  hospitalType: HospitalType;
  contactNumber: string;
  emergencyHelpline?: string;
  email: string;
  website?: string;
  address: IHospitalAddress;
  geoCoordinates?: {
    latitude: number;
    longitude: number;
  };
  departments: string[];
  ayushFacilitiesAvailable: boolean;
  ayushSpecialties: string[];
  infrastructure: IHospitalInfrastructure;
  adminIds: mongoose.Types.ObjectId[];
  registeredDoctorsCount: number;
  status: HospitalStatus;
  verificationDetails?: {
    isVerified: boolean;
    verifiedAt?: Date;
    verifiedBy?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const HospitalAddressSchema = new Schema<IHospitalAddress>({
  street: { type: String, trim: true },
  city: { type: String, required: true, trim: true, index: true },
  state: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, required: true, default: 'India', trim: true }
}, { _id: false });

const HospitalInfrastructureSchema = new Schema<IHospitalInfrastructure>({
  totalBeds: { type: Number, default: 0, min: 0 },
  availableBeds: { type: Number, default: 0, min: 0 },
  icuBeds: { type: Number, default: 0, min: 0 },
  hasAmbulanceService: { type: Boolean, default: true },
  hasEmergency24x7: { type: Boolean, default: true },
  hasPharmacy: { type: Boolean, default: true },
  hasLaboratory: { type: Boolean, default: true }
}, { _id: false });

const HospitalSchema = new Schema<IHospital>({
  hospitalId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true,
    index: true
  },
  registrationNumber: {
    type: String,
    required: [true, 'Registration / license number is required'],
    unique: true,
    trim: true,
    index: true
  },
  hospitalType: {
    type: String,
    required: true,
    enum: [
      'GOVERNMENT',
      'PRIVATE',
      'AYUSH_HOSPITAL',
      'CLINIC',
      'COMMUNITY_HEALTH_CENTER',
      'MULTI_SPECIALTY'
    ],
    default: 'MULTI_SPECIALTY'
  },
  contactNumber: {
    type: String,
    required: [true, 'Contact number is required'],
    trim: true
  },
  emergencyHelpline: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  address: {
    type: HospitalAddressSchema,
    required: true
  },
  geoCoordinates: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  departments: {
    type: [String],
    default: [
      'General Medicine',
      'Cardiology',
      'Orthopedics',
      'Pediatrics',
      'Emergency Medicine',
      'Ayurveda'
    ]
  },
  ayushFacilitiesAvailable: {
    type: Boolean,
    default: false
  },
  ayushSpecialties: {
    type: [String],
    default: []
  },
  infrastructure: {
    type: HospitalInfrastructureSchema,
    default: () => ({
      totalBeds: 50,
      availableBeds: 20,
      icuBeds: 5,
      hasAmbulanceService: true,
      hasEmergency24x7: true,
      hasPharmacy: true,
      hasLaboratory: true
    })
  },
  adminIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  }],
  registeredDoctorsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED'],
    default: 'ACTIVE'
  },
  verificationDetails: {
    isVerified: { type: Boolean, default: true },
    verifiedAt: { type: Date, default: Date.now },
    verifiedBy: { type: String, default: 'SYSTEM_ADMIN' }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for searching
HospitalSchema.index({ name: 'text', 'address.city': 'text', departments: 'text' });

export const Hospital: Model<IHospital> = mongoose.models.Hospital || mongoose.model<IHospital>('Hospital', HospitalSchema);
export default Hospital;

