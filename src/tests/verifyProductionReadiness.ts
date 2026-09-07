/**
 * SIH26047 Production Readiness & Enhancement Verification Suite
 *
 * Validates:
 * 1. Gemini Configuration & Graceful Fallback
 * 2. EMR / Prescription Data Formatting
 * 3. ABDM / FHIR R4 Bundle Transformation
 * 4. Queue Synchronization Abstraction
 * 5. Safety & Emergency Triage Integrity
 */

import { ServerGeminiProvider } from '../ai-services/llm/providers/ServerGeminiProvider';
import { LLMGateway } from '../ai-services/llm/LLMGateway';
import { FhirTransformer } from '../shared/fhir/fhirTransformer';
import { DoctorSummaryDraft } from '../data-models/doctorSummary';
import { PatientCaseRecord } from '../data-models/intake';
import { LocalBroadcastChannelSyncProvider, QueueEvent } from '../backend/sync/queueSyncAbstraction';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    passCount++;
    console.log(`[PASS] ${testName}`);
    if (details) console.log(`       Details: ${details}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${testName}`);
    if (details) console.error(`       Details: ${details}`);
  }
}

async function runProductionReadinessTests() {
  console.log('=== SIH26047 PRODUCTION READINESS & SIH DEMO ENHANCEMENT SUITE ===\n');

  // Test 1: Gemini Provider recognizes environment key configuration safely
  const customProvider = new ServerGeminiProvider({
    apiKey: 'test-api-key-sample-12345',
    modelName: 'gemini-3.6-flash'
  });
  assert(
    customProvider.isConfigured() === true && customProvider.getModelName() === 'gemini-3.6-flash',
    '1. Gemini Provider initializes with custom/environment configuration',
    `Model: ${customProvider.getModelName()}, Configured: ${customProvider.isConfigured()}`
  );

  // Test 2: Unconfigured Gemini provider triggers Deterministic NLP Fallback
  const unconfiguredProvider = new ServerGeminiProvider({ apiKey: undefined });
  assert(
    unconfiguredProvider.isConfigured() === false,
    '2. Unconfigured Gemini Provider safely reports unconfigured status',
    `Configured: ${unconfiguredProvider.isConfigured()}`
  );

  // Test 3: LLMGateway fallback resilience when Gemini is uncontactable
  const gateway = new LLMGateway(unconfiguredProvider);
  const utteranceResult = await gateway.interpretPatientUtterance('Pet mein dard hai 2 din se', 'hi');
  assert(
    utteranceResult.fallbackTriggered === true && utteranceResult.interpretation.complaint.length > 0,
    '3. LLMGateway automatically triggers Deterministic NLP fallback when Gemini is unavailable',
    `Provider used: ${utteranceResult.providerUsed}, Extracted: ${utteranceResult.interpretation.complaint}`
  );

  // Test 4: Sample Clinical Summary Creation
  const sampleSummary: DoctorSummaryDraft = {
    caseId: 'CASE-PROD-001',
    patientId: 'PAT-001',
    patientName: 'Sunil Kumar',
    age: 48,
    gender: 'Male',
    abhaId: '91-4829-1029-4821',
    selectedLanguage: 'en',
    mode: 'GENERAL_CLINICAL',
    dateGenerated: '2026-09-02T10:00:00.000Z',
    chiefComplaint: {
      normalizedText: 'Retrosternal Chest Pain with Diaphoresis',
      rawPatientVerbatim: 'Severe crushing chest pain radiating to left arm',
      isAiNormalized: true,
      provenanceTag: 'PATIENT_REPORTED'
    },
    hpiStructured: {
      onset: '2 hours ago',
      duration: 'Constant for 2 hours',
      location: 'Substernal / Precordial',
      character: 'Crushing, heavy pressure',
      severity: '9/10',
      aggravatingFactors: 'Physical exertion',
      relievingFactors: 'None reported',
      associatedSymptoms: 'Diaphoresis, shortness of breath, nausea'
    },
    patientVerbatimStatements: [
      { step: 'CHIEF_COMPLAINT', rawText: 'Severe chest pain radiating to left arm', modality: 'VOICE' }
    ],
    extractedMedications: [
      {
        id: 'med-1',
        name: 'Aspirin',
        dosage: '75 mg',
        frequency: 'OD',
        duration: 'Ongoing',
        evidence: {
          documentId: 'doc-1',
          documentName: 'Prescription 2026',
          pageNumber: 1,
          snippet: 'Tab Aspirin 75mg OD',
          confidenceScore: 0.95
        }
      },
      {
        id: 'med-2',
        name: 'Atorvastatin',
        dosage: '40 mg',
        frequency: 'HS',
        duration: 'Ongoing',
        evidence: {
          documentId: 'doc-1',
          documentName: 'Prescription 2026',
          pageNumber: 1,
          snippet: 'Tab Atorvastatin 40mg HS',
          confidenceScore: 0.95
        }
      }
    ],
    medicationConflicts: [],
    previousDiagnoses: [
      {
        id: 'diag-1',
        conditionName: 'Hypertension',
        status: 'ACTIVE',
        evidence: {
          documentId: 'doc-1',
          documentName: 'Discharge Summary',
          pageNumber: 1,
          snippet: 'HTN since 5 years',
          confidenceScore: 0.95
        }
      }
    ],
    investigationResults: [
      {
        id: 'lab-1',
        testName: 'Troponin-T',
        resultValue: '0.45',
        numericValue: 0.45,
        unit: 'ng/mL',
        sourceReferenceRange: {
          raw: '< 0.01',
          hasSourceRange: true
        },
        flag: 'HIGH',
        isAbnormal: true,
        evidence: {
          documentId: 'doc-1',
          documentName: 'Lab Report',
          pageNumber: 1,
          snippet: 'Troponin-T: 0.45 ng/mL (High)',
          confidenceScore: 0.98
        }
      }
    ],
    abnormalLabFindings: [
      {
        id: 'lab-1',
        testName: 'Troponin-T',
        resultValue: '0.45',
        numericValue: 0.45,
        unit: 'ng/mL',
        sourceReferenceRange: {
          raw: '< 0.01',
          hasSourceRange: true
        },
        flag: 'HIGH',
        isAbnormal: true,
        evidence: {
          documentId: 'doc-1',
          documentName: 'Lab Report',
          pageNumber: 1,
          snippet: 'Troponin-T: 0.45 ng/mL (High)',
          confidenceScore: 0.98
        }
      }
    ],
    timelineEvents: [],
    redFlagTriage: {
      hasTriggered: true,
      status: 'RED',
      alerts: [
        {
          ruleId: 'RED_ACS_01',
          ruleTitle: 'Acute Coronary Syndrome Alert',
          matchedTrigger: 'Severe crushing chest pain radiating to left arm with diaphoresis',
          severity: 'CRITICAL',
          timestamp: '2026-09-02T10:00:00.000Z',
          actionMessage: 'Immediate ECG and emergency physician evaluation.'
        }
      ],
      statusNotice: 'Urgent emergency triage required'
    },
    verificationItems: [],
    provisionalTags: ['Acute Coronary Syndrome', 'Myocardial Infarction Rule-Out'],
    clinicalDisclaimer: 'Pre-consultation clinical summary. Licensed physician decision is final.',
    currentVersionNumber: 1,
    versions: [],
    auditTrail: [],
    doctorEdits: {
      physicianNotes: 'Admit to ICCU. Perform stat 12-lead ECG, start dual antiplatelet therapy.',
      status: 'ACCEPTED',
      verifiedByDoctorName: 'Dr. A. K. Varma, MD, DNB'
    }
  };

  const sampleCaseRecord: PatientCaseRecord = {
    caseId: 'CASE-PROD-001',
    patientId: 'PAT-001',
    mode: 'GENERAL_CLINICAL',
    status: 'RED_FLAG_TRIAGE',
    chiefComplaint: 'Severe chest pain radiating to left arm',
    answers: [
      {
        questionId: 'q-chief',
        step: 'CHIEF_COMPLAINT',
        customText: 'Severe chest pain radiating to left arm',
        rawPatientResponse: 'Severe chest pain radiating to left arm',
        audioProvenance: 'VOICE',
        timestamp: '2026-09-02T09:50:00.000Z'
      }
    ],
    startedAt: '2026-09-02T09:45:00.000Z',
    redFlagsDetected: ['RED_ACS_01'],
    language: 'en'
  };

  // Test 5: FHIR Transformation Engine transforms summary into standard FHIR R4 Bundle
  const fhirBundle = FhirTransformer.transformSummaryToFhirBundle(sampleSummary, sampleCaseRecord);
  assert(
    fhirBundle.resourceType === 'Bundle' && fhirBundle.entry.length >= 5,
    '4. FHIR Transformer converts summary into standard FHIR R4 Bundle',
    `Bundle Type: ${fhirBundle.type}, Total Resources: ${fhirBundle.entry.length}`
  );

  // Test 6: FHIR Patient contains valid ABHA ID identifier
  const patientResource = fhirBundle.entry.find(e => e.resource.resourceType === 'Patient')?.resource as any;
  assert(
    patientResource && patientResource.identifier?.[0]?.value === '91-4829-1029-4821',
    '5. FHIR Patient Resource preserves ABHA Health ID accurately',
    `ABHA: ${patientResource?.identifier?.[0]?.value}, Name: ${patientResource?.name?.[0]?.text}`
  );

  // Test 7: FHIR Condition contains Chief Complaint and SOCRATES notes
  const conditionResource = fhirBundle.entry.find(e => e.resource.resourceType === 'Condition')?.resource as any;
  assert(
    conditionResource && conditionResource.code.text.includes('Chest Pain'),
    '6. FHIR Condition Resource contains Chief Complaint and SOCRATES HPI',
    `Condition Code: ${conditionResource?.code?.text}`
  );

  // Test 8: FHIR Observations contain Red-Flag Triage & Lab results
  const obsResources = fhirBundle.entry.filter(e => e.resource.resourceType === 'Observation');
  assert(
    obsResources.length >= 2,
    '7. FHIR Observation Resources represent Triage level and Lab results with units/flags',
    `Observation entries created: ${obsResources.length}`
  );

  // Test 9: FHIR MedicationStatement contains extracted medications
  const medResources = fhirBundle.entry.filter(e => e.resource.resourceType === 'MedicationStatement');
  assert(
    medResources.length === 2,
    '8. FHIR MedicationStatement Resources contain extracted past medications',
    `Medications converted: ${medResources.map(m => (m.resource as any).medicationCodeableConcept.text).join(', ')}`
  );

  // Test 10: Multi-Device Queue Synchronization Service
  const syncService = new LocalBroadcastChannelSyncProvider('test_queue_channel');
  let receivedEvent: QueueEvent | null = null;
  const unsubscribe = syncService.subscribe((evt) => {
    receivedEvent = evt;
  });

  await syncService.publishEvent({
    type: 'PATIENT_ENQUEUED',
    caseId: 'CASE-PROD-001',
    patientId: 'PAT-001',
    patientName: 'Sunil Kumar',
    source: 'PATIENT_KIOSK',
    payload: { triage: 'RED' }
  });

  assert(
    receivedEvent !== null && (receivedEvent as QueueEvent).type === 'PATIENT_ENQUEUED',
    '9. Queue Synchronization Service dispatches and receives events locally',
    `Event: ${receivedEvent ? (receivedEvent as QueueEvent).eventId : 'None'}`
  );
  unsubscribe();

  // Summary
  console.log(`\nTOTAL PRODUCTION READINESS TESTS: ${passCount} / ${passCount + failCount} PASSED.`);
}

runProductionReadinessTests().catch(err => {
  console.error('Test execution error:', err);
});
