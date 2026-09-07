/**
 * CarePrep FHIR R4 Service — Phase 6 Interoperability Layer
 *
 * Assembles FHIR R4 Bundles from CarePrep's canonical MongoDB models.
 * This service is SERVER-SIDE ONLY and must never be imported in frontend code.
 *
 * Design Rules:
 * - Deterministic mapping only. Gemini is NEVER invoked for code lookups.
 * - All codes use free-text `code.text` unless a deterministic LOINC/SNOMED mapping exists.
 * - AI-generated content is tagged `ai-generated`; physician-confirmed is `physician-verified`.
 * - Cross-patient isolation is enforced at the route layer (caller passes verified user).
 * - ABDM/ABHA identifiers are mapped only if present on the Patient model.
 *
 * NOT a live ABDM M1/M2/M3 integration — this is an architectural preparation layer.
 */

import { IPatient } from '../models/Patient';
import { IMedicalHistory, IAllergyItem } from '../models/MedicalHistory';
import { IAssessment } from '../models/Assessment';
import { IClinicalSummaryDocument } from '../models/ClinicalSummary';
import { IConsent, ConsentScope } from '../models/Consent';
import {
  FhirBundle,
  FhirBundleEntry,
  FhirPatient,
  FhirCondition,
  FhirObservation,
  FhirMedicationStatement,
  FhirAllergyIntolerance,
  FhirClinicalImpression,
  FhirProvenance,
  FhirComposition,
  FhirResource,
  FhirMeta,
  FHIR_TAG_AI_GENERATED,
  FHIR_TAG_PHYSICIAN_VERIFIED,
  FHIR_TAG_ABDM_READY
} from '../../shared/fhir/fhirTypes';

// ============================================================
// Deterministic Vital Sign LOINC Mappings
// Only add codes where the mapping is unambiguous and standard.
// DO NOT add codes by guessing. If uncertain, use text-only.
// ============================================================
const VITAL_LOINC_MAP: Record<string, { code: string; display: string }> = {
  'Blood Pressure': { code: '85354-9', display: 'Blood pressure panel' },
  'Heart Rate': { code: '8867-4', display: 'Heart rate' },
  'Temperature': { code: '8310-5', display: 'Body temperature' },
  'SpO2': { code: '59408-5', display: 'Oxygen saturation by Pulse oximetry' },
  'BMI': { code: '39156-5', display: 'Body mass index (BMI) [Ratio]' },
  'Weight': { code: '29463-7', display: 'Body weight' },
  'Height': { code: '8302-2', display: 'Body height' },
};

// ABDM ABHA system URL
const ABHA_SYSTEM = 'https://healthid.ndhm.gov.in';
// CarePrep internal system URL
const CAREPREP_SYSTEM = 'https://careprep.in/fhir';

// ============================================================
// Helper functions
// ============================================================

function makeAiMeta(): FhirMeta {
  return {
    tag: [FHIR_TAG_AI_GENERATED]
  };
}

function makeVerifiedMeta(): FhirMeta {
  return {
    tag: [FHIR_TAG_PHYSICIAN_VERIFIED]
  };
}

function mapGender(gender?: string): 'male' | 'female' | 'other' | 'unknown' {
  if (!gender) return 'unknown';
  const g = gender.toLowerCase().trim();
  if (g.startsWith('m')) return 'male';
  if (g.startsWith('f')) return 'female';
  if (g.startsWith('o')) return 'other';
  return 'unknown';
}

function mapAllergyCriticality(severity?: string): 'low' | 'high' | 'unable-to-assess' {
  if (!severity) return 'unable-to-assess';
  if (severity === 'Severe') return 'high';
  if (severity === 'Moderate') return 'low';
  return 'unable-to-assess';
}

function mapAllergyCategory(category?: string): Array<'food' | 'medication' | 'environment' | 'biologic'> {
  if (!category) return [];
  const map: Record<string, 'food' | 'medication' | 'environment' | 'biologic'> = {
    'Drug': 'medication',
    'Food': 'food',
    'Environmental': 'environment',
  };
  return map[category] ? [map[category]] : [];
}

function safeDate(d?: Date | string): string {
  if (!d) return new Date().toISOString();
  if (d instanceof Date) return d.toISOString();
  return new Date(d).toISOString();
}

// ============================================================
// FHIR Resource Builders
// ============================================================

function buildFhirPatient(patient: IPatient, isVerified: boolean): FhirPatient {
  const identifiers = [];

  // ABHA identifier — only if present
  if (patient.abhaId) {
    identifiers.push({
      system: ABHA_SYSTEM,
      value: patient.abhaId,
      use: 'official' as const,
      type: { text: 'Ayushman Bharat Health Account (ABHA)' }
    });
  }

  // CarePrep internal identifier
  identifiers.push({
    system: `${CAREPREP_SYSTEM}/patient-id`,
    value: patient.patientId,
    use: 'secondary' as const,
    type: { text: 'CarePrep Patient ID' }
  });

  return {
    resourceType: 'Patient',
    id: patient.patientId,
    meta: isVerified ? makeVerifiedMeta() : makeAiMeta(),
    identifier: identifiers,
    active: true,
    name: [
      {
        use: 'usual',
        text: patient.fullName
      }
    ],
    gender: mapGender(patient.gender),
    birthDate: patient.dateOfBirth || undefined,
    telecom: [
      ...(patient.mobile ? [{ system: 'phone' as const, value: patient.mobile, use: 'mobile' as const }] : []),
      ...(patient.email ? [{ system: 'email' as const, value: patient.email, use: 'home' as const }] : [])
    ]
  };
}

function buildConditionsFromHistory(
  history: IMedicalHistory,
  patientId: string,
  timestamp: string
): FhirCondition[] {
  const conditions: FhirCondition[] = [];

  (history.conditionsList || []).forEach((condition, idx) => {
    const clinicalCode =
      condition.status === 'Resolved'
        ? { code: 'resolved', display: 'Resolved' }
        : { code: 'active', display: 'Active' };

    conditions.push({
      resourceType: 'Condition',
      id: `condition-hist-${patientId}-${idx + 1}`,
      meta: makeAiMeta(), // patient-reported history — not physician-examined
      clinicalStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          ...clinicalCode
        }]
      },
      verificationStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'unconfirmed',
          display: 'Unconfirmed (Patient-Reported)'
        }]
      },
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-category',
          code: 'problem-list-item',
          display: 'Problem List Item'
        }],
        text: 'Past Medical History (Patient-Reported)'
      }],
      code: { text: condition.name },
      subject: { reference: `Patient/${patientId}` },
      onsetDateTime: condition.since ? new Date(condition.since).toISOString() : undefined,
      recordedDate: timestamp,
      note: condition.notes ? [{ text: condition.notes }] : undefined
    });
  });

  return conditions;
}

function buildMedicationStatements(
  history: IMedicalHistory,
  patientId: string,
  timestamp: string
): FhirMedicationStatement[] {
  return (history.currentMedications || []).map((med, idx) => ({
    resourceType: 'MedicationStatement',
    id: `medstmt-${patientId}-${idx + 1}`,
    meta: makeAiMeta(), // patient-reported — not prescription-verified
    status: 'active' as const,
    medicationCodeableConcept: { text: med.name },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: med.startDate ? new Date(med.startDate).toISOString() : timestamp,
    dosage: [{
      text: [med.dosage, med.frequency, med.instructions]
        .filter(Boolean)
        .join(' | ')
        .trim() || 'As per prescription',
      timing: med.frequency ? { code: { text: med.frequency } } : undefined
    }],
    note: [
      ...(med.reason ? [{ text: `Reason: ${med.reason}` }] : []),
      ...(med.prescribedBy ? [{ text: `Prescribed by: ${med.prescribedBy}` }] : []),
      { text: 'Patient-reported medication — not independently verified.' }
    ]
  }));
}

function buildAllergyIntolerances(
  history: IMedicalHistory,
  patientId: string,
  timestamp: string
): FhirAllergyIntolerance[] {
  if (history.noKnownAllergies) return [];

  return (history.allergiesList || []).map((allergy, idx) => ({
    resourceType: 'AllergyIntolerance',
    id: `allergy-${patientId}-${idx + 1}`,
    meta: makeAiMeta(),
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        code: 'active',
        display: 'Active'
      }],
      text: 'Active'
    },
    verificationStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
        code: 'unconfirmed',
        display: 'Unconfirmed (Patient-Reported)'
      }],
      text: 'Unconfirmed'
    },
    type: 'allergy' as const,
    category: mapAllergyCategory(allergy.category),
    criticality: mapAllergyCriticality(allergy.severity),
    code: { text: allergy.allergen },
    patient: { reference: `Patient/${patientId}` },
    recordedDate: timestamp,
    reaction: allergy.reaction ? [{
      manifestation: [{ text: allergy.reaction }],
      severity: (allergy.severity?.toLowerCase() as 'mild' | 'moderate' | 'severe') || undefined,
      description: allergy.reaction
    }] : undefined,
    note: [{ text: 'Patient-reported allergy — not independently confirmed by clinician.' }]
  }));
}

function buildVitalObservations(
  history: IMedicalHistory,
  patientId: string,
  isVerified: boolean
): FhirObservation[] {
  const vitals = history.vitals;
  if (!vitals) return [];

  const timestamp = safeDate(vitals.recordedAt);
  const observations: FhirObservation[] = [];
  const meta = isVerified ? makeVerifiedMeta() : makeAiMeta();

  const vitalEntries: Array<{ key: string; value?: string; displayKey: string }> = [
    { key: 'Blood Pressure', value: vitals.bloodPressure, displayKey: 'Blood Pressure' },
    { key: 'Heart Rate', value: vitals.heartRate, displayKey: 'Heart Rate' },
    { key: 'Temperature', value: vitals.temperature, displayKey: 'Temperature' },
    { key: 'SpO2', value: vitals.spo2, displayKey: 'SpO2' },
    { key: 'BMI', value: vitals.bmi, displayKey: 'BMI' },
    { key: 'Weight', value: vitals.weight, displayKey: 'Weight' },
    { key: 'Height', value: vitals.height, displayKey: 'Height' },
  ];

  vitalEntries.forEach((entry, idx) => {
    if (!entry.value || entry.value.trim() === '') return;

    const loincMapping = VITAL_LOINC_MAP[entry.key];
    const numericValue = parseFloat(entry.value);

    observations.push({
      resourceType: 'Observation',
      id: `obs-vital-${patientId}-${idx + 1}`,
      meta,
      status: isVerified ? 'final' : 'preliminary',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'vital-signs',
          display: 'Vital Signs'
        }],
        text: 'Vital Signs'
      }],
      code: loincMapping
        ? {
            coding: [{ system: 'http://loinc.org', code: loincMapping.code, display: loincMapping.display }],
            text: entry.displayKey
          }
        : { text: entry.displayKey },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: timestamp,
      valueString: isNaN(numericValue) ? entry.value : undefined,
      valueQuantity: !isNaN(numericValue)
        ? { value: numericValue, unit: '' }
        : undefined
    });
  });

  return observations;
}

function buildTriageObservation(
  assessment: IAssessment,
  patientId: string
): FhirObservation {
  const isEmergent = assessment.triageStatus === 'RED_FLAG_TRIAGE';
  return {
    resourceType: 'Observation',
    id: `obs-triage-${assessment.assessmentId}`,
    meta: makeAiMeta(), // Deterministic — not physician-examined
    status: 'preliminary',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: 'survey',
        display: 'Survey'
      }],
      text: 'Pre-Consultation Clinical Triage'
    }],
    code: { text: 'CarePrep AI Pre-Consultation Triage Assessment' },
    subject: { reference: `Patient/${patientId}` },
    effectiveDateTime: safeDate(assessment.createdAt),
    valueString: isEmergent ? 'RED_FLAG_TRIAGE — Immediate Attention Required' : assessment.triageStatus,
    note: [
      ...(assessment.redFlagsDetected?.length > 0
        ? [{ text: `Red Flags Detected: ${assessment.redFlagsDetected.join('; ')}` }]
        : [{ text: 'No red flags detected at intake.' }]),
      { text: 'Note: Pre-consultation triage by CarePrep AI. Clinical triage decisions are the responsibility of the attending physician.' }
    ]
  };
}

function buildClinicalImpressionFromSummary(
  summary: IClinicalSummaryDocument,
  patientId: string
): { resource: FhirClinicalImpression; isVerified: boolean } {
  const isVerified = summary.reviewStatus === 'DOCTOR_CONFIRMED';
  const sourceData = summary.doctorEditedSummary || summary.aiGeneratedSummary;

  return {
    isVerified,
    resource: {
      resourceType: 'ClinicalImpression',
      id: `impression-${summary.summaryId}`,
      meta: isVerified ? makeVerifiedMeta() : makeAiMeta(),
      status: isVerified ? 'completed' : 'in-progress',
      description: 'CarePrep Pre-Consultation Clinical Summary',
      subject: { reference: `Patient/${patientId}` },
      date: safeDate(isVerified ? summary.confirmedAt : summary.generatedAt),
      summary: sourceData?.preConsultationSummary || 'AI-generated pre-consultation draft.',
      finding: (sourceData?.importantPointsForDoctor || []).map(point => ({
        itemCodeableConcept: { text: point },
        basis: 'AI-assisted pre-consultation analysis'
      })),
      note: [
        {
          text: isVerified
            ? `Physician Review: ${summary.reviewStatus} by Dr. ${summary.reviewedBy?.doctorName || 'Unknown'}. Decision: ${summary.doctorDecision}.`
            : `Review Status: ${summary.reviewStatus} — Pending physician review and sign-off.`
        },
        {
          text: 'Clinical decisions rest with the licensed physician. AI output is assistive only.'
        },
        ...(summary.doctorNotes
          ? [{ text: `Physician Notes: ${summary.doctorNotes}` }]
          : [])
      ]
    }
  };
}

function buildProvenanceFromEvidenceTrail(
  assessment: IAssessment,
  patientId: string,
  targetResourceRefs: string[],
  timestamp: string
): FhirProvenance {
  const entries = (assessment.evidenceTrail || []).map((ev, idx) => ({
    role: 'source' as const,
    what: {
      reference: `#evidence-${idx + 1}`,
      display: `${ev.sourceType}: ${ev.sourceName}`
    },
    description: `[${ev.sourceType}] ${ev.sourceName} → ${ev.structuredField}: "${ev.rawSnippet.substring(0, 120)}${ev.rawSnippet.length > 120 ? '...' : ''}"`
  }));

  return {
    resourceType: 'Provenance',
    id: `provenance-${assessment.assessmentId}`,
    meta: makeAiMeta(),
    target: targetResourceRefs.map(ref => ({ reference: ref })),
    recorded: timestamp,
    reason: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActReason',
        code: 'TREAT',
        display: 'Treatment'
      }],
      text: 'Pre-consultation clinical data collection'
    }],
    activity: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-DataOperation',
        code: 'CREATE',
        display: 'Create'
      }],
      text: 'CarePrep AI Multi-Agent Orchestration'
    },
    agent: [
      {
        type: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/provenance-participant-type', code: 'author', display: 'Author' }],
          text: 'CarePrep AI System'
        },
        who: { reference: 'Device/careprep-ai-orchestrator', display: 'CarePrep AI Orchestrator (gemini-3.6-flash)' }
      }
    ],
    entity: entries.length > 0 ? entries : undefined
  };
}

function buildComposition(
  patientId: string,
  patientName: string,
  isVerified: boolean,
  timestamp: string,
  resourceRefs: string[],
  summary?: IClinicalSummaryDocument
): FhirComposition {
  return {
    resourceType: 'Composition',
    id: `composition-${patientId}`,
    meta: isVerified ? makeVerifiedMeta() : makeAiMeta(),
    status: isVerified ? 'final' : 'preliminary',
    type: {
      coding: [{
        system: 'http://loinc.org',
        code: '60591-5',
        display: 'Patient summary Document'
      }],
      text: 'CarePrep Pre-Consultation Patient Summary'
    },
    subject: { reference: `Patient/${patientId}`, display: patientName },
    date: timestamp,
    author: [{ reference: 'Device/careprep-ai-orchestrator', display: 'CarePrep AI System' }],
    title: 'CarePrep Pre-Consultation Patient Summary',
    confidentiality: 'N',
    ...(isVerified && summary?.reviewedBy ? {
      attester: [{
        mode: 'professional' as const,
        time: safeDate(summary.confirmedAt),
        party: { reference: `Practitioner/${summary.reviewedBy.doctorId}`, display: summary.reviewedBy.doctorName }
      }]
    } : {}),
    section: [
      {
        title: 'Patient Demographics',
        entry: [{ reference: `Patient/${patientId}` }]
      },
      {
        title: 'Clinical Summary & Findings',
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml">CarePrep Pre-Consultation Summary. Verification Status: ${isVerified ? 'PHYSICIAN CONFIRMED' : 'AI DRAFT — PENDING REVIEW'}. Clinical decisions rest with the attending physician.</div>`
        }
      }
    ]
  };
}

// ============================================================
// FHIR Service — Main Assembly
// ============================================================

export interface FhirBundleContext {
  patient: IPatient;
  history?: IMedicalHistory | null;
  assessment?: IAssessment | null;
  clinicalSummary?: IClinicalSummaryDocument | null;
}

export interface ConsentCheckResult {
  hasActiveConsent: boolean;
  consents: IConsent[];
}

export class FhirService {
  /**
   * Assembles a complete FHIR R4 Bundle for a patient from all available MongoDB models.
   *
   * Provenance tagging rules:
   * - Patient-reported data (history, medications, allergies) → `ai-generated` tag
   * - Vitals → `physician-verified` if `clinicalSummary.reviewStatus === DOCTOR_CONFIRMED`
   * - ClinicalImpression → `physician-verified` if confirmed, else `ai-generated`
   * - Provenance resource always included when assessment has evidenceTrail
   */
  public static buildPatientFhirBundle(ctx: FhirBundleContext): FhirBundle {
    const { patient, history, assessment, clinicalSummary } = ctx;
    const patientId = patient.patientId;
    const timestamp = new Date().toISOString();
    const isVerified = clinicalSummary?.reviewStatus === 'DOCTOR_CONFIRMED';

    const entries: FhirBundleEntry[] = [];
    const resourceRefs: string[] = [];

    // 1. Patient Resource
    const fhirPatient = buildFhirPatient(patient, isVerified);
    entries.push({ fullUrl: `urn:uuid:${fhirPatient.id}`, resource: fhirPatient });
    resourceRefs.push(`Patient/${patientId}`);

    // 2. Conditions from Medical History
    if (history) {
      const conditions = buildConditionsFromHistory(history, patientId, timestamp);
      conditions.forEach(c => {
        entries.push({ fullUrl: `urn:uuid:${c.id}`, resource: c });
        resourceRefs.push(`Condition/${c.id}`);
      });

      // 3. Current Medications
      const medications = buildMedicationStatements(history, patientId, timestamp);
      medications.forEach(m => {
        entries.push({ fullUrl: `urn:uuid:${m.id}`, resource: m });
        resourceRefs.push(`MedicationStatement/${m.id}`);
      });

      // 4. Allergies
      const allergies = buildAllergyIntolerances(history, patientId, timestamp);
      allergies.forEach(a => {
        entries.push({ fullUrl: `urn:uuid:${a.id}`, resource: a });
        resourceRefs.push(`AllergyIntolerance/${a.id}`);
      });

      // 5. Vital Signs
      const vitals = buildVitalObservations(history, patientId, isVerified);
      vitals.forEach(v => {
        entries.push({ fullUrl: `urn:uuid:${v.id}`, resource: v });
        resourceRefs.push(`Observation/${v.id}`);
      });
    }

    // 6. Triage Observation from Assessment
    if (assessment) {
      const triageObs = buildTriageObservation(assessment, patientId);
      entries.push({ fullUrl: `urn:uuid:${triageObs.id}`, resource: triageObs });
      resourceRefs.push(`Observation/${triageObs.id}`);

      // 7. Provenance from Evidence Trail
      if ((assessment.evidenceTrail || []).length > 0) {
        const provenance = buildProvenanceFromEvidenceTrail(assessment, patientId, resourceRefs.slice(), timestamp);
        entries.push({ fullUrl: `urn:uuid:${provenance.id}`, resource: provenance });
      }
    }

    // 8. Clinical Impression from ClinicalSummary
    if (clinicalSummary) {
      const { resource: impression, isVerified: impressionVerified } = buildClinicalImpressionFromSummary(clinicalSummary, patientId);
      entries.push({ fullUrl: `urn:uuid:${impression.id}`, resource: impression });
      resourceRefs.push(`ClinicalImpression/${impression.id}`);
    }

    // 9. Composition (document index)
    const composition = buildComposition(
      patientId,
      patient.fullName,
      isVerified,
      timestamp,
      resourceRefs,
      clinicalSummary || undefined
    );
    // Insert Composition as the first entry (FHIR document bundle convention)
    entries.unshift({ fullUrl: `urn:uuid:${composition.id}`, resource: composition });

    return {
      resourceType: 'Bundle',
      id: `careprep-bundle-${patientId}`,
      meta: {
        lastUpdated: timestamp,
        profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle'],
        tag: [FHIR_TAG_ABDM_READY, isVerified ? FHIR_TAG_PHYSICIAN_VERIFIED : FHIR_TAG_AI_GENERATED]
      },
      type: 'document',
      timestamp,
      entry: entries
    };
  }

  /**
   * Checks whether the patient has an active FHIR export consent record.
   */
  public static async checkConsentStatus(
    patientId: string,
    scope: ConsentScope,
    consents: IConsent[]
  ): Promise<ConsentCheckResult> {
    const now = new Date();
    const active = consents.filter(c =>
      c.patientId === patientId &&
      c.scope === scope &&
      c.status === 'ACTIVE' &&
      (!c.expiresAt || new Date(c.expiresAt) > now)
    );
    return {
      hasActiveConsent: active.length > 0,
      consents: active
    };
  }

  /**
   * Generates a minimal FHIR OperationOutcome (error response) for failed exports.
   */
  public static buildOperationOutcome(severity: 'error' | 'warning' | 'information', code: string, diagnostics: string) {
    return {
      resourceType: 'OperationOutcome',
      issue: [
        {
          severity,
          code,
          diagnostics
        }
      ]
    };
  }
}
