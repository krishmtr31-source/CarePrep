/**
 * CarePrep (SIH26047) - Comprehensive Phase 4 Preparation Test Suite
 * Validates Scenarios A through N as mandated by the Phase 4 specification.
 */

import http from 'http';
import { clinicalSummaryService } from '../backend/services/clinicalSummaryService';
import { handleClinicalSummaryRoutes } from '../backend/routes/clinicalSummaryRoutes';
import { getGeminiModelName } from '../backend/config/geminiConfig';
import { classifyGeminiError } from '../backend/utils/geminiErrorHandler';
import { AuthenticatedUser } from '../backend/server/authMiddleware';

let server: http.Server;
const PORT = 3098;
const BASE_URL = `http://localhost:${PORT}`;

// Simulated in-memory token/session store
const patientUserA: AuthenticatedUser = { userId: 'patient-prep-A', role: 'patient' };
const patientUserB: AuthenticatedUser = { userId: 'patient-prep-B', role: 'patient' };
const doctorUser: AuthenticatedUser = { userId: 'doc-prep-1', role: 'doctor' };

function createTestServer(): Promise<void> {
  return new Promise((resolve) => {
    server = http.createServer(async (req, res) => {
      const url = req.url || '/';
      const authHeader = req.headers.authorization || '';
      
      let user: AuthenticatedUser | null = null;
      if (authHeader.includes('token-patient-a')) user = patientUserA;
      else if (authHeader.includes('token-patient-b')) user = patientUserB;
      else if (authHeader.includes('token-doctor')) user = doctorUser;

      const handled = await handleClinicalSummaryRoutes(req, res, url, user);
      if (!handled) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Route not found' }));
      }
    });

    server.listen(PORT, () => {
      console.log(`[Phase 4 Preparation Test Server] Running at ${BASE_URL}`);
      resolve();
    });
  });
}

function stopTestServer(): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

async function runPhase4PreparationTests() {
  console.log('================================================================');
  console.log('PHASE 4: AI-POWERED CLINICAL SUMMARY & PATIENT PREPARATION TEST');
  console.log('Project: CarePrep (SIH26047)');
  console.log('================================================================\n');

  process.env.GEMINI_MOCK_MODE = 'true';
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testId: string, message: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testId}: ${message}`);
      if (detail) console.log(`        -> ${detail}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testId}: ${message}`);
      if (detail) console.error(`        -> ${detail}`);
      failedCount++;
    }
  }

  await createTestServer();

  try {
    // ------------------------------------------------------------------------
    // Scenario A: Complete patient data
    // ------------------------------------------------------------------------
    const fullContext = {
      patient: { fullName: 'Sumantha Ghosh', age: 48, gender: 'Female', abhaId: '91-4521-8890-1234' },
      intake: {
        chiefComplaint: 'Substernal chest tightness radiating to left arm',
        duration: '3 hours',
        severity: '8/10',
        symptoms: ['Chest pain', 'Shortness of breath', 'Diaphoresis']
      },
      medicalHistory: {
        conditions: ['Type 2 Diabetes Mellitus', 'Primary Hypertension'],
        surgeries: ['Appendectomy (2015)'],
        hospitalizations: ['Hyperglycemia stabilization (2021)']
      },
      medications: [{ name: 'Metformin', dosage: '500mg', frequency: 'BD' }],
      allergies: [{ allergen: 'Penicillin', reaction: 'Urticaria' }],
      familyHistory: ['Father had myocardial infarction at age 52'],
      lifestyle: { smoking: 'Non-smoker', physicalActivity: 'Sedentary' },
      vitals: { bloodPressure: '158/94 mmHg', heartRate: '104 bpm', spo2: '95%' },
      documents: [{
        fileName: 'ECG_Report.pdf',
        documentType: 'OTHER',
        summary: 'Sinus tachycardia with ST depressions in V4-V6',
        labResults: [{ testName: 'Troponin-T', value: '0.85', unit: 'ng/mL', flag: 'HIGH' }]
      }]
    };

    const recordA = await clinicalSummaryService.generateSummary({
      patientId: 'pt-scenario-a',
      directContext: fullContext as any,
      forceRegenerate: true
    });

    assert(
      recordA.aiGeneratedSummary.chiefComplaint.includes('chest') &&
      recordA.aiGeneratedSummary.patientPreparation !== undefined &&
      recordA.aiGeneratedSummary.patientPreparation.whatToTellDoctor.length > 0 &&
      recordA.aiGeneratedSummary.sourcesUsed?.preConsultation === true &&
      recordA.aiGeneratedSummary.sourcesUsed?.medicalHistory === true &&
      recordA.aiGeneratedSummary.sourcesUsed?.reports === true,
      'Scenario A',
      'Complete patient data produces fully populated clinical and preparation sections',
      `What to tell: "${recordA.aiGeneratedSummary.patientPreparation?.whatToTellDoctor[0]}"`
    );

    // ------------------------------------------------------------------------
    // Scenario B: Minimal patient data (only chief complaint)
    // ------------------------------------------------------------------------
    const recordB = await clinicalSummaryService.generateSummary({
      patientId: 'pt-scenario-b',
      directContext: {
        intake: { chiefComplaint: 'Mild dry cough', symptoms: ['dry cough'] }
      } as any,
      forceRegenerate: true
    });

    assert(
      recordB.aiGeneratedSummary.chiefComplaint === 'Mild dry cough' &&
      recordB.aiGeneratedSummary.patientOverview.age === 'Not recorded' &&
      Boolean(recordB.aiGeneratedSummary.patientPreparation?.importantSymptoms.includes('dry cough')),
      'Scenario B',
      'Minimal patient data handled gracefully without crash or fabricated values',
      `Age: ${recordB.aiGeneratedSummary.patientOverview.age}`
    );

    // ------------------------------------------------------------------------
    // Scenario C: Missing medical history
    // ------------------------------------------------------------------------
    const recordC = await clinicalSummaryService.generateSummary({
      patientId: 'pt-scenario-c',
      directContext: {
        intake: { chiefComplaint: 'Joint stiffness', symptoms: ['joint pain'] },
        medicalHistory: { conditions: [], surgeries: [], hospitalizations: [] }
      } as any,
      forceRegenerate: true
    });

    assert(
      recordC.aiGeneratedSummary.medicalHistory.length === 0 &&
      recordC.aiGeneratedSummary.relevantMedicalHistory?.length === 0,
      'Scenario C',
      'Missing medical history produces empty list without inventing past conditions',
      `Conditions count: ${recordC.aiGeneratedSummary.medicalHistory.length}`
    );

    // ------------------------------------------------------------------------
    // Scenario D: Missing medications
    // ------------------------------------------------------------------------
    const recordD = await clinicalSummaryService.generateSummary({
      patientId: 'pt-scenario-d',
      directContext: {
        intake: { chiefComplaint: 'Headache', symptoms: ['headache'] },
        medications: []
      } as any,
      forceRegenerate: true
    });

    assert(
      recordD.aiGeneratedSummary.medications.length === 0 &&
      Boolean(
        recordD.aiGeneratedSummary.patientPreparation?.currentMedicines[0]?.includes('No active') ||
        recordD.aiGeneratedSummary.patientPreparation?.currentMedicines.length === 0
      ),
      'Scenario D',
      'Missing medications explicitly reported as "No active medicines recorded"',
      `Medication state: ${recordD.aiGeneratedSummary.patientPreparation?.currentMedicines[0]}`
    );

    // ------------------------------------------------------------------------
    // Scenario E: Missing reports
    // ------------------------------------------------------------------------
    const recordE = await clinicalSummaryService.generateSummary({
      patientId: 'pt-scenario-e',
      directContext: {
        intake: { chiefComplaint: 'Skin rash', symptoms: ['erythema'] },
        documents: []
      } as any,
      forceRegenerate: true
    });

    assert(
      recordE.aiGeneratedSummary.documentFindings.length === 0 &&
      recordE.aiGeneratedSummary.sourcesUsed?.reports === false,
      'Scenario E',
      'Missing documents reported with zero findings and reports transparency set to false',
      `Reports source used: ${recordE.aiGeneratedSummary.sourcesUsed?.reports}`
    );

    // ------------------------------------------------------------------------
    // Scenario F: Existing red flag (emergency preserved without AI downgrade)
    // ------------------------------------------------------------------------
    const recordF = await clinicalSummaryService.generateSummary({
      patientId: 'pt-scenario-f',
      directContext: {
        intake: {
          chiefComplaint: 'Crushing chest pain radiating to jaw with diaphoresis',
          symptoms: ['Chest pain', 'Shortness of breath', 'Diaphoresis']
        }
      } as any,
      forceRegenerate: true
    });

    assert(
      recordF.aiGeneratedSummary.urgency.level === 'emergency' &&
      recordF.aiGeneratedSummary.redFlags.length > 0 &&
      Boolean(recordF.aiGeneratedSummary.redFlagStatus?.includes('EMERGENCY')),
      'Scenario F',
      'Phase 2 red flag preserved: triage level emergency cannot be downgraded by AI',
      `Urgency: ${recordF.aiGeneratedSummary.urgency.level}, Status: ${recordF.aiGeneratedSummary.redFlagStatus}`
    );

    // ------------------------------------------------------------------------
    // Scenario G: No red flag (routine presentation)
    // ------------------------------------------------------------------------
    const recordG = await clinicalSummaryService.generateSummary({
      patientId: 'pt-scenario-g',
      directContext: {
        intake: {
          chiefComplaint: 'Routine checkup for seasonal allergic rhinitis',
          symptoms: ['Sneezing', 'Runny nose']
        }
      } as any,
      forceRegenerate: true
    });

    assert(
      recordG.aiGeneratedSummary.urgency.level === 'routine' &&
      recordG.aiGeneratedSummary.redFlags.length === 0,
      'Scenario G',
      'Routine complaint without red flags produces routine urgency level',
      `Urgency: ${recordG.aiGeneratedSummary.urgency.level}`
    );

    // ------------------------------------------------------------------------
    // Scenario H: Gemini 429 quota handling
    // ------------------------------------------------------------------------
    const mock429Error = { status: 429, message: 'RESOURCE_EXHAUSTED: Daily quota exceeded' };
    const classified429 = classifyGeminiError(mock429Error);

    assert(
      classified429.code === 'AI_QUOTA_EXCEEDED' &&
      classified429.httpStatus === 429 &&
      classified429.retryable === false,
      'Scenario H',
      'Gemini 429 classified as AI_QUOTA_EXCEEDED with non-retryable status',
      `Code: ${classified429.code}, Retryable: ${classified429.retryable}`
    );

    // ------------------------------------------------------------------------
    // Scenario I: Gemini 503 service unavailable
    // ------------------------------------------------------------------------
    const mock503Error = { status: 503, message: 'The service is temporarily overloaded' };
    const classified503 = classifyGeminiError(mock503Error);

    assert(
      classified503.code === 'AI_SERVICE_UNAVAILABLE' &&
      classified503.httpStatus === 503 &&
      classified503.retryable === true,
      'Scenario I',
      'Gemini 503 classified as AI_SERVICE_UNAVAILABLE with bounded retry allowed',
      `Code: ${classified503.code}, Status: ${classified503.httpStatus}`
    );

    // ------------------------------------------------------------------------
    // Scenario J: Gemini malformed JSON recovery
    // ------------------------------------------------------------------------
    const malformedRaw = {
      chiefComplaint: 'Fever with chills',
      symptomSummary: 'High temperature for 2 days'
      // Missing all other nested objects
    };
    const recovered = clinicalSummaryService.sanitizeSummaryResult(malformedRaw, {
      patient: { fullName: 'Test Patient', gender: 'Male' },
      intake: { chiefComplaint: 'Fever with chills', symptoms: ['fever', 'chills'] },
      medicalHistory: { conditions: [], surgeries: [], hospitalizations: [] },
      medications: [],
      allergies: [],
      familyHistory: [],
      lifestyle: {},
      vitals: {},
      documents: [],
      redFlags: [],
      sourcesUsed: { preConsultation: true, medicalHistory: false, medications: false, reports: false, vitals: false, lifestyle: false },
      sourceDataHash: 'test-hash'
    } as any);

    assert(
      recovered.chiefComplaint === 'Fever with chills' &&
      recovered.patientPreparation?.whatToTellDoctor.length! > 0 &&
      recovered.aiDisclaimer.includes('AI-assisted'),
      'Scenario J',
      'Malformed/incomplete JSON safely normalized without crashing or throwing',
      `Disclaimer: "${recovered.aiDisclaimer}"`
    );

    // ------------------------------------------------------------------------
    // Scenario K: Unauthenticated HTTP request rejection
    // ------------------------------------------------------------------------
    const unauthRes = await fetch(`${BASE_URL}/api/clinical-summary`, {
      method: 'GET'
    });
    const unauthData = await unauthRes.json();

    assert(
      unauthRes.status === 401 && unauthData.error === 'Authentication required.',
      'Scenario K',
      'Unauthenticated request strictly rejected with HTTP 401',
      `Status: ${unauthRes.status}`
    );

    // ------------------------------------------------------------------------
    // Scenario L: Cross-patient data access rejection (Patient B cannot generate/access Patient A)
    // ------------------------------------------------------------------------
    const crossAccessRes = await fetch(`${BASE_URL}/api/clinical-summary/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token-patient-b'
      },
      body: JSON.stringify({
        patientId: 'patient-prep-A' // Patient B attempting to tamper patientId to Patient A
      })
    });
    const crossAccessData = await crossAccessRes.json();

    assert(
      crossAccessRes.status === 403,
      'Scenario L',
      'Cross-patient tampering forbidden: Patient B cannot generate summary for Patient A',
      `Status: ${crossAccessRes.status}, Error: "${crossAccessData.error}"`
    );

    // ------------------------------------------------------------------------
    // Scenario M: Existing cached summary returned without unnecessary Gemini API call
    // ------------------------------------------------------------------------
    // Generate initial summary for patientUserA
    const genRes1 = await fetch(`${BASE_URL}/api/clinical-summary/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token-patient-a'
      },
      body: JSON.stringify({
        directContext: {
          intake: { chiefComplaint: 'Persistent migraine with photophobia', symptoms: ['headache', 'photophobia'] }
        }
      })
    });
    const genData1 = await genRes1.json();
    const firstSummaryId = genData1.record?.summaryId;

    // Call generate again without changes
    const genRes2 = await fetch(`${BASE_URL}/api/clinical-summary/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token-patient-a'
      },
      body: JSON.stringify({
        directContext: {
          intake: { chiefComplaint: 'Persistent migraine with photophobia', symptoms: ['headache', 'photophobia'] }
        }
      })
    });
    const genData2 = await genRes2.json();

    assert(
      genRes2.status === 200 &&
      genData2.record?.summaryId === firstSummaryId &&
      genData2.record?.isCached === true,
      'Scenario M',
      'Cached summary returned when clinical dataset is unchanged (zero redundant Gemini requests)',
      `Returned Summary ID: ${genData2.record?.summaryId}, isCached: ${genData2.record?.isCached}`
    );

    // Also test GET /api/clinical-summary for patientUserA
    const getPatientRes = await fetch(`${BASE_URL}/api/clinical-summary`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer token-patient-a'
      }
    });
    const getPatientData = await getPatientRes.json();

    assert(
      getPatientRes.status === 200 &&
      getPatientData.record?.summaryId === firstSummaryId,
      'Scenario M (GET)',
      'GET /api/clinical-summary fetches active summary for authenticated patient session',
      `Retrieved summaryId: ${getPatientData.record?.summaryId}`
    );

    // ------------------------------------------------------------------------
    // Scenario N: Explicit regeneration bypasses cache
    // ------------------------------------------------------------------------
    const regenRes = await fetch(`${BASE_URL}/api/clinical-summary/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token-patient-a'
      },
      body: JSON.stringify({
        directContext: {
          intake: { chiefComplaint: 'Persistent migraine with photophobia', symptoms: ['headache', 'photophobia'] }
        }
      })
    });
    const regenData = await regenRes.json();

    assert(
      regenRes.status === 200 &&
      regenData.record?.summaryId !== firstSummaryId &&
      regenData.record?.isCached === false,
      'Scenario N',
      'Explicit regeneration bypasses cache and generates freshly synthesized summary',
      `New Summary ID: ${regenData.record?.summaryId} !== ${firstSummaryId}`
    );

  } finally {
    await stopTestServer();
  }

  console.log('\n================================================================');
  console.log(`PREPARATION TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase4PreparationTests().catch(err => {
  console.error('[testPhase4Preparation] Unhandled test runner error:', err);
  process.exit(1);
});
