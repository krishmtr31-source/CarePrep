import { llmGateway } from '../llm/LLMGateway';
import { DeterministicNLPProvider } from '../llm/providers/DeterministicNLPProvider';
import { LLMInterpretationResult, ILLMService } from './LLMServiceTypes';

export * from './LLMServiceTypes';
export { DeterministicNLPProvider };

/**
 * Pluggable LLM Service.
 * Bridges ConversationAgent and IntakeOrchestrator to the LLMGateway.
 */
export class PluggableLLMService implements ILLMService {
  public async interpretPatientResponse(
    text: string,
    language: 'en' | 'hi' | 'ta'
  ): Promise<LLMInterpretationResult> {
    const res = await llmGateway.interpretPatientUtterance(text, language);
    const data = res.interpretation;
    const isGemini = res.providerUsed === 'GEMINI';

    return {
      detectedChiefComplaint: data.complaint !== 'Not provided.' ? data.complaint : undefined,
      detectedDuration: data.duration !== 'Not provided.' ? data.duration : undefined,
      detectedSeverity: data.severity !== 'Not provided.' ? data.severity : undefined,
      detectedBodySite: data.location !== 'Not provided.' ? data.location : undefined,
      detectedAssociatedSymptoms: data.associatedSymptoms.length > 0 ? data.associatedSymptoms : undefined,
      detectedMedications: data.detectedMedications?.map(m => m.name),
      requiresVerificationNotes: data.requiresClarification ? ['Language interpretation marked as ambiguous; clinician verification suggested.'] : undefined,
      providerUsed: res.providerUsed === 'DETERMINISTIC_NLP' ? 'DETERMINISTIC_NLP' : (isGemini ? 'GEMINI' : 'EXTERNAL_LLM'),
      originalPatientUtterance: text,
      detectedMissingInformation: data.missingInformation,
      suggestedNextQuestion: data.nextQuestion,
      interpretationConfidence: data.confidence,
      providerModelName: res.auditEntry.model,
      isGeminiActive: isGemini
    };
  }

  public async classifyIntent(text: string): Promise<{ intent: string; confidence: number }> {
    const lower = text.toLowerCase();
    if (lower.includes('emergency') || lower.includes('chest pain') || lower.includes('breathing')) {
      return { intent: 'EMERGENCY_SYMPTOM', confidence: 1.0 };
    }
    if (lower.includes('pain') || lower.includes('dard') || lower.includes('vali') || lower.includes('fever')) {
      return { intent: 'DESCRIBE_SYMPTOM', confidence: 0.95 };
    }
    return { intent: 'GENERAL_STATEMENT', confidence: 0.8 };
  }
}

export const llmService = new PluggableLLMService();
