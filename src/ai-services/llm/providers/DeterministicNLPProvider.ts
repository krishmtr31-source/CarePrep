import { ILLMProvider } from './ILLMProvider';
import { PatientInterpretationSchema } from '../llmTypes';
import { conversationService } from '../../conversation/ConversationService';

/**
 * Deterministic NLP Provider.
 * Offline-capable, rule-based clinical parameter extractor using regex,
 * dictionary lookups, and keyword mappings.
 * 
 * Safety: Deterministic, offline capable; no generative LLM currently active.
 */
export class DeterministicNLPProvider implements ILLMProvider {
  public getProviderName(): string {
    return 'DETERMINISTIC_NLP';
  }

  public getModelName(): string {
    return 'rule-based-v1.0';
  }

  public async testConnection(): Promise<boolean> {
    return true; // Always connected locally
  }

  public async interpretPatientUtterance(
    text: string,
    language: 'en' | 'hi' | 'ta'
  ): Promise<PatientInterpretationSchema> {
    const parsed = conversationService.parsePatientUtterance(text, language);

    const isAmbiguous = Boolean(
      parsed.requiresVerificationNotes && parsed.requiresVerificationNotes.length > 0
    );

    const medications = (parsed.detectedMedications || []).map(med => ({
      name: med,
      isUncertain: false
    }));

    return {
      complaint: parsed.detectedChiefComplaint || 'Not provided.',
      duration: parsed.detectedDuration || 'Not provided.',
      location: parsed.detectedBodySite || 'Not provided.',
      character: 'Not provided.',
      severity: parsed.detectedSeverity || 'Not provided.',
      associatedSymptoms: parsed.detectedAssociatedSymptoms || [],
      detectedMedications: medications,
      uncertainty: isAmbiguous ? 'AMBIGUOUS' : 'CLEAR',
      requiresClarification: isAmbiguous,
      sourceText: text,
      extractedAt: new Date().toISOString()
    };
  }

  public async interpretPatientResponse(
    text: string,
    language: 'en' | 'hi' | 'ta'
  ): Promise<any> {
    const res = await this.interpretPatientUtterance(text, language);
    return {
      detectedChiefComplaint: res.complaint !== 'Not provided.' ? res.complaint : undefined,
      detectedDuration: res.duration !== 'Not provided.' ? res.duration : undefined,
      detectedSeverity: res.severity !== 'Not provided.' ? res.severity : undefined,
      detectedBodySite: res.location !== 'Not provided.' ? res.location : undefined,
      detectedAssociatedSymptoms: res.associatedSymptoms.length > 0 ? res.associatedSymptoms : undefined,
      detectedMedications: res.detectedMedications?.map(m => m.name),
      requiresVerificationNotes: res.requiresClarification ? ['Language interpretation marked as ambiguous; clinician verification suggested.'] : undefined,
      providerUsed: 'DETERMINISTIC_NLP'
    };
  }
}
