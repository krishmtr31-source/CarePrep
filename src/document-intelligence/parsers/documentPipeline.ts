import { ExtractedDocumentData, TimelineEvent, DocumentClassification, ExtractedMedication, ExtractedLabResult, ExtractedDiagnosis, GeminiMedicalDocumentAnalysis } from '../models/document';
import { classifyDocumentText } from './documentClassifier';
import { parsePrescriptionText } from './prescriptionParser';
import { parseLabReportText } from './labReportParser';
import { parseDischargeSummaryText } from './dischargeSummaryParser';
import { evaluateTextQuality } from '../ocr/textQualityChecker';
import { cleanOcrText } from '../ocr/ocrCleaner';
import { llmGateway } from '../../ai-services/llm/LLMGateway';
import { SchemaValidator } from '../../ai-services/llm/schemaValidator';

/**
 * Synchronous deterministic baseline parser.
 */
export function processDocumentText(
  rawText: string,
  fileName: string,
  fileType: 'pdf' | 'image' | 'sample' = 'sample',
  overrideClassification?: DocumentClassification,
  extractionMethod: 'PDF_TEXT' | 'OCR' | 'SAMPLE' = 'SAMPLE'
): ExtractedDocumentData {
  const docId = `doc-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
  const cleanedText = cleanOcrText(rawText);
  const textQuality = evaluateTextQuality(cleanedText);

  // If text is heavily corrupted (e.g. raw binary PDF or pure gibberish), reject parsing into entities
  if (!textQuality.isAcceptable && textQuality.hasBinaryArtifacts) {
    return {
      documentId: docId,
      fileName,
      fileType,
      uploadedAt: new Date().toISOString(),
      classification: 'OTHER',
      classificationConfidence: 0.10,
      detectedDate: new Date().toISOString().split('T')[0],
      rawText: cleanedText,
      pagesCount: 1,
      medications: [],
      labResults: [],
      diagnoses: [],
      textQuality: 'UNUSABLE',
      geminiAnalyzed: false,
      evidenceValidated: true,
      unreliableFields: [
        'Corrupted or unreadable document stream: unable to reliably extract clinical entities. Manual verification required.'
      ]
    };
  }

  const classificationResult = classifyDocumentText(cleanedText);
  const finalClassification = overrideClassification || classificationResult.classification;

  let medications: ExtractedMedication[] = [];
  let labResults: ExtractedLabResult[] = [];
  let diagnoses: ExtractedDiagnosis[] = [];
  let facilityName: string | undefined;
  let doctorName: string | undefined;
  let detectedDate: string | undefined;
  let summaryNote: string | undefined;
  let unreliableFields: string[] = [];

  const effectiveMethod = extractionMethod === 'SAMPLE' && fileType === 'pdf' ? 'PDF_TEXT' : extractionMethod;

  // Parse based on classification
  if (finalClassification === 'PRESCRIPTION') {
    const parsed = parsePrescriptionText(cleanedText, docId, fileName, effectiveMethod);
    medications = parsed.medications;
    diagnoses = parsed.diagnoses;
    doctorName = parsed.doctorName;
    unreliableFields = parsed.unreliableFields;
  } else if (finalClassification === 'LAB_REPORT') {
    const parsed = parseLabReportText(cleanedText, docId, fileName, effectiveMethod);
    labResults = parsed.labResults;
    facilityName = parsed.facilityName;
    doctorName = parsed.doctorName;
    detectedDate = parsed.reportDate;
    unreliableFields = parsed.unreliableFields;
  } else if (finalClassification === 'DISCHARGE_SUMMARY') {
    const parsed = parseDischargeSummaryText(cleanedText, docId, fileName, effectiveMethod);
    diagnoses = parsed.diagnoses;
    medications = parsed.medications;
    facilityName = parsed.facilityName;
    detectedDate = parsed.dischargeDate || parsed.admissionDate;
    summaryNote = parsed.summaryNote;
    unreliableFields = parsed.unreliableFields;
  } else {
    // Other / Ambiguous / Unclassified
    const labCheck = parseLabReportText(cleanedText, docId, fileName, effectiveMethod);
    labResults = labCheck.labResults;
    if (labResults.length > 0) {
      facilityName = labCheck.facilityName;
      doctorName = labCheck.doctorName;
      detectedDate = labCheck.reportDate;
    } else {
      unreliableFields.push('Unstandardized layout: manual clinician verification required');
    }
    const rxCheck = parsePrescriptionText(cleanedText, docId, fileName, effectiveMethod);
    medications = rxCheck.medications;
  }

  return {
    documentId: docId,
    fileName,
    fileType,
    uploadedAt: new Date().toISOString(),
    classification: finalClassification,
    classificationConfidence: classificationResult.confidence,
    detectedDate: detectedDate || new Date().toISOString().split('T')[0],
    facilityName,
    doctorName,
    rawText: cleanedText,
    pagesCount: 1,
    medications,
    labResults,
    diagnoses,
    summaryNote,
    unreliableFields,
    textQuality: textQuality.isAcceptable ? 'VALID' : 'DEGRADED',
    geminiAnalyzed: false,
    evidenceValidated: true
  };
}

/**
 * Asynchronous Hybrid AI + Deterministic Document Understanding Pipeline.
 * 
 * Pipeline:
 * Uploaded Document -> PDF/OCR Extraction -> Raw Text -> Text Quality Check ->
 * [Deterministic Baseline + Gemini 3.6 Flash] -> Schema Validator ->
 * Evidence Grounding -> Deterministic Lab Abnormality -> Physician Model
 */
export async function processDocumentWithAI(
  rawText: string,
  fileName: string,
  fileType: 'pdf' | 'image' | 'sample' = 'sample',
  overrideClassification?: DocumentClassification,
  extractionMethod: 'PDF_TEXT' | 'OCR' | 'SAMPLE' = 'SAMPLE',
  fileData?: string,
  mimeType?: string,
  originalFileUrl?: string
): Promise<ExtractedDocumentData> {
  const docId = `doc-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
  const cleanedText = cleanOcrText(rawText);
  const textQuality = evaluateTextQuality(cleanedText);

  // 1. Text Quality Guard: If raw text has binary stream artifacts or extreme corruption and no fileData
  if (!textQuality.isAcceptable && textQuality.hasBinaryArtifacts && !fileData) {
    return {
      documentId: docId,
      fileName,
      fileType,
      uploadedAt: new Date().toISOString(),
      classification: 'OTHER',
      classificationConfidence: 0.10,
      detectedDate: new Date().toISOString().split('T')[0],
      rawText: cleanedText,
      pagesCount: 1,
      medications: [],
      labResults: [],
      diagnoses: [],
      textQuality: 'UNUSABLE',
      geminiAnalyzed: false,
      evidenceValidated: true,
      originalFileUrl,
      unreliableFields: [
        'Corrupted or unreadable document stream: unable to reliably extract clinical entities. Manual verification required.'
      ]
    };
  }

  // 2. Deterministic baseline parse
  const detBaseline = processDocumentText(rawText, fileName, fileType, overrideClassification, extractionMethod);
  const effectiveMethod = extractionMethod === 'SAMPLE' && fileType === 'pdf' ? 'PDF_TEXT' : extractionMethod;

  try {
    // 3. Attempt full Gemini Medical Document Understanding via backend proxy
    let fullGeminiAnalysis: GeminiMedicalDocumentAnalysis | null = null;

    if (typeof window !== 'undefined') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000);

        const response = await fetch('/api/ai/document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: cleanedText,
            fileName,
            fileData,
            mimeType
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.data && resData.data.document) {
            fullGeminiAnalysis = resData.data as GeminiMedicalDocumentAnalysis;
          }
        }
      } catch (proxyErr) {
        console.warn('Direct Gemini document endpoint error, attempting gateway fallback:', proxyErr);
      }
    }

    // 4. If full Gemini analysis was received
    if (fullGeminiAnalysis) {
      const docTypeLower = (fullGeminiAnalysis.document?.document_type || '').toLowerCase();
      let finalClassification: DocumentClassification = overrideClassification || detBaseline.classification;

      if (!overrideClassification) {
        if (docTypeLower.includes('lab') || docTypeLower.includes('blood') || docTypeLower.includes('pathology') || fullGeminiAnalysis.laboratory_results?.length > 0) {
          finalClassification = 'LAB_REPORT';
        } else if (docTypeLower.includes('prescription') || docTypeLower.includes('rx')) {
          finalClassification = 'PRESCRIPTION';
        } else if (docTypeLower.includes('discharge') || docTypeLower.includes('summary')) {
          finalClassification = 'DISCHARGE_SUMMARY';
        }
      }

      // Build Extracted Medications
      const medications: ExtractedMedication[] = [];
      (fullGeminiAnalysis.medications || []).forEach((med, idx) => {
        medications.push({
          id: `med-${docId}-${idx + 1}`,
          name: med.name,
          dosage: med.dosage || 'Not specified',
          frequency: med.frequency || 'Not specified',
          duration: med.duration || 'Not specified',
          evidence: {
            documentId: docId,
            documentName: fileName,
            pageNumber: 1,
            snippet: `${med.name} ${med.dosage || ''} ${med.frequency || ''}`.trim(),
            confidenceScore: 0.95,
            extractionMethod: effectiveMethod,
            requiresVerification: false
          }
        });
      });
      if (medications.length === 0 && detBaseline.medications.length > 0) {
        detBaseline.medications.forEach(m => medications.push(m));
      }

      // Build Extracted Labs
      const labResults: ExtractedLabResult[] = [];
      (fullGeminiAnalysis.laboratory_results || []).forEach((lab, idx) => {
        const numVal = parseFloat(String(lab.value));
        const statusLower = (lab.status || 'unknown').toLowerCase();
        const flag = statusLower === 'high' ? 'HIGH' : statusLower === 'low' ? 'LOW' : statusLower === 'normal' ? 'NORMAL' : 'INDETERMINATE';
        const isAbnormal = statusLower === 'high' || statusLower === 'low' || statusLower === 'abnormal';

        labResults.push({
          id: `lab-${docId}-${idx + 1}`,
          testName: lab.test_name,
          resultValue: String(lab.value),
          numericValue: isNaN(numVal) ? undefined : numVal,
          value: isNaN(numVal) ? String(lab.value) : numVal,
          unit: lab.unit || '',
          sourceReferenceRange: {
            raw: lab.reference_range || '',
            hasSourceRange: Boolean(lab.reference_range && lab.reference_range !== 'Not specified in source document')
          },
          referenceRange: lab.reference_range || '',
          flag,
          status: statusLower,
          isAbnormal,
          source: 'uploaded_lab_report',
          evidence: {
            documentId: docId,
            documentName: fileName,
            pageNumber: 1,
            snippet: `${lab.test_name} ${lab.value} ${lab.unit} (Ref: ${lab.reference_range})`,
            confidenceScore: 0.95,
            extractionMethod: effectiveMethod,
            requiresVerification: statusLower === 'unknown'
          }
        });
      });
      if (labResults.length === 0 && detBaseline.labResults.length > 0) {
        detBaseline.labResults.forEach(l => labResults.push(l));
        fullGeminiAnalysis.laboratory_results = detBaseline.labResults.map(l => ({
          test_name: l.testName,
          testName: l.testName,
          value: l.numericValue ?? l.resultValue,
          unit: l.unit,
          reference_range: l.referenceRange || l.sourceReferenceRange?.raw || '',
          referenceRange: l.referenceRange || l.sourceReferenceRange?.raw || '',
          status: (l.status || (l.flag === 'HIGH' ? 'high' : l.flag === 'LOW' ? 'low' : l.flag === 'NORMAL' ? 'normal' : 'unknown')).toLowerCase() as any,
          source: 'uploaded_lab_report'
        }));
      }

      // Build Diagnoses
      const diagnoses: ExtractedDiagnosis[] = [];
      (fullGeminiAnalysis.diagnoses_or_conditions_mentioned || []).forEach((diag, idx) => {
        diagnoses.push({
          id: `diag-${docId}-${idx + 1}`,
          conditionName: diag,
          status: 'ACTIVE',
          date: fullGeminiAnalysis?.document?.document_date || detBaseline.detectedDate,
          evidence: {
            documentId: docId,
            documentName: fileName,
            pageNumber: 1,
            snippet: diag,
            confidenceScore: 0.95,
            extractionMethod: effectiveMethod,
            requiresVerification: false
          }
        });
      });
      if (diagnoses.length === 0 && detBaseline.diagnoses.length > 0) {
        detBaseline.diagnoses.forEach(d => diagnoses.push(d));
      }

      return {
        documentId: docId,
        fileName,
        fileType,
        uploadedAt: new Date().toISOString(),
        classification: finalClassification,
        classificationConfidence: 0.95,
        detectedDate: fullGeminiAnalysis.document?.document_date || detBaseline.detectedDate,
        facilityName: fullGeminiAnalysis.document?.hospital_or_lab || detBaseline.facilityName,
        doctorName: fullGeminiAnalysis.document?.doctor_name || detBaseline.doctorName,
        rawText: cleanedText,
        pagesCount: 1,
        medications,
        labResults,
        diagnoses,
        summaryNote: fullGeminiAnalysis.doctor_review_summary || fullGeminiAnalysis.patient_friendly_summary || detBaseline.summaryNote,
        unreliableFields: fullGeminiAnalysis.missing_or_unclear_information || detBaseline.unreliableFields,
        textQuality: textQuality.isAcceptable ? 'VALID' : 'DEGRADED',
        geminiAnalyzed: true,
        geminiAnalysis: fullGeminiAnalysis,
        originalFileUrl,
        evidenceValidated: true
      };
    }

    // 5. Secondary AI path: Invoke Gemini via LLMGateway
    const geminiResponse = await llmGateway.interpretDocument(cleanedText, fileName, fileData, mimeType);
    const geminiData = geminiResponse.interpretation;
    const fallbackUsed = geminiResponse.fallbackTriggered;

    if (fallbackUsed || !geminiData) {
      return {
        ...detBaseline,
        geminiAnalyzed: false,
        originalFileUrl,
        evidenceValidated: true,
        textQuality: textQuality.isAcceptable ? 'VALID' : 'DEGRADED'
      };
    }

    // Hybrid Classification Resolution (Rule 11)
    let finalClassification: DocumentClassification = overrideClassification || detBaseline.classification;
    let classificationConflict = false;

    if (!overrideClassification) {
      if (geminiData.documentType && geminiData.documentType !== 'OTHER') {
        if (detBaseline.classification !== geminiData.documentType && detBaseline.classification !== 'OTHER') {
          classificationConflict = true;
          finalClassification = (geminiData.confidence || 0.90) >= detBaseline.classificationConfidence
            ? geminiData.documentType
            : detBaseline.classification;
        } else {
          finalClassification = geminiData.documentType;
        }
      }
    }

    // Build Extracted Medications
    const medications: ExtractedMedication[] = [];
    (geminiData.medications || []).forEach((med, idx) => {
      medications.push({
        id: `med-${docId}-${idx + 1}`,
        name: med.name,
        dosage: med.dose || 'Not found / Requires verification',
        frequency: med.frequency || 'Not found / Requires verification',
        duration: med.duration || 'Not found / Requires verification',
        evidence: {
          documentId: docId,
          documentName: fileName,
          pageNumber: med.page || 1,
          snippet: med.evidence || med.name,
          confidenceScore: med.confidence || 0.95,
          extractionMethod: effectiveMethod,
          requiresVerification: med.requiresVerification
        },
        isAyushMedicine: med.isAyushMedicine
      });
    });
    if (medications.length === 0 && detBaseline.medications.length > 0) {
      detBaseline.medications.forEach(m => medications.push(m));
    }

    // Build Extracted Labs with Deterministic Abnormality Evaluation
    const labResults: ExtractedLabResult[] = [];
    (geminiData.labs || []).forEach((lab, idx) => {
      const numVal = lab.value ? parseFloat(String(lab.value)) : NaN;
      const refRangeStr = lab.referenceRange && lab.referenceRange !== 'Not specified in source document'
        ? lab.referenceRange
        : '';
      const evalResult = SchemaValidator.evaluateLabFlagDeterministically(numVal, refRangeStr);

      labResults.push({
        id: `lab-${docId}-${idx + 1}`,
        testName: lab.testName,
        resultValue: lab.value !== null && lab.value !== undefined ? String(lab.value) : 'Not found',
        numericValue: isNaN(numVal) ? undefined : numVal,
        value: isNaN(numVal) ? String(lab.value) : numVal,
        unit: lab.unit || '',
        sourceReferenceRange: {
          raw: refRangeStr,
          min: evalResult.min,
          max: evalResult.max,
          hasSourceRange: evalResult.hasSourceRange
        },
        referenceRange: refRangeStr,
        flag: evalResult.flag,
        status: evalResult.flag.toLowerCase(),
        isAbnormal: evalResult.isAbnormal,
        source: 'uploaded_lab_report',
        evidence: {
          documentId: docId,
          documentName: fileName,
          pageNumber: lab.page || 1,
          snippet: lab.evidence || `${lab.testName} ${lab.value} ${lab.unit}`,
          confidenceScore: lab.confidence || 0.95,
          extractionMethod: effectiveMethod,
          requiresVerification: !evalResult.hasSourceRange || lab.requiresVerification
        }
      });
    });
    if (labResults.length === 0 && detBaseline.labResults.length > 0) {
      detBaseline.labResults.forEach(l => labResults.push(l));
    }

    // Build Extracted Diagnoses
    const diagnoses: ExtractedDiagnosis[] = [];
    (geminiData.diagnoses || []).forEach((diag, idx) => {
      diagnoses.push({
        id: `diag-${docId}-${idx + 1}`,
        conditionName: diag.name,
        status: 'ACTIVE',
        date: geminiData.documentDate || detBaseline.detectedDate,
        evidence: {
          documentId: docId,
          documentName: fileName,
          pageNumber: diag.page || 1,
          snippet: diag.evidence || diag.name,
          confidenceScore: diag.confidence || 0.95,
          extractionMethod: effectiveMethod,
          requiresVerification: false
        }
      });
    });
    if (diagnoses.length === 0 && detBaseline.diagnoses.length > 0) {
      detBaseline.diagnoses.forEach(d => diagnoses.push(d));
    }

    // Compile Unreliable Fields
    const unreliableFields: string[] = [...(detBaseline.unreliableFields || [])];
    if (classificationConflict) {
      unreliableFields.push(
        `Classification conflict: Deterministic classified as ${detBaseline.classification} vs Gemini as ${geminiData.documentType}. Clinician verification required.`
      );
    }
    if (medications.some(m => m.evidence.requiresVerification)) {
      unreliableFields.push('One or more medications contain unverified OCR tokens — physical review required.');
    }
    if (labResults.some(l => l.flag === 'INDETERMINATE' && !l.sourceReferenceRange.hasSourceRange)) {
      unreliableFields.push('One or more lab tests lack source reference ranges.');
    }

    const dedupedUnreliable = Array.from(new Set(unreliableFields));

    return {
      documentId: docId,
      fileName,
      fileType,
      uploadedAt: new Date().toISOString(),
      classification: finalClassification,
      classificationConfidence: Math.max(detBaseline.classificationConfidence, geminiData.confidence || 0.94),
      detectedDate: geminiData.documentDate || detBaseline.detectedDate,
      facilityName: geminiData.facilityName || detBaseline.facilityName,
      doctorName: geminiData.doctorName || detBaseline.doctorName,
      rawText: cleanedText,
      pagesCount: 1,
      medications,
      labResults,
      diagnoses,
      summaryNote: geminiData.summaryNote || detBaseline.summaryNote,
      unreliableFields: dedupedUnreliable,
      classificationConflict,
      textQuality: textQuality.isAcceptable ? 'VALID' : 'DEGRADED',
      geminiAnalyzed: true,
      originalFileUrl,
      evidenceValidated: true
    };
  } catch (err) {
    return {
      ...detBaseline,
      geminiAnalyzed: false,
      originalFileUrl,
      evidenceValidated: true,
      textQuality: textQuality.isAcceptable ? 'VALID' : 'DEGRADED'
    };
  }
}

/**
 * Builds chronological timeline events from extracted documents
 */
export function buildDocumentTimelineEvents(docs: ExtractedDocumentData[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  docs.forEach(doc => {
    const docDate = doc.detectedDate || doc.uploadedAt.split('T')[0];

    // Diagnoses events
    doc.diagnoses.forEach(diag => {
      events.push({
        id: `tl-diag-${diag.id}`,
        date: diag.date || docDate,
        title: `Diagnosis: ${diag.conditionName}`,
        category: 'DIAGNOSIS',
        description: `Documented in ${doc.fileName} (${doc.classification.replace('_', ' ')})`,
        provenance: 'AI_EXTRACTED_DOC',
        documentId: doc.documentId,
        documentName: doc.fileName
      });
    });

    // Abnormal & Key Lab results
    doc.labResults.forEach(lab => {
      events.push({
        id: `tl-lab-${lab.id}`,
        date: docDate,
        title: `${lab.testName}: ${lab.resultValue} ${lab.unit}`,
        category: 'LAB_RESULT',
        description: `Ref: ${lab.sourceReferenceRange.raw || 'Not provided'} • Status: ${lab.flag}`,
        provenance: 'AI_EXTRACTED_DOC',
        documentId: doc.documentId,
        documentName: doc.fileName,
        flag: lab.flag === 'HIGH' ? 'HIGH' : lab.flag === 'LOW' ? 'LOW' : 'NORMAL'
      });
    });

    // Medications
    doc.medications.forEach(med => {
      events.push({
        id: `tl-med-${med.id}`,
        date: docDate,
        title: `Prescribed: ${med.name} ${med.dosage !== 'Not found / Requires verification' ? med.dosage : ''}`,
        category: 'MEDICATION',
        description: `${med.frequency} ${med.duration !== 'Not found / Requires verification' ? '• ' + med.duration : ''}`,
        provenance: 'AI_EXTRACTED_DOC',
        documentId: doc.documentId,
        documentName: doc.fileName
      });
    });
  });

  // Sort descending by date
  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
