/**
 * CarePrep API Client
 * Centralized service for communicating with the MongoDB-backed API endpoints.
 * Automatically injects authentication tokens and handles error states.
 */

const AUTH_STORAGE_KEYS = {
  CURRENT_USER: 'careprep_auth_current_user',
  AUTH_TOKEN: 'careprep_auth_session_token'
};

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.AUTH_TOKEN);
    const rawUser = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        if (user.id) {
          headers['x-user-id'] = user.id;
          headers['x-patient-id'] = user.id;
        }
        if (user.role) {
          headers['x-user-role'] = user.role;
        }
      } catch (e) {}
    }
  }

  return headers;
}

export interface PatientProfileData {
  patientId?: string;
  fullName: string;
  email?: string;
  mobile?: string;
  age?: number;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  abhaId?: string;
  city?: string;
  preferredLanguage?: string;
  isNew?: boolean;
  updatedAt?: string;
}

export interface ConditionItem {
  id?: string;
  name: string;
  since?: string;
  status: 'Ongoing' | 'Managed' | 'Resolved';
  notes?: string;
}

export interface SurgeryItem {
  id?: string;
  procedure: string;
  year?: string;
  hospital?: string;
}

export interface HospitalizationItem {
  id?: string;
  reason: string;
  year?: string;
  hospital?: string;
}

export interface AllergyItem {
  id?: string;
  allergen: string;
  category: 'Drug' | 'Food' | 'Environmental' | 'Other';
  reaction?: string;
  severity?: 'Mild' | 'Moderate' | 'Severe';
}

export interface MedicationItem {
  id?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  reason?: string;
  startDate?: string;
  prescribedBy?: string;
  instructions?: string;
}

export interface FamilyHistoryItem {
  id?: string;
  relationship: 'Father' | 'Mother' | 'Sibling' | 'Grandparent' | 'Other';
  condition: string;
}

export interface LifestyleData {
  smoking?: string;
  alcohol?: string;
  physicalActivity?: string;
  diet?: string;
  sleepHours?: string;
  occupation?: string;
}

export interface VitalsData {
  bloodPressure?: string;
  heartRate?: string;
  weight?: string;
  height?: string;
  bmi?: string;
  spo2?: string;
  temperature?: string;
  recordedAt?: string;
}

export interface MedicalHistoryData {
  patientId?: string;
  conditionsList?: ConditionItem[];
  surgeriesList?: SurgeryItem[];
  hospitalizationsList?: HospitalizationItem[];
  allergiesList?: AllergyItem[];
  noKnownAllergies?: boolean;
  currentMedications?: MedicationItem[];
  familyHistoryList?: FamilyHistoryItem[];
  lifestyle?: LifestyleData;
  vitals?: VitalsData;
  otherRelevantHistory?: string;
  existingConditions?: string[];
  previousSurgeries?: string[];
  allergies?: string[];
  familyHistory?: string[];
  empty?: boolean;
  updatedAt?: string;
}

export const carePrepApi = {
  /**
   * Health check for MongoDB connection.
   */
  async getDatabaseStatus(): Promise<{ isConnected: boolean; databaseName?: string; error?: string }> {
    try {
      const res = await fetch('/api/db/health', {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e: any) {
      return { isConnected: false, error: e.message || 'Database uncontactable' };
    }
  },

  // ==================== PATIENT & MEDICAL HISTORY ====================

  async getPatientProfile(): Promise<PatientProfileData | null> {
    try {
      const res = await fetch('/api/patients/me', {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async updatePatientProfile(data: Partial<PatientProfileData>): Promise<{ success: boolean; patient?: any; error?: string }> {
    try {
      const res = await fetch('/api/patients/me', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  },

  async getMedicalHistory(): Promise<MedicalHistoryData | null> {
    try {
      const res = await fetch('/api/patients/me/medical-history', {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateMedicalHistory(data: Partial<MedicalHistoryData>): Promise<{ success: boolean; history?: any; error?: string }> {
    try {
      const res = await fetch('/api/patients/me/medical-history', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save medical history' };
    }
  },

  // ==================== PRE-VISIT ASSESSMENTS ====================

  async getAssessments(): Promise<any[]> {
    try {
      const res = await fetch('/api/assessments', {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getAssessmentById(id: string): Promise<any | null> {
    try {
      const res = await fetch(`/api/assessments/${id}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async saveAssessment(assessment: any): Promise<{ success: boolean; assessment?: any; error?: string }> {
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(assessment)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save assessment' };
    }
  },

  async updateAssessment(id: string, update: any): Promise<{ success: boolean; assessment?: any; error?: string }> {
    try {
      const res = await fetch(`/api/assessments/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(update)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update assessment' };
    }
  },

  // ==================== MEDICAL REPORTS ====================

  async getReports(patientId?: string): Promise<any[]> {
    try {
      const url = patientId ? `/api/reports?patientId=${encodeURIComponent(patientId)}` : '/api/reports';
      const res = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async getReportById(id: string): Promise<any | null> {
    try {
      const res = await fetch(`/api/reports/${id}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async saveReport(reportData: any): Promise<{ success: boolean; report?: any; error?: string }> {
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(reportData)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save report' };
    }
  },

  // ==================== CONSULTATIONS & PRESCRIPTIONS ====================

  async getConsultations(patientId?: string): Promise<any[]> {
    try {
      const url = patientId ? `/api/consultations?patientId=${encodeURIComponent(patientId)}` : '/api/consultations';
      const res = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async saveConsultation(data: any): Promise<{ success: boolean; consultation?: any; error?: string }> {
    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to record consultation' };
    }
  },

  async getPrescriptions(patientId?: string): Promise<any[]> {
    try {
      const url = patientId ? `/api/prescriptions?patientId=${encodeURIComponent(patientId)}` : '/api/prescriptions';
      const res = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },

  async savePrescription(data: any): Promise<{ success: boolean; prescription?: any; error?: string }> {
    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to save prescription' };
    }
  },

  async getFacilities(): Promise<any[]> {
    try {
      const res = await fetch('/api/facilities', {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.facilities || [];
    } catch {
      return [];
    }
  }
};

export interface NearbyHospitalResult {
  facilityId: string;
  name: string;
  type: string;
  ownership: string;
  specialties?: string[];
  location: {
    latitude: number;
    longitude: number;
  };
  address: {
    street?: string | null;
    city: string;
    state: string;
    pincode?: string | null;
    landmark?: string | null;
    fullAddress?: string | null;
  };
  contact: {
    phone?: string | null;
    emergencyPhone?: string | null;
    email?: string | null;
    website?: string | null;
  };
  pricing?: {
    generalOpdFee?: number | null;
    specialistConsultationFee?: number | null;
    bedChargesPerDay?: number | null;
    emergencyFee?: number | null;
    isGovernmentSubsidized?: boolean;
  };
  schemeEligibility?: {
    pmjayAyushmanBharat?: boolean | null;
    cghs?: boolean | null;
    echs?: boolean | null;
    esic?: boolean | null;
    stateBimaYojana?: string | null;
  };
  rating?: number | null;
  availableBeds?: number | null;
  isOpen24x7?: boolean | null;
  openingHoursRaw?: string | null;
  distanceKm: number;
  distanceMeters: number;
  distanceDisplay: string;
  dataSource?: string;
}

export interface NearbyHospitalsResponse {
  success: boolean;
  provider?: string;
  patientCoordinates: {
    latitude: number;
    longitude: number;
  };
  searchRadiusKm: number;
  initialRequestedRadiusKm: number;
  expandedRadius: boolean;
  count: number;
  hospitals: NearbyHospitalResult[];
  error?: string;
}

/**
 * Hospital Service Provider Abstraction
 * Decouples location discovery, geocoding, and distance formatting from the UI layer.
 */
export const hospitalService = {
  /**
   * Find nearby hospitals for given latitude & longitude within specified radius (km).
   */
  async findNearbyHospitals(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): Promise<NearbyHospitalsResponse> {
    try {
      const url = `/api/hospitals/nearby?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(
        longitude
      )}&radius=${encodeURIComponent(radiusKm)}`;

      const res = await fetch(url, {
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[HospitalFinder] HTTP error ${res.status}: ${res.statusText}`);
        }
        let errMsg = 'Unable to find nearby hospitals right now.';
        try {
          const errJson = await res.json();
          if (errJson.message || errJson.error) {
            errMsg = errJson.message || errJson.error;
          }
        } catch {}
        throw new Error(errMsg);
      }

      return await res.json();
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[HospitalFinder] findNearbyHospitals caught error:', err);
      }
      return {
        success: false,
        patientCoordinates: { latitude, longitude },
        searchRadiusKm: radiusKm,
        initialRequestedRadiusKm: radiusKm,
        expandedRadius: false,
        count: 0,
        hospitals: [],
        error: err.message || 'Unable to find nearby hospitals right now.'
      };
    }
  },

  /**
   * Geocode a manual city, area, or PIN code query.
   */
  async geocodeLocation(query: string): Promise<{
    success: boolean;
    found: boolean;
    coordinates?: { latitude: number; longitude: number; city: string; state: string };
    source?: string;
    error?: string;
  }> {
    try {
      const url = `/api/facilities/geocode?query=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        found: false,
        error: err.message || 'Geocoding service unavailable'
      };
    }
  },

  /**
   * Helper to format distance nicely according to standard:
   * < 1 km: e.g. "650 m away"
   * >= 1 km: e.g. "2.4 km away"
   */
  formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m away`;
    }
    return `${distanceKm.toFixed(1)} km away`;
  }
};

import { IClinicalSummaryRecord } from '../types/clinicalSummaryTypes';

export const clinicalSummaryApi = {
  async getPatientSummary(): Promise<{ success: boolean; record?: IClinicalSummaryRecord; error?: string }> {
    try {
      const res = await fetch('/api/clinical-summary', {
        method: 'GET',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'No clinical summary found.' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error fetching patient summary.' };
    }
  },

  async generateSummary(params: {
    patientId?: string;
    assessmentId?: string;
    caseId?: string;
    consultationId?: string;
    forceRegenerate?: boolean;
    directContext?: any;
  }): Promise<{ success: boolean; record?: IClinicalSummaryRecord; error?: string; code?: string }> {
    try {
      const res = await fetch('/api/clinical-summary/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to generate clinical summary.', code: data.code };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error generating clinical summary.' };
    }
  },

  async regenerateSummary(params?: {
    patientId?: string;
    assessmentId?: string;
    caseId?: string;
    consultationId?: string;
    directContext?: any;
  }): Promise<{ success: boolean; record?: IClinicalSummaryRecord; error?: string; code?: string }> {
    try {
      const res = await fetch('/api/clinical-summary/regenerate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(params || {})
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to regenerate clinical summary.', code: data.code };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error regenerating clinical summary.' };
    }
  },

  async getSummary(id: string): Promise<{ success: boolean; record?: IClinicalSummaryRecord; error?: string }> {
    try {
      const res = await fetch(`/api/clinical-summary/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to fetch clinical summary.' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error fetching clinical summary.' };
    }
  },

  async reviewSummary(
    id: string,
    reviewData: {
      doctorNotes?: string;
      doctorEditedSummary?: any;
      doctorDecision?: string;
      doctorName?: string;
    }
  ): Promise<{ success: boolean; record?: IClinicalSummaryRecord; error?: string }> {
    try {
      const res = await fetch(`/api/clinical-summary/${encodeURIComponent(id)}/review`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(reviewData)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update review.' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error updating review.' };
    }
  },

  async confirmSummary(
    id: string,
    confirmData: {
      doctorNotes?: string;
      doctorDecision?: string;
      doctorName?: string;
      finalSummary?: any;
    }
  ): Promise<{ success: boolean; record?: IClinicalSummaryRecord; error?: string }> {
    try {
      const res = await fetch(`/api/clinical-summary/${encodeURIComponent(id)}/confirm`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(confirmData)
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to confirm clinical summary.' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error confirming clinical summary.' };
    }
  }
};

export const orchestrationApi = {
  async processStep(data: {
    rawText: string;
    modality?: 'VOICE' | 'TYPED' | 'TOUCH_CHIP';
    step?: any;
    selectedOptionIds?: string[];
    sessionId?: string;
    mode?: string;
    language?: 'en' | 'hi' | 'ta';
  }): Promise<{
    success: boolean;
    sessionId?: string;
    context?: any;
    suggestedQuestions?: any[];
    isEmergency?: boolean;
    safetyStatus?: string;
    activeRedFlags?: any[];
    activityLogs?: any[];
    error?: string;
    fallbackAvailable?: boolean;
  }> {
    try {
      const res = await fetch('/api/orchestration/step', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || `HTTP ${res.status}`, fallbackAvailable: resData.fallbackAvailable };
      }
      return resData;
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error executing orchestration step', fallbackAvailable: true };
    }
  },

  async getSession(sessionId: string): Promise<{ success: boolean; context?: any; activityLogs?: any[]; error?: string }> {
    try {
      const res = await fetch(`/api/orchestration/session/${encodeURIComponent(sessionId)}`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to fetch session' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error fetching session' };
    }
  },

  async finalizeSession(sessionId: string): Promise<{ success: boolean; summaryDraft?: any; context?: any; error?: string }> {
    try {
      const res = await fetch('/api/orchestration/finalize', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to finalize session' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error finalizing session' };
    }
  },

  async getStatus(): Promise<{ success: boolean; status?: any; error?: string }> {
    try {
      const res = await fetch('/api/orchestration/status', {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to get orchestration status' };
    }
  }
};

export { medicalDocumentApi } from './medicalDocumentApi';




