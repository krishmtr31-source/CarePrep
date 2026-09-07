/**
 * CarePrep (SIH26047) - Clinical Summary & Doctor Review Routes
 * Handles authenticated generation, retrieval, caching, doctor modification, and doctor confirmation.
 */

import { IncomingMessage, ServerResponse } from 'http';
import mongoose from 'mongoose';
import { AuthenticatedUser, sendJson, parseJsonBody } from '../server/authMiddleware';
import { clinicalSummaryService, inMemorySummaryStore } from '../services/clinicalSummaryService';
import { Consultation, ClinicalSummary } from '../models';
import { classifyGeminiError } from '../utils/geminiErrorHandler';
import { IClinicalSummaryRecord, SummaryAuditEntry } from '../../shared/types/clinicalSummaryTypes';

const isDbConnected = () => mongoose.connection.readyState === 1;

export async function handleClinicalSummaryRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  user: AuthenticatedUser | null
): Promise<boolean> {
  if (!url.startsWith('/api/clinical-summary')) {
    return false;
  }

  // All summary endpoints require authentication
  if (!user || !user.userId) {
    sendJson(res, 401, { error: 'Authentication required.' });
    return true;
  }

  const isGetPatientSummary = (url === '/api/clinical-summary' || url === '/api/clinical-summary/') && req.method === 'GET';
  const isGenerate = url === '/api/clinical-summary/generate' && req.method === 'POST';
  const isRegenerate = url === '/api/clinical-summary/regenerate' && req.method === 'POST';
  const confirmMatch = url.match(/^\/api\/clinical-summary\/([^/?]+)\/confirm$/);
  const reviewMatch = url.match(/^\/api\/clinical-summary\/([^/?]+)\/review$/);
  const idMatch = url.match(/^\/api\/clinical-summary\/([^/?]+)$/);

  // =========================================================================
  // 1. GET /api/clinical-summary (Fetch summary for authenticated patient)
  // =========================================================================
  if (isGetPatientSummary) {
    try {
      const patientId = user.userId;
      const record = await clinicalSummaryService.getCachedSummary(patientId);

      if (!record) {
        sendJson(res, 404, { error: 'No clinical summary found for this patient.' });
        return true;
      }

      sendJson(res, 200, {
        success: true,
        record
      });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Failed to retrieve patient clinical summary.' });
      return true;
    }
  }

  // =========================================================================
  // 2. POST /api/clinical-summary/generate & POST /api/clinical-summary/regenerate
  // =========================================================================
  if (isGenerate || isRegenerate) {
    try {
      const body = await parseJsonBody(req);
      // Security guard: For patient users, targetPatientId is unconditionally user.userId
      const targetPatientId = user.role === 'doctor' && body.patientId ? body.patientId : user.userId;

      if (user.role !== 'doctor' && body.patientId && body.patientId !== user.userId) {
        sendJson(res, 403, { error: 'Forbidden. You can only generate summaries for your own record.' });
        return true;
      }

      const record = await clinicalSummaryService.generateSummary({
        patientId: targetPatientId,
        assessmentId: body.assessmentId,
        caseId: body.caseId,
        consultationId: body.consultationId,
        forceRegenerate: isRegenerate || Boolean(body.forceRegenerate),
        directContext: body.directContext
      });

      sendJson(res, 200, {
        success: true,
        record
      });
      return true;
    } catch (err: any) {
      const classified = classifyGeminiError(err);
      console.warn(`[handleClinicalSummaryRoutes] Error: [${classified.code}] ${classified.sanitizedDiagnostic}`);
      
      const userSafeMessage = classified.code === 'AI_QUOTA_EXCEEDED'
        ? 'AI summary is temporarily unavailable because the AI service quota has been reached. Your health information is still safely available.'
        : (classified.code === 'AI_SERVICE_UNAVAILABLE' || classified.code === 'AI_NETWORK_TIMEOUT'
          ? 'AI summary is temporarily unavailable. Please try again later.'
          : classified.message);

      sendJson(res, classified.httpStatus, {
        success: false,
        code: classified.code,
        error: userSafeMessage,
        fallbackAvailable: true
      });
      return true;
    }
  }

  // =========================================================================
  // 3. PUT /api/clinical-summary/:id/review (Doctor edits & review notes)
  // =========================================================================
  if (reviewMatch && req.method === 'PUT') {
    try {
      if (user.role !== 'doctor') {
        sendJson(res, 403, { error: 'Forbidden. Only licensed doctors can review and edit clinical summaries.' });
        return true;
      }

      const targetId = reviewMatch[1];
      const body = await parseJsonBody(req);

      // Look up existing record from Consultation, ClinicalSummary or memory
      let record: IClinicalSummaryRecord | null = inMemorySummaryStore.get(targetId) || null;
      let consultation: any = null;

      if (isDbConnected()) {
        try {
          consultation = await Consultation.findOne({
            $or: [{ consultationId: targetId }, { 'clinicalSummary.summaryId': targetId }, { assessmentId: targetId }]
          });
          if (consultation?.clinicalSummary) {
            record = consultation.clinicalSummary;
          }
        } catch {}

        if (!record) {
          try {
            const csDoc = await ClinicalSummary.findOne({
              $or: [{ summaryId: targetId }, { patientId: targetId }, { consultationId: targetId }]
            });
            if (csDoc) {
              record = {
                summaryId: csDoc.summaryId,
                consultationId: csDoc.consultationId,
                assessmentId: csDoc.assessmentId,
                patientId: csDoc.patientId,
                reviewStatus: csDoc.reviewStatus,
                aiGeneratedSummary: csDoc.aiGeneratedSummary,
                doctorEditedSummary: csDoc.doctorEditedSummary,
                doctorNotes: csDoc.doctorNotes,
                doctorDecision: csDoc.doctorDecision,
                reviewedBy: csDoc.reviewedBy,
                generatedAt: csDoc.generatedAt.toISOString(),
                reviewedAt: csDoc.reviewedAt?.toISOString(),
                confirmedAt: csDoc.confirmedAt?.toISOString(),
                modelUsed: csDoc.modelUsed,
                summaryVersion: csDoc.summaryVersion,
                auditTrail: csDoc.auditTrail || []
              };
            }
          } catch {}
        }
      }

      if (!record) {
        sendJson(res, 404, { error: 'Clinical summary record not found.' });
        return true;
      }

      // Update doctor review fields while preserving original AI summary
      record.reviewStatus = 'DOCTOR_EDITED';
      record.doctorNotes = body.doctorNotes ?? record.doctorNotes;
      record.doctorDecision = body.doctorDecision || 'MODIFIED';
      record.reviewedAt = new Date().toISOString();
      record.reviewedBy = {
        doctorId: user.userId,
        doctorName: body.doctorName || 'Attending Physician'
      };

      if (body.doctorEditedSummary) {
        record.doctorEditedSummary = body.doctorEditedSummary;
      }
      record.summaryVersion = (record.summaryVersion || 1) + 1;

      const editAudit: SummaryAuditEntry = {
        timestamp: new Date().toISOString(),
        action: 'EDITED',
        performedBy: {
          userId: user.userId,
          role: 'doctor',
          name: body.doctorName || 'Attending Physician'
        },
        notes: body.doctorNotes || 'Physician edited summary contents.'
      };
      record.auditTrail = record.auditTrail || [];
      record.auditTrail.push(editAudit);

      // Persist in memory store
      inMemorySummaryStore.set(record.summaryId, record);
      inMemorySummaryStore.set(record.patientId, record);
      if (record.consultationId) inMemorySummaryStore.set(record.consultationId, record);

      // Persist to MongoDB if connected
      if (isDbConnected()) {
        try {
          await ClinicalSummary.findOneAndUpdate(
            { summaryId: record.summaryId },
            {
              reviewStatus: record.reviewStatus,
              doctorDecision: record.doctorDecision,
              doctorNotes: record.doctorNotes,
              doctorEditedSummary: record.doctorEditedSummary,
              reviewedAt: new Date(record.reviewedAt),
              reviewedBy: record.reviewedBy,
              summaryVersion: record.summaryVersion,
              auditTrail: record.auditTrail
            }
          );
        } catch {}

        if (consultation) {
          consultation.clinicalSummary = record;
          consultation.reviewStatus = 'DOCTOR_EDITED';
          consultation.doctorNotes = record.doctorNotes;
          consultation.doctorDecision = record.doctorDecision;
          await consultation.save();
        }
      }

      sendJson(res, 200, {
        success: true,
        record
      });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Failed to update clinical review.' });
      return true;
    }
  }

  // =========================================================================
  // 4. POST /api/clinical-summary/:id/confirm (Doctor final confirmation)
  // =========================================================================
  if (confirmMatch && req.method === 'POST') {
    try {
      if (user.role !== 'doctor') {
        sendJson(res, 403, { error: 'Forbidden. Only licensed doctors can sign off and confirm clinical summaries.' });
        return true;
      }

      const targetId = confirmMatch[1];
      const body = await parseJsonBody(req);

      let record: IClinicalSummaryRecord | null = inMemorySummaryStore.get(targetId) || null;
      let consultation: any = null;

      if (isDbConnected()) {
        try {
          consultation = await Consultation.findOne({
            $or: [{ consultationId: targetId }, { 'clinicalSummary.summaryId': targetId }, { assessmentId: targetId }]
          });
          if (consultation?.clinicalSummary) {
            record = consultation.clinicalSummary;
          }
        } catch {}

        if (!record) {
          try {
            const csDoc = await ClinicalSummary.findOne({
              $or: [{ summaryId: targetId }, { patientId: targetId }, { consultationId: targetId }]
            });
            if (csDoc) {
              record = {
                summaryId: csDoc.summaryId,
                consultationId: csDoc.consultationId,
                assessmentId: csDoc.assessmentId,
                patientId: csDoc.patientId,
                reviewStatus: csDoc.reviewStatus,
                aiGeneratedSummary: csDoc.aiGeneratedSummary,
                doctorEditedSummary: csDoc.doctorEditedSummary,
                doctorNotes: csDoc.doctorNotes,
                doctorDecision: csDoc.doctorDecision,
                reviewedBy: csDoc.reviewedBy,
                generatedAt: csDoc.generatedAt.toISOString(),
                reviewedAt: csDoc.reviewedAt?.toISOString(),
                confirmedAt: csDoc.confirmedAt?.toISOString(),
                modelUsed: csDoc.modelUsed,
                summaryVersion: csDoc.summaryVersion,
                auditTrail: csDoc.auditTrail || []
              };
            }
          } catch {}
        }
      }

      if (!record) {
        sendJson(res, 404, { error: 'Clinical summary record not found.' });
        return true;
      }

      // Lock review state as confirmed
      record.reviewStatus = 'DOCTOR_CONFIRMED';
      record.confirmedAt = new Date().toISOString();
      record.reviewedAt = record.reviewedAt || new Date().toISOString();
      record.doctorDecision = body.doctorDecision || 'ACCEPTED';
      record.doctorNotes = body.doctorNotes ?? record.doctorNotes;
      record.reviewedBy = {
        doctorId: user.userId,
        doctorName: body.doctorName || 'Attending Physician'
      };

      if (body.finalSummary) {
        record.doctorEditedSummary = body.finalSummary;
      }

      const confirmAudit: SummaryAuditEntry = {
        timestamp: new Date().toISOString(),
        action: 'CONFIRMED',
        performedBy: {
          userId: user.userId,
          role: 'doctor',
          name: body.doctorName || 'Attending Physician'
        },
        notes: `Physician confirmed consultation summary with decision: ${record.doctorDecision}`
      };
      record.auditTrail = record.auditTrail || [];
      record.auditTrail.push(confirmAudit);

      // Persist in memory store
      inMemorySummaryStore.set(record.summaryId, record);
      inMemorySummaryStore.set(record.patientId, record);
      if (record.consultationId) inMemorySummaryStore.set(record.consultationId, record);

      // Persist to MongoDB if connected
      if (isDbConnected()) {
        try {
          await ClinicalSummary.findOneAndUpdate(
            { summaryId: record.summaryId },
            {
              reviewStatus: record.reviewStatus,
              doctorDecision: record.doctorDecision,
              doctorNotes: record.doctorNotes,
              doctorEditedSummary: record.doctorEditedSummary,
              confirmedAt: new Date(record.confirmedAt),
              reviewedAt: new Date(record.reviewedAt),
              reviewedBy: record.reviewedBy,
              auditTrail: record.auditTrail
            }
          );
        } catch {}

        if (consultation) {
          consultation.clinicalSummary = record;
          consultation.reviewStatus = 'DOCTOR_CONFIRMED';
          consultation.status = 'COMPLETED';
          consultation.completedAt = new Date();
          consultation.doctorDecision = record.doctorDecision;
          consultation.doctorNotes = record.doctorNotes;
          await consultation.save();
        }
      }

      sendJson(res, 200, {
        success: true,
        record
      });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Failed to confirm clinical summary.' });
      return true;
    }
  }

  // =========================================================================
  // 5. GET /api/clinical-summary/:id
  // =========================================================================
  if (idMatch && req.method === 'GET') {
    try {
      const targetId = idMatch[1];
      let record: IClinicalSummaryRecord | null = inMemorySummaryStore.get(targetId) || null;

      if (!record && isDbConnected()) {
        try {
          const consultation = await Consultation.findOne({
            $or: [{ consultationId: targetId }, { 'clinicalSummary.summaryId': targetId }, { assessmentId: targetId }]
          });
          if (consultation?.clinicalSummary) {
            record = consultation.clinicalSummary;
          }
        } catch {}

        if (!record) {
          try {
            const csDoc = await ClinicalSummary.findOne({
              $or: [{ summaryId: targetId }, { patientId: targetId }, { consultationId: targetId }]
            });
            if (csDoc) {
              record = {
                summaryId: csDoc.summaryId,
                consultationId: csDoc.consultationId,
                assessmentId: csDoc.assessmentId,
                patientId: csDoc.patientId,
                reviewStatus: csDoc.reviewStatus,
                aiGeneratedSummary: csDoc.aiGeneratedSummary,
                doctorEditedSummary: csDoc.doctorEditedSummary,
                doctorNotes: csDoc.doctorNotes,
                doctorDecision: csDoc.doctorDecision,
                reviewedBy: csDoc.reviewedBy,
                generatedAt: csDoc.generatedAt.toISOString(),
                reviewedAt: csDoc.reviewedAt?.toISOString(),
                confirmedAt: csDoc.confirmedAt?.toISOString(),
                modelUsed: csDoc.modelUsed,
                summaryVersion: csDoc.summaryVersion,
                auditTrail: csDoc.auditTrail || []
              };
            }
          } catch {}
        }
      }

      if (!record) {
        sendJson(res, 404, { error: 'Clinical summary record not found.' });
        return true;
      }

      // Authorization guard: Patients can only access their own summary
      if (user.role !== 'doctor' && record.patientId !== user.userId) {
        sendJson(res, 403, { error: 'Forbidden. You do not have permission to view this clinical summary.' });
        return true;
      }

      sendJson(res, 200, {
        success: true,
        record
      });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Failed to retrieve clinical summary.' });
      return true;
    }
  }

  return false;
}
