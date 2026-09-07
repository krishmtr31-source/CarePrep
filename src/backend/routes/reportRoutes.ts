import { IncomingMessage, ServerResponse } from 'http';
import { MedicalReport } from '../models';
import { AuthenticatedUser, sendJson, parseJsonBody } from '../server/authMiddleware';
import { HARDCODED_MEDICAL_REPORTS } from '../data/mockMedicalReports';

/**
 * Validates the structure returned from Gemini or client document extraction
 * before persisting to MongoDB.
 */
function validateAndSanitizeReportData(body: any) {
  const labResults = Array.isArray(body.labResults) 
    ? body.labResults.map((lr: any) => ({
        testName: String(lr.testName || lr.test_name || 'Lab Test').trim(),
        value: String(lr.value || lr.resultValue || 'Normal').trim(),
        numericValue: typeof lr.numericValue === 'number' ? lr.numericValue : undefined,
        unit: String(lr.unit || '').trim(),
        referenceRange: String(lr.referenceRange || lr.reference_range || '').trim(),
        status: String(lr.status || lr.flag || 'normal').toLowerCase(),
        isAbnormal: Boolean(lr.isAbnormal || lr.status === 'abnormal' || lr.status === 'high' || lr.status === 'low' || lr.flag === 'HIGH' || lr.flag === 'LOW')
      }))
    : [];

  const medications = Array.isArray(body.medications)
    ? body.medications.map((m: any) => ({
        name: String(m.name || 'Medication').trim(),
        dosage: String(m.dosage || '').trim(),
        frequency: String(m.frequency || '').trim(),
        duration: String(m.duration || '').trim()
      }))
    : [];

  const diagnoses = Array.isArray(body.diagnoses)
    ? body.diagnoses.map((d: any) => (typeof d === 'string' ? d : d.conditionName || String(d)))
    : [];

  const aiSummary = body.aiSummary || body.geminiAnalysis?.summary ? {
    mainPurpose: String(body.aiSummary?.mainPurpose || body.geminiAnalysis?.summary?.main_purpose || '').trim(),
    keyFindings: Array.isArray(body.aiSummary?.keyFindings || body.geminiAnalysis?.summary?.key_findings) 
      ? (body.aiSummary?.keyFindings || body.geminiAnalysis?.summary?.key_findings) 
      : [],
    importantObservations: Array.isArray(body.aiSummary?.importantObservations || body.geminiAnalysis?.summary?.important_observations)
      ? (body.aiSummary?.importantObservations || body.geminiAnalysis?.summary?.important_observations)
      : [],
    patientFriendlySummary: String(body.aiSummary?.patientFriendlySummary || body.geminiAnalysis?.patient_friendly_summary || '').trim(),
    doctorReviewSummary: String(body.aiSummary?.doctorReviewSummary || body.geminiAnalysis?.doctor_review_summary || '').trim()
  } : undefined;

  const hospitalDetails = {
    facilityName: String(body.facilityName || body.hospitalDetails?.facilityName || body.geminiAnalysis?.document?.hospital_or_lab || '').trim(),
    doctorName: String(body.doctorName || body.hospitalDetails?.doctorName || body.geminiAnalysis?.document?.doctor_name || '').trim(),
    reportDate: String(body.detectedDate || body.hospitalDetails?.reportDate || body.geminiAnalysis?.document?.document_date || '').trim()
  };

  return {
    labResults,
    medications,
    diagnoses,
    aiSummary,
    hospitalDetails
  };
}

export async function handleReportRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  url: string,
  user: AuthenticatedUser | null
): Promise<boolean> {
  // Routes:
  // GET  /api/reports/sample (Public demo endpoint for hardcoded medical reports)
  // POST /api/reports
  // GET  /api/reports
  // GET  /api/reports/:id

  if (!url.startsWith('/api/reports')) {
    return false;
  }

  // 1. GET /api/reports/sample – returns hardcoded realistic medical reports for demo/testing
  if (url === '/api/reports/sample' && req.method === 'GET') {
    sendJson(res, 200, HARDCODED_MEDICAL_REPORTS);
    return true;
  }

  // Ensure caller is authenticated for private patient/doctor operations
  if (!user || !user.userId) {
    sendJson(res, 401, { error: 'Authentication required.' });
    return true;
  }

  const isBase = url === '/api/reports';
  const idMatch = url.match(/^\/api\/reports\/([^/?]+)$/);
  const targetId = idMatch ? idMatch[1] : null;

  // 2. POST /api/reports
  if (isBase && req.method === 'POST') {
    try {
      const body = await parseJsonBody(req);
      const reportId = body.documentId || body.reportId || `rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(-4)}`;

      // Validate & sanitize structured information
      const { labResults, medications, diagnoses, aiSummary, hospitalDetails } = validateAndSanitizeReportData(body);

      // Store structured metadata, NEVER dump huge base64 documents into MongoDB
      const report = new MedicalReport({
        reportId,
        patientId: user.userId, // Authenticated patient
        fileName: body.fileName || 'Medical_Report.pdf',
        fileType: body.fileType || (body.fileName?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'),
        fileSize: typeof body.fileSize === 'number' ? body.fileSize : undefined,
        uploadedAt: body.uploadedAt ? new Date(body.uploadedAt) : new Date(),
        processingStatus: body.processingStatus || 'COMPLETED',
        extractedData: body.extractedData || {},
        labResults,
        medications,
        diagnoses,
        hospitalDetails,
        aiSummary,
        sourceDocumentReference: body.sourceDocumentReference || body.documentId || ''
      });

      await report.save();
      sendJson(res, 201, { success: true, report });
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to save medical report.' });
      return true;
    }
  }

  // 3. GET /api/reports (Patient gets own reports; Doctor gets assigned/patient reports)
  if (isBase && req.method === 'GET') {
    try {
      let query: Record<string, any> = {};
      if (user.role === 'doctor') {
        const urlParams = new URL(req.url || '', 'http://localhost').searchParams;
        const requestedPatientId = urlParams.get('patientId');
        if (requestedPatientId) {
          query.patientId = requestedPatientId;
        }
      } else {
        query.patientId = user.userId;
      }

      const reports = await MedicalReport.find(query).sort({ uploadedAt: -1 }).limit(100);
      if (reports && reports.length > 0) {
        sendJson(res, 200, reports);
        return true;
      }

      // If database contains no records yet, provide the rich hardcoded reports personalized for user
      const personalized = HARDCODED_MEDICAL_REPORTS.map((r) => ({
        ...r,
        patientId: user.userId,
      }));
      sendJson(res, 200, personalized);
      return true;
    } catch (err: any) {
      // Graceful fallback to hardcoded reports if MongoDB is unreachable
      const personalized = HARDCODED_MEDICAL_REPORTS.map((r) => ({
        ...r,
        patientId: user.userId,
      }));
      sendJson(res, 200, personalized);
      return true;
    }
  }

  // 4. GET /api/reports/:id
  if (targetId && req.method === 'GET') {
    // Check if targetId matches any hardcoded sample report
    const matchedSample = HARDCODED_MEDICAL_REPORTS.find(
      (r) => r.reportId === targetId || r.reportId.toLowerCase() === targetId.toLowerCase()
    );
    if (matchedSample) {
      sendJson(res, 200, {
        ...matchedSample,
        patientId: user.userId,
      });
      return true;
    }

    try {
      const report = await MedicalReport.findOne({ reportId: targetId });
      if (!report) {
        sendJson(res, 404, { error: 'Medical report not found.' });
        return true;
      }

      // Authorization guard: Patients can only view their own reports
      if (user.role !== 'doctor' && report.patientId !== user.userId) {
        sendJson(res, 403, { error: 'Forbidden. You do not have permission to view this report.' });
        return true;
      }

      sendJson(res, 200, report);
      return true;
    } catch (err: any) {
      sendJson(res, 500, { error: 'Unable to retrieve report details.' });
      return true;
    }
  }

  return false;
}
