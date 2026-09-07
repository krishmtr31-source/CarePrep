import { IncomingMessage, ServerResponse } from 'http';
import { Consultation } from '../models';
import { AuthenticatedUser, sendJson, parseJsonBody } from '../server/authMiddleware';

export async function handleConsultationRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  user: AuthenticatedUser | null
): Promise<boolean> {
  // Routes:
  // GET  /api/consultations
  // GET  /api/consultations/:id
  // POST /api/consultations (Doctor creates or completes consultation)

  if (!url.startsWith('/api/consultations')) {
    return false;
  }

  if (!user || !user.userId) {
    sendJson(res, 401, { error: 'Authentication required.' });
    return true;
  }

  const isBase = url === '/api/consultations';
  const idMatch = url.match(/^\/api\/consultations\/([^/?]+)$/);
  const targetId = idMatch ? idMatch[1] : null;

  // 1. GET /api/consultations
  if (isBase && req.method === 'GET') {
    try {
      let query: Record<string, any> = {};
      if (user.role === 'doctor') {
        const urlParams = new URL(req.url || '', 'http://localhost').searchParams;
        const requestedPatientId = urlParams.get('patientId');
        if (requestedPatientId) {
          query.patientId = requestedPatientId;
        } else {
          query.doctorId = user.userId;
        }
      } else {
        query.patientId = user.userId;
      }

      const consultations = await Consultation.find(query).sort({ createdAt: -1 });
      sendJson(res, 200, consultations);
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to retrieve consultations.' });
      return true;
    }
  }

  // 2. GET /api/consultations/:id
  if (targetId && req.method === 'GET') {
    try {
      const consultation = await Consultation.findOne({ consultationId: targetId });
      if (!consultation) {
        sendJson(res, 404, { error: 'Consultation record not found.' });
        return true;
      }

      if (user.role !== 'doctor' && consultation.patientId !== user.userId) {
        sendJson(res, 403, { error: 'Forbidden. You cannot access this consultation.' });
        return true;
      }

      sendJson(res, 200, consultation);
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to retrieve consultation.' });
      return true;
    }
  }

  // 3. POST /api/consultations (Doctor consultation creation)
  if (isBase && req.method === 'POST') {
    try {
      if (user.role !== 'doctor') {
        sendJson(res, 403, { error: 'Only doctors can record clinical consultations.' });
        return true;
      }

      const body = await parseJsonBody(req);
      const consultationId = body.consultationId || `con-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;

      const consultation = new Consultation({
        consultationId,
        patientId: body.patientId,
        doctorId: user.userId,
        assessmentId: body.assessmentId,
        doctorNotes: body.doctorNotes || '',
        doctorDecision: body.doctorDecision || 'ACCEPTED',
        status: body.status || 'COMPLETED',
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : new Date(),
        completedAt: new Date()
      });

      await consultation.save();
      sendJson(res, 201, { success: true, consultation });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to save consultation.' });
      return true;
    }
  }

  return false;
}
