import { ILLMProvider } from './ILLMProvider';
import { PatientInterpretationSchema, LLMProviderConfig } from '../llmTypes';
import { PromptSanitizer } from '../promptSanitizer';
import { SchemaValidator } from '../schemaValidator';

export class OpenAICompatibleProvider implements ILLMProvider {
  private config: LLMProviderConfig;

  constructor(config?: Partial<LLMProviderConfig>) {
    this.config = {
      providerName: 'OPENAI',
      modelName: config?.modelName || 'gpt-4o-mini',
      endpointUrl: config?.endpointUrl || 'https://api.openai.com/v1/chat/completions',
      apiKey: config?.apiKey,
      timeoutMs: config?.timeoutMs || 5000,
      maxTokens: config?.maxTokens || 400,
      temperature: 0.1,
      ...config
    };
  }

  public getProviderName(): string {
    return this.config.providerName;
  }

  public getModelName(): string {
    return this.config.modelName;
  }

  public async testConnection(): Promise<boolean> {
    if (!this.config.apiKey) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(this.config.endpointUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.modelName,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 2
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  public async interpretPatientUtterance(
    text: string,
    language: 'en' | 'hi' | 'ta',
    context?: string
  ): Promise<PatientInterpretationSchema> {
    if (!this.config.apiKey) {
      throw new Error('LLM Provider API key is not configured.');
    }

    const { sanitizedText } = PromptSanitizer.sanitizePatientInput(text);

    const systemPrompt = `You are a clinical intake language interpreter for a healthcare assistant platform.
Your ONLY role is to extract structured patient-reported symptoms into strict JSON.
CRITICAL SAFETY CONSTRAINTS:
1. NEVER diagnose, prescribe, or provide medical advice.
2. ONLY extract information directly supported by the patient's text.
3. If severity, duration, or location is unmentioned, you MUST write "Not provided.". Never guess.
4. Output strict JSON matching this schema:
{
  "complaint": string,
  "duration": string,
  "location": string,
  "character": string,
  "severity": string,
  "associatedSymptoms": string[],
  "uncertainty": "CLEAR" | "AMBIGUOUS" | "REQUIRES_VERIFICATION",
  "requiresClarification": boolean
}`;

    const userPrompt = `Language: ${language}
Context: ${context || 'Initial intake'}
Patient Utterance:
${sanitizedText}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(this.config.endpointUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.modelName,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`LLM provider returned status HTTP ${response.status}`);
      }

      const json = await response.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response payload from LLM provider.');
      }

      const validation = SchemaValidator.validateInterpretation(content, text);
      return validation.data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      throw err;
    }
  }
}
