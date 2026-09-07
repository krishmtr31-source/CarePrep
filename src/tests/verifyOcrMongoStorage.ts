/**
 * CarePrep OCR Text to JSON -> MongoDB Storage -> Retrieved Structured Report Test
 *
 * Verifies:
 * 1. OCR Text conversion to complete structured JSON (StructuredOcrMedicalData)
 * 2. Preservation of exact OCR numerical reference ranges and units
 * 3. Persistence of structured JSON into MongoDB schema (rawJson & canonical fields)
 * 4. Retrieval of JSON from MongoDB database
 * 5. Formatting of retrieved MongoDB JSON into structured medical report
 */

import { extractStructuredMedicalData } from '../document-intelligence/ocr/medicalInfoExtractor';
import { handleMedicalDocumentRoutes } from '../backend/routes/documentRoutes';
import { MedicalDocument } from '../backend/models/MedicalDocument';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runOcrMongoStorageTests() {
  console.log('===========================================================');
  console.log('🧪 VERIFYING OCR TEXT -> JSON -> MONGODB -> STRUCTURED REPORT');
  console.log('===========================================================\n');

  // Realistic raw OCR text with lab investigations, reference intervals, medications
  const sampleOcrText = `
  METROPOLIS HEALTHCARE & DIAGNOSTICS
  Dr. S. K. Gupta, MD (Pathology) | Reg: MCI-29481
  Patient Name: Mrs. Sunita Sharma
  Age: 52 Years | Gender: Female | Date: 05/09/2026
  Ref By: Dr. Vikram Malhotra, MBBS, MD

  CLINICAL BIOCHEMISTRY REPORT
  TEST NAME                  OBSERVED VALUE    UNIT        BIOLOGICAL REF INTERVAL
  ----------------------------------------------------------------------------------
  Fasting Blood Glucose (FBS)    148.0          mg/dL       70.0 - 99.0
  HbA1c (Glycosylated Hb)        8.4            %           4.0 - 5.6
  Serum Creatinine               1.8            mg/dL       0.5 - 1.1
  Blood Urea Nitrogen (BUN)      32.0           mg/dL       7.0 - 20.0
  Total Cholesterol              242.0          mg/dL       < 200.0
  Triglycerides                  198.0          mg/dL       < 150.0
  HDL Cholesterol                38.0           mg/dL       40.0 - 60.0
  Estimated GFR (eGFR)           34.0           mL/min      > 60.0

  PRESCRIPTION & CLINICAL ADVICE:
  1. Tab Metformin 500 mg - 1 tablet twice daily after meals (BD) for 30 days
  2. Tab Atorvastatin 20 mg - 1 tablet at bedtime (HS) for 30 days
  3. Tab Telmisartan 40 mg - 1 tablet once daily morning (OD) for 30 days

  IMPRESSION:
  Uncontrolled Type 2 Diabetes Mellitus with Diabetic Nephropathy (Stage 3 CKD) and Dyslipidemia.
  Low salt, diabetic diet recommended. Repeat renal function in 4 weeks.
  `;

  // STEP 1: Convert raw OCR text to Structured JSON
  console.log('--- Step 1: Converting Raw OCR Text to Structured JSON ---');
  const structuredJson = extractStructuredMedicalData(sampleOcrText, 'Metropolis_Lab_Report.pdf');
  
  assert(Boolean(structuredJson), 'Structured JSON object generated from OCR text');
  assert(structuredJson.patientOverview.name.includes('Sunita Sharma'), `Extracted patient name: ${structuredJson.patientOverview.name}`);
  assert(structuredJson.patientOverview.doctorName.includes('Dr. Vikram Malhotra') || structuredJson.patientOverview.doctorName.includes('Dr. S. K. Gupta'), `Extracted doctor name: ${structuredJson.patientOverview.doctorName}`);
  assert(structuredJson.labResults.length >= 6, `Extracted ${structuredJson.labResults.length} laboratory tests`);
  
  // Verify strict OCR reference range preservation
  const fbs = structuredJson.labResults.find(l => l.testName.toLowerCase().includes('glucose') || l.testName.toLowerCase().includes('fbs'));
  assert(Boolean(fbs), 'Fasting Blood Glucose found in extracted JSON');
  if (fbs) {
    assert(fbs.resultValue === '148' || fbs.resultValue === '148.0', `FBS observed value correctly parsed: ${fbs.resultValue}`);
    assert(fbs.unit === 'mg/dL', `FBS unit correctly parsed: ${fbs.unit}`);
    assert(fbs.sourceReferenceRange.raw.includes('70') && fbs.sourceReferenceRange.raw.includes('99'), `FBS OCR reference range strictly preserved: "${fbs.sourceReferenceRange.raw}"`);
    assert(fbs.flag === 'HIGH', `FBS correctly marked as HIGH`);
  }

  const hba1c = structuredJson.labResults.find(l => l.testName.toLowerCase().includes('hba1c'));
  assert(Boolean(hba1c), 'HbA1c found in extracted JSON');
  if (hba1c) {
    assert(hba1c.resultValue === '8.4', `HbA1c value: ${hba1c.resultValue}`);
    assert(hba1c.sourceReferenceRange.raw.includes('4') && hba1c.sourceReferenceRange.raw.includes('5.6'), `HbA1c reference range strictly preserved: "${hba1c.sourceReferenceRange.raw}"`);
    assert(hba1c.flag === 'HIGH', `HbA1c flagged as HIGH`);
  }

  const creat = structuredJson.labResults.find(l => l.testName.toLowerCase().includes('creatinine'));
  assert(Boolean(creat), 'Serum Creatinine found');
  if (creat) {
    assert(creat.resultValue === '1.8', `Creatinine value: ${creat.resultValue}`);
    assert(creat.sourceReferenceRange.raw.includes('0.5') && creat.sourceReferenceRange.raw.includes('1.1'), `Creatinine reference range strictly preserved: "${creat.sourceReferenceRange.raw}"`);
    assert(creat.flag === 'HIGH', `Creatinine flagged as HIGH`);
  }

  assert(structuredJson.medications.length >= 2, `Extracted ${structuredJson.medications.length} medications`);
  const met = structuredJson.medications.find(m => m.name.toLowerCase().includes('metformin'));
  assert(Boolean(met), 'Metformin found in medications JSON');

  // STEP 2: Store in MongoDB Database via Endpoint & Schema
  console.log('\n--- Step 2: Storing in MongoDB Database ---');
  
  function createMockHttp(method: string, url: string, bodyData?: any) {
    const bodyString = bodyData ? JSON.stringify(bodyData) : '';
    let responseStatus = 200;
    let responseData = '';
    const responseHeaders: Record<string, string> = {};

    const req: any = {
      method,
      url,
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(bodyString).toString()
      },
      on: (event: string, callback: Function) => {
        if (event === 'data' && bodyString) {
          callback(Buffer.from(bodyString));
        }
        if (event === 'end') {
          callback();
        }
      }
    };

    const res: any = {
      writeHead: (status: number, headers?: any) => {
        responseStatus = status;
        if (headers) Object.assign(responseHeaders, headers);
      },
      setHeader: (k: string, v: string) => {
        responseHeaders[k] = v;
      },
      set statusCode(val: number) {
        responseStatus = val;
      },
      get statusCode() {
        return responseStatus;
      },
      end: (chunk?: any) => {
        if (chunk) responseData += chunk.toString();
      }
    };

    return {
      req,
      res,
      getResponse: () => ({
        status: responseStatus,
        headers: responseHeaders,
        body: responseData ? JSON.parse(responseData) : null
      })
    };
  }

  // Test route handler: POST /api/ocr/convert-and-store
  const convertHttp = createMockHttp('POST', '/api/ocr/convert-and-store', {
    rawText: sampleOcrText,
    fileName: 'Metropolis_Lab_Report.pdf',
    fileDataUrl: 'data:application/pdf;base64,mockPdfData'
  });

  const userContext = { userId: 'patient-test-user-001', role: 'patient' as const };
  const handledConvert = await handleMedicalDocumentRoutes(convertHttp.req, convertHttp.res, '/api/ocr/convert-and-store', userContext);
  assert(handledConvert === true, 'Route handler processed POST /api/ocr/convert-and-store');
  
  const storeRes = convertHttp.getResponse();
  assert(storeRes.status === 201, `Response status 201 Created (got ${storeRes.status})`);
  assert(storeRes.body?.success === true, 'Response body success is true');
  assert(Boolean(storeRes.body?.document), 'Stored document record returned');
  
  const storedDoc = storeRes.body?.document;
  const storedId = storedDoc?.documentId;
  assert(Boolean(storedId), `Generated documentId: ${storedId}`);
  assert(storedDoc.rawJson !== null && typeof storedDoc.rawJson === 'object', 'MongoDB stored document contains rawJson field');
  assert(Array.isArray(storedDoc.labResults) && storedDoc.labResults.length >= 6, `MongoDB stored ${storedDoc.labResults.length} lab results`);

  // STEP 3: Retrieve from MongoDB Database via ID & List Endpoints
  console.log('\n--- Step 3: Retrieving from MongoDB Database ---');
  const getByIdHttp = createMockHttp('GET', `/api/medical-documents/${storedId}`);
  const handledGet = await handleMedicalDocumentRoutes(getByIdHttp.req, getByIdHttp.res, `/api/medical-documents/${storedId}`, userContext);
  assert(handledGet === true, `Route handler processed GET /api/medical-documents/${storedId}`);
  
  const getRes = getByIdHttp.getResponse();
  assert(getRes.status === 200, `GET /api/medical-documents/${storedId} returned 200 OK`);
  
  const retrievedDoc = getRes.body?.document || getRes.body;
  assert(Boolean(retrievedDoc), 'Retrieved document record is not null');
  assert(retrievedDoc.documentId === storedId, 'Retrieved document ID matches stored ID');
  assert(retrievedDoc.rawJson !== null, 'Retrieved document contains complete rawJson');
  assert(retrievedDoc.patientName.includes('Sunita Sharma'), `Retrieved patient: ${retrievedDoc.patientName}`);

  // Test List Retrieval: GET /api/medical-documents
  const listHttp = createMockHttp('GET', '/api/medical-documents');
  const handledList = await handleMedicalDocumentRoutes(listHttp.req, listHttp.res, '/api/medical-documents', userContext);
  assert(handledList === true, 'Route handler processed GET /api/medical-documents');
  
  const listRes = listHttp.getResponse();
  assert(listRes.status === 200, 'GET /api/medical-documents returned 200 OK');
  const docList = Array.isArray(listRes.body) ? listRes.body : (listRes.body?.documents || []);
  assert(Array.isArray(docList) && docList.length > 0, 'Documents list returned');
  const foundInList = docList.find((d: any) => d.documentId === storedId);
  assert(Boolean(foundInList), 'Stored document found in patient documents list');

  // STEP 4: Validate Structured Report Construction from Retrieved MongoDB JSON
  console.log('\n--- Step 4: Validating Structured Medical Report from Retrieved JSON ---');
  const reportLabResults = retrievedDoc.rawJson?.labResults || retrievedDoc.labResults;
  assert(Array.isArray(reportLabResults) && reportLabResults.length >= 6, `Structured report contains ${reportLabResults.length} investigations`);
  
  const highAlerts = reportLabResults.filter((l: any) => l.flag === 'HIGH' || l.flag === 'CRITICAL' || l.flag === 'LOW');
  assert(highAlerts.length >= 3, `Identified ${highAlerts.length} high alert / abnormal values for clinical safety banner`);

  const reportMeds = retrievedDoc.rawJson?.medications || retrievedDoc.medications;
  assert(Array.isArray(reportMeds) && reportMeds.length >= 2, `Structured report contains ${reportMeds.length} medications`);

  console.log('\n===========================================================');
  console.log('✅ ALL OCR -> JSON -> MONGODB -> STRUCTURED REPORT TESTS PASSED!');
  console.log('===========================================================\n');
}

runOcrMongoStorageTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
