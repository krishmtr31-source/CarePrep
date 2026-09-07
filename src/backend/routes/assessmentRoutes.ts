import { IncomingMessage, ServerResponse } from 'http';
import { Assessment } from '../models';
import { AuthenticatedUser, sendJson, parseJsonBody } from '../server/authMiddleware';

export async function handleAssessmentRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  user: AuthenticatedUser | null
): Promise<boolean> {
  // Routes:
  // POST /api/assessments
  // GET  /api/assessments
  // GET  /api/assessments/:id
  // PUT  /api/assessments/:id

  if (!url.startsWith('/api/assessments')) {
    return false;
  }

  if (!user || !user.userId) {
    sendJson(res, 401, { error: 'Authentication required.' });
    return true;
  }

  const isBase = url === '/api/assessments';
  const idMatch = url.match(/^\/api\/assessments\/([^/?]+)$/);
  const targetId = idMatch ? idMatch[1] : null;

  // 1. POST /api/assessments
  if (isBase && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const assessmentId = body.assessmentId || `asm-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;

      // Derive triage status & priority
      const redFlags = Array.isArray(body.redFlagsDetected) ? body.redFlagsDetected : [];
      const triageStatus = redFlags.length > 0 ? 'RED_FLAG_TRIAGE' : (body.triageStatus || 'NORMAL');
      const priority = redFlags.length > 0 ? 'URGENT' : (body.priority || 'ROUTINE');

      // Preserve SOCRATES and AYUSH structures directly
      const assessment = new Assessment({
        assessmentId,
        patientId: user.userId, // ALWAYS enforce authenticated user's ID
        chiefComplaint: body.chiefComplaint || 'Clinical Assessment',
        symptoms: Array.isArray(body.symptoms) ? body.symptoms : [],
        symptomDuration: body.symptomDuration || '',
        socratesData: body.socratesData || {},
        ayushData: body.ayushData || {},
        lifestyleData: body.lifestyleData || {},
        triageStatus,
        priority,
        status: body.status || 'SUBMITTED_TO_DOCTOR',
        tokenNumber: body.tokenNumber || `CP-${Math.floor(100 + Math.random() * 900)}`,
        queuePosition: typeof body.queuePosition === 'number' ? body.queuePosition : 1,
        redFlagsDetected: redFlags,
        answers: Array.isArray(body.answers) ? body.answers : [],
        language: body.language || 'en',
        orchestratorSessionId: body.orchestratorSessionId || '',
        agentActivityLogs: Array.isArray(body.agentActivityLogs) ? body.agentActivityLogs : [],
        evidenceTrail: Array.isArray(body.evidenceTrail) ? body.evidenceTrail : []
      });

      await assessment.save();
      sendJson(res, 201, { success: true, assessment });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to save assessment.' });
      return true;
    }
  }

  // 2. GET /api/assessments (Returns authenticated patient's assessments OR queue for doctors)
  if (isBase && req.method === 'GET') {
    try {
      let query: Record<string, any> = {};
      if (user.role === 'doctor') {
        // Doctor can view submitted or triaged assessments
        query = { status: { $in: ['SUBMITTED_TO_DOCTOR', 'RED_FLAG_TRIAGE', 'COMPLETED', 'REVIEWED_BY_DOCTOR'] } };
      } else {
        // Patient can ONLY view their own assessments
        query = { patientId: user.userId };
      }

      const assessments = await Assessment.find(query).sort({ createdAt: -1 }).limit(50);
      sendJson(res, 200, assessments);
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to fetch assessments.' });
      return true;
    }
  }

  // 3. GET /api/assessments/:id
  if (targetId && req.method === 'GET') {
    try {
      const assessment = await Assessment.findOne({ assessmentId: targetId });
      if (!assessment) {
        sendJson(res, 404, { error: 'Assessment not found.' });
        return true;
      }

      // Authorization guard: Patients can only view their own assessment
      if (user.role !== 'doctor' && assessment.patientId !== user.userId) {
        sendJson(res, 403, { error: 'Forbidden. You do not have permission to view this assessment.' });
        return true;
      }

      sendJson(res, 200, assessment);
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to fetch assessment.' });
      return true;
    }
  }

  // 4. PUT /api/assessments/:id (e.g. Doctor review or patient update)
  if (targetId && req.method === 'PUT') {
    try {
      const body = await parseJsonBody(req);
      const assessment = await Assessment.findOne({ assessmentId: targetId });
      if (!assessment) {
        sendJson(res, 404, { error: 'Assessment not found.' });
        return true;
      }

      // Authorization check
      if (user.role !== 'doctor' && assessment.patientId !== user.userId) {
        sendJson(res, 403, { error: 'Forbidden. You do not have permission to modify this assessment.' });
        return true;
      }

      if (user.role === 'doctor' && body.doctorReview) {
        assessment.doctorReview = {
          reviewedAt: new Date(),
          doctorId: user.userId,
          doctorName: body.doctorReview.doctorName || 'Attending Physician',
          status: body.doctorReview.status || 'ACCEPTED',
          doctorNotes: body.doctorReview.doctorNotes || ''
        };
        assessment.status = 'REVIEWED_BY_DOCTOR';
      } else {
        if (body.status) assessment.status = body.status;
        if (body.chiefComplaint) assessment.chiefComplaint = body.chiefComplaint;
        if (body.socratesData) assessment.socratesData = body.socratesData;
        if (body.ayushData) assessment.ayushData = body.ayushData;
        if (Array.isArray(body.answers)) assessment.answers = body.answers;
      }

      await assessment.save();
      sendJson(res, 200, { success: true, assessment });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to update assessment.' });
      return true;
    }
  }

  return false;
}
