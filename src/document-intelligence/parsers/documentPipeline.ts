import { ExtractedDocumentData, TimelineEvent, DocumentClassification, ExtractedMedication, ExtractedLabResult, ExtractedDiagnosis } from '../models/document';
import { classifyDocumentText } from './documentClassifier';
import { parsePrescriptionText } from './prescriptionParser';
import { parseLabReportText } from './labReportParser';
import { parseDischargeSummaryText } from './dischargeSummaryParser';
import { evaluateTextQuality } from '../ocr/textQualityChecker';
import { cleanOcrText } from '../ocr/ocrCleaner';

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
    // Other / Ambiguous / Degraded Scan
    unreliableFields.push('Degraded scan or unstandardized layout: manual clinician verification required');
    // Try safe parsing for any clean medication lines
    const rxCheck = parsePrescriptionText(cleanedText, docId, fileName, effectiveMethod);
    medications = rxCheck.medications;
    const labCheck = parseLabReportText(cleanedText, docId, fileName, effectiveMethod);
    labResults = labCheck.labResults;
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
    unreliableFields
  };
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
        description: `Documented in ${doc.fileName} (${doc.classification})`,
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
        description: `Ref: ${lab.sourceReferenceRange.raw} • Status: ${lab.flag}`,
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
        title: `Prescribed: ${med.name} ${med.dosage}`,
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
