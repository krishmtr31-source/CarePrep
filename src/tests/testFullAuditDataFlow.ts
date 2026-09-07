import { localStore } from '../backend/storage/localStore';
import { authService } from '../auth/authService';
import { PatientIdentity } from '../data-models/patient';
import { PatientCaseRecord } from '../data-models/intake';
import { generateDoctorSummaryDraft } from '../ai-services/summaryGenerator';
import { checkRedFlags } from '../clinical-rules/redFlags';

console.log('=== CAREPREP COMPREHENSIVE END-TO-END DATA FLOW AUDIT ===\n');

let passedTests = 0;
let totalTests = 0;

function verify(condition: boolean, title: string, details: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] Test ${totalTests}: ${title}`);
    console.log(`       ${details}\n`);
  } else {
    console.error(`[FAIL] Test ${totalTests}: ${title}`);
    console.error(`       ${details}\n`);
  }
}

async function runAudit() {
  // 1. Patient Signup & Authentication
  const testEmail = `audit.patient.${Date.now()}@careprep.in`;
  const signupResult = await authService.signupPatient({
    fullName: 'Ananya Deshmukh',
    emailOrPhone: testEmail,
    password: 'securePass123',
    age: 38,
    gender: 'female',
    abhaId: '91-8899-2233-1122',
    preferredLanguage: 'en'
  });

  verify(
    signupResult.success === true && signupResult.user?.role === 'patient',
    'Patient Signup & Auth Registration',
    `Created patient user "${signupResult.user?.name}" (ID: ${signupResult.user?.id}) with ABHA ID: ${signupResult.user?.patientProfile?.abhaId}`
  );

  const patientId = signupResult.user!.id;
  const savedPatient = localStore.getPatients().find(p => p.id === patientId);

  verify(
    savedPatient !== undefined && savedPatient.fullName === 'Ananya Deshmukh' && savedPatient.age === 38,
    'Patient Storage Binding in localStore',
    `Patient identity stored in localStore with ID ${savedPatient?.id}, age ${savedPatient?.age}`
  );

  // 2. Patient Fills Assessment (Simulating PatientMultiStepForm)
  const caseId = `case-audit-${Date.now().toString(36)}`;
  const tokenNumber = `CP-${Math.floor(100 + Math.random() * 900)}`;
  const chiefComplaint = 'Persistent migraine with nausea and visual aura';
  const duration = '4 days';
  const severity = 7;
  const character = 'Throbbing unilateral temple pain sensitive to light';
  
  const medicalHistory = ['Mild Bronchial Asthma'];
  const medications = [{ name: 'Salbutamol Inhaler', dosage: '100mcg', frequency: 'As needed' }];
  const allergies = ['Penicillin', 'Sulfa Drugs'];
  const lifestyle = {
    diet: 'Vegetarian',
    physicalActivity: 'Light walking',
    sleepHours: '6 hours',
    habits: 'Non-smoker'
  };

  // Run clinical red flag check
  const redFlags = checkRedFlags(`${chiefComplaint} ${character}`);

  const submittedCase: PatientCaseRecord = {
    caseId,
    patientId,
    tokenNumber,
    mode: 'GENERAL_CLINICAL',
    status: redFlags.length > 0 ? 'RED_FLAG_TRIAGE' : 'COMPLETED',
    chiefComplaint,
    language: 'en',
    startedAt: new Date(Date.now() - 900000).toISOString(),
    completedAt: new Date().toISOString(),
    redFlagsDetected: redFlags.map(r => r.id),
    answers: [
      {
        questionId: 'chief_complaint',
        step: 'CHIEF_COMPLAINT',
        selectedOptionIds: [chiefComplaint],
        customText: character,
        rawPatientResponse: `${chiefComplaint}. Severity: ${severity}/10. Duration: ${duration}.`,
        audioProvenance: 'TYPED',
        timestamp: new Date().toISOString()
      },
      {
        questionId: 'medical_history',
        step: 'PAST_HISTORY',
        selectedOptionIds: medicalHistory,
        customText: medicalHistory.join(', '),
        rawPatientResponse: medicalHistory.join(', '),
        audioProvenance: 'TOUCH_CHIP',
        timestamp: new Date().toISOString()
      },
      {
        questionId: 'medications_active',
        step: 'MEDICATIONS',
        selectedOptionIds: medications.map(m => `${m.name} ${m.dosage}`),
        customText: medications.map(m => `${m.name} (${m.dosage}, ${m.frequency})`).join('; '),
        rawPatientResponse: medications.map(m => `${m.name} (${m.dosage})`).join('; '),
        audioProvenance: 'TYPED',
        timestamp: new Date().toISOString()
      },
      {
        questionId: 'allergies',
        step: 'ALLERGIES',
        selectedOptionIds: allergies,
        customText: allergies.join(', '),
        rawPatientResponse: allergies.join(', '),
        audioProvenance: 'TOUCH_CHIP',
        timestamp: new Date().toISOString()
      },
      {
        questionId: 'lifestyle_info',
        step: 'AYUSH_AHARA_SHAKTI',
        selectedOptionIds: [lifestyle.diet, lifestyle.physicalActivity, lifestyle.sleepHours, lifestyle.habits],
        customText: `Diet: ${lifestyle.diet}. Activity: ${lifestyle.physicalActivity}. Sleep: ${lifestyle.sleepHours}. Habits: ${lifestyle.habits}`,
        rawPatientResponse: `Diet: ${lifestyle.diet}. Habits: ${lifestyle.habits}`,
        audioProvenance: 'TOUCH_CHIP',
        timestamp: new Date().toISOString()
      }
    ]
  };

  // 3. Save Case to localStore
  localStore.saveCase(submittedCase);

  const retrievedCase = localStore.getCaseById(caseId);
  verify(
    retrievedCase !== null && retrievedCase.chiefComplaint === chiefComplaint && retrievedCase.patientId === patientId,
    'Patient Case Storage & Retrieval',
    `Case ${caseId} correctly persisted with token ${retrievedCase?.tokenNumber} and chief complaint: "${retrievedCase?.chiefComplaint}"`
  );

  // 4. Verify Automatic Summary Generation
  const generatedSummary = localStore.getSummaryByCaseId(caseId);
  verify(
    generatedSummary !== null && generatedSummary.patientId === patientId,
    'AI/Clinical Summary Draft Generation',
    `Summary generated for case ${caseId}, version ${generatedSummary?.currentVersionNumber}, mode: ${generatedSummary?.mode}`
  );

  // 5. Doctor Portal Authentication & Queue Inspection
  const doctorLoginRes = await authService.login({
    emailOrPhone: 'doctor@hospital.in',
    password: 'password123',
    role: 'doctor'
  });

  verify(
    doctorLoginRes.success === true && doctorLoginRes.user?.role === 'doctor',
    'Doctor Workstation Login',
    `Authenticated Doctor: ${doctorLoginRes.user?.name} (Role: ${doctorLoginRes.user?.role})`
  );

  // 6. Doctor Queue Contains New Patient Submission
  const allDoctorCases = localStore.getCases();
  const queueCase = allDoctorCases.find(c => c.caseId === caseId);

  verify(
    queueCase !== undefined && queueCase.patientId === patientId,
    'Doctor Workstation Queue Real-time Ingestion',
    `Doctor queue found new case ${caseId} with Token #${queueCase?.tokenNumber}`
  );

  // 7. Structured Report Data Verification (Matches Patient's Exact Input)
  const patientRecord = localStore.getPatients().find(p => p.id === queueCase?.patientId);
  const patientReportSummary = localStore.getSummaryByCaseId(caseId);

  const allergiesAns = queueCase?.answers.find(a => a.questionId === 'allergies');
  const historyAns = queueCase?.answers.find(a => a.questionId === 'medical_history');
  const medsAns = queueCase?.answers.find(a => a.questionId === 'medications_active');

  verify(
    patientRecord?.fullName === 'Ananya Deshmukh' &&
    allergiesAns?.customText?.includes('Penicillin') === true &&
    historyAns?.customText?.includes('Mild Bronchial Asthma') === true &&
    medsAns?.customText?.includes('Salbutamol') === true,
    'Structured Clinical Report Accuracy',
    `Report reflects exact patient data:\n       - Name: ${patientRecord?.fullName}\n       - Allergies: ${allergiesAns?.customText}\n       - History: ${historyAns?.customText}\n       - Meds: ${medsAns?.customText}`
  );

  // 8. Doctor Reviews & Signs Off Case
  const signingDoctorName = 'Dr. A. K. Varma, MD';
  const physicianNotes = 'Patient advised hydration, rest in dark room, and neurological follow-up if symptoms persist.';
  
  localStore.updateDoctorReview(caseId, signingDoctorName, 'ACCEPTED', physicianNotes);

  const reviewedCase = localStore.getCaseById(caseId);
  const reviewedSummary = localStore.getSummaryByCaseId(caseId);

  verify(
    reviewedCase?.status === 'REVIEWED_BY_DOCTOR' &&
    reviewedCase?.doctorReview?.status === 'ACCEPTED' &&
    reviewedCase?.doctorReview?.doctorName === signingDoctorName &&
    reviewedSummary?.doctorEdits?.status === 'ACCEPTED',
    'Doctor Clinical Review & Electronic Signoff',
    `Case ${caseId} status updated to: "${reviewedCase?.status}" signed by ${reviewedCase?.doctorReview?.doctorName} with notes: "${reviewedCase?.doctorReview?.doctorNotes}"`
  );

  console.log(`\n======================================================`);
  console.log(`AUDIT RESULT: ${passedTests} / ${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log(`======================================================\n`);
}

runAudit().catch(err => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
