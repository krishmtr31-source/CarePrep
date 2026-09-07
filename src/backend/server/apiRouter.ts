import { IncomingMessage, ServerResponse } from 'http';
import { connectDB as connectToDatabase, getConnectionStatus, getDatabaseStatus } from '../config/database';
import { handleGeminiApiRequest } from './geminiApiHandler';
import { getAuthenticatedUser, sendJson } from './authMiddleware';
import { handlePatientRoutes } from '../routes/patientRoutes';
import { handleAssessmentRoutes } from '../routes/assessmentRoutes';
import { handleReportRoutes } from '../routes/reportRoutes';
import { handleConsultationRoutes } from '../routes/consultationRoutes';
import { handlePrescriptionRoutes } from '../routes/prescriptionRoutes';
import { handleFacilityRoutes } from '../routes/facilityRoutes';
import { handleMedicalDocumentRoutes } from '../routes/documentRoutes';
import { handleClinicalSummaryRoutes } from '../routes/clinicalSummaryRoutes';
import { handleOrchestrationRoutes } from '../routes/orchestrationRoutes';
import { handleFhirRoutes } from '../routes/fhirRoutes';

let dbInitPromise: Promise<boolean> | null = null;

export async function ensureDatabase(): Promise<boolean> {
  if (!dbInitPromise) {
    dbInitPromise = connectToDatabase()
      .then(() => true)
      .catch((err) => {
        console.warn('[Database] ensureDatabase could not connect:', err?.message || err);
        return false;
      });
  }
  return dbInitPromise;
}

/**
 * Unified Backend Router for all `/api/*` endpoints.
 * Used by both `apiServer.ts` and Vite dev server middleware.
 */
export async function handleBackendApiRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = req.url?.split('?')[0] || '';

  // 1. Database Health Check: GET /api/db/health
  if (url === '/api/db/health' && req.method === 'GET') {
    await ensureDatabase();
    const status = getDatabaseStatus();
    sendJson(res, 200, {
      ...status,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  // 2. Existing Gemini API Endpoints: /api/ai/*
  if (url.startsWith('/api/ai/')) {
    return handleGeminiApiRequest(req, res);
  }

  // Check if target URL belongs to CarePrep Data API
  if (
    url.startsWith('/api/patients') ||
    url.startsWith('/api/assessments') ||
    url.startsWith('/api/reports') ||
    url.startsWith('/api/medical-documents') ||
    url.startsWith('/api/consultations') ||
    url.startsWith('/api/prescriptions') ||
    url.startsWith('/api/facilities') ||
    url.startsWith('/api/hospitals') ||
    url.startsWith('/api/clinical-summary') ||
    url.startsWith('/api/orchestration') ||
    url.startsWith('/api/fhir')
  ) {
    // Ensure MongoDB connection is initialized
    await ensureDatabase();

    // Authenticate caller (never trust URL query parameters for authorization)
    const user = getAuthenticatedUser(req);

    if (url.startsWith('/api/fhir')) {
      const handled = await handleFhirRoutes(req, res, url, user);
      if (handled) return true;
    }

    if (url.startsWith('/api/orchestration')) {
      const handled = await handleOrchestrationRoutes(req, res, url, user);
      if (handled) return true;
    }

    if (url.startsWith('/api/clinical-summary')) {
      const handled = await handleClinicalSummaryRoutes(req, res, url, user);
      if (handled) return true;
    }

    if (url.startsWith('/api/facilities') || url.startsWith('/api/hospitals')) {
      const handled = await handleFacilityRoutes(req, res, req.url || url, user);
      if (handled) return true;
    }

    // Dispatch to specific domain route handlers
    if (url.startsWith('/api/patients')) {
      const handled = await handlePatientRoutes(req, res, url, user);
      if (handled) return true;
    }

    if (url.startsWith('/api/assessments')) {
      const handled = await handleAssessmentRoutes(req, res, url, user);
      if (handled) return true;
    }

    if (url.startsWith('/api/reports')) {
      const handled = await handleReportRoutes(req, res, url, user);
      if (handled) return true;
    }

    if (url.startsWith('/api/medical-documents') || url.startsWith('/api/ocr')) {
      const handled = await handleMedicalDocumentRoutes(req, res, url, user);
      if (handled) return true;
    }

    if (url.startsWith('/api/consultations')) {
      const handled = await handleConsultationRoutes(req, res, url, user);
      if (handled) return true;
    }

    if (url.startsWith('/api/prescriptions')) {
      const handled = await handlePrescriptionRoutes(req, res, url, user);
      if (handled) return true;
    }

    // Unmatched API endpoint within domain
    sendJson(res, 404, { error: `Endpoint ${req.method} ${url} not found.` });
    return true;
  }

  return false;
}
