import { llmService, LLMInterpretationResult } from './LLMService';
import { getAdaptiveSocratesQuestions } from '../socratesEngine';
import { IntakeQuestion } from '../../data-models/intake';
import { AgentRequest, AgentResponse, AgentEvidence, EvidenceSourceType } from './orchestrationTypes';
import { evidenceService } from './EvidenceService';

export interface ProcessUtterancePayload {
  rawText: string;
  modality: 'VOICE' | 'TYPED' | 'TOUCH_CHIP';
  stepContext?: string;
}

export interface ConversationAgentResult {
  interpretation: LLMInterpretationResult;
  suggestedQuestions: IntakeQuestion[];
  isEmergencyAlert: boolean;
  selectedNextQuestion?: string;
}

/**
 * Conversation Agent.
 * Understands patient natural language (voice/text/touch) across languages (EN, HI, TA),
 * extracts structured symptoms via Gemini/NLP, and queries the adaptive SOCRATES question pathway.
 */
export class ConversationAgent {
  public async processPatientUtterance(
    request: AgentRequest<ProcessUtterancePayload>
  ): Promise<AgentResponse<ConversationAgentResult>> {
    const { rawText, modality, stepContext } = request.payload;

    // 1. Language understanding & structured entity extraction via LLM/Gateway
    const interpretation = await llmService.interpretPatientResponse(rawText, request.language);

    // 2. Map modality to evidence source type
    const sourceType: EvidenceSourceType = 
      modality === 'VOICE' ? 'PATIENT_VOICE' :
      modality === 'TOUCH_CHIP' ? 'PATIENT_TOUCH' : 'PATIENT_TEXT';

    // 3. Record evidence trail with original verbatim patient response
    const evidenceItems: AgentEvidence[] = [];
    if (interpretation.detectedChiefComplaint) {
      evidenceItems.push(
        evidenceService.recordEvidence(
          sourceType,
          `Patient Response (${modality})`,
          rawText,
          `chiefComplaint: ${interpretation.detectedChiefComplaint}`
        )
      );
    }
    if (interpretation.detectedDuration) {
      evidenceItems.push(
        evidenceService.recordEvidence(
          sourceType,
          `Patient Response (${modality})`,
          rawText,
          `duration: ${interpretation.detectedDuration}`
        )
      );
    }
    if (interpretation.detectedBodySite) {
      evidenceItems.push(
        evidenceService.recordEvidence(
          sourceType,
          `Patient Response (${modality})`,
          rawText,
          `bodySite: ${interpretation.detectedBodySite}`
        )
      );
    }

    // 4. Determine adaptive questioning pathway from SOCRATES engine
    const chiefComplaint = interpretation.detectedChiefComplaint || rawText;
    const suggestedQuestions = getAdaptiveSocratesQuestions(chiefComplaint);

    // 5. Check if Gemini suggested an adaptive question within SOCRATES boundaries
    const selectedNextQuestion = interpretation.suggestedNextQuestion || 
      (suggestedQuestions.length > 0 ? (suggestedQuestions[0].questionText[request.language] || suggestedQuestions[0].questionText.en) : undefined);

    const isEmergencyAlert = Boolean(
      chiefComplaint.toLowerCase().includes('chest pain') || 
      rawText.toLowerCase().includes('chest pain') || 
      rawText.toLowerCase().includes('saans lene mein dikkat') ||
      rawText.toLowerCase().includes('breathing difficulty')
    );

    return {
      agentName: 'ConversationAgent',
      status: 'SUCCESS',
      structuredData: {
        interpretation,
        suggestedQuestions,
        isEmergencyAlert,
        selectedNextQuestion
      },
      evidence: evidenceItems,
      nextAction: 'EVALUATE_SAFETY'
    };
  }
}

export const conversationAgent = new ConversationAgent();
