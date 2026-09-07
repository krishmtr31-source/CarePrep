import { PatientIdentity, ConsentRecord } from '../../data-models/patient';
import { PatientCaseRecord, IntakeMode, IntakeStepType, IntakeAnswer } from '../../data-models/intake';
import { RedFlagAlert } from '../../data-models/redFlag';
import { ExtractedDocumentData, TimelineEvent } from '../../document-intelligence/models/document';
import { DoctorSummaryDraft } from '../../data-models/doctorSummary';

export type OrchestrationState = 
  | 'INIT'
  | 'CONSENTED'
  | 'COLLECTING_HISTORY'
  | 'ANALYZING_RESPONSE'
  | 'SAFETY_CHECK'
  | 'CONTINUE_HISTORY'
  | 'DOCUMENT_PROCESSING'
  | 'TIMELINE_UPDATE'
  | 'AYUSH_PROCESSING'
  | 'SUMMARY_GENERATION'
  | 'PHYSICIAN_REVIEW'
  | 'COMPLETE'
  | 'EMERGENCY_TRIAGE'
  | 'ERROR_FALLBACK';

export type EvidenceSourceType = 
  | 'PATIENT_VOICE'
  | 'PATIENT_TEXT'
  | 'PATIENT_TOUCH'
  | 'DOCUMENT'
  | 'SYSTEM_RULE';

export interface AgentEvidence {
  id: string;
  sourceType: EvidenceSourceType;
  sourceName: string;
  rawSnippet: string;
  structuredField: string;
  timestamp: string;
  confidence?: number;
  documentPage?: number;
}

export interface AgentActivityLog {
  agentName: string;
  timestamp: string;
  action: string;
  status: 'SUCCESS' | 'IN_PROGRESS' | 'WARNING' | 'ERROR';
  details?: string;
}

export interface AgentRequest<T = any> {
  sessionId: string;
  patientId: string;
  mode: IntakeMode;
  language: 'en' | 'hi' | 'ta';
  payload: T;
  stepCount?: number;
}

export interface AgentResponse<T = any> {
  agentName: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR' | 'EMERGENCY';
  structuredData: T;
  evidence?: AgentEvidence[];
  warnings?: string[];
  nextAction?: string;
  error?: string;
}

export interface OrchestratorContext {
  sessionId: string;
  patient: PatientIdentity | null;
  consent: ConsentRecord | null;
  mode: IntakeMode;
  language: 'en' | 'hi' | 'ta';
  state: OrchestrationState;
  chiefComplaint: string;
  answers: IntakeAnswer[];
  documents: ExtractedDocumentData[];
  timeline: TimelineEvent[];
  safetyStatus: 'GREEN' | 'YELLOW' | 'RED';
  activeRedFlags: RedFlagAlert[];
  evidenceTrail: AgentEvidence[];
  activityLogs: AgentActivityLog[];
  generatedSummary: DoctorSummaryDraft | null;
  missingInformation: string[];
  stepIterationCount: number;
}
