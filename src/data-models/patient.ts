export interface PatientIdentity {
  id: string;
  abhaId?: string;
  fullName: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  phoneNumber: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  city?: string;
  preferredLanguage: 'en' | 'hi' | 'ta';
  createdAt: string;
}

export interface ConsentRecord {
  patientId: string;
  hasConsented: boolean;
  timestamp: string;
  scope: {
    symptomCollection: boolean;
    aiHistoryDrafting: boolean;
    physicianReviewOnly: boolean;
    anonymousQualityAudit: boolean;
  };
  disclaimerAcknowledged: boolean;
  version: string;
}
