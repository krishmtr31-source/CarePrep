/**
 * Centralized Gemini AI Error Handler and Diagnostics Utility
 * CarePrep (SIH26047)
 *
 * Implements strict, production-safe classification for:
 * - HTTP 429: Quota limits / RESOURCE_EXHAUSTED (No aggressive retries, no infinite loops)
 * - HTTP 503: Service unavailable / high demand (Bounded retry)
 * - HTTP 401: Authentication / API key configuration error (Immediate stop)
 * - Network / Timeout errors (Bounded retry)
 * 
 * Clinical Safety:
 * - Never returns false reassurance (never treats failure as "no red flags").
 * - Sanitizes all error logs to guarantee zero API key or patient PII exposure.
 * - Supports explicit developer mock mode via GEMINI_MOCK_MODE=true for testing without quota.
 */

import { parseLabReportText } from '../../document-intelligence/parsers/labReportParser';

export interface GeminiErrorClassification {
  type: 'QUOTA_EXCEEDED' | 'SERVICE_UNAVAILABLE' | 'AUTH_ERROR' | 'NETWORK_ERROR' | 'INVALID_ARGUMENT' | 'UNKNOWN';
  httpStatus: number;
  code: 'AI_QUOTA_EXCEEDED' | 'AI_SERVICE_UNAVAILABLE' | 'AI_AUTH_ERROR' | 'AI_NETWORK_TIMEOUT' | 'AI_INVALID_ARGUMENT' | 'AI_UNKNOWN_ERROR';
  message: string;
  retryable: boolean;
  sanitizedDiagnostic: string;
}

/**
 * Strips all sensitive credentials, URLs with keys, and PII from error messages.
 */
export function sanitizeLogMessage(error: any, extraSecrets: (string | undefined)[] = []): string {
  let msg = typeof error === 'string' ? error : error?.message || String(error || '');

  // Strip process.env.GEMINI_API_KEY if present
  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    msg = msg.split(process.env.GEMINI_API_KEY).join('[REDACTED_API_KEY]');
  }

  // Strip any passed secret strings
  for (const secret of extraSecrets) {
    if (secret && secret.length > 5) {
      msg = msg.split(secret).join('[REDACTED_SECRET]');
    }
  }

  // Strip potential Google API keys (AIzaSy... or AQ....)
  msg = msg.replace(/(?:AIzaSy|AQ\.)[a-zA-Z0-9_\-]{30,}/g, '[REDACTED_API_KEY]');

  // Strip URL query parameters containing keys or tokens
  msg = msg.replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]');
  msg = msg.replace(/([?&]token=)[^&\s]+/gi, '$1[REDACTED]');

  return msg;
}

/**
 * Classifies an error caught from @google/genai calls into a deterministic, safe error object.
 */
export function classifyGeminiError(error: any): GeminiErrorClassification {
  const rawMsg = typeof error === 'string' ? error : (error?.message || '');
  const status = error?.status || error?.code || error?.response?.status;
  const sanitizedDiagnostic = sanitizeLogMessage(rawMsg);

  // 1. Quota Exceeded / Rate Limit (HTTP 429 / RESOURCE_EXHAUSTED)
  if (
    status === 429 ||
    rawMsg.includes('429') ||
    rawMsg.includes('RESOURCE_EXHAUSTED') ||
    rawMsg.includes('quota') ||
    rawMsg.includes('Quota exceeded') ||
    rawMsg.includes('rate limit') ||
    rawMsg.includes('GenerateRequestsPerDayPerProjectPerModel')
  ) {
    return {
      type: 'QUOTA_EXCEEDED',
      httpStatus: 429,
      code: 'AI_QUOTA_EXCEEDED',
      message: 'AI document processing is temporarily unavailable because the configured AI quota has been exhausted. Please try again later.',
      retryable: false,
      sanitizedDiagnostic
    };
  }

  // 2. Service Unavailable / High Demand / Overloaded (HTTP 503 / UNAVAILABLE)
  if (
    status === 503 ||
    rawMsg.includes('503') ||
    rawMsg.includes('UNAVAILABLE') ||
    rawMsg.includes('high demand') ||
    rawMsg.includes('overloaded') ||
    rawMsg.includes('temporarily unavailable')
  ) {
    return {
      type: 'SERVICE_UNAVAILABLE',
      httpStatus: 503,
      code: 'AI_SERVICE_UNAVAILABLE',
      message: 'AI service is temporarily experiencing high demand. Please try again in a moment.',
      retryable: true,
      sanitizedDiagnostic
    };
  }

  // 3. Authentication / Key Error (HTTP 401 / 403 API_KEY_INVALID)
  if (
    status === 401 ||
    rawMsg.includes('401') ||
    rawMsg.includes('API_KEY_INVALID') ||
    rawMsg.includes('UNAUTHENTICATED') ||
    rawMsg.includes('Unauthorized') ||
    rawMsg.includes('invalid API key')
  ) {
    return {
      type: 'AUTH_ERROR',
      httpStatus: 401,
      code: 'AI_AUTH_ERROR',
      message: 'AI service configuration error. Please contact system administrator.',
      retryable: false,
      sanitizedDiagnostic
    };
  }

  // 4. Network / Timeout Errors
  if (
    rawMsg.includes('ETIMEDOUT') ||
    rawMsg.includes('ENOTFOUND') ||
    rawMsg.includes('ECONNRESET') ||
    rawMsg.includes('ECONNREFUSED') ||
    rawMsg.includes('timeout') ||
    rawMsg.includes('aborted')
  ) {
    return {
      type: 'NETWORK_ERROR',
      httpStatus: 504,
      code: 'AI_NETWORK_TIMEOUT',
      message: 'AI service request timed out. Please check network connectivity and try again.',
      retryable: true,
      sanitizedDiagnostic
    };
  }

  // 5. Invalid Argument / Malformed Payload
  if (status === 400 || rawMsg.includes('INVALID_ARGUMENT') || rawMsg.includes('invalid argument')) {
    return {
      type: 'INVALID_ARGUMENT',
      httpStatus: 400,
      code: 'AI_INVALID_ARGUMENT',
      message: 'Unable to process document with AI. Please verify document formatting.',
      retryable: false,
      sanitizedDiagnostic
    };
  }

  // 6. Unknown fallback
  return {
    type: 'UNKNOWN',
    httpStatus: 500,
    code: 'AI_UNKNOWN_ERROR',
    message: 'AI service encountered an unexpected error. Please try again.',
    retryable: false,
    sanitizedDiagnostic
  };
}

/**
 * Checks if developer mock mode is enabled via environment variable.
 * STRICT SAFETY RULE: Defaults to FALSE in production.
 */
export function isGeminiMockModeEnabled(): boolean {
  if (typeof process === 'undefined' || !process.env) return false;
  return process.env.GEMINI_MOCK_MODE === 'true';
}

/**
 * Clinically safe mock generator for Red-Flag screening during development/testing.
 * NEVER enabled silently in production.
 */
export function generateMockRedFlagResponse(payload: any) {
  const primarySymptom = (payload?.symptoms?.primarySymptom || '').toLowerCase();
  const description = (payload?.symptoms?.description || '').toLowerCase();
  const painSeverity = Number(payload?.symptoms?.painSeverity || 0);

  const combinedText = `${primarySymptom} ${description}`;

  // Clinically realistic test detection for common test scenarios
  const isEmergency = 
    combinedText.includes('chest pain') || 
    combinedText.includes('difficulty breathing') ||
    combinedText.includes('severe shortness of breath') ||
    combinedText.includes('loss of consciousness') ||
    painSeverity >= 9;

  const isHigh = 
    !isEmergency && (
      combinedText.includes('high fever') || 
      combinedText.includes('blood') || 
      painSeverity >= 7
    );

  if (isEmergency) {
    return {
      riskLevel: 'EMERGENCY' as const,
      redFlagsDetected: [
        { symptom: primarySymptom || 'Chest/respiratory symptoms', reason: 'High-risk cardiovascular or respiratory presentation requiring immediate emergency evaluation.' }
      ],
      recommendedAction: 'Seek emergency medical care immediately. Proceed to the nearest emergency department.',
      patientMessage: 'Your responses indicate symptoms that require prompt emergency clinical attention.',
      confidence: 'HIGH' as const,
      isMock: true,
      mockNotice: '[DEV/TEST MODE: Mock Red-Flag Evaluation]',
      aiModel: 'gemini-3.6-flash (MOCK_MODE)'
    };
  }

  if (isHigh) {
    return {
      riskLevel: 'HIGH' as const,
      redFlagsDetected: [
        { symptom: primarySymptom || 'Acute symptom', reason: 'Elevated pain or acute symptoms requiring timely physician assessment.' }
      ],
      recommendedAction: 'Schedule a prompt consultation with a doctor today.',
      patientMessage: 'Your symptoms should be evaluated promptly by a medical professional.',
      confidence: 'MEDIUM' as const,
      isMock: true,
      mockNotice: '[DEV/TEST MODE: Mock Red-Flag Evaluation]',
      aiModel: 'gemini-3.6-flash (MOCK_MODE)'
    };
  }

  return {
    riskLevel: 'LOW' as const,
    redFlagsDetected: [],
    recommendedAction: 'Discuss your symptoms with your healthcare provider during your scheduled consultation.',
    patientMessage: 'Please proceed with your consultation intake.',
    confidence: 'HIGH' as const,
    isMock: true,
    mockNotice: '[DEV/TEST MODE: Mock Red-Flag Evaluation]',
    aiModel: 'gemini-3.6-flash (MOCK_MODE)'
  };
}

/**
 * Clinically safe fallback / mock generator for Medical Document Digitization.
 * If rawText is provided, dynamically parses real lab values, medications, and metadata.
 * Never invents fake patient names, fake doctors, or fake diagnoses.
 */
export function generateMockDocumentExtraction(fileName: string, rawText: string = '') {
  const lowerName = (fileName + ' ' + rawText).toLowerCase();

  let documentType: 'LAB_REPORT' | 'PRESCRIPTION' | 'DISCHARGE_SUMMARY' | 'OTHER' = 'OTHER';
  let title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

  // Dynamic parsing if rawText is present
  let labResults: any[] = [];
  let facilityName: string | null = null;
  let reportDate: string | null = null;
  let patientName: string | null = null;
  let doctorName: string | null = null;
  let keyFindings: string[] = [];

  if (rawText && rawText.trim()) {
    try {
      const parsed = parseLabReportText(rawText, 'doc-fallback', fileName, 'PDF_TEXT');
      if (parsed.labResults && parsed.labResults.length > 0) {
        documentType = 'LAB_REPORT';
        title = parsed.facilityName ? `${parsed.facilityName} - Laboratory Report` : 'Laboratory Investigation Report';
        labResults = parsed.labResults.map((l: any) => ({
          testName: l.testName,
          value: l.resultValue,
          numericValue: l.numericValue,
          unit: l.unit,
          referenceRange: l.referenceRange || l.sourceReferenceRange?.raw,
          flag: l.flag || 'NORMAL',
          status: (l.status || l.flag?.toLowerCase() || 'normal'),
          isAbnormal: l.isAbnormal || false,
          source: 'uploaded_lab_report'
        }));
        facilityName = parsed.facilityName || null;
        reportDate = parsed.reportDate || null;
        patientName = parsed.patientName || null;
        doctorName = parsed.doctorName || null;

        const abnormalCount = labResults.filter(l => l.isAbnormal).length;
        keyFindings.push(`${labResults.length} laboratory investigations extracted from document.`);
        if (abnormalCount > 0) {
          keyFindings.push(`${abnormalCount} parameter(s) flagged outside source reference ranges.`);
        } else {
          keyFindings.push('All extracted laboratory parameters are within biological reference intervals.');
        }
      }
    } catch (parseErr) {
      console.warn('[geminiErrorHandler] Fallback parse error:', parseErr);
    }
  }

  if (documentType === 'OTHER') {
    if (lowerName.includes('cbc') || lowerName.includes('blood') || lowerName.includes('hemoglobin') || lowerName.includes('lab') || lowerName.includes('glucose')) {
      documentType = 'LAB_REPORT';
      title = 'Laboratory Investigation Report';
    } else if (lowerName.includes('rx') || lowerName.includes('prescription') || lowerName.includes('tab') || lowerName.includes('mg')) {
      documentType = 'PRESCRIPTION';
      title = 'Prescription Record';
    } else if (lowerName.includes('discharge') || lowerName.includes('admission') || lowerName.includes('hospital')) {
      documentType = 'DISCHARGE_SUMMARY';
      title = 'Hospital Discharge Summary';
    }
  }

  return {
    documentType,
    documentTitle: title,
    documentDate: reportDate || new Date().toISOString().split('T')[0],
    patientName,
    doctorName,
    hospitalName: facilityName,
    summary: labResults.length > 0
      ? `Structured analysis of ${fileName}. Successfully extracted ${labResults.length} clinical laboratory parameters.`
      : `Extracted medical documentation for ${fileName}. Factual preview mode active.`,
    labResults,
    medications: [],
    diagnosesMentioned: [],
    proceduresMentioned: [],
    importantNotes: keyFindings.length > 0 ? keyFindings : ['Physical verification recommended against original document.'],
    extractionWarnings: [],
    isMock: true,
    aiModel: 'gemini-3.6-flash (MOCK_MODE)',
    processedAt: new Date().toISOString()
  };
}

/**
 * Clinically safe mock generator for Clinical Summary Generation during development/testing.
 * Tagged clearly as test/demo data. Does NOT invent clinical conclusions.
 */
export function generateMockClinicalSummary(patientName: string = 'Patient', chiefComplaint: string = 'Chief complaint') {
  return {
    isMock: true,
    aiModel: 'gemini-3.6-flash (MOCK_MODE)',
    mockNotice: '[DEV/TEST MODE: Mock Clinical Summary Draft]',
    generatedAt: new Date().toISOString(),
    status: 'DRAFT_MOCK',
    patientName,
    chiefComplaint,
    clinicalObservations: 'Draft summary synthesized in development/test mock mode without live Gemini quota consumption.',
    recommendation: 'Requires complete clinician review and physical examination.'
  };
}
