import { checkRedFlags } from '../../clinical-rules/redFlags';
import { RedFlagAlert } from '../../data-models/redFlag';
import { AgentRequest, AgentResponse, AgentEvidence } from './orchestrationTypes';

export interface SafetyCheckPayload {
  utterance: string;
  chiefComplaint?: string;
  structuredSymptoms?: string[];
}

export interface SafetyCheckResult {
  hasRedFlags: boolean;
  triageLevel: 'GREEN' | 'YELLOW' | 'RED';
  alerts: RedFlagAlert[];
  routingInstruction: string;
}

/**
 * Deterministic Safety Controller.
 * 
 * Safety Scope: Deterministic prototype red-flag rules; not clinically validated.
 * The orchestrator and LLM layers cannot downgrade, override, or suppress a RED safety result.
 */
export class SafetyController {
  public evaluateSafety(request: AgentRequest<SafetyCheckPayload>): AgentResponse<SafetyCheckResult> {
    const { utterance, chiefComplaint, structuredSymptoms } = request.payload;
    const fullText = [
      chiefComplaint,
      utterance,
      ...(structuredSymptoms || [])
    ].filter(Boolean).join(' ');

    const matchedRules = checkRedFlags(fullText);

    const alerts: RedFlagAlert[] = matchedRules.map(rule => ({
      ruleId: rule.id,
      ruleTitle: rule.title,
      severity: rule.severity,
      matchedTrigger: rule.description,
      timestamp: new Date().toISOString(),
      actionMessage: rule.immediateActionNotice[request.language] || rule.immediateActionNotice.en
    }));

    const hasRedFlags = alerts.length > 0;
    const triageLevel: 'GREEN' | 'RED' = hasRedFlags ? 'RED' : 'GREEN';

    const evidence: AgentEvidence[] = alerts.map(a => ({
      id: `ev-safety-${a.ruleId}-${Date.now()}`,
      sourceType: 'SYSTEM_RULE',
      sourceName: `Deterministic Rule ${a.ruleId}`,
      rawSnippet: a.matchedTrigger,
      structuredField: 'redFlagAlert',
      timestamp: new Date().toISOString()
    }));

    return {
      agentName: 'SafetyController',
      status: hasRedFlags ? 'EMERGENCY' : 'SUCCESS',
      structuredData: {
        hasRedFlags,
        triageLevel,
        alerts,
        routingInstruction: hasRedFlags 
          ? 'CRITICAL SAFETY ALERT: Priority human triage routing activated.' 
          : 'Standard pre-consultation routing approved.'
      },
      evidence,
      warnings: hasRedFlags ? alerts.map(a => `${a.ruleTitle} (${a.ruleId})`) : undefined,
      nextAction: hasRedFlags ? 'ROUTE_EMERGENCY_TRIAGE' : 'CONTINUE_INTAKE'
    };
  }
}

export const safetyController = new SafetyController();
