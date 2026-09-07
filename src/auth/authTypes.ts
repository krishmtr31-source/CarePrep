export type UserRole = 'patient' | 'doctor';

export interface PatientProfile {
  age: number;
  gender: 'male' | 'female' | 'other';
  abhaId?: string;
  phoneNumber?: string;
  city?: string;
  preferredLanguage?: 'en' | 'hi' | 'ta';
}

export interface DoctorProfile {
  registrationNumber: string;
  specialization: string;
  hospitalName: string;
  verifiedStatus: 'VERIFIED_DEMO' | 'PENDING_PRODUCTION_AUDIT';
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phoneNumber?: string;
  patientProfile?: PatientProfile;
  doctorProfile?: DoctorProfile;
  createdAt: string;
  lastLoginAt: string;
}

export interface LoginCredentials {
  emailOrPhone: string;
  password: string;
  role: UserRole;
}

export interface PatientSignupPayload {
  fullName: string;
  emailOrPhone: string;
  password: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  abhaId?: string;
  preferredLanguage?: 'en' | 'hi' | 'ta';
}

export interface DoctorSignupPayload {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  registrationNumber: string;
  specialization: string;
  hospitalName: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}
