import { ExtractedDiagnosis, ExtractedMedication } from '../models/document';
import { isValidMedicationName } from './prescriptionParser';

export interface DischargeSummaryParseResult {
  diagnoses: ExtractedDiagnosis[];
  medications: ExtractedMedication[];
  admissionDate?: string;
  dischargeDate?: string;
  facilityName?: string;
  summaryNote?: string;
  unreliableFields: string[];
}

export function parseDischargeSummaryText(
  rawText: string,
  docId: string,
  docName: string,
  extractionMethod: 'PDF_TEXT' | 'OCR' | 'SAMPLE' = 'PDF_TEXT'
): DischargeSummaryParseResult {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const diagnoses: ExtractedDiagnosis[] = [];
  const medications: ExtractedMedication[] = [];
  const unreliableFields: string[] = [];

  let admissionDate: string | undefined;
  let dischargeDate: string | undefined;
  let facilityName: string | undefined;
  let summaryNote: string | undefined;

  // 1. Header, Facility, and Admission/Discharge Dates
  for (const line of lines) {
    if (/(?:hospital|institute|medical\s+centre|clinic)/i.test(line) && !facilityName && !line.includes(':')) {
      facilityName = line.replace(/^[-\s:=]+|[-\s:=]+$/g, '').trim();
    }

    // Match Admission Date: e.g. "Date of Admission: 15-Jan-2026", "Admission Date: 14 January 2026", "DOA: 15/01/2026"
    const admMatch = line.match(/(?:date\s+of\s+admission|admission\s+date|admission|doa)[:\s]+(\d{1,2}[-/][A-Za-z0-9]{3,}[-/]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
    if (admMatch && !admissionDate) {
      admissionDate = admMatch[1].trim();
    }

    // Match Discharge Date: e.g. "Date of Discharge: 18-Jan-2026", "Discharge Date: 18 January 2026", "DOD: 18/01/2026"
    const disMatch = line.match(/(?:date\s+of\s+discharge|discharge\s+date|discharge|dod)[:\s]+(\d{1,2}[-/][A-Za-z0-9]{3,}[-/]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
    if (disMatch && !dischargeDate) {
      dischargeDate = disMatch[1].trim();
    }
  }

  // 2. Final Diagnosis section
  let inDiagSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(?:final\s+diagnosis|diagnosis|diagnoses)/i.test(line)) {
      inDiagSection = true;
      const inlineDiag = line.replace(/^(?:final\s+diagnosis|diagnosis|diagnoses)[:\s]*/i, '').trim();
      if (inlineDiag.length > 2 && !/[=\{\}\\_~^\|<>@\$\*]/.test(inlineDiag)) {
        diagnoses.push({
          id: `diag-${docId}-1`,
          conditionName: inlineDiag,
          status: 'ACTIVE',
          date: dischargeDate || admissionDate,
          evidence: {
            documentId: docId,
            documentName: docName,
            pageNumber: 1,
            snippet: line,
            confidenceScore: 0.95,
            extractionMethod,
            requiresVerification: false
          }
        });
      }
      continue;
    }

    if (/^(?:hospital\s+course|clinical\s+summary|treatment|investigations|discharge\s+medications|advice)/i.test(line)) {
      inDiagSection = false;
    }

    if (inDiagSection && line.length > 3 && !diagnoses.some(d => d.conditionName === line)) {
      const cleanDiag = line.replace(/^[-–\*\d\.\s]+/, '').replace(/[-–:,\s]+$/, '').trim();
      if (cleanDiag.length > 2 && !/[=\{\}\\_~^\|<>@\$\*]/.test(cleanDiag)) {
        diagnoses.push({
          id: `diag-${docId}-${diagnoses.length + 1}`,
          conditionName: cleanDiag,
          status: 'ACTIVE',
          date: dischargeDate || admissionDate,
          evidence: {
            documentId: docId,
            documentName: docName,
            pageNumber: 1,
            snippet: line,
            confidenceScore: 0.90,
            extractionMethod,
            requiresVerification: false
          }
        });
      }
    }
  }

  // 3. Hospital Course Summary
  const courseIdx = lines.findIndex(l => /^(?:hospital\s+course|clinical\s+summary|brief\s+history)/i.test(l));
  if (courseIdx !== -1) {
    const inlineCourse = lines[courseIdx].replace(/^(?:hospital\s+course|clinical\s+summary|brief\s+history)[:\s]*/i, '').trim();
    if (inlineCourse.length > 10) {
      summaryNote = inlineCourse;
    } else if (lines[courseIdx + 1] && lines[courseIdx + 1].length > 10) {
      summaryNote = lines[courseIdx + 1];
    }
  }

  // 4. Discharge Medications
  let inMedSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(?:discharge\s+medications|medications\s+on\s+discharge|rx\s+on\s+discharge|medications)/i.test(line)) {
      inMedSection = true;
      continue;
    }

    if (/^(?:follow-?up|follow\s+up|advice|emergency|doctor|signed|treating\s+consultant)/i.test(line) && inMedSection) {
      inMedSection = false;
    }

    if (inMedSection && line.length > 3) {
      // Clean leading index e.g. "1. Tab. Rifaximin 400 mg - Oral - Three times daily (TID) - Duration: 3 days"
      let workStr = line.replace(/^(?:\d+\.|\*|-)\s*/, '');
      const typeMatch = workStr.match(/^(?:tab\.?|cap\.?|syp\.?|inj\.?|sachet)\s+/i);
      if (typeMatch) workStr = workStr.slice(typeMatch[0].length);

      const dosageMatch = workStr.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|gm|ml|iu|units))\b/i);
      const dosage = dosageMatch ? dosageMatch[1].trim() : 'Not found / Requires verification';

      let rawName = '';
      if (dosageMatch && dosageMatch.index !== undefined) {
        rawName = workStr.slice(0, dosageMatch.index).replace(/[-–,:]+$/, '').trim();
      } else {
        const dashIdx = workStr.search(/[-–]/);
        rawName = (dashIdx !== -1 ? workStr.slice(0, dashIdx) : workStr).trim();
      }

      const nameVal = isValidMedicationName(rawName);

      // Frequency
      let frequency = 'Not found / Requires verification';
      if (/three\s+times|tid\b/i.test(line)) frequency = 'Three times daily (TID)';
      else if (/twice\s+daily|bd\b/i.test(line)) frequency = 'Twice daily (BD)';
      else if (/once\s+daily|od\b/i.test(line)) frequency = 'Once daily (OD)';
      else if (/as\s+needed|sos\b|ors/i.test(line)) frequency = 'As needed (SOS)';

      // Duration
      const durMatch = line.match(/(?:duration[:\s]*)?(\d+\s*(?:days|weeks|months))\b/i);
      const duration = durMatch ? durMatch[1].trim() : 'Not found / Requires verification';

      if (nameVal.isValid) {
        medications.push({
          id: `med-${docId}-${medications.length + 1}`,
          name: nameVal.cleanName,
          dosage,
          frequency,
          duration,
          evidence: {
            documentId: docId,
            documentName: docName,
            pageNumber: 1,
            snippet: line,
            confidenceScore: 0.92,
            extractionMethod,
            requiresVerification: dosage.includes('Not found')
          }
        });
      }
    }
  }

  return {
    diagnoses,
    medications,
    admissionDate,
    dischargeDate,
    facilityName,
    summaryNote,
    unreliableFields
  };
}
