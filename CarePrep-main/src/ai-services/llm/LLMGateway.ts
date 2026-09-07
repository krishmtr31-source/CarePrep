import { ILLMProvider } from './providers/ILLMProvider';
import { DeterministicNLPProvider } from './providers/DeterministicNLPProvider';
import { GeminiProxyProvider } from './providers/GeminiProxyProvider';
import { PatientInterpretationSchema, LLMProviderStatus, LLMAuditEntry } from './llmTypes';

const MAX_LLM_REQUESTS_PER_SESSION = 20;

export class LLMGateway {
  private primaryProvider: ILLMProvider;
  private fallbackProvider: ILLMProvider;
  private totalRequestsThisSession: number = 0;
  private auditHistory: LLMAuditEntry[] = [];
  private isLiveConnected: boolean = false;

  constructor(customPrimary?: ILLMProvider) {
    this.fallbackProvider = new DeterministicNLPProvider();
    // Default primary provider is GeminiProxyProvider
    this.primaryProvider = customPrimary || new GeminiProxyProvider();
  }

  public setPrimaryProvider(provider: ILLMProvider): void {
    this.primaryProvider = provider;
    this.isLiveConnected = false;
  }

  public getPrimaryProvider(): ILLMProvider {
    return this.primaryProvider;
  }

  public getFallbackProvider(): ILLMProvider {
    return this.fallbackProvider;
  }

  public async checkLiveConnection(): Promise<boolean> {
    try {
      const ok = await this.primaryProvider.testConnection();
      this.isLiveConnected = ok;
      return ok;
    } catch {
      this.isLiveConnected = false;
      return false;
    }
  }

  public getProviderStatus(): LLMProviderStatus {
    const isFallback = this.primaryProvider.getProviderName() === 'DETERMINISTIC_NLP';
    const isMock = this.primaryProvider.getProviderName() === 'MOCK_LLM_PROVIDER' || this.primaryProvider.getProviderName() === 'MOCK';
    let statusLabel = 'Deterministic Fallback Active';
    let isConnected = false;

    if (this.isLiveConnected && this.primaryProvider.getProviderName() === 'GEMINI') {
      statusLabel = `Gemini ${this.primaryProvider.getModelName()} Connected`;
      isConnected = true;
    } else if (isMock) {
      statusLabel = 'Provider Abstraction Active';
      isConnected = true;
    } else if (this.primaryProvider.getProviderName() === 'GEMINI' && !this.isLiveConnected) {
      statusLabel = 'Deterministic Fallback Active';
      isConnected = false;
    } else if (!isFallback) {
      statusLabel = 'Provider Abstraction Active';
      isConnected = true;
    }

    return {
      isConnected,
      isGeminiLive: this.isLiveConnected && this.primaryProvider.getProviderName() === 'GEMINI',
      providerName: isConnected ? this.primaryProvider.getProviderName() : this.fallbackProvider.getProviderName(),
      modelName: isConnected ? this.primaryProvider.getModelName() : this.fallbackProvider.getModelName(),
      statusLabel,
      totalRequestsThisSession: this.totalRequestsThisSession,
      maxRequestsLimit: MAX_LLM_REQUESTS_PER_SESSION,
      lastRequestStatus: this.auditHistory.length > 0 
        ? (this.auditHistory[this.auditHistory.length - 1].fallbackUsed ? 'FALLBACK_TRIGGERED' : 'SUCCESS')
        : undefined
    };
  }

  public getAuditHistory(): LLMAuditEntry[] {
    return [...this.auditHistory];
  }

  public async interpretPatientUtterance(
    text: string,
    language: 'en' | 'hi' | 'ta',
    context?: string
  ): Promise<{
    interpretation: PatientInterpretationSchema;
    providerUsed: string;
    fallbackTriggered: boolean;
    auditEntry: LLMAuditEntry;
  }> {
    const startTime = Date.now();
    let fallbackTriggered = false;
    let errorMessage: string | undefined;

    // Guard: Max request limit per session
    if (this.totalRequestsThisSession >= MAX_LLM_REQUESTS_PER_SESSION) {
      fallbackTriggered = true;
      errorMessage = 'Session request limit exceeded. Defaulting to deterministic NLP.';
      const fallbackResult = await this.fallbackProvider.interpretPatientUtterance(text, language, context);
      
      const audit: LLMAuditEntry = {
        id: `audit-${Date.now()}`,
        provider: this.fallbackProvider.getProviderName(),
        model: this.fallbackProvider.getModelName(),
        timestamp: new Date().toISOString(),
        taskType: 'PATIENT_INTERPRETATION',
        success: true,
        fallbackUsed: true,
        latencyMs: Date.now() - startTime,
        errorMessage
      };
      this.auditHistory.push(audit);

      return {
        interpretation: fallbackResult,
        providerUsed: this.fallbackProvider.getProviderName(),
        fallbackTriggered: true,
        auditEntry: audit
      };
    }

    this.totalRequestsThisSession++;

    try {
      // Attempt interpretation with primary provider
      const result = await this.primaryProvider.interpretPatientUtterance(text, language, context);
      this.isLiveConnected = true;
      
      const audit: LLMAuditEntry = {
        id: `audit-${Date.now()}`,
        provider: this.primaryProvider.getProviderName(),
        model: this.primaryProvider.getModelName(),
        timestamp: new Date().toISOString(),
        taskType: 'PATIENT_INTERPRETATION',
        success: true,
        fallbackUsed: this.primaryProvider.getProviderName() === 'DETERMINISTIC_NLP',
        latencyMs: Date.now() - startTime
      };
      this.auditHistory.push(audit);

      return {
        interpretation: result,
        providerUsed: this.primaryProvider.getProviderName(),
        fallbackTriggered: false,
        auditEntry: audit
      };
    } catch (err: any) {
      // Graceful fallback to deterministic NLP on ANY failure (timeout, network, malformed JSON, rate-limit)
      fallbackTriggered = true;
      errorMessage = err.message || 'Unknown LLM provider error';
      
      const fallbackResult = await this.fallbackProvider.interpretPatientUtterance(text, language, context);

      const audit: LLMAuditEntry = {
        id: `audit-${Date.now()}`,
        provider: this.fallbackProvider.getProviderName(),
        model: this.fallbackProvider.getModelName(),
        timestamp: new Date().toISOString(),
        taskType: 'PATIENT_INTERPRETATION',
        success: true,
        fallbackUsed: true,
        latencyMs: Date.now() - startTime,
        errorMessage
      };
      this.auditHistory.push(audit);

      return {
        interpretation: fallbackResult,
        providerUsed: this.fallbackProvider.getProviderName(),
        fallbackTriggered: true,
        auditEntry: audit
      };
    }
  }
}

export const llmGateway = new LLMGateway();
