import { GoogleGenAI } from '@google/genai';
import { ILLMProvider } from './ILLMProvider';
import { PatientInterpretationSchema, LLMProviderConfig } from '../llmTypes';
import { PromptSanitizer } from '../promptSanitizer';
import { SchemaValidator } from '../schemaValidator';

export class ServerGeminiProvider implements ILLMProvider {
  private config: LLMProviderConfig;
  private aiClient: GoogleGenAI | null = null;

  constructor(config?: Partial<LLMProviderConfig>) {
    const apiKey = config?.apiKey || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);
    const modelName = config?.modelName || (typeof process !== 'undefined' ? process.env?.GEMINI_MODEL : undefined) || 'gemini-2.5-flash';

    this.config = {
      providerName: 'GEMINI',
      modelName,
      apiKey,
      timeoutMs: config?.timeoutMs || 8000,
      maxTokens: config?.maxTokens || 600,
      temperature: 0.1,
      ...config
    };

    if (this.config.apiKey) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: this.config.apiKey });
      } catch (err) {
        console.warn('[GeminiProvider] Initialization warning:', err);
      }
    }
  }

  public getProviderName(): string {
    return 'GEMINI';
  }

  public getModelName(): string {
    return this.config.modelName;
  }

  public isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.aiClient);
  }

  public async testConnection(): Promise<boolean> {
    if (!this.isConfigured() || !this.aiClient) {
      return false;
    }

    try {
      const response = await this.aiClient.models.generateContent({
        model: this.config.modelName,
        contents: 'Respond with JSON {"status": "ok"}',
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      return Boolean(response && response.text);
    } catch (err) {
      console.warn('[GeminiProvider] Connection test failed:', err);
      return false;
    }
  }

  public async interpretPatientUtterance(
    text: string,
    language: 'en' | 'hi' | 'ta',
    context?: string
  ): Promise<PatientInterpretationSchema> {
    if (!this.isConfigured() || !this.aiClient) {
      throw new Error('Gemini API key is not configured on server.');
    }

    const { sanitizedText } = PromptSanitizer.sanitizePatientInput(text);

    const systemInstruction = `You are a clinical intake assistant AI for a healthcare platform (CarePrep).
Your task is to understand patient natural language (English, Hindi, Tamil, Hinglish) and extract structured symptoms.

CRITICAL SAFETY & MEDICAL RULES:
1. NEVER diagnose, prescribe, or provide medical advice.
2. NEVER tell the patient they are safe or recommend dismissing symptoms.
3. Extract ONLY information directly supported by the patient's statement.
4. If a field (duration, location, severity, character) is unmentioned, write "Not provided.". NEVER guess.
5. Identify missing SOCRATES information (Site, Onset/Duration, Character, Radiation, Associated symptoms, Timing, Exacerbating/Relieving factors, Severity).
6. Suggest the next single most appropriate clinical intake question in the patient's language (${language}).
7. Output strict JSON matching the requested schema.`;

    const userPrompt = `Patient Language: ${language}
Conversation Context: ${context || 'Chief complaint intake'}
Patient Utterance:
"${sanitizedText}"

Extract structured JSON with fields:
{
  "complaint": "Extracted chief complaint or main symptom",
  "duration": "Duration if stated, otherwise 'Not provided.'",
  "location": "Anatomical location if stated, otherwise 'Not provided.'",
  "character": "Quality/character of symptom if stated, otherwise 'Not provided.'",
  "severity": "Severity only if explicitly stated by patient, otherwise 'Not provided.'",
  "associatedSymptoms": ["List of other symptoms mentioned"],
  "aggravatingFactors": "Any aggravating factor stated or null",
  "relievingFactors": "Any relieving factor stated or null",
  "missingInformation": ["List of missing SOCRATES attributes"],
  "nextQuestion": "Next respectful clinical question to ask patient in ${language}",
  "uncertainty": "CLEAR" or "AMBIGUOUS" or "REQUIRES_VERIFICATION",
  "requiresClarification": boolean,
  "confidence": number between 0.0 and 1.0
}`;

    try {
      const response = await this.aiClient.models.generateContent({
        model: this.config.modelName,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: this.config.temperature
        }
      });

      const rawJsonText = response.text || '{}';
      const validation = SchemaValidator.validateInterpretation(rawJsonText, sanitizedText, language);

      return validation.data;
    } catch (err: any) {
      console.warn('[GeminiProvider] Error during utterance interpretation:', err.message);
      throw err;
    }
  }
}
