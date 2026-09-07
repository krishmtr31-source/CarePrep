import { IncomingMessage, ServerResponse } from 'http';
import { Patient, MedicalHistory } from '../models';
import { AuthenticatedUser, sendJson, parseJsonBody } from '../server/authMiddleware';

export async function handlePatientRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  user: AuthenticatedUser | null
): Promise<boolean> {
  // Routes for authenticated patient:
  // GET /api/patients/me
  // PUT /api/patients/me
  // GET /api/patients/me/medical-history
  // PUT /api/patients/me/medical-history

  if (!url.startsWith('/api/patients/me')) {
    return false;
  }

  if (!user || !user.userId) {
    sendJson(res, 401, { error: 'Authentication required. Please log in.' });
    return true;
  }

  // 1. GET /api/patients/me
  if (url === '/api/patients/me' && req.method === 'GET') {
    try {
      const patient = await Patient.findOne({ patientId: user.userId });
      if (!patient) {
        // Return 200 with empty state object so frontend can handle smoothly
        sendJson(res, 200, {
          patientId: user.userId,
          fullName: '',
          isNew: true
        });
        return true;
      }
      sendJson(res, 200, patient);
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to retrieve patient profile.' });
      return true;
    }
  }

  // 2. PUT /api/patients/me
  if (url === '/api/patients/me' && req.method === 'PUT') {
    try {
      const body = await parseJsonBody(req);
      const updateData: Record<string, any> = {};
      
      if (typeof body.fullName === 'string' && body.fullName.trim()) {
        updateData.fullName = body.fullName.trim();
      }
      if (typeof body.email === 'string') updateData.email = body.email.trim().toLowerCase();
      if (typeof body.mobile === 'string') updateData.mobile = body.mobile.trim();
      if (typeof body.age === 'number' || (!isNaN(Number(body.age)) && body.age !== '')) {
        updateData.age = Number(body.age);
      }
      if (typeof body.dateOfBirth === 'string') updateData.dateOfBirth = body.dateOfBirth.trim();
      if (['male', 'female', 'other'].includes(body.gender)) updateData.gender = body.gender;
      if (typeof body.abhaId === 'string') updateData.abhaId = body.abhaId.trim();
      if (typeof body.city === 'string') updateData.city = body.city.trim();
      if (typeof body.preferredLanguage === 'string') updateData.preferredLanguage = body.preferredLanguage;

      const patient = await Patient.findOneAndUpdate(
        { patientId: user.userId },
        { 
          $set: updateData,
          $setOnInsert: { patientId: user.userId }
        },
        { new: true, upsert: true }
      );

      sendJson(res, 200, { success: true, patient });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to update patient profile.' });
      return true;
    }
  }

  // 3. GET /api/patients/me/medical-history
  if (url === '/api/patients/me/medical-history' && req.method === 'GET') {
    try {
      const history = await MedicalHistory.findOne({ patientId: user.userId });
      if (!history) {
        sendJson(res, 200, {
          patientId: user.userId,
          conditionsList: [],
          surgeriesList: [],
          hospitalizationsList: [],
          allergiesList: [],
          noKnownAllergies: false,
          currentMedications: [],
          familyHistoryList: [],
          lifestyle: {},
          vitals: {},
          otherRelevantHistory: '',
          existingConditions: [],
          previousSurgeries: [],
          allergies: [],
          familyHistory: [],
          empty: true
        });
        return true;
      }
      sendJson(res, 200, history);
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to load medical history.' });
      return true;
    }
  }

  // 4. PUT /api/patients/me/medical-history
  if (url === '/api/patients/me/medical-history' && req.method === 'PUT') {
    try {
      const body = await parseJsonBody(req);
      const updateData: Record<string, any> = {};

      if (Array.isArray(body.conditionsList)) updateData.conditionsList = body.conditionsList;
      if (Array.isArray(body.surgeriesList)) updateData.surgeriesList = body.surgeriesList;
      if (Array.isArray(body.hospitalizationsList)) updateData.hospitalizationsList = body.hospitalizationsList;
      if (Array.isArray(body.allergiesList)) updateData.allergiesList = body.allergiesList;
      if (typeof body.noKnownAllergies === 'boolean') updateData.noKnownAllergies = body.noKnownAllergies;
      if (Array.isArray(body.currentMedications)) updateData.currentMedications = body.currentMedications;
      if (Array.isArray(body.familyHistoryList)) updateData.familyHistoryList = body.familyHistoryList;
      if (body.lifestyle && typeof body.lifestyle === 'object') updateData.lifestyle = body.lifestyle;
      if (body.vitals && typeof body.vitals === 'object') {
        updateData.vitals = { ...body.vitals, recordedAt: new Date() };
      }
      if (typeof body.otherRelevantHistory === 'string') updateData.otherRelevantHistory = body.otherRelevantHistory;

      // Also sync legacy arrays if provided or derive from lists
      if (Array.isArray(body.existingConditions)) {
        updateData.existingConditions = body.existingConditions;
      } else if (Array.isArray(body.conditionsList)) {
        updateData.existingConditions = body.conditionsList.map((c: any) => c.name);
      }

      if (Array.isArray(body.previousSurgeries)) {
        updateData.previousSurgeries = body.previousSurgeries;
      } else if (Array.isArray(body.surgeriesList)) {
        updateData.previousSurgeries = body.surgeriesList.map((s: any) => `${s.procedure} (${s.year || ''})`.trim());
      }

      if (Array.isArray(body.allergies)) {
        updateData.allergies = body.allergies;
      } else if (Array.isArray(body.allergiesList)) {
        updateData.allergies = body.allergiesList.map((a: any) => `${a.allergen} (${a.reaction || ''})`.trim());
      }

      if (Array.isArray(body.familyHistory)) {
        updateData.familyHistory = body.familyHistory;
      } else if (Array.isArray(body.familyHistoryList)) {
        updateData.familyHistory = body.familyHistoryList.map((f: any) => `${f.relationship}: ${f.condition}`);
      }

      const history = await MedicalHistory.findOneAndUpdate(
        { patientId: user.userId },
        {
          $set: updateData,
          $setOnInsert: { patientId: user.userId }
        },
        { new: true, upsert: true }
      );

      sendJson(res, 200, { success: true, history });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to save medical history.' });
      return true;
    }
  }

  return false;
}
