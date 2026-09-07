import { ExtractedMedication, ExtractedDiagnosis } from '../models/document';

const AYUSH_FORMULATION_TERMS = [
  'churna', 'guggulu', 'kwatha', 'arishta', 'asava', 'bhasma', 'taila',
  'rasa', 'vati', 'avaleha', 'kashayam', 'lehyam', 'siddha', 'unani'
];

const NON_MEDICATION_WORDS = new Set([
  'diagnosis', 'assessment', 'impression', 'history', 'patient', 'doctor', 'dr',
  'hospital', 'clinic', 'advice', 'instructions', 'follow', 'review', 'investigation',
  'department', 'signature', 'date', 'name', 'age', 'weight', 'reg', 'phone', 'table',
  'test', 'report', 'specimen', 'page', 'stream', 'obj', 'endobj', 'filter'
]);

export interface PrescriptionParseResult {
  diagnoses: ExtractedDiagnosis[];
  medications: ExtractedMedication[];
  doctorName?: string;
  unreliableFields: string[];
}

/**
 * Validates whether a candidate string is a clean, readable medication name
 */
export function isValidMedicationName(candidate: string): { isValid: boolean; cleanName: string; confidence: number } {
  if (!candidate || candidate.trim().length < 2) {
    return { isValid: false, cleanName: '', confidence: 0 };
  }

  const trimmed = candidate.trim().replace(/^[-–\*\.\d\s]+/, '').replace(/[-–,:\.\s]+$/, '');
  if (trimmed.length < 2 || trimmed.length > 50) {
    return { isValid: false, cleanName: '', confidence: 0 };
  }

  // Check for forbidden symbols found in corrupted OCR or binary byte streams
  if (/[=\)\(%\{\}\\_~^\|<>@\$\*]/.test(trimmed)) {
    return { isValid: false, cleanName: '', confidence: 0 };
  }

  // Calculate letter-to-length ratio
  let letterCount = 0;
  for (let i = 0; i < trimmed.length; i++) {
    const code = trimmed.charCodeAt(i);
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      letterCount++;
    }
  }

  const letterRatio = letterCount / trimmed.length;
  if (letterRatio < 0.70 || letterCount < 2) {
    return { isValid: false, cleanName: '', confidence: 0 };
  }

  // Check if candidate is a common non-medication label
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
  if (NON_MEDICATION_WORDS.has(firstWord) || NON_MEDICATION_WORDS.has(trimmed.toLowerCase())) {
    return { isValid: false, cleanName: '', confidence: 0 };
  }

  // Must contain at least one vowel/consonant pair
  if (!/[aeiouy]/i.test(trimmed)) {
    return { isValid: false, cleanName: '', confidence: 0 };
  }

  return {
    isValid: true,
    cleanName: trimmed,
    confidence: letterRatio >= 0.85 ? 0.95 : 0.75
  };
}

export function parsePrescriptionText(
  rawText: string,
  docId: string,
  docName: string,
  extractionMethod: 'PDF_TEXT' | 'OCR' | 'SAMPLE' = 'PDF_TEXT'
): PrescriptionParseResult {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const medications: ExtractedMedication[] = [];
  const diagnoses: ExtractedDiagnosis[] = [];
  const unreliableFields: string[] = [];
  let doctorName: string | undefined;

  // 1. Doctor Name
  const docLine = lines.find(l => /^dr\.?\s+[a-z]+/i.test(l));
  if (docLine) {
    const rawDoc = docLine.split(/[,-|]/)[0].trim();
    if (rawDoc.length > 3 && rawDoc.length < 50) {
      doctorName = rawDoc;
    }
  }

  // 2. Diagnoses Extraction
  for (const line of lines) {
    const diagMatch = line.match(/(?:diagnosis|assessment|impression|dx)[:\s\/\(]+([^,\n\)]+(?:,\s*[^,\n\)]+)*)/i);
    if (diagMatch && diagMatch[1]) {
      const rawDiagnoses = diagMatch[1].replace(/^[/\s:Assessment]+/, '').trim();
      const conds = rawDiagnoses.split(/,|&|and/).map(c => c.trim()).filter(c => c.length > 2);
      conds.forEach((cond, idx) => {
        const cleanCond = cond.replace(/[-–:]+$/, '').trim();
        if (cleanCond.length >= 3 && !/[=\)\(%\{\}\\_~^\|<>@\$\*]/.test(cleanCond)) {
          diagnoses.push({
            id: `diag-${docId}-${idx + 1}`,
            conditionName: cleanCond,
            status: 'ACTIVE',
            evidence: {
              documentId: docId,
              documentName: docName,
              pageNumber: 1,
              snippet: line,
              confidenceScore: 0.94,
              extractionMethod,
              requiresVerification: false
            }
          });
        }
      });
    }
  }

  // 3. Medication Extraction
  let inRxSection = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(?:rx|medications\s+prescribed|medicines|prescriptions)/i.test(line)) {
      inRxSection = true;
      continue;
    }
    if (/^(?:advice|instructions|investigations|tests|dr\.|follow|signature)/i.test(line) && inRxSection) {
      inRxSection = false;
    }

    // Check if line looks like a medication entry
    const hasMedTypePrefix = /^(?:\d+\.|\*|-)?\s*(?:tab|cap|syp|inj|sachet|ointment)\b/i.test(line);
    const hasDosageUnit = /\b(?:\d+(?:\.\d+)?\s*(?:mg|mcg|g|gm|ml|iu|units))\b/i.test(line);

    if (inRxSection || hasMedTypePrefix || hasDosageUnit) {
      // Clean leading numbering and type prefix
      let workStr = line.replace(/^(?:\d+\.|\*|-)\s*/, '');
      const typePrefixMatch = workStr.match(/^(?:tab\.?|cap\.?|syp\.?|inj\.?|sachet)\s+/i);
      if (typePrefixMatch) {
        workStr = workStr.slice(typePrefixMatch[0].length);
      }

      // Check for dosage: e.g. "500 mg", "20 mg", "250 mg", "3 g"
      const dosageMatch = workStr.match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|gm|ml|iu|units))\b/i);
      const dosage = dosageMatch ? dosageMatch[1].trim() : 'Not found / Requires verification';

      // Medication name is string before dosage or before first hyphen/dash
      let rawName = '';
      if (dosageMatch && dosageMatch.index !== undefined) {
        rawName = workStr.slice(0, dosageMatch.index).replace(/[-–,:]+$/, '').trim();
      } else {
        const dashIdx = workStr.search(/[-–]/);
        rawName = (dashIdx !== -1 ? workStr.slice(0, dashIdx) : workStr).trim();
      }

      // Validate the extracted candidate name
      const nameValidation = isValidMedicationName(rawName);

      // Frequency extraction
      let frequency = 'Not found / Requires verification';
      if (/twice\s+daily|bd\b/i.test(line)) frequency = 'Twice daily (BD)';
      else if (/once\s+daily|od\b|at\s+bedtime|hs\b/i.test(line)) frequency = 'Once daily (OD)';
      else if (/three\s+times\s+daily|tid\b/i.test(line)) frequency = 'Three times daily (TID)';
      else if (/four\s+times|qid\b/i.test(line)) frequency = 'Four times daily (QID)';
      else if (/as\s+needed|sos\b/i.test(line)) frequency = 'As needed (SOS)';

      // Duration extraction
      const durMatch = line.match(/(?:duration[:\s]*)?(\d+\s*(?:days|weeks|months))\b/i);
      const duration = durMatch ? durMatch[1].trim() : 'Not found / Requires verification';

      const isAyush = AYUSH_FORMULATION_TERMS.some(term => line.toLowerCase().includes(term));

      if (nameValidation.isValid) {
        const isPartiallyUncertain = dosage.includes('Not found') || frequency.includes('Not found');
        if (isPartiallyUncertain) {
          unreliableFields.push(`Incomplete dosage/frequency for ${nameValidation.cleanName}`);
        }

        medications.push({
          id: `med-${docId}-${medications.length + 1}`,
          name: nameValidation.cleanName,
          dosage,
          frequency,
          duration,
          isAyushMedicine: isAyush,
          evidence: {
            documentId: docId,
            documentName: docName,
            pageNumber: 1,
            snippet: line,
            confidenceScore: isPartiallyUncertain ? 0.72 : nameValidation.confidence,
            extractionMethod,
            requiresVerification: isPartiallyUncertain
          }
        });
      } else if (inRxSection && line.length > 4 && !NON_MEDICATION_WORDS.has(line.split(/\s+/)[0].toLowerCase())) {
        // Line was in Rx section but could not be reliably parsed into a clean drug name
        unreliableFields.push(`Unreadable medication entry on line: "${line.slice(0, 40)}..."`);
      }
    }
  }

  return {
    diagnoses,
    medications,
    doctorName,
    unreliableFields
  };
}
