/**
 * CarePrep to FHIR R4 Transformation Engine
 *
 * This transformer converts CarePrep internal clinical data models (DoctorSummaryDraft, PatientCaseRecord)
 * into standard FHIR R4 Bundle JSON.
 *
 * Interoperability Architecture:
 *   CarePrep Internal Models -> FHIR Transformation Engine -> Standard FHIR R4 Bundle
 *
 * NOTE: This module represents an architectural preparation layer for the Ayushman Bharat Digital Mission
 * (ABDM) and national digital health standards (EHR Standards for India).
 */

import { DoctorSummaryDraft } from '../../data-models/doctorSummary';
import { PatientCaseRecord } from '../../data-models/intake';
import {
  FhirBundle,
  FhirPatient,
  FhirCondition,
  FhirObservation,
  FhirMedicationStatement,
  FhirQuestionnaireResponse,
  FhirClinicalImpression,
  FhirResource
} from './fhirTypes';

export class FhirTransformer {
  /**
   * Transforms a DoctorSummaryDraft into a comprehensive FHIR R4 Bundle
   */
  public static transformSummaryToFhirBundle(
    summary: DoctorSummaryDraft,
    caseRecord?: PatientCaseRecord
  ): FhirBundle {
    const timestamp = new Date().toISOString();
    const bundleId = `careprep-bundle-${summary.caseId || 'intake'}`;
    const patientRef = `Patient/${summary.patientId || 'patient-01'}`;

    const entries: Array<{ fullUrl: string; resource: FhirResource }> = [];

    // 1. FHIR Patient Resource
    const fhirPatient: FhirPatient = {
      resourceType: 'Patient',
      id: summary.patientId || 'patient-01',
      active: true,
      identifier: summary.abhaId ? [
        {
          system: 'https://healthid.ndhm.gov.in',
          value: summary.abhaId,
          use: 'official',
          type: { text: 'Ayushman Bharat Health Account (ABHA)' }
        }
      ] : undefined,
      name: [
        {
          use: 'usual',
          text: summary.patientName || 'Unnamed Patient'
        }
      ],
      gender: this.mapGender(summary.gender)
    };

    entries.push({
      fullUrl: `urn:uuid:${fhirPatient.id}`,
      resource: fhirPatient
    });

    // 2. FHIR Condition (Chief Complaint)
    if (summary.chiefComplaint?.normalizedText || summary.chiefComplaint?.rawPatientVerbatim) {
      const complaintText = summary.chiefComplaint.normalizedText || summary.chiefComplaint.rawPatientVerbatim;
      const fhirCondition: FhirCondition = {
        resourceType: 'Condition',
        id: `condition-cc-${summary.caseId}`,
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: 'active',
            display: 'Active'
          }]
        },
        verificationStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: 'provisional',
            display: 'Provisional'
          }]
        },
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'problem-list-item',
            display: 'Problem List Item'
          }],
          text: 'Chief Complaint / Presenting Problem'
        }],
        code: {
          text: complaintText
        },
        subject: {
          reference: patientRef,
          display: summary.patientName
        },
        recordedDate: summary.dateGenerated || timestamp,
        note: [
          {
            text: `SOCRATES Details — Onset: ${summary.hpiStructured?.onset || 'Not provided.'}, Location: ${summary.hpiStructured?.location || 'Not provided.'}, Severity: ${summary.hpiStructured?.severity || 'Not provided.'}, Character: ${summary.hpiStructured?.character || 'Not provided.'}`
          }
        ]
      };

      entries.push({
        fullUrl: `urn:uuid:${fhirCondition.id}`,
        resource: fhirCondition
      });
    }

    // 3. FHIR QuestionnaireResponse (Intake & SOCRATES answers)
    if (caseRecord && caseRecord.answers && caseRecord.answers.length > 0) {
      const questionnaireItems = caseRecord.answers.map((ans, idx) => ({
        linkId: ans.step || `step-${idx + 1}`,
        text: ans.questionId,
        answer: [
          {
            valueString: ans.customText || ans.rawPatientResponse || (ans.selectedOptionIds ? ans.selectedOptionIds.join(', ') : '')
          }
        ]
      }));

      const fhirQR: FhirQuestionnaireResponse = {
        resourceType: 'QuestionnaireResponse',
        id: `qr-${summary.caseId}`,
        status: 'completed',
        subject: {
          reference: patientRef,
          display: summary.patientName
        },
        authored: summary.dateGenerated || timestamp,
        item: questionnaireItems
      };

      entries.push({
        fullUrl: `urn:uuid:${fhirQR.id}`,
        resource: fhirQR
      });
    }

    // 4. FHIR Observations (Triage Level & Red Flag Safety)
    const triageObservation: FhirObservation = {
      resourceType: 'Observation',
      id: `obs-triage-${summary.caseId}`,
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'survey',
          display: 'Survey'
        }],
        text: 'Pre-Consultation Clinical Triage'
      }],
      code: {
        text: 'Clinical Triage Evaluation'
      },
      subject: {
        reference: patientRef,
        display: summary.patientName
      },
      effectiveDateTime: summary.dateGenerated || timestamp,
      valueString: summary.redFlagTriage?.hasTriggered ? 'RED_URGENT' : 'GREEN_ROUTINE',
      note: summary.redFlagTriage?.alerts?.map(alert => ({
        text: `[${alert.severity}] ${alert.ruleTitle}: ${alert.matchedTrigger}`
      })) || []
    };

    entries.push({
      fullUrl: `urn:uuid:${triageObservation.id}`,
      resource: triageObservation
    });

    // 5. FHIR Observations (Extracted Laboratory Results)
    if (summary.investigationResults && summary.investigationResults.length > 0) {
      summary.investigationResults.forEach((lab, index) => {
        const numVal = parseFloat(lab.numericValue !== undefined ? String(lab.numericValue) : lab.resultValue);
        const labObs: FhirObservation = {
          resourceType: 'Observation',
          id: `obs-lab-${summary.caseId}-${index + 1}`,
          status: 'final',
          category: [{
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/observation-category',
              code: 'laboratory',
              display: 'Laboratory'
            }],
            text: 'Document Extracted Lab Result'
          }],
          code: {
            text: lab.testName
          },
          subject: {
            reference: patientRef,
            display: summary.patientName
          },
          effectiveDateTime: summary.dateGenerated || timestamp,
          valueString: isNaN(numVal) ? lab.resultValue : undefined,
          valueQuantity: !isNaN(numVal) ? {
            value: numVal,
            unit: lab.unit || ''
          } : undefined,
          interpretation: lab.flag ? [{
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
              code: lab.flag === 'HIGH' ? 'H' : lab.flag === 'LOW' ? 'L' : 'N',
              display: lab.flag
            }],
            text: lab.flag
          }] : undefined,
          referenceRange: lab.sourceReferenceRange?.raw ? [{ text: lab.sourceReferenceRange.raw }] : undefined,
          note: lab.evidence?.snippet ? [{ text: `Extracted from document evidence: "${lab.evidence.snippet}"` }] : undefined
        };

        entries.push({
          fullUrl: `urn:uuid:${labObs.id}`,
          resource: labObs
        });
      });
    }

    // 6. FHIR MedicationStatement (Extracted Past Medications)
    if (summary.extractedMedications && summary.extractedMedications.length > 0) {
      summary.extractedMedications.forEach((med, index) => {
        const medStmt: FhirMedicationStatement = {
          resourceType: 'MedicationStatement',
          id: `medstmt-${summary.caseId}-${index + 1}`,
          status: 'active',
          medicationCodeableConcept: {
            text: med.name
          },
          subject: {
            reference: patientRef,
            display: summary.patientName
          },
          dosage: [{
            text: `${med.dosage || ''} ${med.frequency || ''}`.trim() || 'Dose as per prescription',
            timing: med.frequency ? { code: { text: med.frequency } } : undefined
          }],
          note: med.evidence?.snippet ? [{ text: `Document Source: "${med.evidence.snippet}"` }] : undefined
        };

        entries.push({
          fullUrl: `urn:uuid:${medStmt.id}`,
          resource: medStmt
        });
      });
    }

    // 7. FHIR ClinicalImpression (Physician Summary & Verification)
    const clinicalImpression: FhirClinicalImpression = {
      resourceType: 'ClinicalImpression',
      id: `impression-${summary.caseId}`,
      status: summary.doctorEdits?.status === 'ACCEPTED' ? 'completed' : 'in-progress',
      description: 'CarePrep Pre-Consultation Summary & Physician Review',
      subject: {
        reference: patientRef,
        display: summary.patientName
      },
      date: summary.dateGenerated || timestamp,
      summary: summary.doctorEdits?.physicianNotes || 'AI-generated pre-consultation draft pending final clinician signature.',
      finding: summary.provisionalTags?.map(tag => ({
        itemCodeableConcept: {
          text: tag
        },
        basis: 'Pre-consultation automated intake evidence'
      })) || [],
      note: [
        {
          text: `Review Status: ${summary.doctorEdits?.status || 'DRAFT'}, Verified by: ${summary.doctorEdits?.verifiedByDoctorName || 'Pending'}`
        },
        {
          text: summary.clinicalDisclaimer || 'Pre-consultation record. Clinical decisions rest with the licensed physician.'
        }
      ]
    };

    entries.push({
      fullUrl: `urn:uuid:${clinicalImpression.id}`,
      resource: clinicalImpression
    });

    return {
      resourceType: 'Bundle',
      id: bundleId,
      meta: {
        lastUpdated: timestamp,
        profile: [
          'https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle'
        ]
      },
      type: 'document',
      entry: entries
    };
  }

  private static mapGender(gender?: string): 'male' | 'female' | 'other' | 'unknown' {
    if (!gender) return 'unknown';
    const normalized = gender.toLowerCase().trim();
    if (normalized.startsWith('m')) return 'male';
    if (normalized.startsWith('f')) return 'female';
    if (normalized.startsWith('o')) return 'other';
    return 'unknown';
  }
}
