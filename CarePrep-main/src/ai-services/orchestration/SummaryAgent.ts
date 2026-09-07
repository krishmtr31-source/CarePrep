import { generateDoctorSummaryDraft } from '../summaryGenerator';
import { PatientIdentity } from '../../data-models/patient';
import { PatientCaseRecord } from '../../data-models/intake';
import { ExtractedDocumentData } from '../../document-intelligence/models/document';
import { DoctorSummaryDraft } from '../../data-models/doctorSummary';
import { AgentRequest, AgentResponse } from './orchestrationTypes';

export interface GenerateSummaryPayload {
  patient: PatientIdentity;
  caseRecord: PatientCaseRecord;
  documents: ExtractedDocumentData[];
}

/**
 * Summary Agent.
 * Orchestrates deterministic aggregation of interview history, documents,
 * lab abnormalities, timeline events, and safety flags into a physician-ready intake summary draft.
 */
export class SummaryAgent {
  public generateSummary(
    request: AgentRequest<GenerateSummaryPayload>
  ): AgentResponse<DoctorSummaryDraft> {
    const { patient, caseRecord, documents } = request.payload;

    const summary = generateDoctorSummaryDraft(patient, caseRecord, documents);

    return {
      agentName: 'SummaryAgent',
      status: 'SUCCESS',
      structuredData: summary,
      warnings: summary.verificationItems.length > 0 ? summary.verificationItems : undefined,
      nextAction: 'PRESENT_FOR_PHYSICIAN_REVIEW'
    };
  }
}

export const summaryAgent = new SummaryAgent();
