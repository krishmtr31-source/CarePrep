import { generateDoctorSummaryDraft } from '../ai-services/summaryGenerator';
import { processDocumentText } from '../document-intelligence/parsers/documentPipeline';
import { SAMPLE_DOCUMENTS } from '../document-intelligence/samples/sampleDocuments';
import { localStore } from '../backend/storage/localStore';
import { PatientIdentity } from '../data-models/patient';
import { PatientCaseRecord } from '../data-models/intake';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details: string) {
  results.push({
    name,
    passed: condition,
    details: condition ? details : `FAILED: ${details}`
  });
}

console.log('=== PHASE 3: FINAL VALIDATION & HARDENING TEST SUITE ===\n');

// Common patient fixture
const testPatient: PatientIdentity = {
  id: 'pat-test-101',
  fullName: 'Arjun Verma',
  age: 45,
  gender: 'male',
  abhaId: '14-8899-2341-9988',
  phoneNumber: '+91 98111 22334',
  city: 'Delhi',
  preferredLanguage: 'en',
  createdAt: new Date().toISOString()
};

// Case A — Simple Headache
const headacheCase: PatientCaseRecord = {
  caseId: 'case-h-01',
  patientId: testPatient.id,
  mode: 'GENERAL_CLINICAL',
  status: 'COMPLETED',
  chiefComplaint: 'Mild headache for two days',
  language: 'en',
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  redFlagsDetected: [],
  answers: [
    {
      questionId: 'q1',
      step: 'CHIEF_COMPLAINT',
      rawPatientResponse: 'Mild headache for two days',
      audioProvenance: 'VOICE',
      structuredInterpretation: {
        detectedChiefComplaint: 'Headache',
        detectedDuration: '2 days'
      },
      timestamp: new Date().toISOString()
    }
  ]
};
const summaryA = generateDoctorSummaryDraft(testPatient, headacheCase, []);
assert(
  summaryA.chiefComplaint.normalizedText === 'Headache' &&
  summaryA.hpiStructured.duration === '2 days' &&
  summaryA.hpiStructured.severity === 'Not provided.',
  '1. Case A — Simple Headache (No false negative findings or invented severity)',
  `Chief Complaint: ${summaryA.chiefComplaint.normalizedText}, Duration: ${summaryA.hpiStructured.duration}, Severity: "${summaryA.hpiStructured.severity}"`
);

// Case B — Abdominal Pain with Preserved Verbatim
const abdCase: PatientCaseRecord = {
  caseId: 'case-abd-01',
  patientId: testPatient.id,
  mode: 'GENERAL_CLINICAL',
  status: 'COMPLETED',
  chiefComplaint: 'Pet mein teen din se pain hai',
  language: 'hi',
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  redFlagsDetected: [],
  answers: [
    {
      questionId: 'q1',
      step: 'CHIEF_COMPLAINT',
      rawPatientResponse: 'Pet mein teen din se pain hai',
      audioProvenance: 'VOICE',
      structuredInterpretation: {
        detectedChiefComplaint: 'Abdominal / Stomach Pain',
        detectedDuration: '3 days'
      },
      timestamp: new Date().toISOString()
    }
  ]
};
const summaryB = generateDoctorSummaryDraft(testPatient, abdCase, []);
assert(
  summaryB.chiefComplaint.rawPatientVerbatim === 'Pet mein teen din se pain hai' &&
  summaryB.hpiStructured.duration === '3 days',
  '2. Case B — Abdominal Pain (Verbatim preserved & labeled as automated interpretation)',
  `Verbatim: "${summaryB.chiefComplaint.rawPatientVerbatim}" -> Interpreted: ${summaryB.chiefComplaint.normalizedText}`
);

// Case C — Emergency Presentation (Deterministic Red Flag, No Autonomous Diagnosis)
const emergCase: PatientCaseRecord = {
  caseId: 'case-emerg-01',
  patientId: testPatient.id,
  mode: 'GENERAL_CLINICAL',
  status: 'COMPLETED',
  chiefComplaint: 'Severe chest pain with difficulty breathing',
  language: 'en',
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  redFlagsDetected: [],
  answers: [
    {
      questionId: 'q1',
      step: 'CHIEF_COMPLAINT',
      rawPatientResponse: 'Severe chest pain with difficulty breathing',
      audioProvenance: 'VOICE',
      timestamp: new Date().toISOString()
    }
  ]
};
const summaryC = generateDoctorSummaryDraft(testPatient, emergCase, []);
assert(
  summaryC.redFlagTriage.status === 'RED' &&
  summaryC.redFlagTriage.alerts.length >= 2 &&
  summaryC.previousDiagnoses.length === 0,
  '3. Case C — Emergency Presentation (Deterministic triage triggered, no medical diagnosis)',
  `Triage Status: ${summaryC.redFlagTriage.status}, Triggers: ${summaryC.redFlagTriage.alerts.map(a => a.ruleTitle).join('; ')}`
);

// Case D — Medication Conflict (Patient 1000mg vs Prescription 500mg)
const rxDoc = processDocumentText(SAMPLE_DOCUMENTS[0].rawText, SAMPLE_DOCUMENTS[0].name, 'sample', SAMPLE_DOCUMENTS[0].type);
const medConflictCase: PatientCaseRecord = {
  caseId: 'case-med-conf-01',
  patientId: testPatient.id,
  mode: 'GENERAL_CLINICAL',
  status: 'COMPLETED',
  chiefComplaint: 'Follow up',
  language: 'en',
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  redFlagsDetected: [],
  answers: [
    {
      questionId: 'q_med',
      step: 'CHIEF_COMPLAINT',
      rawPatientResponse: 'I am taking Metformin 1000mg twice daily',
      structuredInterpretation: {
        detectedMedications: ['Metformin 1000mg twice daily']
      },
      timestamp: new Date().toISOString()
    }
  ]
};
const summaryD = generateDoctorSummaryDraft(testPatient, medConflictCase, [rxDoc]);
assert(
  summaryD.medicationConflicts.length > 0 &&
  summaryD.medicationConflicts[0].medicationName.toLowerCase().includes('metformin'),
  '4. Case D — Medication Conflict Detection (Patient 1000mg vs Doc 500mg)',
  `Conflict: ${summaryD.medicationConflicts[0]?.patientStatement} vs ${summaryD.medicationConflicts[0]?.documentStatement}`
);

// Case D2 — No Manufactured Conflict (Patient mentions medicine without dosage)
const noConflictCase: PatientCaseRecord = {
  caseId: 'case-med-no-conf-01',
  patientId: testPatient.id,
  mode: 'GENERAL_CLINICAL',
  status: 'COMPLETED',
  chiefComplaint: 'Follow up',
  language: 'en',
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  redFlagsDetected: [],
  answers: [
    {
      questionId: 'q_med',
      step: 'CHIEF_COMPLAINT',
      rawPatientResponse: 'I take Metformin regularly',
      structuredInterpretation: {
        detectedMedications: ['Metformin']
      },
      timestamp: new Date().toISOString()
    }
  ]
};
const summaryD2 = generateDoctorSummaryDraft(testPatient, noConflictCase, [rxDoc]);
assert(
  summaryD2.medicationConflicts.length === 0,
  '5. Case D2 — No Manufactured Conflict when Patient does not state a dosage',
  `Conflicts generated: ${summaryD2.medicationConflicts.length} (Correctly avoided false positive)`
);

// Case E — Missing Information (Preserved as "Not provided.")
assert(
  summaryA.hpiStructured.aggravatingFactors === 'Not provided.' &&
  summaryA.hpiStructured.relievingFactors === 'Not provided.' &&
  summaryA.hpiStructured.associatedSymptoms === 'Not provided.',
  '6. Case E — Missing Information Integrity',
  'All unstated clinical dimensions remain strictly "Not provided."'
);

// Case F — Abnormal Lab Observation Only (No inferred diagnosis)
const labDoc = processDocumentText(SAMPLE_DOCUMENTS[1].rawText, SAMPLE_DOCUMENTS[1].name, 'sample', SAMPLE_DOCUMENTS[1].type);
const summaryF = generateDoctorSummaryDraft(testPatient, headacheCase, [labDoc]);
assert(
  summaryF.abnormalLabFindings.some(l => l.testName.toLowerCase().includes('hba1c') && l.flag === 'HIGH') &&
  summaryF.previousDiagnoses.length === 0,
  '7. Case F — Abnormal Lab Observation (HbA1c 8.4% HIGH reported without inventing diabetes diagnosis)',
  `Abnormal labs: ${summaryF.abnormalLabFindings.map(l => `${l.testName}: ${l.resultValue} ${l.unit} [${l.flag}]`).join(', ')}`
);

// Case G — Physician Modification (v1 system draft preserved, v2 created)
localStore.saveCase(headacheCase);
localStore.updateDoctorReview('case-h-01', 'Dr. A. K. Varma', 'MODIFIED', 'Patient examined; tension-type headache diagnosed. Acetaminophen advised.');
const v2Summary = localStore.getSummaryByCaseId('case-h-01');
assert(
  v2Summary !== null &&
  v2Summary.currentVersionNumber === 2 &&
  v2Summary.versions.length === 2 &&
  v2Summary.versions[0].authoredBy === 'AI_DRAFT' &&
  v2Summary.versions[1].authoredBy === 'PHYSICIAN',
  '8. Case G — Physician Modification & Versioning (v1 preserved, v2 clinician authored)',
  `Version 1 Author: ${v2Summary?.versions[0]?.authoredBy}, Version 2 Author: ${v2Summary?.versions[1]?.authoredBy}`
);

// Case H — Physician Rejection with Recorded Reason
const rejectCase: PatientCaseRecord = {
  caseId: 'case-rej-01',
  patientId: testPatient.id,
  mode: 'GENERAL_CLINICAL',
  status: 'COMPLETED',
  chiefComplaint: 'Unverified input',
  language: 'en',
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  redFlagsDetected: [],
  answers: []
};
localStore.saveCase(rejectCase);
localStore.updateDoctorReview('case-rej-01', 'Dr. A. K. Varma', 'REJECTED', 'Rejection Reason: Incorrect patient record selected by intake kiosk.', 'Incorrect patient record');
const rejSummary = localStore.getSummaryByCaseId('case-rej-01');
assert(
  rejSummary !== null &&
  rejSummary.doctorEdits?.status === 'REJECTED' &&
  rejSummary.auditTrail.some(a => a.action === 'REJECTED'),
  '9. Case H — Physician Rejection with Recorded Reason & Audit Entry',
  `Status: ${rejSummary?.doctorEdits?.status}, Audit action: REJECTED recorded`
);

// Case I — Response Modality Preservation (Voice, Typed, Touch)
const mixedCase: PatientCaseRecord = {
  caseId: 'case-mix-01',
  patientId: testPatient.id,
  mode: 'GENERAL_CLINICAL',
  status: 'COMPLETED',
  chiefComplaint: 'Fever and body pain',
  language: 'hi',
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  redFlagsDetected: [],
  answers: [
    {
      questionId: 'q_v',
      step: 'CHIEF_COMPLAINT',
      rawPatientResponse: 'Fever since yesterday',
      audioProvenance: 'VOICE',
      timestamp: new Date().toISOString()
    },
    {
      questionId: 'q_t',
      step: 'SOCRATES_CHARACTER',
      rawPatientResponse: 'High temperature with chills',
      audioProvenance: 'TYPED',
      timestamp: new Date().toISOString()
    },
    {
      questionId: 'q_tc',
      step: 'SOCRATES_SEVERITY',
      selectedOptionIds: ['Moderate'],
      audioProvenance: 'TOUCH_CHIP',
      timestamp: new Date().toISOString()
    }
  ]
};
const summaryI = generateDoctorSummaryDraft(testPatient, mixedCase, []);
assert(
  summaryI.patientVerbatimStatements.some(s => s.modality === 'VOICE') &&
  summaryI.patientVerbatimStatements.some(s => s.modality === 'TYPED') &&
  summaryI.patientVerbatimStatements.some(s => s.modality === 'TOUCH_CHIP'),
  '10. Response Modality Provenance (Voice, Typed, Touch preserved verbatim)',
  `Modalities: ${summaryI.patientVerbatimStatements.map(s => s.modality).join(', ')}`
);

// Case J — AYUSH Dashavidha Separate Patient vs Clinician Demarcation
const ayushCase: PatientCaseRecord = {
  caseId: 'case-ayush-01',
  patientId: testPatient.id,
  mode: 'AYUSH',
  status: 'COMPLETED',
  chiefComplaint: 'Sandhivata joint stiffness',
  language: 'hi',
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  redFlagsDetected: [],
  answers: [
    {
      questionId: 'q_prakriti',
      step: 'AYUSH_PRAKRITI',
      rawPatientResponse: 'Vata Predominant',
      audioProvenance: 'TOUCH_CHIP',
      timestamp: new Date().toISOString()
    }
  ]
};
const summaryJ = generateDoctorSummaryDraft(testPatient, ayushCase, []);
assert(
  summaryJ.ayushAssessment !== undefined &&
  summaryJ.ayushAssessment.prakriti === 'Vata Predominant' &&
  summaryJ.ayushAssessment.patientReportedNotes.includes('Requires clinician'),
  '11. AYUSH Dashavidha Demarcation (Patient-reported vs Clinician assessment required)',
  `Prakriti: ${summaryJ.ayushAssessment?.prakriti}`
);

// Case K — Document Timeline & Chronological Ordering
const dcDoc = processDocumentText(SAMPLE_DOCUMENTS[2].rawText, SAMPLE_DOCUMENTS[2].name, 'sample', SAMPLE_DOCUMENTS[2].type);
const summaryK = generateDoctorSummaryDraft(testPatient, headacheCase, [rxDoc, labDoc, dcDoc]);
assert(
  summaryK.timelineEvents.length >= 5 &&
  new Date(summaryK.timelineEvents[0].date).getTime() >= new Date(summaryK.timelineEvents[summaryK.timelineEvents.length - 1].date).getTime(),
  '12. Document Timeline & Chronological Order Integrity',
  `Compiled ${summaryK.timelineEvents.length} events sorted chronologically`
);

let passCount = 0;
results.forEach((r, idx) => {
  if (r.passed) passCount++;
  console.log(`[${r.passed ? 'PASS' : 'FAIL'}] Test ${idx + 1}: ${r.name}`);
  console.log(`       Details: ${r.details}`);
});
console.log(`\nTOTAL HARDENED PHASE 3 TESTS: ${passCount} / ${results.length} PASSED.`);
