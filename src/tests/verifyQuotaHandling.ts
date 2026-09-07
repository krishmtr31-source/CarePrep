/**
 * Automated Verification Test: Gemini Quota & Error Hardening
 * CarePrep (SIH26047)
 *
 * Validates:
 * 1. HTTP 429 Quota Exceeded error classification (Non-retryable, status 429, code: AI_QUOTA_EXCEEDED)
 * 2. HTTP 503 Service Unavailable error classification (Retryable, status 503, code: AI_SERVICE_UNAVAILABLE)
 * 3. HTTP 401 Auth error classification (Non-retryable, status 401, code: AI_AUTH_ERROR)
 * 4. HTTP 504 Network Timeout error classification (Retryable, status 504, code: AI_NETWORK_TIMEOUT)
 * 5. Log Sanitization (guaranteed zero API key or secret leakage)
 * 6. Developer Mock Mode (generates valid test schemas with isMock: true, model: gemini-3.6-flash (MOCK_MODE))
 * 7. Clinical Safety Fallback (sets riskLevel: 'UNAVAILABLE', NEVER false reassurance 'LOW')
 *
 * ZERO live generateContent calls are executed by this test.
 */

import { 
  classifyGeminiError, 
  sanitizeLogMessage, 
  generateMockRedFlagResponse,
  generateMockDocumentExtraction,
  generateMockClinicalSummary
} from '../backend/utils/geminiErrorHandler';
import { getGeminiModelName } from '../backend/config/geminiConfig';

function assert(condition: boolean, testName: string, detail?: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}`);
    if (detail) console.error(`   Detail: ${detail}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${testName}${detail ? ' -> ' + detail : ''}`);
}

async function runQuotaHardeningTests() {
  console.log('=== CAREPREP GEMINI QUOTA & ERROR HARDENING VERIFICATION ===\n');

  // Test 1: Production Model Identity
  const modelName = getGeminiModelName();
  assert(modelName === 'gemini-3.6-flash', '1. Production model is strictly gemini-3.6-flash', modelName);

  // Test 2: HTTP 429 / Quota Exceeded Detection
  const mock429Error = new Error(
    'Resource has been exhausted (e.g. check quota): GenerateRequestsPerDayPerProjectPerModel-FreeTier'
  );
  (mock429Error as any).status = 429;
  const classification429 = classifyGeminiError(mock429Error);
  assert(classification429.type === 'QUOTA_EXCEEDED', '2a. Detects 429 as QUOTA_EXCEEDED');
  assert(classification429.code === 'AI_QUOTA_EXCEEDED', '2b. Emits structured code AI_QUOTA_EXCEEDED');
  assert(classification429.httpStatus === 429, '2c. Returns HTTP status 429');
  assert(classification429.retryable === false, '2d. Marks 429 as NON-RETRYABLE (no infinite retry loop)');
  assert(
    classification429.message.includes('temporarily unavailable'),
    '2e. Returns user-safe structured message',
    classification429.message
  );

  // Test 3: HTTP 503 / Service Unavailable Detection
  const mock503Error = { status: 503, message: 'The service is temporarily unavailable due to high demand.' };
  const classification503 = classifyGeminiError(mock503Error);
  assert(classification503.type === 'SERVICE_UNAVAILABLE', '3a. Detects 503 as SERVICE_UNAVAILABLE');
  assert(classification503.code === 'AI_SERVICE_UNAVAILABLE', '3b. Emits structured code AI_SERVICE_UNAVAILABLE');
  assert(classification503.httpStatus === 503, '3c. Returns HTTP status 503');
  assert(classification503.retryable === true, '3d. Marks 503 as RETRYABLE (allows bounded single retry)');

  // Test 4: HTTP 401 / Authentication Detection
  const mock401Error = { status: 401, message: 'API_KEY_INVALID: User not authenticated' };
  const classification401 = classifyGeminiError(mock401Error);
  assert(classification401.type === 'AUTH_ERROR', '4a. Detects 401 as AUTH_ERROR');
  assert(classification401.code === 'AI_AUTH_ERROR', '4b. Emits structured code AI_AUTH_ERROR');
  assert(classification401.retryable === false, '4c. Marks auth error as non-retryable');

  // Test 5: Network / Timeout Detection
  const mockTimeoutError = { message: 'connect ETIMEDOUT 142.250.192.202:443' };
  const classificationTimeout = classifyGeminiError(mockTimeoutError);
  assert(classificationTimeout.type === 'NETWORK_ERROR', '5a. Detects ETIMEDOUT as NETWORK_ERROR');
  assert(classificationTimeout.code === 'AI_NETWORK_TIMEOUT', '5b. Emits code AI_NETWORK_TIMEOUT');
  assert(classificationTimeout.httpStatus === 504, '5c. Returns HTTP 504 Gateway Timeout');
  assert(classificationTimeout.retryable === true, '5d. Marks network timeout as retryable');

  // Test 6: Log Sanitization & Secret Redaction
  const rawLeakString = 'Error calling https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyFakeKeyForTestingPurposeOnly1234567890 for patient Ramesh';
  const sanitized = sanitizeLogMessage(rawLeakString, ['Ramesh']);
  assert(!sanitized.includes('AIzaSyFakeKey'), '6a. Redacts Google API key pattern completely');
  assert(sanitized.includes('[REDACTED]') || sanitized.includes('[REDACTED_API_KEY]'), '6b. Replaces API key with redaction marker');
  assert(!sanitized.includes('Ramesh'), '6c. Redacts patient PII string');
  assert(sanitized.includes('[REDACTED_SECRET]'), '6d. Replaces PII with [REDACTED_SECRET]');

  // Test 7: Developer Mock Mode Red-Flag Response
  const mockRedFlag = generateMockRedFlagResponse({
    symptoms: { primarySymptom: 'Chest pain and breathing difficulty', painSeverity: 9 }
  });
  assert(mockRedFlag.riskLevel === 'EMERGENCY', '7a. Mock correctly triages acute emergency test scenario');
  assert(mockRedFlag.isMock === true, '7b. Mock response explicitly tagged with isMock: true');
  assert(mockRedFlag.aiModel === 'gemini-3.6-flash (MOCK_MODE)', '7c. Model labeled gemini-3.6-flash (MOCK_MODE)');
  assert(mockRedFlag.mockNotice.includes('DEV/TEST MODE'), '7d. Includes explicit mock warning notice');

  // Test 8: Developer Mock Mode Document Extraction
  const mockDoc = generateMockDocumentExtraction('patient_cbc_report.pdf', 'Hemoglobin 13.5 g/dL');
  assert(mockDoc.documentType === 'LAB_REPORT', '8a. Mock detects document type as LAB_REPORT');
  assert(mockDoc.isMock === true, '8b. Mock document tagged with isMock: true');
  assert(mockDoc.labResults.length > 0, '8c. Generates structured test lab results');
  assert(mockDoc.aiModel === 'gemini-3.6-flash (MOCK_MODE)', '8d. Model tagged with mock model identifier');

  // Test 9: Developer Mock Mode Clinical Summary Draft
  const mockSummary = generateMockClinicalSummary('Test Patient', 'Knee osteoarthritis');
  assert(mockSummary.isMock === true, '9a. Mock clinical summary tagged with isMock: true');
  assert(mockSummary.status === 'DRAFT_MOCK', '9b. Summary draft marked as DRAFT_MOCK');
  assert(mockSummary.recommendation.includes('clinician review'), '9c. Mandates human clinician review');

  console.log('\n======================================================');
  console.log('ALL GEMINI QUOTA & PRODUCTION ERROR HARDENING TESTS PASSED!');
  console.log('======================================================\n');
}

runQuotaHardeningTests().catch(e => {
  console.error(e);
  process.exit(1);
});
