export type UncertaintyLevel = 'CLEAR' | 'AMBIGUOUS' | 'REQUIRES_VERIFICATION';

export interface PatientInterpretationSchema {
  complaint: string;
  duration: string; // e.g. "2 days" or "Not provided."
  location: string; // e.g. "Lower abdomen" or "Not provided."
  character?: string; // e.g. "Throbbing", "Dull ache" or "Not provided."
  severity?: string; // Only if explicitly stated by patient, else "Not provided."
  associatedSymptoms: string[];
  aggravatingFactors?: string;
  relievingFactors?: string;
  detectedMedications?: Array<{
    name: string;
    dosage?: string;
    frequency?: string;
    isUncertain?: boolean;
  }>;
  uncertainty: UncertaintyLevel;
  requiresClarification: boolean;
  sourceText: string;
  extractedAt: string;
  // Enhanced Gemini fields
  originalText?: string;
  language?: string;
  missingInformation?: string[];
  nextQuestion?: string;
  confidence?: number;
}

export interface LLMProviderConfig {
  providerName: 'OPENAI' | 'GEMINI' | 'LOCAL_LLM' | 'DETERMINISTIC_FALLBACK' | 'MOCK';
  modelName: string;
  apiKey?: string;
  endpointUrl?: string;
  timeoutMs: number;
  maxTokens: number;
  temperature: number;
}

export interface LLMProviderStatus {
  isConnected: boolean;
  providerName: string;
  modelName: string;
  statusLabel: string;
  totalRequestsThisSession: number;
  maxRequestsLimit: number;
  isGeminiLive?: boolean;
  lastRequestStatus?: 'SUCCESS' | 'FALLBACK_TRIGGERED' | 'TIMEOUT' | 'SCHEMA_ERROR';
}

export interface LLMAuditEntry {
  id: string;
  provider: string;
  model: string;
  timestamp: string;
  taskType: 'PATIENT_INTERPRETATION' | 'DOCUMENT_NORMALIZATION' | 'INTENT_CLASSIFICATION';
  success: boolean;
  fallbackUsed: boolean;
  latencyMs: number;
  errorMessage?: string;
}
