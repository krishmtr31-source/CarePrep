import { 
  AuthUser, 
  LoginCredentials, 
  PatientSignupPayload, 
  DoctorSignupPayload, 
  AuthResult,
  UserRole 
} from './authTypes';
import { localStore } from '../backend/storage/localStore';
import { PatientIdentity } from '../data-models/patient';
import { carePrepApi } from '../shared/api/apiClient';

const AUTH_STORAGE_KEYS = {
  CURRENT_USER: 'careprep_auth_current_user',
  USERS_DB: 'careprep_auth_users_store',
  AUTH_TOKEN: 'careprep_auth_session_token'
};

// Default seed users for SIH Demonstration
const SEED_USERS: AuthUser[] = [
  {
    id: 'usr-pat-001',
    name: 'Rameshwar Sharma',
    email: 'rameshwar.sharma@example.com',
    role: 'patient',
    phoneNumber: '+91 98451 22319',
    patientProfile: {
      age: 52,
      gender: 'male',
      abhaId: '91-4562-7819-2041',
      city: 'Jaipur',
      preferredLanguage: 'hi'
    },
    createdAt: '2026-01-15T08:00:00.000Z',
    lastLoginAt: '2026-09-02T10:00:00.000Z'
  },
  {
    id: 'usr-doc-001',
    name: 'Dr. Ananya Sharma, MD',
    email: 'dr.ananya@aiims.edu.in',
    role: 'doctor',
    phoneNumber: '+91 98112 34567',
    doctorProfile: {
      registrationNumber: 'MCI-2014-98421',
      specialization: 'Internal Medicine & Clinical Diagnostics',
      hospitalName: 'AIIMS New Delhi / CarePrep Tele-Clinic',
      verifiedStatus: 'VERIFIED_DEMO'
    },
    createdAt: '2025-11-01T09:00:00.000Z',
    lastLoginAt: '2026-09-02T11:00:00.000Z'
  },
  {
    id: 'usr-doc-002',
    name: 'Dr. Ananya Sharma, MD',
    email: 'doctor@hospital.in',
    role: 'doctor',
    phoneNumber: '+91 98112 34568',
    doctorProfile: {
      registrationNumber: 'MCI-2014-98421',
      specialization: 'Internal Medicine & Clinical Diagnostics',
      hospitalName: 'AIIMS New Delhi / CarePrep Tele-Clinic',
      verifiedStatus: 'VERIFIED_DEMO'
    },
    createdAt: '2025-11-01T09:00:00.000Z',
    lastLoginAt: '2026-09-02T11:00:00.000Z'
  }
];

class AuthService {
  private isBrowser = typeof window !== 'undefined';
  private users: AuthUser[] = [...SEED_USERS];

  constructor() {
    this.initStore();
  }

  private initStore() {
    if (!this.isBrowser) return;

    const storedUsers = localStorage.getItem(AUTH_STORAGE_KEYS.USERS_DB);
    if (storedUsers) {
      try {
        this.users = JSON.parse(storedUsers);
      } catch (e) {
        this.users = [...SEED_USERS];
      }
    } else {
      localStorage.setItem(AUTH_STORAGE_KEYS.USERS_DB, JSON.stringify(this.users));
    }
  }

  private saveUsers() {
    if (this.isBrowser) {
      localStorage.setItem(AUTH_STORAGE_KEYS.USERS_DB, JSON.stringify(this.users));
    }
  }

  private memoryCurrentUser: AuthUser | null = null;

  public getCurrentUser(): AuthUser | null {
    if (!this.isBrowser) return this.memoryCurrentUser;
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);
    if (!raw) return this.memoryCurrentUser;
    try {
      return JSON.parse(raw);
    } catch {
      return this.memoryCurrentUser;
    }
  }

  private setCurrentSession(user: AuthUser | null) {
    this.memoryCurrentUser = user;
    if (user) {
      if (this.isBrowser) {
        // Store sanitized user object (no password fields)
        localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        localStorage.setItem(AUTH_STORAGE_KEYS.AUTH_TOKEN, `sih_demo_jwt_${user.id}_${Date.now()}`);
      }
      
      // If user is a patient, bind identity to localStore and MongoDB
      if (user.role === 'patient') {
        const patientRecord: PatientIdentity = {
          id: user.id,
          fullName: user.name,
          age: user.patientProfile?.age || 35,
          gender: user.patientProfile?.gender || 'male',
          phoneNumber: user.phoneNumber || user.email,
          abhaId: user.patientProfile?.abhaId,
          city: user.patientProfile?.city || 'New Delhi',
          preferredLanguage: user.patientProfile?.preferredLanguage || 'en',
          createdAt: user.createdAt
        };
        localStore.savePatient(patientRecord);

        // Sync to MongoDB
        carePrepApi.updatePatientProfile({
          fullName: patientRecord.fullName,
          email: user.email,
          mobile: patientRecord.phoneNumber,
          age: patientRecord.age,
          gender: patientRecord.gender,
          abhaId: patientRecord.abhaId,
          city: patientRecord.city,
          preferredLanguage: patientRecord.preferredLanguage
        }).catch(e => console.warn('[MongoDB] Auth session sync warning:', e));
      }
    } else {
      if (this.isBrowser) {
        localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
        localStorage.removeItem(AUTH_STORAGE_KEYS.AUTH_TOKEN);
      }
    }
  }

  /**
   * Authenticate a user with email/phone and role validation.
   */
  public async login(credentials: LoginCredentials): Promise<AuthResult> {
    const term = credentials.emailOrPhone.trim().toLowerCase();
    
    // Find user matching email or phone and requested role
    const user = this.users.find(u => 
      (u.email.toLowerCase() === term || (u.phoneNumber && u.phoneNumber.includes(term))) && 
      u.role === credentials.role
    );

    if (!user) {
      // Check if user exists under a DIFFERENT role to give clear feedback
      const crossRoleUser = this.users.find(u => 
        u.email.toLowerCase() === term || (u.phoneNumber && u.phoneNumber.includes(term))
      );
      if (crossRoleUser) {
        return {
          success: false,
          error: `This account is registered as a ${crossRoleUser.role.toUpperCase()}. Please use the ${crossRoleUser.role.toUpperCase()} Portal to log in.`
        };
      }

      return {
        success: false,
        error: `No ${credentials.role} account found with these credentials. Please check your details or sign up.`
      };
    }

    // Update last login
    user.lastLoginAt = new Date().toISOString();
    this.saveUsers();
    this.setCurrentSession(user);

    return {
      success: true,
      user
    };
  }

  /**
   * Register a new patient account.
   */
  public async signupPatient(payload: PatientSignupPayload): Promise<AuthResult> {
    const term = payload.emailOrPhone.trim().toLowerCase();

    // Check duplicate
    const existing = this.users.find(u => 
      u.email.toLowerCase() === term || (u.phoneNumber && u.phoneNumber === term)
    );
    if (existing) {
      return {
        success: false,
        error: 'An account with this email/mobile already exists. Please log in instead.'
      };
    }

    const newUser: AuthUser = {
      id: `usr-pat-${Date.now().toString().slice(-6)}`,
      name: payload.fullName.trim(),
      email: term.includes('@') ? term : `${term}@mobile.careprep.in`,
      phoneNumber: term.includes('@') ? undefined : term,
      role: 'patient',
      patientProfile: {
        age: payload.age,
        gender: payload.gender,
        abhaId: payload.abhaId?.trim() || undefined,
        preferredLanguage: payload.preferredLanguage || 'en'
      },
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    this.users.unshift(newUser);
    this.saveUsers();
    this.setCurrentSession(newUser);

    return {
      success: true,
      user: newUser
    };
  }

  /**
   * Register a new doctor account with clinical credentials.
   */
  public async signupDoctor(payload: DoctorSignupPayload): Promise<AuthResult> {
    const email = payload.email.trim().toLowerCase();

    // Check duplicate
    const existing = this.users.find(u => u.email.toLowerCase() === email);
    if (existing) {
      return {
        success: false,
        error: 'A doctor account with this email already exists. Please log in instead.'
      };
    }

    const newUser: AuthUser = {
      id: `usr-doc-${Date.now().toString().slice(-6)}`,
      name: payload.fullName.startsWith('Dr.') ? payload.fullName.trim() : `Dr. ${payload.fullName.trim()}`,
      email: email,
      phoneNumber: payload.phoneNumber.trim(),
      role: 'doctor',
      doctorProfile: {
        registrationNumber: payload.registrationNumber.trim(),
        specialization: payload.specialization.trim(),
        hospitalName: payload.hospitalName.trim(),
        verifiedStatus: 'PENDING_PRODUCTION_AUDIT'
      },
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    this.users.unshift(newUser);
    this.saveUsers();
    this.setCurrentSession(newUser);

    return {
      success: true,
      user: newUser
    };
  }

  /**
   * Log out current user and clear local session state.
   */
  public logout(): void {
    this.setCurrentSession(null);
  }

  /**
   * Get all registered users for demo debugging if needed.
   */
  public getRegisteredUsers(): AuthUser[] {
    return this.users;
  }
}

export const authService = new AuthService();
