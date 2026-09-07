/**
 * CarePrep FHIR R4 API Routes — Phase 6 Interoperability Layer
 *
 * Endpoints:
 *   GET  /api/fhir/patient-record    — Export full FHIR R4 Bundle for authenticated patient
 *   GET  /api/fhir/provenance/:id    — FHIR Provenance resources for an assessment
 *   GET  /api/fhir/consent           — Get active consent records for patient
 *   POST /api/fhir/consent           — Grant or revoke a data-sharing consent
 *
 * Security Rules:
 * - All routes require valid authentication via getAuthenticatedUser
 * - Patients can only access their own records (patientId = user.userId)
 * - Doctors can access any patient's record (role = 'doctor')
 * - No query-parameter-based authorization — ever
 * - Response always uses Content-Type: application/fhir+json for FHIR bundles
 *
 * NOT a live ABDM gateway. This is an interoperability preparation layer.
 */

import { IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { AuthenticatedUser, sendJson, parseJsonBody, getAuthenticatedUser } from '../server/authMiddleware';
import { Patient } from '../models/Patient';
import { MedicalHistory } from '../models/MedicalHistory';
import { Assessment } from '../models/Assessment';
import { ClinicalSummary } from '../models/ClinicalSummary';
import { Consent, IConsent, ConsentScope } from '../models/Consent';
import { FhirService } from '../services/fhirService';

// ============================================================
// Response helpers
// ============================================================

function sendFhirJson(res: ServerResponse, statusCode: number, data: object) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/fhir+json');
  res.setHeader('X-CarePrep-Phase', '6-FHIR-Interoperability');
  res.end(JSON.stringify(data, null, 2));
}

function unauthorized(res: ServerResponse) {
  sendFhirJson(res, 401, FhirService.buildOperationOutcome(
    'error',
    'security',
    'Authentication required. Provide a valid Authorization Bearer token or session headers.'
  ));
}

function forbidden(res: ServerResponse) {
  sendFhirJson(res, 403, FhirService.buildOperationOutcome(
    'error',
    'forbidden',
    'Access denied. You do not have permission to access this patient record.'
  ));
}

function notFound(res: ServerResponse, resource: string) {
  sendFhirJson(res, 404, FhirService.buildOperationOutcome(
    'warning',
    'not-found',
    `${resource} not found.`
  ));
}

// ============================================================
// Route Handler
// ============================================================

export async function handleFhirRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  user: AuthenticatedUser | null
): Promise<boolean> {

  // Authenticate all FHIR routes without exception
  if (!user) {
    unauthorized(res);
    return true;
  }

  // ─────────────────────────────────────────────────────────
  // GET /api/fhir/patient-record
  // Export full FHIR R4 Bundle for the authenticated patient
  // ─────────────────────────────────────────────────────────
  if (url === '/api/fhir/patient-record' && req.method === 'GET') {
    try {
      // Determine target patientId — patients see only their own record
      const urlParams = new URL(req.url || '', 'http://localhost');
      const requestedPatientId = urlParams.searchParams.get('patientId');

      let targetPatientId: string;
      if (user.role === 'doctor' && requestedPatientId) {
        // Doctors may request a specific patient's record
        targetPatientId = requestedPatientId;
      } else {
        // Patients always get their own record — never trust body/query for identity
        targetPatientId = user.userId;
      }

      // Load all available clinical data
      const [patient, history, assessment, clinicalSummary] = await Promise.all([
        Patient.findOne({ patientId: targetPatientId }).lean(),
        MedicalHistory.findOne({ patientId: targetPatientId }).lean(),
        Assessment.findOne({ patientId: targetPatientId }).sort({ createdAt: -1 }).lean(),
        ClinicalSummary.findOne({ patientId: targetPatientId }).sort({ createdAt: -1 }).lean()
      ]);

      if (!patient) {
        notFound(res, `Patient record for ID ${targetPatientId}`);
        return true;
      }

      // Build FHIR Bundle
      const bundle = FhirService.buildPatientFhirBundle({
        patient: patient as any,
        history: history as any,
        assessment: assessment as any,
        clinicalSummary: clinicalSummary as any
      });

      // Add audit metadata headers
      res.setHeader('X-CarePrep-Patient-Id', targetPatientId);
      res.setHeader('X-CarePrep-Bundle-Type', bundle.meta.tag?.map(t => t.code).join(', ') || 'unknown');
      res.setHeader('X-CarePrep-Export-Timestamp', new Date().toISOString());

      sendFhirJson(res, 200, bundle);
      return true;
    } catch (err: any) {
      console.error('[FHIR] patient-record error:', err?.message);
      sendFhirJson(res, 500, FhirService.buildOperationOutcome(
        'error',
        'exception',
        'Internal server error during FHIR bundle assembly.'
      ));
      return true;
    }
  }

  // ─────────────────────────────────────────────────────────
  // GET /api/fhir/provenance/:assessmentId
  // Returns FHIR Provenance entries for an assessment's evidence trail
  // ─────────────────────────────────────────────────────────
  const provenanceMatch = url.match(/^\/api\/fhir\/provenance\/([^/]+)$/);
  if (provenanceMatch && req.method === 'GET') {
    const assessmentId = provenanceMatch[1];

    try {
      const assessment = await Assessment.findOne({ assessmentId }).lean();

      if (!assessment) {
        notFound(res, `Assessment ${assessmentId}`);
        return true;
      }

      // Patients can only view their own assessment's provenance
      if (user.role === 'patient' && (assessment as any).patientId !== user.userId) {
        forbidden(res);
        return true;
      }

      const evidenceTrail = (assessment as any).evidenceTrail || [];
      const agentLogs = (assessment as any).agentActivityLogs || [];

      const provenanceBundle = {
        resourceType: 'Bundle',
        id: `provenance-bundle-${assessmentId}`,
        meta: {
          lastUpdated: new Date().toISOString(),
          profile: ['https://careprep.in/fhir/StructureDefinition/ProvenanceBundle']
        },
        type: 'collection',
        entry: evidenceTrail.map((ev: any, idx: number) => ({
          fullUrl: `urn:uuid:provenance-ev-${idx + 1}`,
          resource: {
            resourceType: 'Provenance',
            id: `provenance-ev-${idx + 1}`,
            meta: { tag: [{ system: 'https://careprep.in/fhir/tags', code: 'ai-generated', display: 'AI-Generated Evidence Trail' }] },
            target: [{ reference: `Assessment/${assessmentId}` }],
            recorded: ev.timestamp || new Date().toISOString(),
            agent: [{
              who: {
                reference: 'Device/careprep-ai-orchestrator',
                display: 'CarePrep AI Multi-Agent System'
              }
            }],
            entity: [{
              role: 'source',
              what: {
                reference: `#${ev.id || `evidence-${idx + 1}`}`,
                display: `${ev.sourceType}: ${ev.sourceName}`
              },
              description: `[${ev.sourceType}] "${ev.rawSnippet?.substring(0, 200) || 'No snippet'}" → Field: ${ev.structuredField}${ev.confidence !== undefined ? ` (Confidence: ${(ev.confidence * 100).toFixed(0)}%)` : ''}`
            }]
          }
        })),
        // Append agent activity log summary
        _agentActivitySummary: agentLogs.map((log: any) => ({
          agentName: log.agentName,
          action: log.action,
          status: log.status,
          timestamp: log.timestamp
        }))
      };

      sendFhirJson(res, 200, provenanceBundle);
      return true;
    } catch (err: any) {
      console.error('[FHIR] provenance error:', err?.message);
      sendFhirJson(res, 500, FhirService.buildOperationOutcome('error', 'exception', 'Internal error fetching provenance data.'));
      return true;
    }
  }

  // ─────────────────────────────────────────────────────────
  // GET /api/fhir/consent
  // Returns all consent records for the authenticated patient
  // ─────────────────────────────────────────────────────────
  if (url === '/api/fhir/consent' && req.method === 'GET') {
    try {
      const patientId = user.userId; // patients only see their own consent
      const consents = await Consent.find({ patientId }).sort({ grantedAt: -1 }).lean();

      sendJson(res, 200, {
        patientId,
        totalConsents: consents.length,
        activeConsents: consents.filter((c: any) => c.status === 'ACTIVE').length,
        consents: consents.map((c: any) => ({
          consentId: c.consentId,
          grantedTo: c.grantedTo,
          scope: c.scope,
          status: c.status,
          grantedAt: c.grantedAt,
          revokedAt: c.revokedAt,
          expiresAt: c.expiresAt,
          patientNote: c.patientNote
        }))
      });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Failed to retrieve consent records.' });
      return true;
    }
  }

  // ─────────────────────────────────────────────────────────
  // POST /api/fhir/consent
  // Grant or revoke data-sharing consent
  // Body: { action: 'GRANT' | 'REVOKE', scope, grantedTo, expiresAt?, patientNote?, consentId? }
  // ─────────────────────────────────────────────────────────
  if (url === '/api/fhir/consent' && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const { action, scope, grantedTo, expiresAt, patientNote, consentId } = body;

      const patientId = user.userId; // Identity always from auth — never from body

      if (!action || !['GRANT', 'REVOKE'].includes(action)) {
        sendJson(res, 400, { error: 'Invalid action. Must be GRANT or REVOKE.' });
        return true;
      }

      if (action === 'GRANT') {
        const validScopes: ConsentScope[] = ['fhir_export', 'doctor_review', 'research', 'facility_transfer'];
        if (!scope || !validScopes.includes(scope as ConsentScope)) {
          sendJson(res, 400, { error: `Invalid scope. Must be one of: ${validScopes.join(', ')}` });
          return true;
        }
        if (!grantedTo || typeof grantedTo !== 'string' || grantedTo.trim().length === 0) {
          sendJson(res, 400, { error: 'grantedTo is required for GRANT action.' });
          return true;
        }

        const newConsent = new Consent({
          consentId: `consent-${randomUUID()}`,
          patientId,
          grantedTo: grantedTo.trim(),
          scope: scope as ConsentScope,
          status: 'ACTIVE',
          grantedAt: new Date(),
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          patientNote: typeof patientNote === 'string' ? patientNote.substring(0, 500) : '',
          processedBy: 'PATIENT_SELF'
        });

        await newConsent.save();

        sendJson(res, 201, {
          success: true,
          message: 'Consent granted successfully.',
          consent: {
            consentId: newConsent.consentId,
            scope: newConsent.scope,
            grantedTo: newConsent.grantedTo,
            status: newConsent.status,
            grantedAt: newConsent.grantedAt
          }
        });
        return true;
      }

      if (action === 'REVOKE') {
        if (!consentId) {
          sendJson(res, 400, { error: 'consentId is required for REVOKE action.' });
          return true;
        }

        // Only allow revoking your own consent
        const existing = await Consent.findOne({ consentId, patientId });
        if (!existing) {
          sendJson(res, 404, { error: 'Consent record not found or does not belong to this patient.' });
          return true;
        }
        if (existing.status === 'REVOKED') {
          sendJson(res, 409, { error: 'Consent is already revoked.' });
          return true;
        }

        existing.status = 'REVOKED';
        existing.revokedAt = new Date();
        await existing.save();

        sendJson(res, 200, {
          success: true,
          message: 'Consent revoked successfully.',
          consentId,
          revokedAt: existing.revokedAt
        });
        return true;
      }

      sendJson(res, 400, { error: 'Unhandled consent action.' });
      return true;
    } catch (err: any) {
      console.error('[FHIR] consent error:', err?.message);
      sendJson(res, 500, { error: 'Failed to process consent request.' });
      return true;
    }
  }

  // Not handled by this router
  return false;
}
