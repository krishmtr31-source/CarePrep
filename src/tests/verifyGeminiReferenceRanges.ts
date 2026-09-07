/**
 * Verification test suite for Gemini API recommended reference range inference.
 * Tests:
 * 1. inferReferenceRangesWithGemini populates standard clinical reference ranges for unclear/missing ranges.
 * 2. High alert / abnormality evaluation correctly flags values exceeding recommended maximum.
 * 3. Existing clearly-printed reference ranges in documents are strictly preserved.
 * 4. HTTP endpoint POST /api/ai/reference-range returns valid structured ranges.
 */

import http from 'http';
import { medicalDocumentService } from '../backend/services/medicalDocumentService';
import { extractStructuredMedicalData } from '../document-intelligence/ocr/medicalInfoExtractor';
import { handleGeminiApiRequest } from '../backend/server/geminiApiHandler';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`  ✓ ${msg}`);
}

async function runTests() {
  console.log('===========================================================');
  console.log('🧪 RUNNING GEMINI REFERENCE RANGE INFERENCE VERIFICATION');
  console.log('===========================================================');

  // --- TEST 1: inferReferenceRangesWithGemini for unclear ranges ---
  console.log('\n--- TEST 1: Service inferReferenceRangesWithGemini ---');
  const testsToInfer = [
    { testName: 'Glucose Fasting', value: '145', unit: 'mg/dL' },
    { testName: 'Serum Creatinine', value: '0.9', unit: 'mg/dL' },
    { testName: 'HbA1c', value: '8.4', unit: '%' },
    { testName: 'Platelet Count', value: '85000', unit: 'cells/µL' }
  ];

  const results = await medicalDocumentService.inferReferenceRangesWithGemini(testsToInfer);

  assert(results.length === 4, `Expected 4 range results, got ${results.length}`);

  const fbg = results.find(r => r.testName.toLowerCase().includes('glucose'));
  assert(Boolean(fbg), 'Found Fasting Glucose result');
  assert(Boolean(fbg?.referenceRange), `Glucose has recommended reference range: ${fbg?.referenceRange}`);
  assert(!fbg?.referenceRange?.includes('Gemini') && !fbg?.referenceRange?.includes('AI'), `Glucose reference range is clean numerical without AI tags: ${fbg?.referenceRange}`);
  assert(fbg?.flag === 'HIGH' || fbg?.flag === 'CRITICAL', `Fasting glucose 145 mg/dL flagged as HIGH: ${fbg?.flag}`);
  assert(fbg?.isAbnormal === true, 'Fasting glucose 145 mg/dL marked as isAbnormal = true');

  const creat = results.find(r => r.testName.toLowerCase().includes('creatinine'));
  assert(Boolean(creat), 'Found Creatinine result');
  assert(creat?.flag === 'NORMAL', `Creatinine 0.9 mg/dL flagged as NORMAL: ${creat?.flag}`);
  assert(creat?.isAbnormal === false, 'Creatinine 0.9 mg/dL marked as isAbnormal = false');

  const hba1c = results.find(r => r.testName.toLowerCase().includes('hba1c'));
  assert(Boolean(hba1c), 'Found HbA1c result');
  assert(hba1c?.flag === 'HIGH' || hba1c?.flag === 'CRITICAL', `HbA1c 8.4% flagged as HIGH: ${hba1c?.flag}`);

  const platelets = results.find(r => r.testName.toLowerCase().includes('platelet'));
  assert(Boolean(platelets), 'Found Platelets result');
  assert(platelets?.flag === 'LOW' || platelets?.flag === 'CRITICAL', `Platelets 85,000 flagged as LOW: ${platelets?.flag}`);

  // --- TEST 2: OCR extraction with missing reference ranges in raw text ---
  console.log('\n--- TEST 2: OCR Extractor Benchmark Handling for Missing Ranges ---');
  const reportTextWithoutRanges = `
PATIENT LAB REPORT
Name: Ramesh Kumar
Date: 12-OCT-2025

INVESTIGATION RESULTS:
Fasting Blood Sugar: 168 mg/dL
Serum Creatinine: 1.1 mg/dL
Total Cholesterol: 245 mg/dL
`;

  const parsed = extractStructuredMedicalData(reportTextWithoutRanges, 'unclear-report.pdf');
  assert(parsed.labResults.length >= 3, `Extracted ${parsed.labResults.length} lab tests from text without printed ranges`);

  const parsedFbg = parsed.labResults.find(l => l.testName.toLowerCase().includes('fasting'));
  assert(Boolean(parsedFbg), 'Found Fasting Blood Sugar in parsed OCR text');
  assert(parsedFbg?.sourceReferenceRange.isAiInferred === true, 'Fasting Blood Sugar marked as isAiInferred = true');
  assert(parsedFbg?.flag === 'HIGH' || parsedFbg?.flag === 'CRITICAL', `Fasting Blood Sugar 168 mg/dL correctly evaluated as HIGH/CRITICAL: ${parsedFbg?.flag}`);
  assert(parsedFbg?.isAbnormal === true, 'Fasting Blood Sugar 168 mg/dL marked isAbnormal = true');

  const parsedChol = parsed.labResults.find(l => l.testName.toLowerCase().includes('cholesterol'));
  assert(Boolean(parsedChol), 'Found Cholesterol in parsed OCR text');
  assert(parsedChol?.flag === 'HIGH', `Cholesterol 245 mg/dL evaluated as HIGH: ${parsedChol?.flag}`);

  // --- TEST 3: Preserving explicitly printed document reference ranges ---
  console.log('\n--- TEST 3: Preserving Explicit Printed Reference Ranges ---');
  const reportWithExplicitRange = `
INVESTIGATION       RESULT   UNITS    REFERENCE RANGE
Hemoglobin          14.2     g/dL     13.0 - 17.0
`;
  const parsedExplicit = extractStructuredMedicalData(reportWithExplicitRange, 'standard-report.pdf');
  const hb = parsedExplicit.labResults.find(l => l.testName.toLowerCase().includes('hemoglobin'));
  assert(Boolean(hb), 'Found Hemoglobin in explicit report');
  assert(hb?.sourceReferenceRange.hasSourceRange === true, 'Explicit range hasSourceRange = true');
  assert(Boolean(hb?.sourceReferenceRange.raw.includes('13.0 - 17.0')), `Explicit raw range preserved: ${hb?.sourceReferenceRange?.raw}`);
  assert(hb?.sourceReferenceRange.isAiInferred !== true, 'Explicit range is not marked as AI inferred');

  // --- TEST 4: Backend POST /api/ai/reference-range HTTP endpoint ---
  console.log('\n--- TEST 4: HTTP POST /api/ai/reference-range Endpoint ---');
  const server = http.createServer(async (req, res) => {
    const handled = await handleGeminiApiRequest(req, res);
    if (!handled) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  await new Promise<void>(resolve => server.listen(3099, resolve));

  const postData = JSON.stringify({
    tests: [
      { testName: 'Serum Bilirubin Total', value: '2.8', unit: 'mg/dL' },
      { testName: 'Potassium', value: '4.2', unit: 'mmol/L' }
    ]
  });

  const responseBody = await new Promise<string>((resolve, reject) => {
    const req = http.request(
      'http://localhost:3099/api/ai/reference-range',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve(body));
      }
    );
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  server.close();

  const apiRes = JSON.parse(responseBody);
  assert(apiRes.success === true, 'API returned success: true');
  assert(Array.isArray(apiRes.ranges) && apiRes.ranges.length === 2, `API returned 2 ranges: ${apiRes.ranges.length}`);
  
  const bilirubin = apiRes.ranges.find((r: any) => r.testName.toLowerCase().includes('bilirubin'));
  assert(Boolean(bilirubin), 'Found Bilirubin in API response');
  assert(bilirubin.flag === 'HIGH' || bilirubin.flag === 'CRITICAL', `Bilirubin 2.8 mg/dL flagged as HIGH: ${bilirubin.flag}`);
  assert(bilirubin.isAbnormal === true, 'Bilirubin 2.8 mg/dL marked isAbnormal = true');

  console.log('\n===========================================================');
  console.log('✅ ALL GEMINI REFERENCE RANGE INFERENCE TESTS PASSED CLEANLY');
  console.log('===========================================================');
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
