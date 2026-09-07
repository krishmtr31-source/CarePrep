import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export type AdminRole = 
  | 'SUPER_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'DOCTOR_ADMIN'
  | 'RECEPTIONIST_ADMIN';

export type AdminPermission = 
  | 'ALL_ACCESS'
  | 'MANAGE_HOSPITAL'
  | 'MANAGE_DOCTORS'
  | 'MANAGE_PATIENTS'
  | 'VIEW_PATIENT_INTAKE'
  | 'EDIT_DOCTOR_SUMMARY'
  | 'APPROVE_TRIAGE'
  | 'EXPORT_REPORTS'
  | 'VIEW_AUDIT_LOGS'
  | 'MANAGE_SETTINGS';

export interface IAdmin extends Document {
  adminId: string;
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  phoneNumber: string;
  role: AdminRole;
  hospitalId?: mongoose.Types.ObjectId;
  department?: string;
  specialization?: string;
  medicalLicenseNumber?: string;
  permissions: AdminPermission[];
  isActive: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  hasPermission(permission: AdminPermission): boolean;
  toSafeObject(): Record<string, unknown>;
}

const DEFAULT_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  SUPER_ADMIN: ['ALL_ACCESS'],
  HOSPITAL_ADMIN: [
    'MANAGE_HOSPITAL',
    'MANAGE_DOCTORS',
    'MANAGE_PATIENTS',
    'VIEW_PATIENT_INTAKE',
    'EXPORT_REPORTS',
    'VIEW_AUDIT_LOGS',
    'MANAGE_SETTINGS'
  ],
  DOCTOR_ADMIN: [
    'VIEW_PATIENT_INTAKE',
    'EDIT_DOCTOR_SUMMARY',
    'APPROVE_TRIAGE',
    'MANAGE_PATIENTS',
    'EXPORT_REPORTS'
  ],
  RECEPTIONIST_ADMIN: [
    'VIEW_PATIENT_INTAKE',
    'MANAGE_PATIENTS'
  ]
};

const AdminSchema = new Schema<IAdmin>({
  adminId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    select: false // Exclude from queries by default for safety
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR_ADMIN', 'RECEPTIONIST_ADMIN'],
    default: 'HOSPITAL_ADMIN',
    index: true
  },
  hospitalId: {
    type: Schema.Types.ObjectId,
    ref: 'Hospital',
    default: null,
    index: true
  },
  department: {
    type: String,
    trim: true
  },
  specialization: {
    type: String,
    trim: true
  },
  medicalLicenseNumber: {
    type: String,
    trim: true,
    sparse: true
  },
  permissions: {
    type: [String],
    default: function(this: IAdmin) {
      return DEFAULT_ROLE_PERMISSIONS[this.role] || [];
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  lastLogin: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save hook to hash password before saving
AdminSchema.pre<IAdmin>('save', async function() {
  if (!this.isModified('passwordHash')) return;

  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  this.passwordChangedAt = new Date();
});

// Instance method to compare password
AdminSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Instance method to check permissions
AdminSchema.methods.hasPermission = function(permission: AdminPermission): boolean {
  if (this.permissions.includes('ALL_ACCESS')) return true;
  return this.permissions.includes(permission);
};

// Instance method to get safe object without password
AdminSchema.methods.toSafeObject = function(): Record<string, unknown> {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.failedLoginAttempts;
  delete obj.lockUntil;
  return obj;
};

export const Admin: Model<IAdmin> = mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);
export default Admin;
