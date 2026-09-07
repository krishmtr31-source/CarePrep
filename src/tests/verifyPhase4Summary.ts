import http from 'http';
import { handleBackendApiRequest, ensureDatabase } from '../backend/server/apiRouter';
import { clinicalSummaryService } from '../backend/services/clinicalSummaryService';
import { getGeminiModelName } from '../backend/config/geminiConfig';
import { classifyGeminiError } from '../backend/utils/geminiErrorHandler';
import { IStructuredClinicalSummary } from '../shared/types/clinicalSummaryTypes';

process.env.NODE_ENV = 'test';
process.env.GEMINI_MOCK_MODE = 'true';

async function runPhase4Tests() {
  console.log('================================================================');
  console.log('PHASE 4: SMART CLINICAL SUMMARY + DOCTOR-IN-THE-LOOP VERIFICATION');
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

  const PORT = 3096;
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

  const patientIdA = 'patient_p4_001';
  const patientIdB = 'patient_p4_002';
  const doctorId = 'doctor_p4_doc';

  const patientAHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer sih_demo_jwt_${patientIdA}_1725700000`,
    'x-user-id': patientIdA,
    'x-patient-id': patientIdA,
    'x-user-role': 'patient'
  };

  const patientBHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer sih_demo_jwt_${patientIdB}_1725700000`,
    'x-user-id': patientIdB,
    'x-patient-id': patientIdB,
    'x-user-role': 'patient'
  };

  const doctorHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer sih_demo_jwt_${doctorId}_1725700000`,
    'x-user-id': doctorId,
    'x-user-role': 'doctor'
  };

  try {
    // -------------------------------------------------------------
    // Test 1: Configured Gemini model is strictly gemini-3.6-flash
    // -------------------------------------------------------------
    const model = getGeminiModelName();
    assert(model === 'gemini-3.6-flash', 'Test 1: Centralized Gemini Model is gemini-3.6-flash', `Model: ${model}`);

    // -------------------------------------------------------------
    // Test 2: Structured Clinical Summary Generation via service
    // -------------------------------------------------------------
    const sampleContext = {
      patient: { fullName: 'Suresh Raina', age: 38, gender: 'male' },
      intake: { chiefComplaint: 'Severe retrosternal chest pain radiating to left arm', duration: '2 hours', severity: '9/10', symptoms: ['Chest pain', 'Shortness of breath'] },
      medicalHistory: { conditions: ['Hypertension'], surgeries: [], hospitalizations: [] },
      medications: [{ name: 'Amlodipine', dosage: '5mg', frequency: 'OD' }],
      allergies: [],
      familyHistory: ['Father: Coronary artery disease'],
      lifestyle: { smoking: 'Occasional', alcohol: 'Non-drinker' },
      vitals: { bloodPressure: '150/95 mmHg', heartRate: '105 bpm', spo2: '96%' },
      documents: [
        {
          fileName: 'ecg_report.pdf',
          documentType: 'ECG_REPORT',
          documentDate: '2026-09-07',
          summary: 'Sinus tachycardia with ST elevation in anterior leads',
          labResults: [{ testName: 'Troponin I', value: '1.8', unit: 'ng/mL', referenceRange: '0.0 - 0.04', flag: 'HIGH' }]
        }
      ],
      redFlags: [
        {
          ruleId: 'rf-acs-01',
          ruleTitle: 'Suspected Acute Coronary Syndrome',
          severity: 'CRITICAL_EMERGENCY' as const,
          matchedTrigger: 'Chest pain radiating to left arm',
          actionMessage: 'Immediate emergency transfer to cardiac catheterization laboratory'
        }
      ]
    };

    const serviceSummary = await clinicalSummaryService.generateSummary({
      patientId: patientIdA,
      assessmentId: 'asm-p4-001',
      directContext: sampleContext
    });

    assert(
      serviceSummary &&
      serviceSummary.aiGeneratedSummary &&
      serviceSummary.aiGeneratedSummary.chiefComplaint === sampleContext.intake.chiefComplaint &&
      serviceSummary.aiGeneratedSummary.urgency.level === 'emergency',
      'Test 2: Structured clinical summary generated conforming to canonical schema',
      `Urgency: ${serviceSummary.aiGeneratedSummary.urgency.level}, Reason: ${serviceSummary.aiGeneratedSummary.urgency.reason}`
    );

    // -------------------------------------------------------------
    // Test 3: Red-Flag Emergency Preservation (cannot be downgraded)
    // -------------------------------------------------------------
    assert(
      serviceSummary.aiGeneratedSummary.redFlags.length === 1 &&
      serviceSummary.aiGeneratedSummary.redFlags[0].ruleTitle === 'Suspected Acute Coronary Syndrome' &&
      serviceSummary.aiGeneratedSummary.urgency.level === 'emergency',
      'Test 3: Red-Flag emergency status preserved without AI downgrade'
    );

    // -------------------------------------------------------------
    // Test 4: Extracted Medical Document Findings Integration
    // -------------------------------------------------------------
    const docFindings = serviceSummary.aiGeneratedSummary.documentFindings;
    assert(
      docFindings.length > 0 &&
      docFindings.some(f => f.entityName === 'Troponin I' && f.value === '1.8'),
      'Test 4: Extracted medical document laboratory findings cross-referenced with provenance',
      `Found: ${docFindings.map(f => `${f.entityName}: ${f.value}`).join(', ')}`
    );

    // -------------------------------------------------------------
    // Test 5: HTTP Endpoint POST /api/clinical-summary/generate
    // -------------------------------------------------------------
    const httpGenRes = await makeRequest(
      '/api/clinical-summary/generate',
      'POST',
      patientAHeaders,
      {
        patientId: patientIdA,
        assessmentId: 'asm-http-001',
        directContext: sampleContext
      }
    );
    assert(
      httpGenRes.status === 200 &&
      httpGenRes.data.success === true &&
      httpGenRes.data.record &&
      httpGenRes.data.record.reviewStatus === 'AI_GENERATED',
      'Test 5: HTTP POST /api/clinical-summary/generate returns 200 with AI_GENERATED status',
      `Summary ID: ${httpGenRes.data.record?.summaryId}`
    );

    const generatedRecord = httpGenRes.data.record;

    // -------------------------------------------------------------
    // Test 6: HTTP Endpoint GET /api/clinical-summary/:id
    // -------------------------------------------------------------
    const httpGetRes = await makeRequest(
      `/api/clinical-summary/${generatedRecord.summaryId}`,
      'GET',
      patientAHeaders
    );
    assert(
      httpGetRes.status === 200 &&
      httpGetRes.data.success === true &&
      httpGetRes.data.record.summaryId === generatedRecord.summaryId,
      'Test 6: HTTP GET /api/clinical-summary/:id returns generated summary record'
    );

    // -------------------------------------------------------------
    // Test 7: Unauthorized Patient Cross-Access Blocked (HTTP 403)
    // -------------------------------------------------------------
    const crossAccessRes = await makeRequest(
      `/api/clinical-summary/${generatedRecord.summaryId}`,
      'GET',
      patientBHeaders // Different patient
    );
    assert(
      crossAccessRes.status === 403,
      'Test 7: Patient B forbidden from accessing Patient A summary (HTTP 403)',
      `Status: ${crossAccessRes.status}, Error: ${crossAccessRes.data?.error}`
    );

    // -------------------------------------------------------------
    // Test 8: Patient Unauthorized to Review or Confirm (HTTP 403)
    // -------------------------------------------------------------
    const patientReviewRes = await makeRequest(
      `/api/clinical-summary/${generatedRecord.summaryId}/review`,
      'PUT',
      patientAHeaders,
      { doctorNotes: 'Patient attempting to doctor notes' }
    );
    assert(
      patientReviewRes.status === 403,
      'Test 8a: Patient forbidden from submitting doctor reviews (HTTP 403)'
    );

    const patientConfirmRes = await makeRequest(
      `/api/clinical-summary/${generatedRecord.summaryId}/confirm`,
      'POST',
      patientAHeaders,
      { doctorDecision: 'ACCEPTED' }
    );
    assert(
      patientConfirmRes.status === 403,
      'Test 8b: Patient forbidden from confirming clinical summary (HTTP 403)'
    );

    // -------------------------------------------------------------
    // Test 9: Doctor Review & Clinical Amendments (PUT /api/clinical-summary/:id/review)
    // -------------------------------------------------------------
    const doctorAmendRes = await makeRequest(
      `/api/clinical-summary/${generatedRecord.summaryId}/review`,
      'PUT',
      doctorHeaders,
      {
        doctorNotes: 'Patient triaged to Resuscitation Bay 1. Cardiology on call alerted. STAT Troponin confirmed.',
        doctorDecision: 'MODIFIED',
        doctorName: 'Dr. Priya Nambiar, DM Cardiology',
        doctorEditedSummary: {
          ...generatedRecord.aiGeneratedSummary,
          clinicalHighlights: [
            'EMERGENCY: Acute anterior STEMI in progress',
            'Cardiology alerted for primary PCI',
            'Troponin I markedly elevated (1.8 ng/mL)'
          ]
        }
      }
    );
    assert(
      doctorAmendRes.status === 200 &&
      doctorAmendRes.data.record.reviewStatus === 'DOCTOR_EDITED' &&
      doctorAmendRes.data.record.doctorEditedSummary !== undefined &&
      doctorAmendRes.data.record.aiGeneratedSummary !== undefined,
      'Test 9: Doctor review saves amendments while preserving original AI summary immutably',
      `Status: ${doctorAmendRes.data.record?.reviewStatus}, Version: ${doctorAmendRes.data.record?.summaryVersion}`
    );

    // -------------------------------------------------------------
    // Test 10: Doctor Confirmation & Lock (POST /api/clinical-summary/:id/confirm)
    // -------------------------------------------------------------
    const doctorConfirmRes = await makeRequest(
      `/api/clinical-summary/${generatedRecord.summaryId}/confirm`,
      'POST',
      doctorHeaders,
      {
        doctorNotes: 'Confirmed diagnosis of Acute STEMI. Transferred to Cath Lab.',
        doctorDecision: 'ACCEPTED',
        doctorName: 'Dr. Priya Nambiar, DM Cardiology'
      }
    );
    assert(
      doctorConfirmRes.status === 200 &&
      doctorConfirmRes.data.record.reviewStatus === 'DOCTOR_CONFIRMED' &&
      doctorConfirmRes.data.record.confirmedAt !== undefined,
      'Test 10: Doctor confirmation transitions status to DOCTOR_CONFIRMED with sign-off timestamp',
      `Status: ${doctorConfirmRes.data.record?.reviewStatus}, ConfirmedAt: ${doctorConfirmRes.data.record?.confirmedAt}`
    );

    // -------------------------------------------------------------
    // Test 11: Audit Trail Verification
    // -------------------------------------------------------------
    const auditTrail = doctorConfirmRes.data.record.auditTrail;
    assert(
      Array.isArray(auditTrail) &&
      auditTrail.length >= 3 &&
      auditTrail.some((a: any) => a.action === 'GENERATED') &&
      auditTrail.some((a: any) => a.action === 'EDITED') &&
      auditTrail.some((a: any) => a.action === 'CONFIRMED'),
      'Test 11: Audit trail recorded all actions (GENERATED -> EDITED -> CONFIRMED)',
      `Audit steps: ${auditTrail.map((a: any) => a.action).join(' -> ')}`
    );

    // -------------------------------------------------------------
    // Test 12: Missing fields represented as "Not recorded" / null (Never fabricated)
    // -------------------------------------------------------------
    const sparseContext = {
      patient: { fullName: 'Anita Devi' },
      intake: { chiefComplaint: 'Mild dizziness', symptoms: [] },
      medicalHistory: { conditions: [], surgeries: [], hospitalizations: [] },
      medications: [],
      allergies: [],
      familyHistory: [],
      lifestyle: {},
      vitals: {},
      documents: [],
      redFlags: []
    };
    const sparseSummary = await clinicalSummaryService.generateSummary({
      patientId: 'patient_sparse_001',
      directContext: sparseContext
    });
    assert(
      sparseSummary.aiGeneratedSummary.vitals.bloodPressure === 'Not recorded' &&
      sparseSummary.aiGeneratedSummary.patientOverview.gender === 'Not recorded' &&
      sparseSummary.aiGeneratedSummary.urgency.level === 'routine',
      'Test 12: Missing data fields strictly preserved as "Not recorded" or null without fabrication',
      `Vitals BP: ${sparseSummary.aiGeneratedSummary.vitals.bloodPressure}, Gender: ${sparseSummary.aiGeneratedSummary.patientOverview.gender}`
    );

    // -------------------------------------------------------------
    // Test 13: Error Handling for Gemini 429 Quota Exceeded
    // -------------------------------------------------------------
    const mock429Err: any = new Error('429 RESOURCE_EXHAUSTED: quota exceeded');
    mock429Err.status = 429;
    const classified429 = classifyGeminiError(mock429Err);
    assert(
      classified429.code === 'AI_QUOTA_EXCEEDED' &&
      classified429.httpStatus === 429 &&
      classified429.message.includes('quota has been exhausted'),
      'Test 13: Gemini 429 classified safely as AI_QUOTA_EXCEEDED with non-retryable status'
    );

    // -------------------------------------------------------------
    // Test 14: Error Handling for Gemini 503 / Network Timeout
    // -------------------------------------------------------------
    const mockTimeoutErr: any = new Error('ETIMEDOUT connect to gemini API');
    const classifiedTimeout = classifyGeminiError(mockTimeoutErr);
    assert(
      classifiedTimeout.code === 'AI_NETWORK_TIMEOUT' &&
      classifiedTimeout.httpStatus === 504 &&
      classifiedTimeout.retryable === true,
      'Test 14: Gemini network timeout classified as AI_NETWORK_TIMEOUT (504)'
    );

    // -------------------------------------------------------------
    // Test 15: Non-Regression on Phase 2 Red Flags (Routine vs Emergency)
    // -------------------------------------------------------------
    const routineContext = {
      patient: { fullName: 'Kavita Singh' },
      intake: { chiefComplaint: 'Mild allergic rhinitis with sneezing', duration: '1 day', symptoms: ['Sneezing'] },
      medicalHistory: { conditions: [], surgeries: [], hospitalizations: [] },
      medications: [],
      allergies: [],
      familyHistory: [],
      lifestyle: {},
      vitals: {},
      documents: [],
      redFlags: []
    };
    const routineSummary = await clinicalSummaryService.generateSummary({
      patientId: 'pat_routine_001',
      directContext: routineContext
    });
    assert(
      routineSummary.aiGeneratedSummary.urgency.level === 'routine',
      'Test 15: Routine complaint without red flags produces "routine" triage level'
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

runPhase4Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
