import { localStore } from '../backend/storage/localStore';
import { PatientIdentity } from '../data-models/patient';
import { PatientCaseRecord } from '../data-models/intake';
import { authService } from '../auth/authService';

console.log('=== CAREPREP SIH26047: PATIENT COMPLETION -> DOCTOR HANDOVER TEST SUITE ===\n');

let passCount = 0;
let totalCount = 0;

function assert(condition: any, testNum: number, name: string, details: string) {
  totalCount++;
  if (condition) {
    passCount++;
    console.log(`[PASS] Test ${testNum}: ${name}`);
    console.log(`       Details: ${details}`);
  } else {
    console.error(`[FAIL] Test ${testNum}: ${name}`);
    console.error(`       Details: ${details}`);
  }
}

async function runTests() {
  // Test 1: Patient signs up and creates active profile
  const patientEmail = `patient.flow.${Date.now()}@example.com`;
  const signupRes = await authService.signupPatient({
    fullName: 'Meera Nambiar',
    emailOrPhone: patientEmail,
    password: 'password123',
    age: 42,
    gender: 'female',
    abhaId: '91-3344-5566-7788',
    preferredLanguage: 'en'
  });

  assert(
    signupRes.success === true && signupRes.user?.role === 'patient',
    1,
    'Patient Account Setup',
    `Authenticated Patient: ${signupRes.user?.name} (${signupRes.user?.id})`
  );

  const patientId = signupRes.user!.id;
  const initialCasesCount = localStore.getCases().length;

  // Test 2: Case Submission Generation
  const newCaseId = `case-handover-${Date.now().toString(36)}`;
  const tokenNumber = `C-${100 + initialCasesCount + 1}`;
  const queuePosition = localStore.getCases().filter(c => c.status !== 'REVIEWED_BY_DOCTOR').length + 1;

  const completedCase: PatientCaseRecord = {
    caseId: newCaseId,
    patientId: patientId,
    mode: 'GENERAL_CLINICAL',
    status: 'SUBMITTED_TO_DOCTOR',
    chiefComplaint: 'Severe throbbing migraine with photophobia since 2 days',
    tokenNumber: tokenNumber,
    queuePosition: queuePosition,
    startedAt: new Date(Date.now() - 600000).toISOString(),
    completedAt: new Date().toISOString(),
    redFlagsDetected: [],
    language: 'en',
    answers: [
      {
        questionId: 'socrates_chief_complaint',
        step: 'CHIEF_COMPLAINT',
        selectedOptionIds: ['Severe Headache / Migraine'],
        customText: 'Pulsating right temporal headache with nausea and light sensitivity',
        audioProvenance: 'VOICE',
        timestamp: new Date().toISOString()
      },
      {
        questionId: 'socrates_severity',
        step: 'SOCRATES_SEVERITY',
        selectedOptionIds: ['8/10 (Severe pain, prevents normal activities)'],
        customText: '8 out of 10',
        audioProvenance: 'TOUCH_CHIP',
        timestamp: new Date().toISOString()
      }
    ]
  };

  // Test 3: Save to Shared Storage State
  localStore.saveCase(completedCase);

  const storedCase = localStore.getCaseById(newCaseId);
  assert(
    storedCase !== null && storedCase.status === 'SUBMITTED_TO_DOCTOR' && storedCase.tokenNumber === tokenNumber,
    2,
    'Patient Intake Submission to Shared Registry',
    `Case ${newCaseId} saved with status: "${storedCase?.status}", Token: ${storedCase?.tokenNumber}, Position: #${storedCase?.queuePosition}`
  );

  // Test 4: Doctor Queue Receives the Case
  const doctorQueue = localStore.getCases();
  const queueCase = doctorQueue.find(c => c.caseId === newCaseId);

  assert(
    queueCase !== undefined && queueCase.patientId === patientId,
    3,
    'Doctor Queue Shared State Reception',
    `Doctor queue received patient case ${queueCase?.caseId} in position #${queueCase?.queuePosition}`
  );

  // Test 5: AI Clinical Summary Auto-Generated & Available for Doctor Review
  const summaryDraft = localStore.getSummaryByCaseId(newCaseId);
  assert(
    summaryDraft !== null && summaryDraft.chiefComplaint.normalizedText.length > 0,
    4,
    'Doctor Summary Draft Auto-Synthesis',
    `Summary Draft generated for Doctor Review: "${summaryDraft?.chiefComplaint.normalizedText}"`
  );

  // Test 6: Doctor Can Review and Accept Case
  localStore.updateDoctorReview(
    newCaseId,
    'Dr. Ananya Sharma',
    'ACCEPTED',
    'Migraine with aura confirmed. Prescribed Sumatriptan 50mg PRN and resting in dark room.',
    'Verified via CarePrep Doctor Console'
  );

  const reviewedCase = localStore.getCaseById(newCaseId);
  assert(
    reviewedCase?.status === 'REVIEWED_BY_DOCTOR' && reviewedCase?.doctorReview?.status === 'ACCEPTED',
    5,
    'Doctor Review & Versioned EMR Signing',
    `Doctor ${reviewedCase?.doctorReview?.doctorName} reviewed and marked case as ${reviewedCase?.doctorReview?.status}`
  );

  // Test 7: Patient Role-Based Protection Remains Intact
  const patientCrossAccess = await authService.login({
    emailOrPhone: patientEmail,
    password: 'password123',
    role: 'doctor'
  });

  assert(
    patientCrossAccess.success === false,
    6,
    'Patient RBAC Protection Maintained (Patient Cannot Access Doctor Role)',
    `Blocked cross-role access: "${patientCrossAccess.error}"`
  );

  console.log(`\nTOTAL COMPLETION & HANDOVER TESTS: ${passCount} / ${totalCount} PASSED.`);
}

runTests().catch(err => {
  console.error('Error in handover test suite:', err);
});
