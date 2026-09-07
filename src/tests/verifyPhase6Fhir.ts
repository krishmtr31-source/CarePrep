/**
 * PHASE 6 — FHIR R4 INTEROPERABILITY TEST SUITE
 *
 * Tests the CarePrep FHIR service, type definitions, consent model,
 * and provenance tracking layer.
 *
 * Test Coverage:
 * 1.  FHIR Bundle structure validation (resourceType, id, meta, type)
 * 2.  Patient resource with ABHA identifier mapping
 * 3.  Patient resource without ABHA (anonymous-compatible)
 * 4.  AI-generated tag on unverified bundle
 * 5.  Physician-verified tag on confirmed bundle
 * 6.  Condition resources from medical history
 * 7.  MedicationStatement resources from current medications
 * 8.  AllergyIntolerance resource with severity/criticality mapping
 * 9.  noKnownAllergies flag produces no allergy entries
 * 10. Vital signs as FHIR Observations with deterministic LOINC codes
 * 11. Triage Observation from Assessment (RED_FLAG_TRIAGE)
 * 12. Triage Observation from Assessment (NORMAL)
 * 13. Provenance resource from evidence trail
 * 14. ClinicalImpression from AI-generated summary (preliminary)
 * 15. ClinicalImpression from physician-confirmed summary (final)
 * 16. Composition resource present and correct
 * 17. Consent model — grant, check, revoke logic
 * 18. Missing / null history graceful handling (no crash)
 */

import { FhirService, FhirBundleContext } from '../backend/services/fhirService';
import { FHIR_TAG_AI_GENERATED, FHIR_TAG_PHYSICIAN_VERIFIED } from '../shared/fhir/fhirTypes';

// ============================================================
// Test infrastructure
// ============================================================
let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    totalPassed++;
    console.log(`[PASS] Test ${totalPassed}: ${testName}`);
    if (details) console.log(`       ${details}`);
  } else {
    totalFailed++;
    console.error(`[FAIL] Test: ${testName}`);
    if (details) console.error(`       ${details}`);
  }
}

// ============================================================
// Sample data fixtures (no real DB — unit-level only)
// ============================================================

const MOCK_PATIENT: any = {
  patientId: 'pat-fhir-001',
  fullName: 'Anika Sharma',
  email: 'anika.sharma@example.com',
  mobile: '+91 98765 43210',
  gender: 'female',
  dateOfBirth: '1988-06-14',
  abhaId: '43-1122-3344-5566',
  city: 'Bengaluru',
  preferredLanguage: 'en'
};

const MOCK_PATIENT_NO_ABHA: any = {
  patientId: 'pat-fhir-002',
  fullName: 'Rajan Nair',
  email: '',
  mobile: '+91 90011 22334',
  gender: 'male',
  dateOfBirth: '1972-11-30',
  abhaId: undefined,
  city: 'Kochi',
  preferredLanguage: 'ml'
};

const MOCK_HISTORY: any = {
  patientId: 'pat-fhir-001',
  conditionsList: [
    { name: 'Type 2 Diabetes Mellitus', status: 'Ongoing', since: '2018', notes: 'Controlled on Metformin' },
    { name: 'Hypertension', status: 'Managed', since: '2020', notes: '' }
  ],
  surgeriesList: [
    { procedure: 'Appendectomy', year: '2005', hospital: 'City Hospital Bengaluru' }
  ],
  hospitalizationsList: [],
  allergiesList: [
    { allergen: 'Penicillin', category: 'Drug', reaction: 'Anaphylaxis', severity: 'Severe' },
    { allergen: 'Peanuts', category: 'Food', reaction: 'Hives', severity: 'Moderate' }
  ],
  noKnownAllergies: false,
  currentMedications: [
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', reason: 'Diabetes management', prescribedBy: 'Dr. Mehta' },
    { name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', reason: 'Hypertension', prescribedBy: 'Dr. Mehta' }
  ],
  familyHistoryList: [
    { relationship: 'Father', condition: 'Coronary Artery Disease' }
  ],
  lifestyle: {
    smoking: 'Never',
    alcohol: 'Occasional',
    physicalActivity: 'Moderate (30 min 3x/week)',
    diet: 'Vegetarian',
    sleepHours: '7'
  },
  vitals: {
    bloodPressure: '132/84',
    heartRate: '76',
    temperature: '98.6',
    spo2: '98',
    bmi: '26.2',
    weight: '68',
    height: '161',
    recordedAt: new Date('2026-09-01T09:30:00Z')
  },
  existingConditions: [],
  previousSurgeries: [],
  allergies: [],
  familyHistory: []
};

const MOCK_HISTORY_NO_ALLERGIES: any = {
  ...MOCK_HISTORY,
  allergiesList: [],
  noKnownAllergies: true
};

const MOCK_ASSESSMENT_RED: any = {
  assessmentId: 'asmt-fhir-001',
  patientId: 'pat-fhir-001',
  chiefComplaint: 'Crushing chest pain radiating to left arm',
  symptoms: ['Chest Pain', 'Shortness of Breath', 'Sweating'],
  triageStatus: 'RED_FLAG_TRIAGE',
  priority: 'EMERGENT',
  status: 'SUBMITTED_TO_DOCTOR',
  redFlagsDetected: ['Crushing chest pain', 'Radiation to left arm', 'Diaphoresis'],
  language: 'en',
  answers: [],
  evidenceTrail: [
    {
      id: 'ev-001',
      sourceType: 'PATIENT_VOICE',
      sourceName: 'Voice Utterance #1',
      rawSnippet: 'I have crushing chest pain radiating to my left arm',
      structuredField: 'Chief Complaint',
      timestamp: '2026-09-01T10:00:00Z',
      confidence: 0.97
    },
    {
      id: 'ev-002',
      sourceType: 'DOCUMENT',
      sourceName: 'LabReport_Aug2026.pdf (Page 2)',
      rawSnippet: 'Troponin I: 0.84 ng/mL [HIGH CRITICAL]',
      structuredField: 'Lab Results',
      timestamp: '2026-09-01T10:05:00Z',
      confidence: 0.99
    }
  ],
  agentActivityLogs: [
    { agentName: 'SafetyController', action: 'RED_FLAG_SCREEN', status: 'SUCCESS', timestamp: '2026-09-01T10:00:05Z' }
  ],
  createdAt: new Date('2026-09-01T10:00:00Z'),
  updatedAt: new Date('2026-09-01T10:05:00Z')
};

const MOCK_ASSESSMENT_NORMAL: any = {
  ...MOCK_ASSESSMENT_RED,
  assessmentId: 'asmt-fhir-002',
  chiefComplaint: 'Headache for 2 days',
  symptoms: ['Headache'],
  triageStatus: 'NORMAL',
  priority: 'ROUTINE',
  redFlagsDetected: [],
  evidenceTrail: []
};

const MOCK_SUMMARY_AI: any = {
  summaryId: 'sum-fhir-001',
  patientId: 'pat-fhir-001',
  modelUsed: 'gemini-3.6-flash',
  status: 'READY',
  reviewStatus: 'AI_GENERATED',
  doctorDecision: 'PENDING',
  doctorNotes: '',
  aiGeneratedSummary: {
    preConsultationSummary: 'Patient presents with crushing chest pain. Urgent evaluation required.',
    importantPointsForDoctor: ['History of hypertension', 'Taking Metformin and Amlodipine'],
    chiefComplaint: 'Crushing chest pain — EMERGENCY'
  },
  generatedAt: new Date('2026-09-01T10:10:00Z'),
  summaryVersion: 1,
  auditTrail: []
};

const MOCK_SUMMARY_VERIFIED: any = {
  ...MOCK_SUMMARY_AI,
  summaryId: 'sum-fhir-002',
  reviewStatus: 'DOCTOR_CONFIRMED',
  doctorDecision: 'ACCEPTED',
  doctorNotes: 'STEMI confirmed. Cath lab activated.',
  reviewedBy: { doctorId: 'doc-001', doctorName: 'Dr. Krishnamurthy' },
  confirmedAt: new Date('2026-09-01T10:30:00Z'),
  doctorEditedSummary: {
    preConsultationSummary: 'STEMI confirmed by Dr. Krishnamurthy. Cath lab activated at 10:30.',
    importantPointsForDoctor: ['STEMI — immediate PCI required', 'Allergic to Penicillin'],
    chiefComplaint: 'ST-elevation MI'
  }
};

// ============================================================
// Test Execution
// ============================================================

async function runPhase6FhirTests() {
  console.log('=== PHASE 6: FHIR R4 INTEROPERABILITY TEST SUITE ===\n');

  // ──────────────────────────────────────────────────────────
  // Test 1: FHIR Bundle structure validation
  // ──────────────────────────────────────────────────────────
  const ctx1: FhirBundleContext = { patient: MOCK_PATIENT, history: MOCK_HISTORY, assessment: MOCK_ASSESSMENT_NORMAL, clinicalSummary: MOCK_SUMMARY_AI };
  const bundle1 = FhirService.buildPatientFhirBundle(ctx1);
  assert(
    bundle1.resourceType === 'Bundle' &&
    typeof bundle1.id === 'string' &&
    bundle1.id.startsWith('careprep-bundle-') &&
    bundle1.type === 'document' &&
    Array.isArray(bundle1.entry) &&
    bundle1.entry.length > 0,
    '1. FHIR Bundle structure validation (resourceType, id, type, entries)',
    `Bundle ID: ${bundle1.id}, Type: ${bundle1.type}, Entries: ${bundle1.entry.length}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 2: Patient resource with ABHA identifier
  // ──────────────────────────────────────────────────────────
  const patientEntry = bundle1.entry.find(e => (e.resource as any).resourceType === 'Patient');
  const patientResource = patientEntry?.resource as any;
  const abhaIdentifier = patientResource?.identifier?.find((id: any) => id.system?.includes('ndhm'));
  assert(
    patientResource?.resourceType === 'Patient' &&
    patientResource.id === 'pat-fhir-001' &&
    abhaIdentifier !== undefined &&
    abhaIdentifier.value === '43-1122-3344-5566',
    '2. Patient resource with ABHA identifier mapping',
    `Patient ID: ${patientResource?.id}, ABHA: ${abhaIdentifier?.value}, Identifiers: ${patientResource?.identifier?.length}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 3: Patient without ABHA — no ABHA identifier in output
  // ──────────────────────────────────────────────────────────
  const ctx3: FhirBundleContext = { patient: MOCK_PATIENT_NO_ABHA };
  const bundle3 = FhirService.buildPatientFhirBundle(ctx3);
  const patientRes3 = bundle3.entry.find(e => (e.resource as any).resourceType === 'Patient')?.resource as any;
  const noAbhaId = patientRes3?.identifier?.find((id: any) => id.system?.includes('ndhm'));
  assert(
    patientRes3?.id === 'pat-fhir-002' &&
    noAbhaId === undefined &&
    patientRes3?.identifier?.length >= 1, // at least CarePrep internal ID
    '3. Patient without ABHA — no ABHA identifier in FHIR output',
    `Patient ID: ${patientRes3?.id}, ABHA entry: ${noAbhaId}, Identifiers: ${patientRes3?.identifier?.length}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 4: AI-generated tag on unverified bundle
  // ──────────────────────────────────────────────────────────
  const bundleTags = bundle1.meta?.tag || [];
  const hasAiTag = bundleTags.some(t => t.code === FHIR_TAG_AI_GENERATED.code);
  const hasVerifiedTag = bundleTags.some(t => t.code === FHIR_TAG_PHYSICIAN_VERIFIED.code);
  assert(
    hasAiTag === true && hasVerifiedTag === false,
    '4. AI-generated tag present on unverified bundle; physician-verified tag absent',
    `Tags: ${bundleTags.map(t => t.code).join(', ')}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 5: Physician-verified tag on doctor-confirmed bundle
  // ──────────────────────────────────────────────────────────
  const ctx5: FhirBundleContext = { patient: MOCK_PATIENT, history: MOCK_HISTORY, assessment: MOCK_ASSESSMENT_NORMAL, clinicalSummary: MOCK_SUMMARY_VERIFIED };
  const bundle5 = FhirService.buildPatientFhirBundle(ctx5);
  const bundleTags5 = bundle5.meta?.tag || [];
  const hasVerifiedTag5 = bundleTags5.some(t => t.code === FHIR_TAG_PHYSICIAN_VERIFIED.code);
  assert(
    hasVerifiedTag5 === true,
    '5. Physician-verified tag present on doctor-confirmed bundle',
    `Tags: ${bundleTags5.map(t => t.code).join(', ')}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 6: Conditions from medical history
  // ──────────────────────────────────────────────────────────
  const conditions = bundle1.entry.filter(e => (e.resource as any).resourceType === 'Condition');
  const diabetesCondition = conditions.find(c => (c.resource as any).code?.text?.includes('Diabetes'));
  assert(
    conditions.length === 2 &&
    diabetesCondition !== undefined &&
    (diabetesCondition.resource as any).verificationStatus?.coding?.[0]?.code === 'unconfirmed',
    '6. Condition resources from medical history — patient-reported, unconfirmed verification',
    `Conditions: ${conditions.length}, Diabetes found: ${!!diabetesCondition}, Verification: ${(diabetesCondition?.resource as any)?.verificationStatus?.coding?.[0]?.code}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 7: MedicationStatement resources
  // ──────────────────────────────────────────────────────────
  const medications = bundle1.entry.filter(e => (e.resource as any).resourceType === 'MedicationStatement');
  const metformin = medications.find(m => (m.resource as any).medicationCodeableConcept?.text === 'Metformin');
  assert(
    medications.length === 2 &&
    metformin !== undefined &&
    (metformin.resource as any).status === 'active',
    '7. MedicationStatement resources from current medications',
    `Medications: ${medications.length}, Metformin found: ${!!metformin}, Status: ${(metformin?.resource as any)?.status}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 8: AllergyIntolerance with severity mapping
  // ──────────────────────────────────────────────────────────
  const allergies = bundle1.entry.filter(e => (e.resource as any).resourceType === 'AllergyIntolerance');
  const penicillin = allergies.find(a => (a.resource as any).code?.text === 'Penicillin');
  assert(
    allergies.length === 2 &&
    penicillin !== undefined &&
    (penicillin.resource as any).criticality === 'high' &&
    (penicillin.resource as any).category?.includes('medication'),
    '8. AllergyIntolerance resource — Severe Penicillin allergy → criticality: high',
    `Allergies: ${allergies.length}, Penicillin criticality: ${(penicillin?.resource as any)?.criticality}, Category: ${(penicillin?.resource as any)?.category}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 9: noKnownAllergies flag produces no AllergyIntolerance entries
  // ──────────────────────────────────────────────────────────
  const ctx9: FhirBundleContext = { patient: MOCK_PATIENT, history: MOCK_HISTORY_NO_ALLERGIES };
  const bundle9 = FhirService.buildPatientFhirBundle(ctx9);
  const allergies9 = bundle9.entry.filter(e => (e.resource as any).resourceType === 'AllergyIntolerance');
  assert(
    allergies9.length === 0,
    '9. noKnownAllergies flag → zero AllergyIntolerance FHIR resources produced',
    `AllergyIntolerance entries: ${allergies9.length}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 10: Vital signs as Observations with LOINC codes
  // ──────────────────────────────────────────────────────────
  const observations = bundle1.entry.filter(e => {
    const r = e.resource as any;
    return r.resourceType === 'Observation' && r.category?.[0]?.coding?.[0]?.code === 'vital-signs';
  });
  const heartRateObs = observations.find(o =>
    (o.resource as any).code?.coding?.[0]?.code === '8867-4' // LOINC for Heart Rate
  );
  assert(
    observations.length >= 5 &&
    heartRateObs !== undefined,
    '10. Vital signs as FHIR Observations with deterministic LOINC codes',
    `Vital observations: ${observations.length}, Heart Rate LOINC 8867-4 found: ${!!heartRateObs}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 11: Triage Observation — RED_FLAG_TRIAGE
  // ──────────────────────────────────────────────────────────
  const ctx11: FhirBundleContext = { patient: MOCK_PATIENT, history: MOCK_HISTORY, assessment: MOCK_ASSESSMENT_RED, clinicalSummary: null };
  const bundle11 = FhirService.buildPatientFhirBundle(ctx11);
  const triageObs = bundle11.entry.find(e => {
    const r = e.resource as any;
    return r.resourceType === 'Observation' && r.id?.includes('triage');
  })?.resource as any;
  assert(
    triageObs !== undefined &&
    triageObs.valueString?.includes('RED_FLAG_TRIAGE') &&
    triageObs.status === 'preliminary',
    '11. Triage Observation from RED_FLAG_TRIAGE assessment — preliminary, not final',
    `Triage value: ${triageObs?.valueString}, Status: ${triageObs?.status}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 12: Triage Observation — NORMAL
  // ──────────────────────────────────────────────────────────
  const triageNormal = bundle1.entry.find(e => {
    const r = e.resource as any;
    return r.resourceType === 'Observation' && r.id?.includes('triage');
  })?.resource as any;
  assert(
    triageNormal !== undefined &&
    triageNormal.valueString === 'NORMAL',
    '12. Triage Observation from NORMAL assessment',
    `Triage value: ${triageNormal?.valueString}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 13: Provenance resource from evidence trail
  // ──────────────────────────────────────────────────────────
  const provenanceEntry = bundle11.entry.find(e => (e.resource as any).resourceType === 'Provenance');
  const provenanceResource = provenanceEntry?.resource as any;
  assert(
    provenanceResource !== undefined &&
    provenanceResource.entity?.length === 2 &&
    provenanceResource.entity[0]?.what?.display?.includes('PATIENT_VOICE') &&
    provenanceResource.agent?.[0]?.who?.display?.includes('CarePrep'),
    '13. Provenance resource generated from assessment evidence trail',
    `Provenance entities: ${provenanceResource?.entity?.length}, Agent: ${provenanceResource?.agent?.[0]?.who?.display}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 14: ClinicalImpression from AI summary — status: in-progress
  // ──────────────────────────────────────────────────────────
  const impressionAI = bundle1.entry.find(e => (e.resource as any).resourceType === 'ClinicalImpression')?.resource as any;
  assert(
    impressionAI !== undefined &&
    impressionAI.status === 'in-progress' &&
    impressionAI.meta?.tag?.some((t: any) => t.code === 'ai-generated'),
    '14. ClinicalImpression from AI summary → status: in-progress, tag: ai-generated',
    `Status: ${impressionAI?.status}, Tags: ${impressionAI?.meta?.tag?.map((t: any) => t.code).join(', ')}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 15: ClinicalImpression from physician-confirmed summary — status: completed
  // ──────────────────────────────────────────────────────────
  const impressionVerified = bundle5.entry.find(e => (e.resource as any).resourceType === 'ClinicalImpression')?.resource as any;
  assert(
    impressionVerified !== undefined &&
    impressionVerified.status === 'completed' &&
    impressionVerified.meta?.tag?.some((t: any) => t.code === 'physician-verified'),
    '15. ClinicalImpression from physician-confirmed summary → status: completed, tag: physician-verified',
    `Status: ${impressionVerified?.status}, Tags: ${impressionVerified?.meta?.tag?.map((t: any) => t.code).join(', ')}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 16: Composition resource present and is first entry
  // ──────────────────────────────────────────────────────────
  const firstEntry = bundle1.entry[0]?.resource as any;
  assert(
    firstEntry?.resourceType === 'Composition' &&
    firstEntry?.subject?.reference === `Patient/pat-fhir-001` &&
    firstEntry?.status === 'preliminary',
    '16. Composition resource is first entry in Bundle, subject references Patient',
    `Composition status: ${firstEntry?.status}, Subject: ${firstEntry?.subject?.reference}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 17: Consent model — in-memory grant/revoke logic
  // ──────────────────────────────────────────────────────────
  const mockConsents: any[] = [
    {
      consentId: 'consent-001',
      patientId: 'pat-fhir-001',
      grantedTo: 'doc-999',
      scope: 'fhir_export',
      status: 'ACTIVE',
      grantedAt: new Date(),
      expiresAt: undefined
    },
    {
      consentId: 'consent-002',
      patientId: 'pat-fhir-001',
      grantedTo: 'SELF',
      scope: 'doctor_review',
      status: 'REVOKED',
      grantedAt: new Date(Date.now() - 86400000),
      revokedAt: new Date()
    }
  ];
  const consentCheck = await FhirService.checkConsentStatus('pat-fhir-001', 'fhir_export', mockConsents);
  const revokedCheck = await FhirService.checkConsentStatus('pat-fhir-001', 'doctor_review', mockConsents);
  assert(
    consentCheck.hasActiveConsent === true &&
    consentCheck.consents.length === 1 &&
    revokedCheck.hasActiveConsent === false,
    '17. Consent status check — active consent detected, revoked consent excluded',
    `fhir_export active: ${consentCheck.hasActiveConsent}, doctor_review active: ${revokedCheck.hasActiveConsent}`
  );

  // ──────────────────────────────────────────────────────────
  // Test 18: Missing history/assessment graceful handling (no crash)
  // ──────────────────────────────────────────────────────────
  let bundleMinimal: any;
  let threwError = false;
  try {
    bundleMinimal = FhirService.buildPatientFhirBundle({ patient: MOCK_PATIENT_NO_ABHA });
  } catch {
    threwError = true;
  }
  assert(
    threwError === false &&
    bundleMinimal?.resourceType === 'Bundle' &&
    bundleMinimal?.entry?.length >= 2, // at least Composition + Patient
    '18. Missing history & assessment — FHIR bundle produced without crash',
    `Error thrown: ${threwError}, Entries: ${bundleMinimal?.entry?.length}`
  );

  // ──────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────
  console.log(`\n${'='.repeat(56)}`);
  console.log(`PHASE 6 FHIR TESTS: ${totalPassed} / ${totalPassed + totalFailed} PASSED`);
  if (totalFailed > 0) {
    console.error(`${totalFailed} test(s) FAILED — review above output.`);
    process.exit(1);
  } else {
    console.log('All Phase 6 FHIR interoperability tests PASSED.');
  }
}

runPhase6FhirTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
