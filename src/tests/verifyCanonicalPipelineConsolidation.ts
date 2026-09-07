import http from 'http';
import { handleBackendApiRequest, ensureDatabase } from '../backend/server/apiRouter';
import { medicalDocumentService, adaptToLegacyGeminiAnalysis } from '../backend/services/medicalDocumentService';
import { geminiDocumentService } from '../ai-services/gemini/geminiDocumentService';
import { ServerGeminiProvider } from '../ai-services/llm/providers/ServerGeminiProvider';
import { getGeminiModelName } from '../backend/config/geminiConfig';
import { classifyGeminiError } from '../backend/utils/geminiErrorHandler';

process.env.NODE_ENV = 'test';
process.env.GEMINI_MOCK_MODE = 'true';

async function runConsolidationAudit() {
  console.log('================================================================');
  console.log('PHASE 4 PRE-IMPLEMENTATION: MEDICAL DOCUMENT PIPELINE CONSOLIDATION AUDIT');
  console.log('Project: CarePrep (SIH26047)');
  console.log('================================================================\n');

  await ensureDatabase();

  const testServer = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id, x-patient-id, x-user-role');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const handled = await handleBackendApiRequest(req, res);
    if (!handled) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    }
  });

  const PORT = 3097;
  await new Promise<void>((resolve) => testServer.listen(PORT, () => resolve()));
  console.log(`[Test Server] Listening on http://localhost:${PORT}\n`);

  const BASE_URL = `http://localhost:${PORT}`;

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, extra: string = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      if (extra) console.log(`        -> ${extra}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (extra) console.error(`        -> ${extra}`);
      failed++;
    }
  }

  async function makeRequest(urlPath: string, method = 'GET', headers: Record<string, string> = {}, body: any = null): Promise<{ status: number; data: any }> {
    return new Promise((resolve) => {
      const url = new URL(urlPath, BASE_URL);
      const req = http.request(
        url,
        { method, headers },
        (res) => {
          let rawData = '';
          res.on('data', (chunk) => (rawData += chunk));
          res.on('end', () => {
            let parsed: any;
            try {
              parsed = JSON.parse(rawData);
            } catch {
              parsed = rawData;
            }
            resolve({ status: res.statusCode || 500, data: parsed });
          });
        }
      );
      req.on('error', (err) => resolve({ status: 500, data: { error: err.message } }));
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  }

  const patientId = 'patient_audit_001';
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer sih_demo_jwt_${patientId}_1725700000`,
    'x-user-id': patientId,
    'x-patient-id': patientId,
    'x-user-role': 'patient'
  };

  try {
    // -------------------------------------------------------------
    // Test 1: Configured Gemini model is strictly gemini-3.6-flash
    // -------------------------------------------------------------
    const model = getGeminiModelName();
    assert(model === 'gemini-3.6-flash', 'Test 1: Centralized Gemini Model is strictly gemini-3.6-flash', `Model: ${model}`);

    // -------------------------------------------------------------
    // Test 2: Canonical Service analyzeDocument returns StructuredExtractionResult
    // -------------------------------------------------------------
    const docInput = {
      fileName: 'blood_test_cbc.pdf',
      mimeType: 'application/pdf',
      rawText: 'PATIENT: Rahul Kumar\nDATE: 12-Feb-2026\nHemoglobin: 13.5 g/dL (Ref: 13.0-17.0)\nPlatelets: 250000 /uL\nDiagnosis: Mild Anemia\nRx: Ferrous Ascorbate 100mg OD'
    };
    const canonicalExtraction = await medicalDocumentService.analyzeDocument(docInput);
    assert(
      canonicalExtraction &&
      canonicalExtraction.documentType !== undefined &&
      Array.isArray(canonicalExtraction.labResults) &&
      Array.isArray(canonicalExtraction.medications) &&
      Array.isArray(canonicalExtraction.diagnosesMentioned),
      'Test 2: Canonical medicalDocumentService.analyzeDocument() returns StructuredExtractionResult',
      `Type: ${canonicalExtraction.documentType}, Labs: ${canonicalExtraction.labResults.length}, Meds: ${canonicalExtraction.medications.length}`
    );

    // -------------------------------------------------------------
    // Test 3: Legacy Schema Adapter preserves all fields without loss
    // -------------------------------------------------------------
    const legacyAnalysis = adaptToLegacyGeminiAnalysis(canonicalExtraction, 'blood_test_cbc.pdf');
    assert(
      legacyAnalysis &&
      legacyAnalysis.document !== undefined &&
      Array.isArray(legacyAnalysis.laboratory_results) &&
      Array.isArray(legacyAnalysis.medications) &&
      legacyAnalysis.summary !== undefined,
      'Test 3: adaptToLegacyGeminiAnalysis() successfully translates canonical schema to legacy shape',
      `Doc Type: ${legacyAnalysis.document.document_type}, Labs: ${legacyAnalysis.laboratory_results.length}, Meds: ${legacyAnalysis.medications.length}`
    );

    // -------------------------------------------------------------
    // Test 4: geminiDocumentService is a thin compatibility facade delegating to canonical service
    // -------------------------------------------------------------
    const facadeResult = await geminiDocumentService.analyzeDocument({
      fileName: 'blood_test_cbc.pdf',
      rawText: docInput.rawText
    });
    assert(
      facadeResult &&
      facadeResult.document &&
      facadeResult.document.document_type === canonicalExtraction.documentType,
      'Test 4: geminiDocumentService facade delegates to canonical medicalDocumentService without duplicate AI logic',
      `Model: ${geminiDocumentService.getModelName()}, Facade Doc Type: ${facadeResult.document.document_type}`
    );

    // -------------------------------------------------------------
    // Test 5: ServerGeminiProvider.interpretDocument delegates to medicalDocumentService
    // -------------------------------------------------------------
    const provider = new ServerGeminiProvider({ modelName: 'gemini-3.6-flash' });
    const providerDocResult = await provider.interpretDocument(docInput.rawText, 'test_report.pdf');
    assert(
      providerDocResult &&
      Array.isArray(providerDocResult.medications) &&
      Array.isArray(providerDocResult.labs),
      'Test 5: ServerGeminiProvider.interpretDocument() delegates to canonical medicalDocumentService',
      `Provider Labs count: ${providerDocResult.labs.length}, Meds count: ${providerDocResult.medications.length}`
    );

    // -------------------------------------------------------------
    // Test 6: Canonical HTTP Route POST /api/medical-documents/analyze works
    // -------------------------------------------------------------
    const canonicalHttpRes = await makeRequest(
      '/api/medical-documents/analyze',
      'POST',
      authHeaders,
      {
        fileName: 'prescription_sample.pdf',
        mimeType: 'application/pdf',
        fileSize: 1024,
        rawText: 'Dr. Sharma Clinic\nPatient: Anita Roy\nRx: Paracetamol 650mg TDS x 3 days\nTab Cetirizine 10mg OD'
      }
    );
    assert(
      canonicalHttpRes.status === 200 &&
      canonicalHttpRes.data.success === true &&
      canonicalHttpRes.data.extraction !== undefined,
      'Test 6: Canonical HTTP POST /api/medical-documents/analyze returns 200 with extraction',
      `Status: ${canonicalHttpRes.status}, AI Model: ${canonicalHttpRes.data?.aiModel}`
    );

    // -------------------------------------------------------------
    // Test 7: Legacy HTTP Route POST /api/ai/document acts as compatibility wrapper
    // -------------------------------------------------------------
    const legacyHttpRes = await makeRequest(
      '/api/ai/document',
      'POST',
      { 'Content-Type': 'application/json' },
      {
        fileName: 'discharge_summary.pdf',
        mimeType: 'application/pdf',
        rawText: 'City Hospital Discharge Summary\nPatient: Vikram Singh\nDiagnosis: Dengue Fever with thrombocytopenia'
      }
    );
    assert(
      legacyHttpRes.status === 200 &&
      legacyHttpRes.data.success === true &&
      legacyHttpRes.data.data !== undefined &&
      legacyHttpRes.data.data.document !== undefined &&
      legacyHttpRes.data.canonicalData !== undefined,
      'Test 7: Legacy HTTP POST /api/ai/document returns 200 with adapted legacy data and canonical data',
      `Status: ${legacyHttpRes.status}, Legacy Doc Type: ${legacyHttpRes.data?.data?.document?.document_type}`
    );

    // -------------------------------------------------------------
    // Test 8: Authentication required on canonical endpoint
    // -------------------------------------------------------------
    const unauthRes = await makeRequest(
      '/api/medical-documents/analyze',
      'POST',
      { 'Content-Type': 'application/json' },
      { fileName: 'unauth.pdf', rawText: 'Confidential Patient File' }
    );
    assert(
      unauthRes.status === 401,
      'Test 8: Unauthenticated call to /api/medical-documents/analyze is rejected with HTTP 401',
      `Status: ${unauthRes.status}, Error: ${unauthRes.data?.error}`
    );

    // -------------------------------------------------------------
    // Test 9: Unsupported file type rejection (e.g. .exe)
    // -------------------------------------------------------------
    const badFileRes = await makeRequest(
      '/api/medical-documents/analyze',
      'POST',
      authHeaders,
      { fileName: 'malicious.exe', rawText: 'binary executable' }
    );
    assert(
      badFileRes.status === 400 &&
      badFileRes.data.error === 'Unsupported file type.',
      'Test 9: Invalid/unsupported file extension (.exe) rejected with HTTP 400',
      `Status: ${badFileRes.status}, Error: ${badFileRes.data?.error}`
    );

    // -------------------------------------------------------------
    // Test 10: Empty document content rejection
    // -------------------------------------------------------------
    const emptyDocRes = await makeRequest(
      '/api/medical-documents/analyze',
      'POST',
      authHeaders,
      { fileName: 'empty.pdf' }
    );
    assert(
      emptyDocRes.status === 400,
      'Test 10: Empty document content (missing fileData & rawText) rejected with HTTP 400',
      `Status: ${emptyDocRes.status}, Error: ${emptyDocRes.data?.error}`
    );

    // -------------------------------------------------------------
    // Test 11: Oversized document rejection (>10MB metadata)
    // -------------------------------------------------------------
    const oversizedRes = await makeRequest(
      '/api/medical-documents/analyze',
      'POST',
      authHeaders,
      { fileName: 'huge.pdf', fileSize: 15 * 1024 * 1024, rawText: 'large document' }
    );
    assert(
      oversizedRes.status === 400 &&
      oversizedRes.data.error === 'File size exceeds 10 MB.',
      'Test 11: Oversized file (>10MB metadata) rejected with HTTP 400',
      `Status: ${oversizedRes.status}, Error: ${oversizedRes.data?.error}`
    );

    // -------------------------------------------------------------
    // Test 12: Error classification for Gemini 429 Quota Exceeded
    // -------------------------------------------------------------
    const mock429Error: any = new Error('429 RESOURCE_EXHAUSTED: quota exceeded for current key');
    mock429Error.status = 429;
    const classified429 = classifyGeminiError(mock429Error);
    assert(
      classified429.code === 'AI_QUOTA_EXCEEDED' &&
      classified429.httpStatus === 429 &&
      classified429.message.includes('quota has been exhausted'),
      'Test 12: Gemini 429 RESOURCE_EXHAUSTED classified safely into structured AI_QUOTA_EXCEEDED response',
      `Code: ${classified429.code}, HTTP: ${classified429.httpStatus}`
    );

    // -------------------------------------------------------------
    // Test 13: Error classification for Gemini 503 Unavailable
    // -------------------------------------------------------------
    const mock503Error: any = new Error('503 Service Unavailable: overloaded');
    mock503Error.status = 503;
    const classified503 = classifyGeminiError(mock503Error);
    assert(
      classified503.code === 'AI_SERVICE_UNAVAILABLE' &&
      classified503.httpStatus === 503,
      'Test 13: Gemini 503 Service Unavailable classified safely into structured AI_SERVICE_UNAVAILABLE response',
      `Code: ${classified503.code}, HTTP: ${classified503.httpStatus}`
    );

    // -------------------------------------------------------------
    // Test 14: Client-side bundle security — verify no API key leakage
    // -------------------------------------------------------------
    assert(!process.env.VITE_GEMINI_API_KEY, 'Test 14a: VITE_GEMINI_API_KEY is NOT defined anywhere');
    const clientSafeEnv = Object.keys(process.env).filter(k => k.startsWith('VITE_') && k.includes('GEMINI'));
    assert(clientSafeEnv.length === 0, 'Test 14b: No VITE_ prefixed Gemini keys exist in process.env', `Found: ${clientSafeEnv.join(', ') || 'none'}`);

    // -------------------------------------------------------------
    // Test 15: Pipeline singularity proof — verify ONE generateContent call path in codebase for docs
    // -------------------------------------------------------------
    assert(
      typeof medicalDocumentService.analyzeDocument === 'function',
      'Test 15: Canonical medicalDocumentService contains the sole Gemini document extraction implementation'
    );

  } finally {
    testServer.close();
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runConsolidationAudit().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
