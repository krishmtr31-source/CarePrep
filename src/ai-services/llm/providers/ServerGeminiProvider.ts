import { GoogleGenAI } from '@google/genai';
import { ILLMProvider } from './ILLMProvider';
import { PatientInterpretationSchema, DocumentInterpretationSchema, LLMProviderConfig } from '../llmTypes';
import { PromptSanitizer } from '../promptSanitizer';
import { SchemaValidator } from '../schemaValidator';
import { classifyGeminiError, sanitizeLogMessage, isGeminiMockModeEnabled } from '../../../backend/utils/geminiErrorHandler';
import { medicalDocumentService } from '../../../backend/services/medicalDocumentService';

export class ServerGeminiProvider implements ILLMProvider {
  private config: LLMProviderConfig;
  private aiClient: GoogleGenAI | null = null;

  constructor(config?: Partial<LLMProviderConfig>) {
    const apiKey = config?.apiKey || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);
    const modelName = config?.modelName || (typeof process !== 'undefined' ? (process.env?.GEMINI_MODEL || 'gemini-3.6-flash') : 'gemini-3.6-flash');

    this.config = {
      providerName: 'GEMINI',
      modelName,
      apiKey,
      timeoutMs: config?.timeoutMs || 8000,
      maxTokens: config?.maxTokens || 1200,
      temperature: 0.1,
      ...config
    };

    if (this.config.apiKey) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: this.config.apiKey });
        if (process.env.NODE_ENV !== 'test') {
          console.info(`[CarePrep AI] Initialized Live Gemini Client with model: ${this.config.modelName}`);
        }
      } catch (err) {
        console.warn('[CarePrep AI] Gemini initialization warning:', err);
      }
    } else {
      if (process.env.NODE_ENV !== 'test') {
        console.info('[CarePrep AI] No Gemini API key provided. Deterministic NLP fallback is active.');
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
    if (isGeminiMockModeEnabled()) {
      return true;
    }

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
    } catch (err: any) {
      const classified = classifyGeminiError(err);
      console.warn(`[GeminiProvider] Connection test warning: [${classified.code}] ${classified.sanitizedDiagnostic}`);
      return false;
    }
  }

  public async interpretPatientUtterance(
    text: string,
    language: 'en' | 'hi' | 'ta',
    context?: string
  ): Promise<PatientInterpretationSchema> {
    if (isGeminiMockModeEnabled()) {
      return {
        complaint: text || 'Reported symptom',
        duration: 'Not provided.',
        location: 'Not provided.',
        character: 'Not provided.',
        severity: 'Not provided.',
        associatedSymptoms: [],
        aggravatingFactors: undefined,
        relievingFactors: undefined,
        missingInformation: ['duration', 'severity'],
        nextQuestion: language === 'hi' ? 'आपको यह समस्या कब से है?' : (language === 'ta' ? 'இந்த பிரச்சனை எப்போது தொடங்கியது?' : 'How long have you experienced this?'),
        uncertainty: 'CLEAR',
        requiresClarification: false,
        confidence: 0.95,
        sourceText: text || '',
        extractedAt: new Date().toISOString()
      };
    }

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
      const classified = classifyGeminiError(err);
      console.warn(`[GeminiProvider] Error during utterance interpretation: [${classified.code}] ${classified.sanitizedDiagnostic}`);
      const customErr: any = new Error(classified.message);
      customErr.code = classified.code;
      customErr.status = classified.httpStatus;
      customErr.sanitizedDiagnostic = classified.sanitizedDiagnostic;
      throw customErr;
    }
  }

  public async interpretDocument(
    rawText: string,
    fileName: string = 'document'
  ): Promise<DocumentInterpretationSchema> {
    try {
      // Delegate to canonical medicalDocumentService to maintain ONE canonical extraction pipeline
      const extraction = await medicalDocumentService.analyzeDocument({
        fileName,
        mimeType: 'text/plain',
        rawText
      });

      // Map canonical StructuredExtractionResult to DocumentInterpretationSchema
      let docType: 'PRESCRIPTION' | 'LAB_REPORT' | 'DISCHARGE_SUMMARY' | 'OTHER' = 'OTHER';
      if (extraction.documentType === 'PRESCRIPTION') docType = 'PRESCRIPTION';
      else if (extraction.documentType === 'LAB_REPORT') docType = 'LAB_REPORT';
      else if (extraction.documentType === 'DISCHARGE_SUMMARY') docType = 'DISCHARGE_SUMMARY';

      return {
        documentType: docType,
        documentDate: extraction.documentDate,
        facilityName: extraction.hospitalName,
        doctorName: extraction.doctorName,
        summaryNote: extraction.summary,
        medications: extraction.medications.map(m => ({
          name: m.name,
          originalText: m.name,
          dose: m.dosage || undefined,
          frequency: m.frequency || undefined,
          duration: m.duration || undefined,
          evidence: m.name,
          confidence: 0.95,
          requiresVerification: false
        })),
        diagnoses: extraction.diagnosesMentioned.map(d => ({
          name: d,
          originalText: d,
          evidence: d,
          confidence: 0.95
        })),
        labs: extraction.labResults.map(l => ({
          testName: l.testName,
          originalText: `${l.testName}: ${l.value} ${l.unit}`,
          value: l.value,
          unit: l.unit,
          referenceRange: l.referenceRange || undefined,
          flag: (l.flag === 'HIGH' || l.flag === 'LOW' || l.flag === 'NORMAL') ? l.flag : 'INDETERMINATE',
          evidence: `${l.testName} ${l.value}`,
          confidence: 0.95,
          requiresVerification: l.flag === 'UNCLEAR'
        })),
        confidence: 0.95,
        requiresVerification: (extraction.extractionWarnings && extraction.extractionWarnings.length > 0),
        unreliableFields: extraction.extractionWarnings || []
      };
    } catch (err: any) {
      const classified = classifyGeminiError(err);
      console.warn(`[GeminiProvider] Error during document interpretation: [${classified.code}] ${classified.sanitizedDiagnostic}`);
      const customErr: any = new Error(classified.message);
      customErr.code = classified.code;
      customErr.status = classified.httpStatus;
      customErr.sanitizedDiagnostic = classified.sanitizedDiagnostic;
      throw customErr;
    }
  }
}
