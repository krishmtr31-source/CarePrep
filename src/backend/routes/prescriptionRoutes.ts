import { IncomingMessage, ServerResponse } from 'http';
import { Prescription } from '../models';
import { AuthenticatedUser, sendJson, parseJsonBody } from '../server/authMiddleware';

export async function handlePrescriptionRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  user: AuthenticatedUser | null
): Promise<boolean> {
  // Routes:
  // GET  /api/prescriptions
  // POST /api/prescriptions (Doctor writes prescription)

  if (!url.startsWith('/api/prescriptions')) {
    return false;
  }

  if (!user || !user.userId) {
    sendJson(res, 401, { error: 'Authentication required.' });
    return true;
  }

  const isBase = url === '/api/prescriptions';

  // 1. GET /api/prescriptions
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

      const prescriptions = await Prescription.find(query).sort({ createdAt: -1 });
      sendJson(res, 200, prescriptions);
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to retrieve prescriptions.' });
      return true;
    }
  }

  // 2. POST /api/prescriptions (Doctor writes prescription)
  if (isBase && req.method === 'POST') {
    try {
      if (user.role !== 'doctor') {
        sendJson(res, 403, { error: 'Only authorized physicians can issue prescriptions.' });
        return true;
      }

      const body = await parseJsonBody(req);
      const prescriptionId = body.prescriptionId || `rx-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;

      const medicines = Array.isArray(body.medicines) ? body.medicines.map((m: any) => ({
        name: String(m.name || 'Medicine').trim(),
        dosage: String(m.dosage || '').trim(),
        frequency: String(m.frequency || '').trim(),
        duration: String(m.duration || '').trim(),
        instructions: String(m.instructions || '').trim()
      })) : [];

      const prescription = new Prescription({
        prescriptionId,
        patientId: body.patientId,
        doctorId: user.userId,
        consultationId: body.consultationId,
        medicines,
        instructions: body.instructions || ''
      });

      await prescription.save();
      sendJson(res, 201, { success: true, prescription });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to save prescription.' });
      return true;
    }
  }

  return false;
}
