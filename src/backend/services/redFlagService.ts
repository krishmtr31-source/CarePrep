import { GoogleGenAI } from '@google/genai';
import { getGeminiModelName, getGeminiApiKey, isGeminiMockMode } from '../config/geminiConfig';
import { classifyGeminiError, generateMockRedFlagResponse } from '../utils/geminiErrorHandler';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EMERGENCY';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RedFlagDetectedItem {
  symptom: string;
  reason: string;
}

export interface RedFlagAnalysisResult {
  riskLevel: RiskLevel;
  redFlagsDetected: RedFlagDetectedItem[];
  recommendedAction: string;
  patientMessage: string;
  confidence: ConfidenceLevel;
  timestamp?: string;
  model?: string;
}

export interface RedFlagIntakeRequest {
  patient?: {
    age?: number | string;
    gender?: string;
  };
  symptoms?: {
    primarySymptom?: string;
    duration?: string;
    description?: string;
    painSeverity?: number | string;
  };
  medicalHistory?: string[];
  medications?: any[];
  allergies?: string[];
}

export class ServerRedFlagService {
  private aiClient: GoogleGenAI | null = null;
  private modelName: string;
  private apiKey?: string;

  constructor() {
    this.apiKey = getGeminiApiKey();
    this.modelName = getGeminiModelName();

    if (this.apiKey) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: this.apiKey });
      } catch (err) {
        console.warn('[CarePrep RedFlagService] Client initialization warning:', err);
      }
    }
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.aiClient);
  }

  public getModelName(): string {
    return this.modelName;
  }

  /**
   * Analyzes clinical intake responses for emergency or high-risk red-flag symptoms.
   * Explicitly avoids disease diagnosis, prescribing, or specific treatment recommendations.
   */
  public async analyzeIntake(data: RedFlagIntakeRequest): Promise<RedFlagAnalysisResult> {
    const primarySymptom = (data.symptoms?.primarySymptom || '').trim();
    const description = (data.symptoms?.description || '').trim();
    const duration = (data.symptoms?.duration || '').trim();
    const painSeverity = data.symptoms?.painSeverity !== undefined ? Number(data.symptoms.painSeverity) : 5;

    // Development/Test Mode: if GEMINI_MOCK_MODE=true is explicitly set
    if (isGeminiMockMode()) {
      return generateMockRedFlagResponse(data);
    }

    // Edge Case: Completely empty symptom report should immediately return LOW risk without calling Gemini
    if (!primarySymptom && !description) {
      return {
        riskLevel: 'LOW',
        redFlagsDetected: [],
        recommendedAction: 'Proceed with normal intake consultation.',
        patientMessage: 'No specific acute symptoms were reported.',
        confidence: 'HIGH',
        timestamp: new Date().toISOString(),
        model: this.modelName
      };
    }

    if (!this.aiClient) {
      throw new Error('Gemini API client is not initialized.');
    }

    const systemInstruction = `You are a clinical safety screening assistant for a healthcare pre-consultation platform named CarePrep.
Your sole role is to review patient intake responses and identify POTENTIAL RED-FLAG SYMPTOMS that warrant prompt or emergency medical attention.

IMPORTANT CONSTRAINTS (MANDATORY):
1. You are NOT diagnosing the patient. Never state or imply that the patient has a specific disease or medical condition.
2. You are screening for clinical urgency only.
3. Recommend appropriate urgency and triage actions (e.g. "Seek emergency medical evaluation immediately" or "Discuss this with your doctor during your visit").
4. Never prescribe drugs or tell the patient what treatment to take.

RISK LEVEL DEFINITIONS:
1. "EMERGENCY":
   - Severe/crushing chest pain, chest pain with difficulty breathing or radiation to left arm/jaw.
   - Severe respiratory distress (cannot breathe, gasping, choking, stridor).
   - Acute stroke/neurological signs (sudden inability to move an arm/leg, facial droop, sudden loss of speech/slurred speech/confusion).
   - Severe allergic reaction / anaphylaxis (throat swelling, tongue swelling, difficulty breathing with known allergy).
   - Loss of consciousness, fainting with chest pain, thunderclap headache.
   - Massive active bleeding or vomiting blood.
   - Acute rigid abdomen with unbearable pain.
2. "HIGH":
   - Potentially serious symptoms requiring prompt medical evaluation within 12-24 hours (e.g. severe pain >=8/10, high fever with severe lethargy, inability to keep fluids down, persistent severe migraine).
3. "MODERATE":
   - Symptoms that warrant attention during regular medical consultation but do not appear to require emergency care (e.g. chronic pain flare-up, symptoms persisting for weeks without acute distress, mild localized joint pain).
4. "LOW":
   - Ordinary symptoms without detected red flags (e.g. mild headache since yesterday, common cold for two days, minor scratch, mild fatigue).

OUTPUT FORMAT:
Return strict, raw JSON matching this schema exactly:
{
  "riskLevel": "LOW" | "MODERATE" | "HIGH" | "EMERGENCY",
  "redFlagsDetected": [
    {
      "symptom": "string",
      "reason": "string"
    }
  ],
  "recommendedAction": "string",
  "patientMessage": "string",
  "confidence": "LOW" | "MEDIUM" | "HIGH"
}`;

    const intakeSummary = [
      `Patient Age: ${data.patient?.age || 'Not specified'}`,
      `Patient Gender: ${data.patient?.gender || 'Not specified'}`,
      `Primary Symptom (Chief Complaint): ${primarySymptom || 'None reported'}`,
      `Duration: ${duration || 'Not specified'}`,
      `Pain Severity (1-10): ${isNaN(painSeverity) ? 'Not specified' : painSeverity}`,
      `Description & Notes: ${description || 'None reported'}`,
      `Past Medical History: ${Array.isArray(data.medicalHistory) && data.medicalHistory.length > 0 ? data.medicalHistory.join(', ') : 'None reported'}`,
      `Current Medications: ${Array.isArray(data.medications) && data.medications.length > 0 ? data.medications.map(m => typeof m === 'string' ? m : m.name).join(', ') : 'None reported'}`,
      `Known Allergies: ${Array.isArray(data.allergies) && data.allergies.length > 0 ? data.allergies.join(', ') : 'None reported'}`
    ].join('\n');

    const userPrompt = `Analyze the following patient intake responses for emergency and red-flag symptoms:\n\n${intakeSummary}`;

    let response: any = null;
    let lastError: any = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        response = await this.aiClient.models.generateContent({
          model: this.modelName,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        });
        if (response && response.text) {
          break;
        }
      } catch (callErr: any) {
        lastError = callErr;
        const classified = classifyGeminiError(callErr);
        console.warn(`[CarePrep RedFlagService] AI call error (attempt ${attempt}/2): [${classified.code}] ${classified.sanitizedDiagnostic}`);

        // DO NOT retry on quota limits (429), auth errors (401), or invalid arguments (400)
        if (!classified.retryable || attempt >= 2) {
          const customErr: any = new Error(classified.message);
          customErr.code = classified.code;
          customErr.status = classified.httpStatus;
          customErr.sanitizedDiagnostic = classified.sanitizedDiagnostic;
          throw customErr;
        }

        // Bounded retry only for retryable errors (503 service unavailable / network timeout)
        await new Promise(r => setTimeout(r, 1200));
        continue;
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    const responseText = response?.text?.trim() || '';
    if (!responseText) {
      throw new Error('Empty response received from Gemini model.');
    }

    // Parse and strictly validate the JSON response
    let parsed: any;
    try {
      parsed = JSON.parse(responseText);
    } catch (parseErr) {
      // In case markdown code fences were returned
      const cleaned = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const validRiskLevels: RiskLevel[] = ['LOW', 'MODERATE', 'HIGH', 'EMERGENCY'];
    const validConfidences: ConfidenceLevel[] = ['LOW', 'MEDIUM', 'HIGH'];

    const riskLevel: RiskLevel = validRiskLevels.includes(parsed.riskLevel)
      ? parsed.riskLevel
      : 'LOW';

    const confidence: ConfidenceLevel = validConfidences.includes(parsed.confidence)
      ? parsed.confidence
      : 'MEDIUM';

    const redFlagsDetected: RedFlagDetectedItem[] = Array.isArray(parsed.redFlagsDetected)
      ? parsed.redFlagsDetected.map((item: any) => ({
          symptom: typeof item?.symptom === 'string' ? item.symptom : 'Urgent symptom',
          reason: typeof item?.reason === 'string' ? item.reason : 'Clinical evaluation required.'
        }))
      : [];

    const recommendedAction = typeof parsed.recommendedAction === 'string' && parsed.recommendedAction.trim()
      ? parsed.recommendedAction.trim()
      : riskLevel === 'EMERGENCY'
        ? 'Seek emergency medical care immediately.'
        : 'Discuss your symptoms with your healthcare provider.';

    const patientMessage = typeof parsed.patientMessage === 'string' && parsed.patientMessage.trim()
      ? parsed.patientMessage.trim()
      : riskLevel === 'EMERGENCY'
        ? 'Your responses may indicate symptoms that require urgent medical attention.'
        : 'Please proceed with your intake consultation.';

    return {
      riskLevel,
      redFlagsDetected,
      recommendedAction,
      patientMessage,
      confidence,
      timestamp: new Date().toISOString(),
      model: this.modelName
    };
  }
}

export const redFlagService = new ServerRedFlagService();
