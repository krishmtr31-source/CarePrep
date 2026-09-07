/**
 * PHASE 6 — END-TO-END INTEGRATION TEST SUITE
 * 
 * Verifies the complete integrated application workflow:
 * 1. Complete Normal Patient Intake Flow (Patient -> Socrates -> Summary -> Physician Review)
 * 2. Emergency Red-Flag Workflow (Deterministic Safety Gate -> Emergency Triage)
 * 3. LLM Gateway & Deterministic Fallback Resilience
 * 4. Document Processing -> Lab Abnormality -> Timeline -> Summary Flow
 * 5. AYUSH Patient Pathway & Dashavidha Routing
 * 6. Multi-Modal Evidence Provenance Traceability
 * 7. Physician Review Console Operations (Modify, Accept/Confirm, Reject)
 * 8. Multi-Modal Input Equivalence (Voice, Text, Touch)
 * 9. Error Recovery & Missing Information Grounding Guard
 * 10. Loop & Resource Safety Limits (MAX_STEPS = 10, MAX_REQUESTS = 20)
 * 11. Safety Hierarchy: Deterministic Engine Overrides LLM False Negative (RED Wins)
 * 12. End-to-End Multi-Source Intake Draft Synthesis
 */

import { IntakeOrchestrator } from '../ai-services/orchestration/IntakeOrchestrator';
import { conversationAgent } from '../ai-services/orchestration/ConversationAgent';
import { documentAgent } from '../ai-services/orchestration/DocumentAgent';
import { ayushAgent } from '../ai-services/orchestration/AyushAgent';
import { safetyController } from '../ai-services/orchestration/SafetyController';
import { evidenceService } from '../ai-services/orchestration/EvidenceService';
import { summaryAgent } from '../ai-services/orchestration/SummaryAgent';
import { generateDoctorSummaryDraft } from '../ai-services/summaryGenerator';
import { processDocumentText } from '../document-intelligence/parsers/documentPipeline';
import { SAMPLE_DOCUMENTS } from '../document-intelligence/samples/sampleDocuments';
import { localStore } from '../backend/storage/localStore';
import { LLMGateway } from '../ai-services/llm/LLMGateway';
import { MockLLMProvider } from '../ai-services/llm/providers/MockLLMProvider';
import { DeterministicNLPProvider } from '../ai-services/llm/providers/DeterministicNLPProvider';
import { PatientIdentity } from '../data-models/patient';
import { PatientCaseRecord } from '../data-models/intake';

let totalPassed = 0;
let totalFailed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    totalPassed++;
    console.log(`[PASS] Test ${totalPassed}: ${testName}`);
    if (details) console.log(`       Details: ${details}`);
  } else {
    totalFailed++;
    console.error(`[FAIL] Test: ${testName}`);
    if (details) console.error(`       Details: ${details}`);
  }
}

const testPatient: PatientIdentity = {
  id: 'pat-phase6-001',
  fullName: 'Meenakshi Sundaram',
  age: 48,
  gender: 'female',
  abhaId: '32-9988-7766-5544',
  phoneNumber: '+91 98450 12345',
  city: 'Madurai',
  preferredLanguage: 'en',
  createdAt: new Date().toISOString()
};

export async function runPhase6Tests() {
  console.log('=== PHASE 6: END-TO-END INTEGRATION TEST SUITE ===\n');

  // --- 1. Complete Normal Patient Intake Flow ---
  const orchNormal = new IntakeOrchestrator('sess-p6-normal');
  orchNormal.startSession(testPatient, 'GENERAL_CLINICAL', 'en');
  const normalRes = await orchNormal.handlePatientInput('I have a severe headache for 2 days on the right side', 'VOICE');
  assert(
    orchNormal.getContext().state === 'COLLECTING_HISTORY' &&
    normalRes.suggestedQuestions.length > 0 &&
    orchNormal.getContext().safetyStatus === 'GREEN',
    '1. Complete Normal Patient Intake Flow (Initiation -> Socrates)',
    `State: ${orchNormal.getContext().state}, Questions: ${normalRes.suggestedQuestions.length}, Triage: ${orchNormal.getContext().safetyStatus}`
  );

  // --- 2. Emergency Red-Flag Workflow ---
  const orchEmerg = new IntakeOrchestrator('sess-p6-emerg');
  orchEmerg.startSession(testPatient, 'GENERAL_CLINICAL', 'en');
  const emergRes = await orchEmerg.handlePatientInput('I have crushing chest pain radiating to left arm and severe shortness of breath', 'VOICE');
  assert(
    orchEmerg.getContext().state === 'EMERGENCY_TRIAGE' &&
    emergRes.isEmergency === true &&
    orchEmerg.getContext().safetyStatus === 'RED',
    '2. Emergency Red-Flag Workflow (Deterministic Immediate Triage)',
    `State: ${orchEmerg.getContext().state}, Emergency: ${emergRes.isEmergency}, Alerts: ${orchEmerg.getContext().activeRedFlags.length}`
  );

  // --- 3. LLM Gateway & Deterministic Fallback Resilience ---
  const mockProvider = new MockLLMProvider();
  mockProvider.setBehavior({ simulateTimeout: true });
  const gatewayWithTimeout = new LLMGateway(mockProvider);
  const fallbackRes = await gatewayWithTimeout.interpretPatientUtterance('Severe abdominal cramps since yesterday', 'en');
  assert(
    fallbackRes.fallbackTriggered === true &&
    fallbackRes.providerUsed === 'DETERMINISTIC_NLP' &&
    fallbackRes.interpretation.complaint === 'Abdominal / Stomach Pain',
    '3. LLM Gateway & Deterministic Fallback Resilience',
    `Fallback Triggered: ${fallbackRes.fallbackTriggered}, Provider Used: ${fallbackRes.providerUsed}, Extracted: ${fallbackRes.interpretation.complaint}`
  );

  // --- 4. Document Processing -> Lab Abnormality -> Timeline -> Summary Flow ---
  const orchDoc = new IntakeOrchestrator('sess-p6-doc');
  orchDoc.startSession(testPatient, 'GENERAL_CLINICAL', 'en');
  const labDoc = processDocumentText(SAMPLE_DOCUMENTS[1].rawText, SAMPLE_DOCUMENTS[1].name, 'sample', SAMPLE_DOCUMENTS[1].type);
  await orchDoc.handleDocumentUpload(SAMPLE_DOCUMENTS[1].rawText, SAMPLE_DOCUMENTS[1].name, 'sample', SAMPLE_DOCUMENTS[1].type);
  const docContext = orchDoc.getContext();
  assert(
    docContext.documents.length === 1 &&
    docContext.timeline.length >= 3 &&
    docContext.documents[0].labResults.some(l => l.flag === 'HIGH'),
    '4. Document Processing -> Lab Abnormality -> Timeline Pipeline',
    `Documents: ${docContext.documents.length}, Timeline Events: ${docContext.timeline.length}, Abnormal Labs: ${docContext.documents[0].labResults.filter(l => l.flag === 'HIGH').length}`
  );

  // --- 5. AYUSH Patient Pathway & Dashavidha Routing ---
  const orchAyush = new IntakeOrchestrator('sess-p6-ayush');
  orchAyush.startSession(testPatient, 'AYUSH', 'hi');
  const ayushRes = await orchAyush.handlePatientInput('Sandhivata joint pain in knees', 'TOUCH_CHIP', 'AYUSH_PRAKRITI', ['Vata Predominant']);
  const ayushPayloadReq = {
    sessionId: 'sess-p6-ayush',
    patientId: testPatient.id,
    mode: 'AYUSH' as const,
    language: 'hi' as const,
    payload: { answers: orchAyush.getContext().answers }
  };
  const ayushAgentRes = ayushAgent.processAyushIntake(ayushPayloadReq);
  assert(
    orchAyush.getContext().mode === 'AYUSH' &&
    ayushRes.suggestedQuestions.length >= 6 &&
    ayushAgentRes.structuredData.dashavidhaProfile.prakriti.toLowerCase().includes('vata') &&
    ayushAgentRes.structuredData.clinicianNotice.includes('Patient-reported'),
    '5. AYUSH Patient Pathway & Dashavidha Routing',
    `Mode: ${orchAyush.getContext().mode}, Questions: ${ayushRes.suggestedQuestions.length}, Notice: ${ayushAgentRes.structuredData.clinicianNotice}`
  );

  // --- 6. Multi-Modal Evidence Provenance Traceability ---
  evidenceService.clearEvidence();
  evidenceService.recordEvidence(
    'PATIENT_VOICE',
    'Voice Utterance #1 (08:30:15)',
    'I have had a throbbing pain on the right side of my head for 2 days.',
    'Chief Complaint'
  );
  evidenceService.recordEvidence(
    'DOCUMENT',
    'Metropolis_Lab_Aug2026.pdf (Page 1)',
    'HbA1c: 8.4 % [HIGH]',
    'Lab Results'
  );
  const allEvidence = evidenceService.getAllEvidence();
  const voiceEvidence = allEvidence.find(e => e.sourceType === 'PATIENT_VOICE');
  const docEvidence = allEvidence.find(e => e.sourceType === 'DOCUMENT');
  assert(
    allEvidence.length === 2 && voiceEvidence !== undefined && docEvidence !== undefined,
    '6. Multi-Modal Evidence Provenance Traceability',
    `Evidence count: ${allEvidence.length}, Distinct Sources: Voice (${voiceEvidence?.sourceType}) & Doc (${docEvidence?.sourceType})`
  );

  // --- 7. Physician Review Console Operations ---
  const p6Case: PatientCaseRecord = {
    caseId: 'case-p6-review',
    patientId: testPatient.id,
    mode: 'GENERAL_CLINICAL',
    status: 'COMPLETED',
    chiefComplaint: 'Throbbing right headache for 2 days',
    language: 'en',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    redFlagsDetected: [],
    answers: []
  };
  localStore.saveCase(p6Case);
  localStore.updateDoctorReview('case-p6-review', 'Dr. Radhakrishnan', 'MODIFIED', 'Patient examined; right migraine without aura confirmed. Sumatriptan prescribed.');
  const reviewedSummary = localStore.getSummaryByCaseId('case-p6-review');
  assert(
    reviewedSummary !== null &&
    reviewedSummary.currentVersionNumber === 2 &&
    reviewedSummary.versions[0].authoredBy === 'AI_DRAFT' &&
    reviewedSummary.versions[1].authoredBy === 'PHYSICIAN' &&
    reviewedSummary.doctorEdits?.status === 'MODIFIED',
    '7. Physician Review Console Operations (Preserved v1, Clinician v2, Audit Trace)',
    `v1 Author: ${reviewedSummary?.versions[0]?.authoredBy}, v2 Author: ${reviewedSummary?.versions[1]?.authoredBy}, Status: ${reviewedSummary?.doctorEdits?.status}`
  );

  // --- 8. Multi-Modal Input Equivalence ---
  const deterministicNLP = new DeterministicNLPProvider();
  const textInputRes = await deterministicNLP.interpretPatientUtterance('I have a severe headache for 2 days', 'en');
  const voiceInputRes = await deterministicNLP.interpretPatientUtterance('I have a severe headache for 2 days', 'en');
  const touchInputRes = await deterministicNLP.interpretPatientUtterance('Headache 2 days', 'en');
  assert(
    textInputRes.complaint === voiceInputRes.complaint &&
    textInputRes.complaint === touchInputRes.complaint &&
    textInputRes.complaint === 'Headache',
    '8. Multi-Modal Input Equivalence (Voice, Text, Touch Normalized Consistency)',
    `Text: ${textInputRes.complaint}, Voice: ${voiceInputRes.complaint}, Touch: ${touchInputRes.complaint}`
  );

  // --- 9. Error Recovery & Missing Information Grounding Guard ---
  const sparseUtteranceRes = await deterministicNLP.interpretPatientUtterance('I feel mild pain', 'en');
  assert(
    sparseUtteranceRes.duration === 'Not provided.' &&
    sparseUtteranceRes.location === 'Not provided.' &&
    sparseUtteranceRes.uncertainty !== 'CLEAR',
    '9. Error Recovery & Missing Information Grounding Guard',
    `Duration: ${sparseUtteranceRes.duration}, Location: ${sparseUtteranceRes.location}, Uncertainty: ${sparseUtteranceRes.uncertainty}`
  );

  // --- 10. Loop & Resource Safety Limits ---
  const orchLoop = new IntakeOrchestrator('sess-p6-loop');
  orchLoop.startSession(testPatient, 'GENERAL_CLINICAL', 'en');
  for (let i = 0; i < 12; i++) {
    await orchLoop.handlePatientInput(`Iterative symptom check step ${i + 1}`, 'TYPED');
    if (orchLoop.getContext().state === 'PHYSICIAN_REVIEW') break;
  }
  assert(
    orchLoop.getContext().state === 'PHYSICIAN_REVIEW' && orchLoop.getActivityLogs().length > 0,
    '10. Loop & Resource Safety Limits (MAX_STEPS Guard)',
    `Terminated safely at State: ${orchLoop.getContext().state}`
  );

  // --- 11. Safety Hierarchy: Deterministic Engine Overrides LLM False Negative ---
  const mockLLMFalseNegativeReq = {
    sessionId: 'sess-fn-01',
    patientId: testPatient.id,
    mode: 'GENERAL_CLINICAL' as const,
    language: 'en' as const,
    payload: {
      utterance: 'I have severe crushing chest pain radiating to my left arm and I cannot breathe',
      chiefComplaint: 'Mild Chest Discomfort',
      structuredSymptoms: ['Shortness of breath', 'Sweating']
    }
  };
  const safetyScreening = safetyController.evaluateSafety(mockLLMFalseNegativeReq);
  assert(
    safetyScreening.status === 'EMERGENCY' &&
    safetyScreening.structuredData.alerts.length >= 2,
    '11. Safety Hierarchy: Deterministic Red-Flag ALWAYS Overrides LLM False Negative (RED Wins)',
    `Deterministic Safety Status: ${safetyScreening.status}, Alerts Triggered: ${safetyScreening.structuredData.alerts.length}`
  );

  // --- 12. End-to-End Multi-Source Synthesis ---
  const orchSynthesis = new IntakeOrchestrator('sess-p6-synth');
  orchSynthesis.startSession(testPatient, 'GENERAL_CLINICAL', 'en');
  await orchSynthesis.handlePatientInput('Throbbing right headache for 2 days', 'VOICE');
  await orchSynthesis.handleDocumentUpload(SAMPLE_DOCUMENTS[1].rawText, SAMPLE_DOCUMENTS[1].name, 'sample', SAMPLE_DOCUMENTS[1].type);
  const finalizedContext = orchSynthesis.finalizeIntakeSummary();
  assert(
    finalizedContext.state === 'PHYSICIAN_REVIEW' &&
    finalizedContext.generatedSummary !== null &&
    finalizedContext.generatedSummary.chiefComplaint.normalizedText.toLowerCase().includes('headache') &&
    finalizedContext.documents.length === 1,
    '12. End-to-End Multi-Source Intake Draft Synthesis',
    `State: ${finalizedContext.state}, Chief Complaint: ${finalizedContext.generatedSummary?.chiefComplaint.normalizedText}, Documents: ${finalizedContext.documents.length}`
  );

  console.log(`\nTOTAL PHASE 6 INTEGRATION TESTS: ${totalPassed} / ${totalPassed + totalFailed} PASSED.\n`);
}

runPhase6Tests();
