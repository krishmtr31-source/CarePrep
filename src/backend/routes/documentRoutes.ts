import { IncomingMessage, ServerResponse } from 'http';
import mongoose from 'mongoose';
import { MedicalDocument } from '../models';
import { AuthenticatedUser, sendJson, parseJsonBody } from '../server/authMiddleware';
import { medicalDocumentService } from '../services/medicalDocumentService';
import { classifyGeminiError, sanitizeLogMessage, isGeminiMockModeEnabled } from '../utils/geminiErrorHandler';

// In-memory fallback store when running in detached mode / offline DB
const inMemoryDocStore = new Map<string, any>();

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png'
];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

function validateFileMetadata(fileName: string, mimeType?: string, fileSize?: number): { valid: boolean; error?: string } {
  const lowerName = fileName.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some(ext => lowerName.endsWith(ext));
  
  if (!hasValidExt) {
    return { valid: false, error: 'Unsupported file type.' };
  }

  if (mimeType) {
    const cleanMime = mimeType.toLowerCase().split(';')[0].trim();
    if (!ALLOWED_MIME_TYPES.includes(cleanMime)) {
      return { valid: false, error: 'Unsupported file type.' };
    }
  }

  if (typeof fileSize === 'number' && fileSize > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: 'File size exceeds 10 MB.' };
  }

  return { valid: true };
}

export async function handleMedicalDocumentRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  user: AuthenticatedUser | null
): Promise<boolean> {
  if (!url.startsWith('/api/medical-documents')) {
    return false;
  }

  // 1. All medical document endpoints require authentication
  if (!user || !user.userId) {
    sendJson(res, 401, { error: 'Authentication required.' });
    return true;
  }

  const isBase = url === '/api/medical-documents';
  const isAnalyze = url === '/api/medical-documents/analyze';
  const idMatch = url.match(/^\/api\/medical-documents\/([^/?]+)$/);
  const targetId = idMatch ? idMatch[1] : null;

  // =========================================================================
  // 1. POST /api/medical-documents/analyze (Gemini Extraction Endpoint)
  // =========================================================================
  if (isAnalyze && req.method === 'POST') {
    try {
      // Allow up to 25MB body payload for base64 encoded PDF/image files
      const body = await parseJsonBody(req, 25 * 1024 * 1024);
      const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
      const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : '';
      const fileSize = typeof body.fileSize === 'number' ? body.fileSize : undefined;
      const fileData = typeof body.fileData === 'string' ? body.fileData : undefined;
      const rawText = typeof body.rawText === 'string' ? body.rawText : undefined;

      if (!fileName) {
        sendJson(res, 400, { error: 'Unsupported file type.' });
        return true;
      }

      // Validate extension, MIME type, and file size
      const validation = validateFileMetadata(fileName, mimeType, fileSize);
      if (!validation.valid) {
        sendJson(res, 400, { error: validation.error });
        return true;
      }

      // Check for empty or unreadable document payload
      if (!fileData && (!rawText || !rawText.trim())) {
        sendJson(res, 400, { error: 'Unable to read this document.' });
        return true;
      }

      if (fileData) {
        const base64Content = fileData.includes(',') ? fileData.split(',')[1] : fileData;
        if (!base64Content || base64Content.length < 10) {
          sendJson(res, 400, { error: 'Unable to read this document.' });
          return true;
        }
      }

      // Check Gemini configuration
      if (!medicalDocumentService.isConfigured() && !isGeminiMockModeEnabled()) {
        sendJson(res, 503, {
          success: false,
          code: 'AI_SERVICE_UNAVAILABLE',
          error: 'AI extraction is temporarily unavailable.',
          fallbackAvailable: true
        });
        return true;
      }

      // Send to server-side Gemini
      try {
        const extraction = await medicalDocumentService.analyzeDocument({
          fileName,
          mimeType: mimeType || (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
          fileData,
          rawText
        });

        sendJson(res, 200, {
          success: true,
          extraction,
          aiModel: medicalDocumentService.getModelName(),
          processedAt: new Date().toISOString()
        });
        return true;
      } catch (aiErr: any) {
        const classified = classifyGeminiError(aiErr);
        console.warn(`[handleMedicalDocumentRoutes] AI extraction failure: [${classified.code}] ${classified.sanitizedDiagnostic}`);
        sendJson(res, classified.httpStatus, {
          success: false,
          code: classified.code,
          error: classified.message,
          fallbackAvailable: true
        });
        return true;
      }
    } catch (err: any) {
      if (err.message === 'Payload too large') {
        sendJson(res, 400, { error: 'File size exceeds 10 MB.' });
      } else {
        sendJson(res, 400, { error: 'Unable to read this document.' });
      }
      return true;
    }
  }

  // Helper to check if MongoDB connection is active
  const isDbConnected = () => mongoose.connection.readyState === 1;

  // =========================================================================
  // 2. POST /api/medical-documents (Save Patient-Reviewed Document to MongoDB)
  // =========================================================================
  if (isBase && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req, 25 * 1024 * 1024);
      const documentId = body.documentId || `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;

      const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : 'Medical_Document';
      const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : 'application/pdf';
      const fileSize = typeof body.fileSize === 'number' ? body.fileSize : 0;
      const fileData = typeof body.fileData === 'string' ? body.fileData : undefined;

      const docPayload: any = {
        documentId,
        patientId: user.userId, // Authenticated patient ID strictly enforced
        fileName,
        mimeType,
        fileSize,
        fileData,
        documentType: body.documentType || 'OTHER',
        documentTitle: body.documentTitle || fileName,
        documentDate: body.documentDate || null,
        patientName: body.patientName || null,
        doctorName: body.doctorName || null,
        hospitalName: body.hospitalName || null,
        summary: body.summary || '',
        labResults: Array.isArray(body.labResults) ? body.labResults : [],
        medications: Array.isArray(body.medications) ? body.medications : [],
        diagnosesMentioned: Array.isArray(body.diagnosesMentioned) ? body.diagnosesMentioned : [],
        proceduresMentioned: Array.isArray(body.proceduresMentioned) ? body.proceduresMentioned : [],
        importantNotes: Array.isArray(body.importantNotes) ? body.importantNotes : [],
        extractionWarnings: Array.isArray(body.extractionWarnings) ? body.extractionWarnings : [],
        extractionStatus: body.extractionStatus || 'PROCESSED',
        aiModel: body.aiModel || medicalDocumentService.getModelName(),
        processedAt: body.processedAt ? new Date(body.processedAt) : new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (isDbConnected()) {
        const newDoc = new MedicalDocument(docPayload);
        await newDoc.save();
        sendJson(res, 201, { success: true, document: newDoc });
      } else {
        inMemoryDocStore.set(documentId, docPayload);
        sendJson(res, 201, { success: true, document: docPayload });
      }
      return true;
    } catch (err: any) {
      console.error('[handleMedicalDocumentRoutes] Save error:', err);
      sendJson(res, 500, { error: 'Failed to save medical document to database.' });
      return true;
    }
  }

  // =========================================================================
  // 3. GET /api/medical-documents (List Authenticated Patient's Documents)
  // =========================================================================
  if (isBase && req.method === 'GET') {
    try {
      let queryPatientId: string = user.userId;

      if (user.role === 'doctor') {
        const urlParams = new URL(req.url || '', 'http://localhost').searchParams;
        const requestedPatientId = urlParams.get('patientId');
        if (requestedPatientId) {
          queryPatientId = requestedPatientId;
        }
      }

      if (isDbConnected()) {
        const query: Record<string, any> = { patientId: queryPatientId };
        const docs = await MedicalDocument.find(query).sort({ createdAt: -1 }).limit(100);
        sendJson(res, 200, docs);
      } else {
        const docs = Array.from(inMemoryDocStore.values())
          .filter(d => d.patientId === queryPatientId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        sendJson(res, 200, docs);
      }
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to retrieve medical documents.' });
      return true;
    }
  }

  // =========================================================================
  // 4. GET /api/medical-documents/:id (Get Single Document with Authorization)
  // =========================================================================
  if (targetId && req.method === 'GET') {
    try {
      let doc: any = null;

      if (isDbConnected()) {
        doc = await MedicalDocument.findOne({ documentId: targetId });
      } else {
        doc = inMemoryDocStore.get(targetId);
      }

      if (!doc) {
        sendJson(res, 404, { error: 'Medical document not found.' });
        return true;
      }

      // Tenant isolation: Patients can only view their own documents
      if (user.role !== 'doctor' && doc.patientId !== user.userId) {
        sendJson(res, 403, { error: 'Forbidden. You do not have permission to access this document.' });
        return true;
      }

      sendJson(res, 200, doc);
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to retrieve medical document.' });
      return true;
    }
  }

  // =========================================================================
  // 5. PUT /api/medical-documents/:id (Edit Extracted Information Before/After Saving)
  // =========================================================================
  if (targetId && req.method === 'PUT') {
    try {
      let doc: any = null;

      if (isDbConnected()) {
        doc = await MedicalDocument.findOne({ documentId: targetId });
      } else {
        doc = inMemoryDocStore.get(targetId);
      }

      if (!doc) {
        sendJson(res, 404, { error: 'Medical document not found.' });
        return true;
      }

      if (user.role !== 'doctor' && doc.patientId !== user.userId) {
        sendJson(res, 403, { error: 'Forbidden. You do not have permission to modify this document.' });
        return true;
      }

      const body = await parseJsonBody(req, 5 * 1024 * 1024);

      if (body.documentTitle !== undefined) doc.documentTitle = body.documentTitle;
      if (body.documentType !== undefined) doc.documentType = body.documentType;
      if (body.documentDate !== undefined) doc.documentDate = body.documentDate;
      if (body.patientName !== undefined) doc.patientName = body.patientName;
      if (body.doctorName !== undefined) doc.doctorName = body.doctorName;
      if (body.hospitalName !== undefined) doc.hospitalName = body.hospitalName;
      if (body.summary !== undefined) doc.summary = body.summary;
      if (Array.isArray(body.labResults)) doc.labResults = body.labResults;
      if (Array.isArray(body.medications)) doc.medications = body.medications;
      if (Array.isArray(body.diagnosesMentioned)) doc.diagnosesMentioned = body.diagnosesMentioned;
      if (Array.isArray(body.proceduresMentioned)) doc.proceduresMentioned = body.proceduresMentioned;
      if (Array.isArray(body.importantNotes)) doc.importantNotes = body.importantNotes;
      if (Array.isArray(body.extractionWarnings)) doc.extractionWarnings = body.extractionWarnings;
      doc.updatedAt = new Date();

      if (isDbConnected()) {
        await doc.save();
      } else {
        inMemoryDocStore.set(targetId, doc);
      }

      sendJson(res, 200, { success: true, document: doc });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to update medical document.' });
      return true;
    }
  }

  // =========================================================================
  // 6. DELETE /api/medical-documents/:id (Delete Document with Confirmation)
  // =========================================================================
  if (targetId && req.method === 'DELETE') {
    try {
      let doc: any = null;

      if (isDbConnected()) {
        doc = await MedicalDocument.findOne({ documentId: targetId });
      } else {
        doc = inMemoryDocStore.get(targetId);
      }

      if (!doc) {
        sendJson(res, 404, { error: 'Medical document not found.' });
        return true;
      }

      if (user.role !== 'doctor' && doc.patientId !== user.userId) {
        sendJson(res, 403, { error: 'Forbidden. You do not have permission to delete this document.' });
        return true;
      }

      if (isDbConnected()) {
        await MedicalDocument.deleteOne({ documentId: targetId });
      } else {
        inMemoryDocStore.delete(targetId);
      }

      sendJson(res, 200, { success: true, message: 'Medical document deleted successfully.' });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to delete medical document.' });
      return true;
    }
  }

  return false;
}
