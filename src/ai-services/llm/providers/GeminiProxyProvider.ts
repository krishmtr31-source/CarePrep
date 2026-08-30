import { ILLMProvider } from './ILLMProvider';
import { PatientInterpretationSchema } from '../llmTypes';
import { SchemaValidator } from '../schemaValidator';
import { ServerGeminiProvider } from './ServerGeminiProvider';

export class GeminiProxyProvider implements ILLMProvider {
  private apiEndpoint: string;
  private modelName: string;
  private serverProvider: ServerGeminiProvider | null = null;
  private lastHealthCheckStatus: boolean | null = null;

  constructor(options?: { apiEndpoint?: string; modelName?: string }) {
    this.apiEndpoint = options?.apiEndpoint || '/api/ai/interpret';
    this.modelName = options?.modelName || 'gemini-2.5-flash';

    // In server/Node environment (or tests), initialize local server provider if process.env is present
    if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
      this.serverProvider = new ServerGeminiProvider({
        apiKey: process.env.GEMINI_API_KEY,
        modelName: process.env.GEMINI_MODEL || this.modelName
      });
    }
  }

  public getProviderName(): string {
    return 'GEMINI';
  }

  public getModelName(): string {
    return this.modelName;
  }

  public async testConnection(): Promise<boolean> {
    // 1. Direct Node environment test if ServerGeminiProvider exists
    if (this.serverProvider && this.serverProvider.isConfigured()) {
      const liveOk = await this.serverProvider.testConnection();
      this.lastHealthCheckStatus = liveOk;
      return liveOk;
    }

    // 2. Browser / HTTP environment test
    if (typeof window !== 'undefined') {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const res = await fetch('/api/ai/health', {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          this.lastHealthCheckStatus = Boolean(data.isConnected);
          if (data.modelName) {
            this.modelName = data.modelName;
          }
          return Boolean(data.isConnected);
        }
      } catch {
        this.lastHealthCheckStatus = false;
        return false;
      }
    }

    return false;
  }

  public async interpretPatientUtterance(
    text: string,
    language: 'en' | 'hi' | 'ta',
    context?: string
  ): Promise<PatientInterpretationSchema> {
    // 1. If running in Node environment with direct Server provider
    if (this.serverProvider && this.serverProvider.isConfigured()) {
      return this.serverProvider.interpretPatientUtterance(text, language, context);
    }

    // 2. If running in browser, call secure backend API proxy
    if (typeof window !== 'undefined') {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text,
            language,
            context
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(errBody.error || `Gemini backend proxy returned HTTP ${response.status}`);
        }

        const resData = await response.json();
        const validated = SchemaValidator.validateInterpretation(resData.data, text, language);
        return validated.data;
      } catch (err: any) {
        clearTimeout(timeoutId);
        throw new Error(err.message || 'Failed to communicate with Gemini AI service');
      }
    }

    throw new Error('No Gemini backend endpoint or local API key available');
  }
}
