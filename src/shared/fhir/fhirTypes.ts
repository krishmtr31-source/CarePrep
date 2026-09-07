/**
 * FHIR R4 Data Structure Definitions for CarePrep Interoperability Layer
 *
 * NOTE: This is an architectural preparation layer for the Ayushman Bharat Digital Mission (ABDM)
 * and FHIR R4 interoperability. It transforms internal CarePrep case records into standard FHIR bundles.
 * It is NOT a live ABDM M1/M2/M3 production gateway integration.
 *
 * Phase 6 additions:
 * - FhirMeta with tag support (ai-generated vs physician-verified provenance)
 * - FhirProvenance for evidence trail traceability
 * - FhirAllergyIntolerance for allergy records
 * - FhirComposition for document bundles
 * - Extended FhirResource union type
 */

// ============================================================
// Shared Primitives
// ============================================================

export interface FhirMeta {
  lastUpdated?: string;
  profile?: string[];
  tag?: Array<{
    system?: string;
    code: string;
    display?: string;
  }>;
}

export interface FhirIdentifier {
  system?: string;
  value: string;
  use?: 'official' | 'usual' | 'secondary' | 'temp';
  type?: {
    text: string;
  };
}

export interface FhirCodeableConcept {
  coding?: Array<{
    system?: string;
    code?: string;
    display?: string;
  }>;
  text: string;
}

export interface FhirReference {
  reference: string;
  display?: string;
}

// ============================================================
// FHIR R4 Resource Definitions
// ============================================================

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  meta?: FhirMeta;
  identifier?: FhirIdentifier[];
  active: boolean;
  name: Array<{
    use: 'official' | 'usual';
    text: string;
    family?: string;
    given?: string[];
  }>;
  gender: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  telecom?: Array<{
    system: 'phone' | 'email';
    value: string;
    use: 'mobile' | 'home';
  }>;
}

export interface FhirCondition {
  resourceType: 'Condition';
  id: string;
  meta?: FhirMeta;
  clinicalStatus: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  verificationStatus: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  };
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  onsetDateTime?: string;
  recordedDate: string;
  note?: Array<{ text: string }>;
}

export interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  meta?: FhirMeta;
  status: 'preliminary' | 'final' | 'amended';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  effectiveDateTime: string;
  valueString?: string;
  valueQuantity?: {
    value: number;
    unit: string;
    system?: string;
    code?: string;
  };
  interpretation?: FhirCodeableConcept[];
  referenceRange?: Array<{
    text?: string;
  }>;
  note?: Array<{ text: string }>;
}

export interface FhirMedicationStatement {
  resourceType: 'MedicationStatement';
  id: string;
  meta?: FhirMeta;
  status: 'active' | 'completed' | 'intended' | 'stopped';
  medicationCodeableConcept: FhirCodeableConcept;
  subject: FhirReference;
  effectiveDateTime?: string;
  dosage?: Array<{
    text: string;
    timing?: {
      code?: {
        text: string;
      };
    };
    doseAndRate?: Array<{
      doseQuantity?: {
        value?: number;
        unit?: string;
      };
    }>;
  }>;
  note?: Array<{ text: string }>;
}

export interface FhirQuestionnaireResponseItem {
  linkId: string;
  text: string;
  answer?: Array<{
    valueString?: string;
    valueBoolean?: boolean;
    valueInteger?: number;
  }>;
}

export interface FhirQuestionnaireResponse {
  resourceType: 'QuestionnaireResponse';
  id: string;
  meta?: FhirMeta;
  status: 'completed' | 'in-progress';
  subject: FhirReference;
  authored: string;
  item: FhirQuestionnaireResponseItem[];
}

export interface FhirClinicalImpression {
  resourceType: 'ClinicalImpression';
  id: string;
  meta?: FhirMeta;
  status: 'completed' | 'in-progress';
  description: string;
  subject: FhirReference;
  date: string;
  summary: string;
  finding?: Array<{
    itemCodeableConcept?: FhirCodeableConcept;
    basis?: string;
  }>;
  note?: Array<{ text: string }>;
}

/**
 * FHIR R4 AllergyIntolerance — Phase 6 addition
 * Maps CarePrep IAllergyItem to FHIR standard.
 */
export interface FhirAllergyIntolerance {
  resourceType: 'AllergyIntolerance';
  id: string;
  meta?: FhirMeta;
  clinicalStatus: FhirCodeableConcept;
  verificationStatus: FhirCodeableConcept;
  type?: 'allergy' | 'intolerance';
  category?: Array<'food' | 'medication' | 'environment' | 'biologic'>;
  criticality?: 'low' | 'high' | 'unable-to-assess';
  code: FhirCodeableConcept;
  patient: FhirReference;
  recordedDate?: string;
  reaction?: Array<{
    manifestation: FhirCodeableConcept[];
    severity?: 'mild' | 'moderate' | 'severe';
    description?: string;
  }>;
  note?: Array<{ text: string }>;
}

/**
 * FHIR R4 Provenance — Phase 6 addition
 * Tracks the source and custody chain of clinical information.
 * Used to separate AI-generated drafts from physician-verified facts.
 */
export interface FhirProvenance {
  resourceType: 'Provenance';
  id: string;
  meta?: FhirMeta;
  target: FhirReference[];
  recorded: string;
  reason?: FhirCodeableConcept[];
  activity?: FhirCodeableConcept;
  agent: Array<{
    type?: FhirCodeableConcept;
    role?: FhirCodeableConcept[];
    who: FhirReference;
    onBehalfOf?: FhirReference;
  }>;
  entity?: Array<{
    role: 'derivation' | 'revision' | 'quotation' | 'source' | 'removal';
    what: FhirReference;
    description?: string;
  }>;
  signature?: Array<{
    type: Array<{ system: string; code: string; display?: string }>;
    when: string;
    who: FhirReference;
    data?: string;
  }>;
}

/**
 * FHIR R4 Composition — Phase 6 addition
 * Represents a structured document (the overall summary composition).
 */
export interface FhirComposition {
  resourceType: 'Composition';
  id: string;
  meta?: FhirMeta;
  status: 'preliminary' | 'final' | 'amended' | 'entered-in-error';
  type: FhirCodeableConcept;
  subject: FhirReference;
  date: string;
  author: FhirReference[];
  title: string;
  confidentiality?: 'U' | 'L' | 'M' | 'N' | 'R' | 'V';
  attester?: Array<{
    mode: 'personal' | 'professional' | 'legal' | 'official';
    time?: string;
    party?: FhirReference;
  }>;
  section?: Array<{
    title: string;
    code?: FhirCodeableConcept;
    text?: {
      status: 'generated' | 'additional' | 'empty';
      div: string;
    };
    entry?: FhirReference[];
  }>;
}

// ============================================================
// Union & Bundle Types
// ============================================================

export type FhirResource =
  | FhirPatient
  | FhirCondition
  | FhirObservation
  | FhirMedicationStatement
  | FhirQuestionnaireResponse
  | FhirClinicalImpression
  | FhirAllergyIntolerance
  | FhirProvenance
  | FhirComposition;

export interface FhirBundleEntry {
  fullUrl: string;
  resource: FhirResource;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  meta: {
    lastUpdated: string;
    profile: string[];
    tag?: Array<{ system?: string; code: string; display?: string }>;
  };
  type: 'collection' | 'document' | 'transaction' | 'searchset';
  timestamp?: string;
  entry: FhirBundleEntry[];
}

// ============================================================
// Provenance Tag Constants (Phase 6)
// ============================================================

export const FHIR_TAG_AI_GENERATED = {
  system: 'https://careprep.in/fhir/tags',
  code: 'ai-generated',
  display: 'AI-Generated Draft (CarePrep)'
} as const;

export const FHIR_TAG_PHYSICIAN_VERIFIED = {
  system: 'https://careprep.in/fhir/tags',
  code: 'physician-verified',
  display: 'Physician Verified & Confirmed'
} as const;

export const FHIR_TAG_ABDM_READY = {
  system: 'https://careprep.in/fhir/tags',
  code: 'abdm-ready',
  display: 'ABDM Interoperability Ready (Preparation Layer)'
} as const;
