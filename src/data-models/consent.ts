export interface ConsentItem {
  id: string;
  titleKey: string;
  descKey: string;
  required: boolean;
  agreed: boolean;
}

export interface ConsentLog {
  consentId: string;
  patientId: string;
  timestamp: string;
  status: 'ACCEPTED' | 'DECLINED';
  acceptedClauses: string[];
  ipAddress?: string;
  userAgent?: string;
  language: string;
}
