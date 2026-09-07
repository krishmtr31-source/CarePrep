const http = require('http');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env if present
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w_]+)\s*=\s*(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  }
}

process.env.NODE_ENV = 'test';

async function runPhase3Tests() {
  console.log('================================================================');
  console.log('PHASE 3 — AI MEDICAL DOCUMENT DIGITIZATION AUDIT & TEST SUITE');
  console.log('Project: CarePrep (SIH26047)');
  console.log('================================================================\n');

  // Dynamically import compiled or ts-node backend server
  const { server } = require('../src/backend/server/apiServer.ts');
  const { ensureDatabase } = require('../src/backend/server/apiRouter.ts');
  const { MedicalDocument } = require('../src/backend/models/MedicalDocument.ts');

  await ensureDatabase();

  const PORT = 3099;
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`[Test Server] Running on http://localhost:${PORT}\n`);

  const BASE_URL = `http://localhost:${PORT}`;

  const PATIENT_A = 'patient_test_001';
  const PATIENT_B = 'patient_test_002';

  const AUTH_A = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer sih_demo_jwt_${PATIENT_A}_1725700000`,
    'x-user-id': PATIENT_A,
    'x-patient-id': PATIENT_A,
    'x-user-role': 'patient'
  };

  const AUTH_B = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer sih_demo_jwt_${PATIENT_B}_1725700000`,
    'x-user-id': PATIENT_B,
    'x-patient-id': PATIENT_B,
    'x-user-role': 'patient'
  };

  async function makeRequest(path, method = 'GET', headers = {}, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE_URL);
      const req = http.request(
        url,
        {
          method,
          headers
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            let parsed;
            try {
              parsed = JSON.parse(data);
            } catch {
              parsed = data;
            }
            resolve({ status: res.statusCode, data: parsed, headers: res.headers });
          });
        }
      );
      req.on('error', reject);
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.end();
    });
  }

  async function callAnalyzeWithRetry(payload, headers = AUTH_A, maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await makeRequest('/api/medical-documents/analyze', 'POST', headers, payload);
      if (res.status === 503 && (res.data?.details?.includes('429') || res.data?.details?.includes('quota')) && attempt < maxRetries) {
        console.log(`    [Gemini Rate-Limit] Waiting 16s before retry (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise(r => setTimeout(r, 16000));
        continue;
      }
      return res;
    }
  }

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, message) {
    totalCount++;
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
    }
  }

  // Sample 1x1 transparent PNG data URL
  const samplePngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  // Sample minimal valid 1-page PDF base64
  const samplePdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL01lZGlhQm94WzAgMCAzMDAgMTQ0XS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDw+Pj4+ZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDUyIDAwMDAwIG4gCjAwMDAwMDAxMDggMDAwMDAgbiAKdHJhaWxlcjw8L1NpemUgNC9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjE4NQolJUVPRgo=';

  // -------------------------------------------------------------------------
  // Test 1: Clear PDF lab report extraction
  // -------------------------------------------------------------------------
  console.log('Test 1: Clear PDF lab report extraction');
  const res1 = await callAnalyzeWithRetry(
    {
      fileName: 'CBC_Report_June_2026.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024 * 50,
      fileData: samplePdfBase64,
      rawText: `METROPOLIS HEALTHCARE LABS
Patient: Krishna Tiwari   Date: 2026-06-12
Doctor: Dr. Ramesh Sharma
COMPLETE BLOOD COUNT (CBC)
Hemoglobin: 13.5 g/dL (Reference: 13.0-17.0) Normal
WBC: 7200 /uL (Reference: 4000-11000) Normal
Platelet Count: 250000 /uL (Reference: 150000-450000) Normal
Fasting Blood Sugar: 145 mg/dL (Reference: 70-100) High`
    }
  );
  assert(res1.status === 200 || (res1.status === 503 && res1.data?.fallbackAvailable), `Handled safely with HTTP 200 or 503 rate-limit guard (got ${res1.status})`);
  if (res1.status === 200) {
    assert(res1.data.success === true, 'Response marked success');
    assert(res1.data.extraction?.documentType === 'LAB_REPORT', `DocumentType is LAB_REPORT (got ${res1.data.extraction?.documentType})`);
    assert(Array.isArray(res1.data.extraction?.labResults) && res1.data.extraction.labResults.length >= 3, `Extracted lab results array (count: ${res1.data.extraction?.labResults?.length})`);
    const hb = res1.data.extraction?.labResults.find(l => l.testName.toLowerCase().includes('hemoglobin'));
    assert(Boolean(hb && hb.value === '13.5'), `Hemoglobin preserved value 13.5 (got ${hb?.value})`);
    assert(Boolean(hb && hb.unit === 'g/dL'), `Hemoglobin unit preserved as g/dL (got ${hb?.unit})`);
  } else {
    assert(res1.data?.error === 'AI extraction is temporarily unavailable.', 'Returned "AI extraction is temporarily unavailable."');
  }

  // -------------------------------------------------------------------------
  // Test 2: Scanned PDF extraction
  // -------------------------------------------------------------------------
  console.log('\nTest 2: Scanned PDF document');
  const res2 = await callAnalyzeWithRetry(
    {
      fileName: 'Scanned_Renal_Panel.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024 * 120,
      fileData: samplePdfBase64,
      rawText: `SCANNED DOCUMENT - APOLLO HOSPITALS
Kidney Function Test
Serum Creatinine: 1.1 mg/dL (Ref: 0.7 - 1.3)
Blood Urea Nitrogen: 18 mg/dL (Ref: 7 - 20)
Serum Uric Acid: 5.4 mg/dL`
    }
  );
  assert(res2.status === 200 || (res2.status === 503 && res2.data?.fallbackAvailable), `Handled safely with HTTP 200 or 503 rate-limit guard (got ${res2.status})`);
  if (res2.status === 200) {
    assert(res2.data.extraction?.documentType === 'LAB_REPORT', `Classified correctly as LAB_REPORT (got ${res2.data.extraction?.documentType})`);
    assert(res2.data.extraction?.labResults.some(l => l.testName.toLowerCase().includes('creatinine')), 'Extracted Serum Creatinine');
  } else {
    assert(res2.data?.error === 'AI extraction is temporarily unavailable.', 'Returned "AI extraction is temporarily unavailable."');
  }

  // -------------------------------------------------------------------------
  // Test 3: JPG Medical report
  // -------------------------------------------------------------------------
  console.log('\nTest 3: JPG Medical report');
  const res3 = await callAnalyzeWithRetry(
    {
      fileName: 'Thyroid_Profile.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024 * 80,
      fileData: samplePngBase64,
      rawText: `Dr. Lal PathLabs
Thyroid Profile Total
TSH: 2.45 uIU/mL (Reference: 0.35 - 4.94) Normal
Total T3: 1.10 ng/mL
Total T4: 8.2 ug/dL`
    }
  );
  assert(res3.status === 200 || (res3.status === 503 && res3.data?.fallbackAvailable), `Handled safely with HTTP 200 or 503 rate-limit guard (got ${res3.status})`);
  if (res3.status === 200) {
    assert(res3.data.extraction?.documentType === 'LAB_REPORT', 'Document classified as LAB_REPORT');
    assert(res3.data.extraction?.labResults.some(l => l.testName.toUpperCase().includes('TSH')), 'Extracted TSH value');
  } else {
    assert(res3.data?.error === 'AI extraction is temporarily unavailable.', 'Returned "AI extraction is temporarily unavailable."');
  }

  // -------------------------------------------------------------------------
  // Test 4: Prescription document extraction
  // -------------------------------------------------------------------------
  console.log('\nTest 4: Prescription document');
  const res4 = await callAnalyzeWithRetry(
    {
      fileName: 'Prescription_02June.png',
      mimeType: 'image/png',
      fileSize: 1024 * 60,
      fileData: samplePngBase64,
      rawText: `RX - Dr. S. Mukherjee (Cardiology)
Date: 2026-06-02
Patient: Krishna Tiwari
Rx:
1. Tab. Paracetamol 500 mg - Twice daily - 5 days - Oral
2. Tab. Pantoprazole 40 mg - Once daily before breakfast - 14 days
3. Tab. Atorvastatin 10 mg - Once daily at night - 30 days
Advice: Low salt diet, regular morning walk.`
    }
  );
  assert(res4.status === 200 || (res4.status === 503 && res4.data?.fallbackAvailable), `Handled safely with HTTP 200 or 503 rate-limit guard (got ${res4.status})`);
  if (res4.status === 200) {
    assert(res4.data.extraction?.documentType === 'PRESCRIPTION', `DocumentType is PRESCRIPTION (got ${res4.data.extraction?.documentType})`);
    assert(Array.isArray(res4.data.extraction?.medications) && res4.data.extraction.medications.length >= 2, `Extracted medications list (count: ${res4.data.extraction?.medications?.length})`);
    const pcm = res4.data.extraction?.medications.find(m => m.name.toLowerCase().includes('paracetamol'));
    assert(Boolean(pcm && pcm.dosage?.includes('500')), `Paracetamol dosage extracted as 500 mg (got ${pcm?.dosage})`);
  } else {
    assert(res4.data?.error === 'AI extraction is temporarily unavailable.', 'Returned "AI extraction is temporarily unavailable."');
  }

  // -------------------------------------------------------------------------
  // Test 5: Discharge summary extraction
  // -------------------------------------------------------------------------
  console.log('\nTest 5: Discharge summary');
  const res5 = await callAnalyzeWithRetry(
    {
      fileName: 'Discharge_Summary_CityHospital.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024 * 150,
      fileData: samplePdfBase64,
      rawText: `CITY MULTISPECIALTY HOSPITAL
DISCHARGE SUMMARY
Admission Date: 2026-05-10   Discharge Date: 2026-05-14
Consultant: Dr. A. K. Verma
Final Diagnosis: Acute Gastroenteritis with Moderate Dehydration
Procedures Performed: Intravenous fluid resuscitation, Diagnostic abdominal ultrasound
Hospital Course: Patient improved symptomatically. Vital signs stable at discharge.
Discharge Medications: Tab Ciprofloxacin 500mg BD x 5 days, ORS sachets.
Follow-up: Review in OPD after 7 days.`
    }
  );
  assert(res5.status === 200 || (res5.status === 503 && res5.data?.fallbackAvailable), `Handled safely with HTTP 200 or 503 rate-limit guard (got ${res5.status})`);
  if (res5.status === 200) {
    assert(res5.data.extraction?.documentType === 'DISCHARGE_SUMMARY', `DocumentType is DISCHARGE_SUMMARY (got ${res5.data.extraction?.documentType})`);
    assert(res5.data.extraction?.diagnosesMentioned.length > 0, 'Extracted explicitly mentioned diagnoses');
    assert(res5.data.extraction?.diagnosesMentioned.some(d => d.toLowerCase().includes('gastroenteritis')), 'Preserved exact diagnosis wording');
  } else {
    assert(res5.data?.error === 'AI extraction is temporarily unavailable.', 'Returned "AI extraction is temporarily unavailable."');
  }

  // -------------------------------------------------------------------------
  // Test 6: Poor quality image / unclear values
  // -------------------------------------------------------------------------
  console.log('\nTest 6: Poor quality image / ambiguous values');
  const res6 = await callAnalyzeWithRetry(
    {
      fileName: 'Blurry_Handwritten_Note.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024 * 30,
      fileData: samplePngBase64,
      rawText: `Smudged doctor slip:
Patient: [Unclear ink blot]
Dose: [illegible 2?5? mg]
Note: Blood pressure high? 1?0/90?`
    }
  );
  assert(res6.status === 200 || (res6.status === 503 && res6.data?.fallbackAvailable), `Handled safely with HTTP 200 or 503 rate-limit guard (got ${res6.status})`);
  if (res6.status === 200) {
    assert(res6.data.extraction?.extractionWarnings.length > 0 || res6.data.extraction?.labResults.some(l => l.flag === 'UNCLEAR'), 'Flagged unclear items in extractionWarnings or UNCLEAR flag');
  } else {
    assert(res6.data?.error === 'AI extraction is temporarily unavailable.', 'Returned "AI extraction is temporarily unavailable."');
  }

  // -------------------------------------------------------------------------
  // Test 7: Unsupported file format
  // -------------------------------------------------------------------------
  console.log('\nTest 7: Unsupported file format');
  const res7 = await makeRequest(
    '/api/medical-documents/analyze',
    'POST',
    AUTH_A,
    {
      fileName: 'malicious_code.exe',
      mimeType: 'application/x-msdownload',
      fileSize: 1024,
      fileData: 'data:application/octet-stream;base64,TVo='
    }
  );
  assert(res7.status === 400, `Rejected with HTTP 400 Bad Request (got ${res7.status})`);
  assert(res7.data.error === 'Unsupported file type.', `Returned exact error message: "Unsupported file type." (got ${res7.data.error})`);

  // -------------------------------------------------------------------------
  // Test 8: File > 10 MB
  // -------------------------------------------------------------------------
  console.log('\nTest 8: File > 10 MB');
  const res8 = await makeRequest(
    '/api/medical-documents/analyze',
    'POST',
    AUTH_A,
    {
      fileName: 'Huge_MRI_Scan.pdf',
      mimeType: 'application/pdf',
      fileSize: 11 * 1024 * 1024, // 11 MB
      fileData: samplePdfBase64
    }
  );
  assert(res8.status === 400, `Rejected with HTTP 400 Bad Request (got ${res8.status})`);
  assert(res8.data.error === 'File size exceeds 10 MB.', `Returned exact error message: "File size exceeds 10 MB." (got ${res8.data.error})`);

  // -------------------------------------------------------------------------
  // Test 9: Empty document
  // -------------------------------------------------------------------------
  console.log('\nTest 9: Empty document');
  const res9 = await makeRequest(
    '/api/medical-documents/analyze',
    'POST',
    AUTH_A,
    {
      fileName: 'empty_report.pdf',
      mimeType: 'application/pdf',
      fileSize: 0,
      fileData: ''
    }
  );
  assert(res9.status === 400, `Rejected with HTTP 400 Bad Request (got ${res9.status})`);
  assert(res9.data.error === 'Unable to read this document.', `Returned exact error message: "Unable to read this document." (got ${res9.data.error})`);

  // -------------------------------------------------------------------------
  // Test 10: Gemini API failure resilience
  // -------------------------------------------------------------------------
  console.log('\nTest 10: Gemini API failure resilience');
  // Temporarily corrupt API key to test failure branch
  const originalApiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'invalid_mock_api_key';
  
  // Note: Since cached client might exist, we test the route error handling
  const res10 = await makeRequest(
    '/api/medical-documents/analyze',
    'POST',
    AUTH_A,
    {
      fileName: 'Report_Test.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024,
      fileData: samplePdfBase64,
      rawText: 'Simple test document'
    }
  );
  // Restore original key
  process.env.GEMINI_API_KEY = originalApiKey;
  assert(
    res10.status === 503 || (res10.status === 200 && res10.data.success),
    `Handled safely with 503 or graceful recovery without crashing (got ${res10.status})`
  );
  if (res10.status === 503) {
    assert(res10.data.error === 'AI extraction is temporarily unavailable.', 'Returned "AI extraction is temporarily unavailable."');
  }

  // -------------------------------------------------------------------------
  // Test 11: Malformed Gemini JSON recovery
  // -------------------------------------------------------------------------
  console.log('\nTest 11: Malformed Gemini JSON recovery');
  const { medicalDocumentService } = require('../src/backend/services/medicalDocumentService.ts');
  const sanitized = medicalDocumentService.sanitizeExtractionResult(
    {
      documentType: 'INVALID_UNKNOWN_TYPE',
      documentTitle: '   ',
      labResults: [{ testName: 'Platelets', value: 200000, flag: 'high' }],
      extractionWarnings: ['Ambiguous handwriting']
    },
    'TestDoc.pdf'
  );
  assert(sanitized.documentType === 'OTHER', `Defaulted invalid type to OTHER (got ${sanitized.documentType})`);
  assert(sanitized.documentTitle === 'TestDoc', `Sanitized document title to filename (got ${sanitized.documentTitle})`);
  assert(sanitized.labResults[0].flag === 'HIGH', 'Normalized flag to HIGH');

  // -------------------------------------------------------------------------
  // Test 12: Unauthorized document request
  // -------------------------------------------------------------------------
  console.log('\nTest 12: Unauthorized document request');
  const res12 = await makeRequest(
    '/api/medical-documents',
    'GET',
    {} // No auth headers
  );
  assert(res12.status === 401, `Rejected with HTTP 401 Unauthorized (got ${res12.status})`);
  assert(res12.data.error === 'Authentication required.', 'Returned "Authentication required."');

  // -------------------------------------------------------------------------
  // Test 13: Tenant Isolation (Patient A vs Patient B cross-access)
  // -------------------------------------------------------------------------
  console.log('\nTest 13: Tenant Isolation & Document CRUD');
  // Patient A creates a document
  const testDocId = `doc-test-${Date.now()}`;
  const saveRes = await makeRequest(
    '/api/medical-documents',
    'POST',
    AUTH_A,
    {
      documentId: testDocId,
      fileName: 'Confidential_Report_Patient_A.pdf',
      fileSize: 1024 * 45,
      mimeType: 'application/pdf',
      documentType: 'LAB_REPORT',
      documentTitle: 'Confidential Patient A Blood Work',
      summary: 'Patient A confidential blood work',
      labResults: [{ testName: 'Hemoglobin', value: '14.0', unit: 'g/dL', flag: 'NORMAL' }]
    }
  );
  assert(saveRes.status === 201, `Patient A saved document (HTTP 201 Created)`);
  assert(saveRes.data.document.patientId === PATIENT_A, 'Document stored strictly under Patient A ID');

  // Patient A retrieves own document
  const getOwnRes = await makeRequest(
    `/api/medical-documents/${testDocId}`,
    'GET',
    AUTH_A
  );
  assert(getOwnRes.status === 200, 'Patient A can access own document');

  // Patient B attempts to access Patient A's document
  const getOtherRes = await makeRequest(
    `/api/medical-documents/${testDocId}`,
    'GET',
    AUTH_B
  );
  assert(getOtherRes.status === 403, `Patient B rejected with HTTP 403 Forbidden (got ${getOtherRes.status})`);
  assert(getOtherRes.data.error?.includes('permission'), 'Returned permission denied message');

  // Patient B attempts to delete Patient A's document
  const deleteOtherRes = await makeRequest(
    `/api/medical-documents/${testDocId}`,
    'DELETE',
    AUTH_B
  );
  assert(deleteOtherRes.status === 403, `Patient B cannot delete Patient A's document (HTTP 403)`);

  // Patient A deletes own document
  const deleteOwnRes = await makeRequest(
    `/api/medical-documents/${testDocId}`,
    'DELETE',
    AUTH_A
  );
  assert(deleteOwnRes.status === 200, 'Patient A successfully deleted document');

  // Verify document is deleted
  const getDeletedRes = await makeRequest(
    `/api/medical-documents/${testDocId}`,
    'GET',
    AUTH_A
  );
  assert(getDeletedRes.status === 404, 'Deleted document returns HTTP 404 Not Found');

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passedCount} / ${totalCount} PASSED`);
  console.log('================================================================');

  server.close();
  process.exit(passedCount === totalCount ? 0 : 1);
}

runPhase3Tests().catch((err) => {
  console.error('Test suite runner failed:', err);
  process.exit(1);
});
