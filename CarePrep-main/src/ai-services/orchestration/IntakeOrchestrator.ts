import { 
  OrchestratorContext, 
  AgentActivityLog, 
  AgentRequest 
} from './orchestrationTypes';
import { conversationAgent } from './ConversationAgent';
import { documentAgent } from './DocumentAgent';
import { ayushAgent } from './AyushAgent';
import { safetyController } from './SafetyController';
import { summaryAgent } from './SummaryAgent';
import { PatientIdentity, ConsentRecord } from '../../data-models/patient';
import { PatientCaseRecord, IntakeMode, IntakeAnswer } from '../../data-models/intake';
import { DocumentClassification } from '../../document-intelligence/models/document';

const MAX_AGENT_STEPS = 10;

/**
 * Central Intake Orchestrator.
 * Coordinates specialized agents (Conversation, Document, AYUSH, Safety, Evidence, Summary)
 * through a non-linear state machine with loop prevention and deterministic safety guarantees.
 */
export class IntakeOrchestrator {
  private context: OrchestratorContext;

  constructor(initialSessionId: string = `session-${Date.now()}`) {
    this.context = this.createInitialContext(initialSessionId);
  }

  private createInitialContext(sessionId: string): OrchestratorContext {
    return {
      sessionId,
      patient: null,
      consent: null,
      mode: 'GENERAL_CLINICAL',
      language: 'en',
      state: 'INIT',
      chiefComplaint: '',
      answers: [],
      documents: [],
      timeline: [],
      safetyStatus: 'GREEN',
      activeRedFlags: [],
      evidenceTrail: [],
      activityLogs: [],
      generatedSummary: null,
      missingInformation: [],
      stepIterationCount: 0
    };
  }

  public getContext(): OrchestratorContext {
    return { ...this.context };
  }

  public getActivityLogs(): AgentActivityLog[] {
    return [...this.context.activityLogs];
  }

  private logActivity(agentName: string, action: string, status: AgentActivityLog['status'], details?: string) {
    const entry: AgentActivityLog = {
      agentName,
      action,
      status,
      timestamp: new Date().toISOString(),
      details
    };
    this.context.activityLogs.push(entry);
  }

  public startSession(patient: PatientIdentity, mode: IntakeMode, language: 'en' | 'hi' | 'ta'): OrchestratorContext {
    this.context.patient = patient;
    this.context.mode = mode;
    this.context.language = language;
    this.context.state = 'INIT';
    this.context.stepIterationCount = 0;
    this.logActivity('IntakeOrchestrator', `Session initialized for ${patient.fullName} (${mode} mode)`, 'SUCCESS');
    return this.getContext();
  }

  public recordConsent(consent: ConsentRecord): OrchestratorContext {
    this.context.consent = consent;
    this.context.state = 'CONSENTED';
    this.logActivity('IntakeOrchestrator', 'Patient consent validated and recorded', 'SUCCESS');
    return this.getContext();
  }

  /**
   * Process Patient Spoken / Typed / Touched Utterance
   */
  public async handlePatientInput(
    rawText: string,
    modality: 'VOICE' | 'TYPED' | 'TOUCH_CHIP' = 'TYPED',
    step: any = 'CHIEF_COMPLAINT',
    selectedOptionIds?: string[]
  ): Promise<{
    orchestratorContext: OrchestratorContext;
    suggestedQuestions: any[];
    isEmergency: boolean;
  }> {
    // 1. Loop prevention guard
    if (this.context.stepIterationCount >= MAX_AGENT_STEPS) {
      this.logActivity('IntakeOrchestrator', 'Maximum automated steps reached. Transitioning to clinician review.', 'WARNING');
      this.context.state = 'PHYSICIAN_REVIEW';
      return {
        orchestratorContext: this.getContext(),
        suggestedQuestions: [],
        isEmergency: this.context.safetyStatus === 'RED'
      };
    }

    this.context.stepIterationCount++;
    this.context.state = 'ANALYZING_RESPONSE';

    const req: AgentRequest = {
      sessionId: this.context.sessionId,
      patientId: this.context.patient?.id || 'anonymous',
      mode: this.context.mode,
      language: this.context.language,
      payload: {
        rawText,
        modality,
        stepContext: step
      }
    };

    // 2. Invoke Conversation Agent
    this.logActivity('ConversationAgent', `Interpreting patient response (${modality})`, 'IN_PROGRESS');
    const convResponse = await conversationAgent.processPatientUtterance(req);
    this.logActivity('ConversationAgent', `Structured interpretation: ${convResponse.structuredData.interpretation.detectedChiefComplaint || 'Symptom response captured'}`, 'SUCCESS');

    if (convResponse.evidence && convResponse.evidence.length > 0) {
      this.context.evidenceTrail.push(...convResponse.evidence);
    }

    // 3. Save intake answer
    const newAnswer: IntakeAnswer = {
      questionId: `q-${Date.now()}`,
      step,
      selectedOptionIds,
      customText: rawText,
      rawPatientResponse: rawText,
      audioProvenance: modality,
      structuredInterpretation: {
        detectedChiefComplaint: convResponse.structuredData.interpretation.detectedChiefComplaint,
        detectedDuration: convResponse.structuredData.interpretation.detectedDuration,
        detectedSeverity: convResponse.structuredData.interpretation.detectedSeverity,
        detectedBodySite: convResponse.structuredData.interpretation.detectedBodySite,
        detectedAssociatedSymptoms: convResponse.structuredData.interpretation.detectedAssociatedSymptoms,
        detectedMedications: convResponse.structuredData.interpretation.detectedMedications
      },
      timestamp: new Date().toISOString()
    };
    this.context.answers.push(newAnswer);

    if (convResponse.structuredData.interpretation.detectedChiefComplaint && !this.context.chiefComplaint) {
      this.context.chiefComplaint = convResponse.structuredData.interpretation.detectedChiefComplaint;
    }

    // 4. Invoke Safety Controller (Deterministic red-flag evaluation)
    this.context.state = 'SAFETY_CHECK';
    this.logActivity('SafetyController', 'Screening against deterministic clinical red-flag rules', 'IN_PROGRESS');
    
    const safetyReq: AgentRequest = {
      sessionId: this.context.sessionId,
      patientId: this.context.patient?.id || 'anonymous',
      mode: this.context.mode,
      language: this.context.language,
      payload: {
        utterance: rawText,
        chiefComplaint: this.context.chiefComplaint,
        structuredSymptoms: convResponse.structuredData.interpretation.detectedAssociatedSymptoms
      }
    };
    const safetyResponse = safetyController.evaluateSafety(safetyReq);

    if (safetyResponse.evidence && safetyResponse.evidence.length > 0) {
      this.context.evidenceTrail.push(...safetyResponse.evidence);
    }

    if (safetyResponse.status === 'EMERGENCY') {
      this.context.safetyStatus = 'RED';
      this.context.activeRedFlags = safetyResponse.structuredData.alerts;
      this.context.state = 'EMERGENCY_TRIAGE';
      this.logActivity('SafetyController', `🔴 EMERGENCY TRIGGER: ${safetyResponse.structuredData.alerts.map(a => a.ruleTitle).join('; ')}`, 'ERROR');
      return {
        orchestratorContext: this.getContext(),
        suggestedQuestions: [],
        isEmergency: true
      };
    } else {
      this.context.safetyStatus = 'GREEN';
      this.logActivity('SafetyController', '🟢 No prototype red-flag rule triggered', 'SUCCESS');
    }

    // 5. If AYUSH mode, coordinate with AyushAgent
    let suggestedQuestions = convResponse.structuredData.suggestedQuestions;
    if (this.context.mode === 'AYUSH') {
      this.context.state = 'AYUSH_PROCESSING';
      this.logActivity('AyushAgent', 'Aggregating Dashavidha Pariksha clinical parameters', 'IN_PROGRESS');
      const ayushResponse = ayushAgent.processAyushIntake({
        ...req,
        payload: { answers: this.context.answers }
      });
      suggestedQuestions = ayushResponse.structuredData.suggestedQuestions;
      this.logActivity('AyushAgent', 'Dashavidha profile updated', 'SUCCESS');
    }

    this.context.state = 'COLLECTING_HISTORY';
    return {
      orchestratorContext: this.getContext(),
      suggestedQuestions,
      isEmergency: false
    };
  }

  /**
   * Process Uploaded Medical Document
   */
  public async handleDocumentUpload(
    rawText: string,
    fileName: string,
    sourceType: 'pdf' | 'image' | 'sample',
    hintType?: DocumentClassification
  ): Promise<OrchestratorContext> {
    this.context.state = 'DOCUMENT_PROCESSING';
    this.logActivity('DocumentAgent', `Processing medical record: ${fileName} (${sourceType})`, 'IN_PROGRESS');

    const docReq: AgentRequest = {
      sessionId: this.context.sessionId,
      patientId: this.context.patient?.id || 'anonymous',
      mode: this.context.mode,
      language: this.context.language,
      payload: {
        rawText,
        fileName,
        sourceType,
        hintType
      }
    };

    const docResponse = await documentAgent.processDocument(docReq);

    if (docResponse.status === 'ERROR') {
      this.logActivity('DocumentAgent', `Processing error on ${fileName}: ${docResponse.warnings?.[0]}`, 'WARNING');
      this.context.documents.push(docResponse.structuredData.extractedDocument);
    } else {
      this.context.documents.push(docResponse.structuredData.extractedDocument);
      this.logActivity(
        'DocumentAgent',
        `Extracted ${docResponse.structuredData.extractedDocument.medications.length} meds, ${docResponse.structuredData.extractedDocument.labResults.length} labs from ${fileName}`,
        'SUCCESS'
      );

      // Update timeline
      this.context.state = 'TIMELINE_UPDATE';
      this.context.timeline = [
        ...this.context.timeline,
        ...docResponse.structuredData.timelineEvents
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      this.logActivity('EvidenceLayer', `Linked document evidence to chronological timeline`, 'SUCCESS');
    }

    return this.getContext();
  }

  /**
   * Finalize Intake and Synthesize Physician Summary Draft
   */
  public finalizeIntakeSummary(): OrchestratorContext {
    this.context.state = 'SUMMARY_GENERATION';
    this.logActivity('SummaryAgent', 'Synthesizing multi-source structured clinical draft', 'IN_PROGRESS');

    const patient: PatientIdentity = this.context.patient || {
      id: 'pat-anon',
      fullName: 'Patient',
      age: 0,
      gender: 'other',
      phoneNumber: '+91 00000 00000',
      preferredLanguage: this.context.language,
      createdAt: new Date().toISOString()
    };

    const caseRecord: PatientCaseRecord = {
      caseId: this.context.sessionId,
      patientId: patient.id,
      mode: this.context.mode,
      status: 'COMPLETED',
      chiefComplaint: this.context.chiefComplaint || 'Not provided.',
      language: this.context.language,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      redFlagsDetected: this.context.activeRedFlags.map(a => a.ruleId),
      answers: this.context.answers
    };

    const summaryResponse = summaryAgent.generateSummary({
      sessionId: this.context.sessionId,
      patientId: patient.id,
      mode: this.context.mode,
      language: this.context.language,
      payload: {
        patient,
        caseRecord,
        documents: this.context.documents
      }
    });

    this.context.generatedSummary = summaryResponse.structuredData;
    this.context.state = 'PHYSICIAN_REVIEW';
    this.logActivity('SummaryAgent', `Physician intake summary draft generated (Version 1)`, 'SUCCESS');

    return this.getContext();
  }
}

export const intakeOrchestrator = new IntakeOrchestrator();
