/**
 * CarePrep (SIH26047) - Phase 5 Multi-Agent Orchestration Routes
 * Authenticated endpoints for coordinating specialized clinical agents:
 * - ConversationAgent
 * - SafetyController (Deterministic Red-Flag Override)
 * - DocumentAgent
 * - AyushAgent
 * - EvidenceService (Provenance linking)
 * - SummaryAgent
 */

import { IncomingMessage, ServerResponse } from 'http';
import { AuthenticatedUser, sendJson, parseJsonBody } from '../server/authMiddleware';
import { IntakeOrchestrator } from '../../ai-services/orchestration/IntakeOrchestrator';
import { llmGateway } from '../../ai-services/llm/LLMGateway';

// Active in-memory session orchestrator pool indexed by sessionId
const orchestratorSessions = new Map<string, IntakeOrchestrator>();

function getOrCreateOrchestrator(sessionId: string, user: AuthenticatedUser, mode: any = 'GENERAL_CLINICAL', language: any = 'en'): IntakeOrchestrator {
  let orchestrator = orchestratorSessions.get(sessionId);
  if (!orchestrator) {
    orchestrator = new IntakeOrchestrator(sessionId);
    orchestrator.startSession(
      {
        id: user.userId,
        fullName: 'Authenticated Patient',
        age: 40,
        gender: 'other',
        phoneNumber: '',
        city: '',
        preferredLanguage: language,
        createdAt: new Date().toISOString()
      },
      mode,
      language
    );
    orchestratorSessions.set(sessionId, orchestrator);
  }
  return orchestrator;
}

export async function handleOrchestrationRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  user: AuthenticatedUser | null
): Promise<boolean> {
  if (!url.startsWith('/api/orchestration')) {
    return false;
  }

  // 1. Mandatory authentication guard
  if (!user || !user.userId) {
    sendJson(res, 401, { error: 'Authentication required for AI orchestration.' });
    return true;
  }

  const isStep = url === '/api/orchestration/step' && req.method === 'POST';
  const isFinalize = url === '/api/orchestration/finalize' && req.method === 'POST';
  const sessionMatch = url.match(/^\/api\/orchestration\/session\/([^/?]+)$/);
  const isStatus = url === '/api/orchestration/status' && req.method === 'GET';

  // =========================================================================
  // 1. GET /api/orchestration/status (LLM Gateway & Safety Status)
  // =========================================================================
  if (isStatus) {
    const status = llmGateway.getProviderStatus();
    sendJson(res, 200, {
      success: true,
      status,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  // =========================================================================
  // 2. POST /api/orchestration/step (Execute single intake turn through multi-agent state machine)
  // =========================================================================
  if (isStep) {
    try {
      const body = await parseJsonBody(req);
      const rawText = typeof body.rawText === 'string' ? body.rawText.trim() : '';
      const modality = ['VOICE', 'TYPED', 'TOUCH_CHIP'].includes(body.modality) ? body.modality : 'TYPED';
      const step = body.step || 'CHIEF_COMPLAINT';
      const selectedOptionIds = Array.isArray(body.selectedOptionIds) ? body.selectedOptionIds : undefined;
      const sessionId = typeof body.sessionId === 'string' && body.sessionId ? body.sessionId : `session-${user.userId}-${Date.now()}`;
      const mode = body.mode || 'GENERAL_CLINICAL';
      const language = ['en', 'hi', 'ta'].includes(body.language) ? body.language : 'en';

      if (!rawText && (!selectedOptionIds || selectedOptionIds.length === 0)) {
        sendJson(res, 400, { error: 'Patient response (rawText or selectedOptionIds) is required.' });
        return true;
      }

      const orchestrator = getOrCreateOrchestrator(sessionId, user, mode, language);
      const result = await orchestrator.handlePatientInput(
        rawText || (selectedOptionIds?.join(', ') || ''),
        modality,
        step,
        selectedOptionIds
      );

      sendJson(res, 200, {
        success: true,
        sessionId,
        context: result.orchestratorContext,
        suggestedQuestions: result.suggestedQuestions,
        isEmergency: result.isEmergency,
        safetyStatus: result.orchestratorContext.safetyStatus,
        activeRedFlags: result.orchestratorContext.activeRedFlags,
        activityLogs: result.orchestratorContext.activityLogs.slice(-6)
      });
      return true;
    } catch (err: any) {
      console.error('[OrchestrationRoutes] /api/orchestration/step error:', err);
      sendJson(res, 500, { 
        error: 'AI orchestration encountered a processing error.',
        fallbackAvailable: true 
      });
      return true;
    }
  }

  // =========================================================================
  // 3. GET /api/orchestration/session/:id (Fetch session context and activity logs)
  // =========================================================================
  if (sessionMatch && req.method === 'GET') {
    const sessionId = sessionMatch[1];
    const orchestrator = orchestratorSessions.get(sessionId);

    if (!orchestrator) {
      sendJson(res, 404, { error: `Orchestration session ${sessionId} not found.` });
      return true;
    }

    const context = orchestrator.getContext();
    // Security check: Patients may only access their own sessions
    if (user.role !== 'doctor' && context.patient?.id && context.patient.id !== user.userId) {
      sendJson(res, 403, { error: 'Unauthorized access to session.' });
      return true;
    }

    sendJson(res, 200, {
      success: true,
      context,
      activityLogs: orchestrator.getActivityLogs()
    });
    return true;
  }

  // =========================================================================
  // 4. POST /api/orchestration/finalize (Synthesize doctor summary draft & finalize)
  // =========================================================================
  if (isFinalize) {
    try {
      const body = await parseJsonBody(req);
      const sessionId = body.sessionId;

      if (!sessionId) {
        sendJson(res, 400, { error: 'sessionId parameter is required.' });
        return true;
      }

      const orchestrator = orchestratorSessions.get(sessionId);
      if (!orchestrator) {
        sendJson(res, 404, { error: `Orchestration session ${sessionId} not found.` });
        return true;
      }

      const finalizedContext = orchestrator.finalizeIntakeSummary();

      sendJson(res, 200, {
        success: true,
        summaryDraft: finalizedContext.generatedSummary,
        context: finalizedContext
      });
      return true;
    } catch (err: any) {
      console.error('[OrchestrationRoutes] /api/orchestration/finalize error:', err);
      sendJson(res, 500, { error: 'Failed to finalize orchestration intake.' });
      return true;
    }
  }

  return false;
}
