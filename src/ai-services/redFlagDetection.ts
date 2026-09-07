/**
 * AI-Assisted Clinical Red-Flag Detection Service
 * Phase 2 — Triage and Red-Flag Identification
 * 
 * IMPORTANT:
 * - This service communicates strictly with the CarePrep backend API (/api/ai/red-flags).
 * - NEVER accesses or exposes secret GEMINI_API_KEY on the client.
 * - NEVER sends patient GPS coordinates to AI.
 * - Strictly screening for urgency; NEVER provides disease diagnosis or treatment prescriptions.
 */

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'EMERGENCY' | 'UNAVAILABLE';
export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RedFlagDetectedItem {
  symptom: string;
  reason: string;
}

export interface RedFlagIntakePayload {
  patient?: {
    age?: number | string;
    gender?: string;
  };
  symptoms: {
    primarySymptom: string;
    duration?: string;
    description?: string;
    painSeverity?: number | string;
  };
  medicalHistory?: string[];
  medications?: Array<{ name: string; dosage?: string; frequency?: string } | string>;
  allergies?: string[];
}

export interface RedFlagAnalysisResult {
  isAvailable: boolean;
  riskLevel: RiskLevel;
  redFlagsDetected: RedFlagDetectedItem[];
  recommendedAction: string;
  patientMessage: string;
  confidence: ConfidenceLevel;
  timestamp: string;
  model?: string;
  fallbackNotice?: string;
  isMock?: boolean;
}

// In-memory cache to prevent duplicate Gemini API requests when patient answers haven't changed
const resultCache = new Map<string, RedFlagAnalysisResult>();

/**
 * Computes a simple deterministic signature for the intake payload
 */
function createPayloadHash(payload: RedFlagIntakePayload): string {
  const parts = [
    String(payload.patient?.age || ''),
    String(payload.patient?.gender || ''),
    (payload.symptoms.primarySymptom || '').trim().toLowerCase(),
    (payload.symptoms.duration || '').trim().toLowerCase(),
    (payload.symptoms.description || '').trim().toLowerCase(),
    String(payload.symptoms.painSeverity || ''),
    (payload.medicalHistory || []).join('|').toLowerCase(),
    (payload.medications || []).map(m => typeof m === 'string' ? m : m.name).join('|').toLowerCase(),
    (payload.allergies || []).join('|').toLowerCase()
  ];
  return parts.join(':::');
}

/**
 * Detects potential red-flag symptoms by querying the server-side Gemini screening endpoint.
 * Gracefully falls back if Gemini or network is unavailable without blocking intake.
 */
export async function detectRedFlags(payload: RedFlagIntakePayload): Promise<RedFlagAnalysisResult> {
  const primarySymptom = (payload.symptoms?.primarySymptom || '').trim();
  const description = (payload.symptoms?.description || '').trim();

  // 1. Fast path for empty symptoms
  if (!primarySymptom && !description) {
    return {
      isAvailable: true,
      riskLevel: 'LOW',
      redFlagsDetected: [],
      recommendedAction: 'Proceed with normal intake consultation.',
      patientMessage: 'No urgent red flags reported. Please continue with your intake.',
      confidence: 'HIGH',
      timestamp: new Date().toISOString(),
      model: 'deterministic-empty'
    };
  }

  // 2. Cache check to protect API and avoid duplicate calls
  const payloadHash = createPayloadHash(payload);
  const cached = resultCache.get(payloadHash);
  if (cached) {
    return cached;
  }

  // 3. Dispatch to backend API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500); // 9.5s timeout guard

    const response = await fetch('/api/ai/red-flags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patient: {
          age: payload.patient?.age,
          gender: payload.patient?.gender
        },
        symptoms: {
          primarySymptom: payload.symptoms.primarySymptom,
          duration: payload.symptoms.duration,
          description: payload.symptoms.description,
          painSeverity: payload.symptoms.painSeverity
        },
        medicalHistory: payload.medicalHistory || [],
        medications: (payload.medications || []).map(m => typeof m === 'string' ? { name: m } : m),
        allergies: payload.allergies || []
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return createFallbackResult(errorData.error);
    }

    const data = await response.json();
    if (!data.success || !data.analysis) {
      return createFallbackResult(data.error);
    }

    const analysis = data.analysis;
    const result: RedFlagAnalysisResult = {
      isAvailable: true,
      riskLevel: analysis.riskLevel || 'LOW',
      redFlagsDetected: Array.isArray(analysis.redFlagsDetected) ? analysis.redFlagsDetected : [],
      recommendedAction: analysis.recommendedAction || 'Proceed with your healthcare consultation.',
      patientMessage: analysis.patientMessage || 'Please review your responses before continuing.',
      confidence: analysis.confidence || 'HIGH',
      timestamp: analysis.timestamp || new Date().toISOString(),
      model: analysis.model || 'gemini-3.6-flash',
      isMock: analysis.isMock
    };

    // Cache result
    resultCache.set(payloadHash, result);
    return result;
  } catch (err: any) {
    console.warn('[CarePrep AI] Red-flag analysis network/server fallback:', err?.message || err);
    return createFallbackResult();
  }
}

/**
 * Creates safe, non-blocking fallback response when AI service is unavailable.
 * Clinical Safety Rule: An AI failure is NEVER interpreted as "no red flags" (LOW risk).
 */
function createFallbackResult(customMessage?: string): RedFlagAnalysisResult {
  const fallbackMessage = customMessage ||
    'AI symptom screening is temporarily unavailable. You can continue your intake and your responses will still be available for your healthcare provider.';

  return {
    isAvailable: false,
    riskLevel: 'UNAVAILABLE',
    redFlagsDetected: [],
    recommendedAction: 'Continue with normal intake consultation. Your healthcare provider will perform complete clinical triage.',
    patientMessage: fallbackMessage,
    confidence: 'LOW',
    timestamp: new Date().toISOString(),
    fallbackNotice: fallbackMessage
  };
}

/**
 * Clear cache if needed (e.g. after full submission)
 */
export function clearRedFlagCache(): void {
  resultCache.clear();
}
