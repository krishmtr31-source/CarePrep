export interface LLMInterpretationResult {
  detectedChiefComplaint?: string;
  detectedDuration?: string;
  detectedSeverity?: string;
  detectedBodySite?: string;
  detectedAssociatedSymptoms?: string[];
  detectedMedications?: string[];
  requiresVerificationNotes?: string[];
  providerUsed: 'DETERMINISTIC_NLP' | 'EXTERNAL_LLM' | 'GEMINI';
  originalPatientUtterance?: string;
  detectedMissingInformation?: string[];
  suggestedNextQuestion?: string;
  interpretationConfidence?: number;
  providerModelName?: string;
  isGeminiActive?: boolean;
}

export interface ILLMService {
  interpretPatientResponse(text: string, language: 'en' | 'hi' | 'ta'): Promise<LLMInterpretationResult>;
  classifyIntent(text: string, context?: string): Promise<{ intent: string; confidence: number }>;
}
