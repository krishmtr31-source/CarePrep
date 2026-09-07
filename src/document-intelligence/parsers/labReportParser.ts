import { ExtractedLabResult } from '../models/document';

export interface LabReportParseResult {
  labResults: ExtractedLabResult[];
  facilityName?: string;
  reportDate?: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: string;
  doctorName?: string;
  unreliableFields: string[];
}

export const UNIT_PATTERN = '(?:%|mg\\/dL|g\\/dL|gm\\/dL|gm%|mg%|mmol\\/L|umol\\/L|µmol\\/L|pmol\\/L|nmol\\/L|U\\/L|U\\/mL|U\\/ml|IU\\/L|u\\/l|iu\\/l|uIU\\/mL|µIU\\/mL|mIU\\/L|IU\\/mL|mcg\\/L|g\\/L|mg\\/L|mEq\\/L|meq\\/l|cells\\/cu\\.mm|cells\\/cumm|cells\\/mcL|cells\\/uL|cells\\/[µ\u00b5\u03bc]L|\\/cu\\.mm|\\/cumm|\\/mcL|\\/uL|\\/[µ\u00b5\u03bc]L|cumm|cu\\.mm|mcL|uL|[µ\u00b5\u03bc]L|mill\\/cu\\.mm|mil\\/cumm|mill\\/cumm|million\\/cumm|Lakhs\\/cumm|lakh\\/cumm|Lakhs|x10\\^?\\d+\\/(?:uL|[µ\u00b5\u03bc]L|L)|ng\\/ml|ng\\/dL|ng\\/dl|pg\\/ml|pg\\/dL|pg\\/dl|ug\\/dl|mcg\\/dl|ug\\/L|mcg\\/L|fl|fL|pg|mm\\/hr|mm\\/1st\\s*hr|mm|sec|seconds|INR|ratio|index|\\/HPF|\\/hpf)';

/**
 * Extracts and cleans reference range into a standard numerical interval.
 * Returns { hasRange: boolean, raw: string, min?: number, max?: number }
 */
export function extractReferenceRangeDetails(str: string): {
  hasRange: boolean;
  raw: string;
  min?: number;
  max?: number;
} {
  if (!str) return { hasRange: false, raw: 'Not specified in report' };

  let clean = str
    .replace(/^[\(\[\{]\s*(?:ref(?:\.|erence)?(?:\s*range|\s*interval)?|normal(?:\s*range)?|bio(?:\.|logical)?\s*ref(?:\.|erence)?(?:\s*range|\s*interval)?)?[:\s]*/i, '')
    .replace(/[\)\]\}]$/, '')
    .replace(/^(?:ref(?:\.|erence)?(?:\s*range|\s*interval)?|normal(?:\s*range)?|bio(?:\.|logical)?\s*ref(?:\.|erence)?(?:\s*range|\s*interval)?)?[:\s]*/i, '')
    .trim();

  // Strip unit from end if present
  clean = clean.replace(new RegExp(`\\s*${UNIT_PATTERN}\\s*$`, 'i'), '').trim();

  // Pattern 1: Numerical interval with hyphen, dash, tilde or "to" (e.g. "70.0 - 100.0", "70 to 100", "0.7–1.3", "13.0 - 17.0")
  const intervalMatch = clean.match(/(?:(?:male|female|adults?|normal)[:\s]*)?([<>]?\s*\d{1,3}(?:[0-9,])*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(?:[-–—~]|to)\s*(\d{1,3}(?:[0-9,])*(?:\.\d+)?|\d+(?:\.\d+)?)/i);
  if (intervalMatch) {
    const minStr = intervalMatch[1].replace(/[^0-9.]/g, '').trim();
    const maxStr = intervalMatch[2].replace(/[^0-9.]/g, '').trim();
    const min = parseFloat(minStr);
    const max = parseFloat(maxStr);
    if (!isNaN(min) && !isNaN(max)) {
      return {
        hasRange: true,
        raw: `${minStr} - ${maxStr}`,
        min,
        max
      };
    }
  }

  // Pattern 2: Inequality Less Than (e.g. "< 200", "<= 140", "Up to 140", "Upto 140", "Desirable: < 200")
  const lessMatch = clean.match(/(?:<|<=|less\s+than|up\s*to|upto)\s*(\d{1,3}(?:[0-9,])*(?:\.\d+)?|\d+(?:\.\d+)?)/i);
  if (lessMatch) {
    const maxStr = lessMatch[1].replace(/[^0-9.]/g, '').trim();
    const max = parseFloat(maxStr);
    if (!isNaN(max)) {
      return {
        hasRange: true,
        raw: `< ${maxStr}`,
        max
      };
    }
  }

  // Pattern 3: Inequality Greater Than (e.g. "> 40", ">= 60", "Greater than 50")
  const greaterMatch = clean.match(/(?:>|>=|greater\s+than)\s*(\d{1,3}(?:[0-9,])*(?:\.\d+)?|\d+(?:\.\d+)?)/i);
  if (greaterMatch) {
    const minStr = greaterMatch[1].replace(/[^0-9.]/g, '').trim();
    const min = parseFloat(minStr);
    if (!isNaN(min)) {
      return {
        hasRange: true,
        raw: `> ${minStr}`,
        min
      };
    }
  }

  return { hasRange: false, raw: 'Not specified in report' };
}

/**
 * Cleans OCR artifacts, dot leaders, numbering prefixes, and normalizes medical test names.
 */
export function cleanTestName(name: string): string {
  let cleaned = name
    .replace(/^[-*#•·▪■\d.)\s]+/, '') // Strip leading numbering e.g. "1.", "01.", "1)"
    .replace(/^(?:test(?:\s*name)?|investigation|parameter|analyte)[:\s]+/i, '') // Strip label prefixes
    .replace(/\.{2,}/g, ' ') // Strip dot leaders e.g. "Hemoglobin ........"
    .replace(/[|:;]+$/g, '') // Strip trailing punctuation
    .replace(/^[|:;]+/g, '')
    .trim();

  // Normalize common medical acronyms and prefixes
  cleaned = cleaned
    .replace(/\bS\.\s*/i, 'Serum ')
    .replace(/\bB\.\s*Urea\b/i, 'Blood Urea')
    .replace(/\bR\.?B\.?C\.?\s*(?:count)?\b/i, 'RBC Count')
    .replace(/\bW\.?B\.?C\.?\s*(?:count)?\b/i, 'WBC Count')
    .replace(/\bT\.?L\.?C\.?\b/i, 'Total Leucocyte Count (TLC)')
    .replace(/\bHaemoglobin\b/i, 'Hemoglobin')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
}

export function parseLabReportText(
  rawText: string,
  docId: string,
  docName: string,
  extractionMethod: 'PDF_TEXT' | 'OCR' | 'SAMPLE' = 'PDF_TEXT'
): LabReportParseResult {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const labResults: ExtractedLabResult[] = [];
  const unreliableFields: string[] = [];
  let facilityName: string | undefined;
  let reportDate: string | undefined;
  let patientName: string | undefined;
  let patientAge: number | undefined;
  let patientGender: string | undefined;
  let doctorName: string | undefined;

  // 1. Header & Metadata Detection (Patient, Doctor, Facility, Date)
  for (const line of lines.slice(0, 15)) {
    // Facility detection
    if (/(?:pathology|diagnostic|laboratory|labs|biochemistry|hospital|clinic)/i.test(line) && !facilityName) {
      if (!/patient|doctor|physician|dr\.|mr\.|mrs\.|ms\.|age|gender|date/i.test(line)) {
        facilityName = line.replace(/^[-\s:=|*#]+|[-\s:=|*#]+$/g, '').trim();
      }
    }
    // Date detection
    const dateMatch = line.match(/(?:report\s+date|date|collection\s+date|sample\s+date)[:\s]+(\d{1,2}[-/][A-Za-z0-9]{3,}[-/]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (dateMatch && !reportDate) {
      reportDate = dateMatch[1].trim();
    }
    // Patient name detection (strictly excludes investigation/table headers)
    if (!/investigation|test|result|reference|status|range/i.test(line)) {
      const patientMatch = line.match(/(?:patient(?:\s+name)?|pt(?:\s+name)?|^\s*name)[:\s]+([A-Za-z\s.]{2,40})/i);
      if (patientMatch && !patientName) {
        const candidate = patientMatch[1].replace(/^(?:mr|mrs|ms|dr)\.?\s+/i, '').trim();
        if (
          candidate.length >= 2 && 
          !/^(name|patient|unknown|record|details|report|lab|test|investigation|result|unit|reference)$/i.test(candidate) &&
          !/result|unit|reference|range|status/i.test(candidate)
        ) {
          patientName = patientMatch[1].trim();
        }
      }
    }
    // Age & Gender detection
    const ageMatch = line.match(/(?:age(?:\s*\/\s*gender)?|age)[:\s]+(\d{1,3})\s*(?:y|yrs|years)?/i);
    if (ageMatch && !patientAge) {
      patientAge = parseInt(ageMatch[1], 10);
    }
    const genderMatch = line.match(/(?:gender|sex)[:\s]+(male|female|other|m|f)\b/i);
    if (genderMatch && !patientGender) {
      const g = genderMatch[1].toUpperCase();
      patientGender = g === 'M' ? 'Male' : g === 'F' ? 'Female' : genderMatch[1];
    }
    // Doctor detection
    const doctorMatch = line.match(/(?:referred\s+by|ref\s+by|consulting\s+doctor|physician|dr\.)[:\s]+([A-Za-z\s.]{2,40})/i);
    if (doctorMatch && !doctorName) {
      doctorName = doctorMatch[1].replace(/^[-\s:=]+|[-\s:=]+$/g, '').trim();
    }
  }

  // 2. Table Row Parsing
  const seenTests = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip table header rows, divider rules, and metadata / footer notes
    if (
      /^(?:investigation|test\s+name|department|patient|interpretation|verified|doctor|nabl|specimen|certificate|ref\s+by|age|gender|sample|barcode|signature|page\s+\d+|method|clinical\s+significance)/i.test(line) ||
      line.startsWith('---') ||
      line.startsWith('===') ||
      line.startsWith('***') ||
      line.startsWith('___')
    ) {
      continue;
    }

    // Normalization: convert pipes and tabs to multi-space
    const normalizedLine = line.replace(/[|\t]/g, '    ');

    // Strategy 1: Multi-column parsing with dynamic role classification
    const rawCols = normalizedLine.split(/\s{2,}/).map(c => c.trim()).filter(Boolean);

    if (rawCols.length >= 2) {
      let testName = '';
      let valStr = '';
      let unit = '';
      let refRangeStr = '';
      let explicitFlag = '';
      const unclassified: string[] = [];

      for (let cIdx = 0; cIdx < rawCols.length; cIdx++) {
        const col = rawCols[cIdx];
        const rangeCheck = extractReferenceRangeDetails(col);

        if (rangeCheck.hasRange) {
          refRangeStr = col;
          continue;
        }

        if (/^(?:HIGH|LOW|NORMAL|ABNORMAL|BORDERLINE|CRITICAL|DESIRABLE|OPTIMAL|H|L|\*|▲|▼)$/i.test(col)) {
          explicitFlag = col.toUpperCase();
          continue;
        }

        if (new RegExp(`^${UNIT_PATTERN}$`, 'i').test(col)) {
          unit = col;
          continue;
        }

        // Check if value + unit together e.g. "220 mg/dL"
        const valUnitMatch = col.match(new RegExp(`^([<>]?\\s*\\d{1,3}(?:[0-9,])*(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})$`, 'i'));
        if (valUnitMatch) {
          valStr = valUnitMatch[1].trim();
          if (!unit) unit = valUnitMatch[2].trim();
          continue;
        }

        // Numeric value e.g. "145.0" or "2,40,000"
        if (/^[<>]?\\s*\\d{1,3}(?:[0-9,])*(?:\\.\\d+)?$/.test(col) && !valStr) {
          valStr = col;
          continue;
        }

        unclassified.push(col);
      }

      if (unclassified.length > 0) {
        testName = unclassified[0];
        if (!valStr && unclassified.length > 1) {
          valStr = unclassified[1];
        }
      }

      if (testName && valStr) {
        const parsedLab = evaluateAndBuildLabResult(
          testName,
          valStr,
          unit,
          refRangeStr,
          explicitFlag,
          line,
          docId,
          docName,
          extractionMethod,
          labResults.length + 1
        );

        if (parsedLab && !seenTests.has(parsedLab.testName.toLowerCase())) {
          seenTests.add(parsedLab.testName.toLowerCase());
          labResults.push(parsedLab);
          continue;
        }
      }
    }

    // Strategy 2: Flexible pattern matching for single-spaced rows, colons, or dot leaders
    const linePattern = new RegExp(
      `^([A-Za-z0-9\\s\\(\\)\\/,–+.-]+?)(?:\\s*[:=\\-]\\s*|\\s{2,}|\\.{2,}\\s*|\\s+)([<>]?\\s*\\d{1,3}(?:[0-9,])*(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})?(?:\\s+|\\b)(?:([\\(\\[]?.*?[\\)\\]]?))?$`,
      'i'
    );

    const m = line.match(linePattern);
    if (m) {
      const rawName = m[1];
      const rawVal = m[2];
      const rawUnit = m[3] || '';
      const remainder = m[4] || '';

      const parsedLab = evaluateAndBuildLabResult(
        rawName,
        rawVal,
        rawUnit,
        remainder,
        '',
        line,
        docId,
        docName,
        extractionMethod,
        labResults.length + 1
      );

      if (parsedLab && !seenTests.has(parsedLab.testName.toLowerCase())) {
        seenTests.add(parsedLab.testName.toLowerCase());
        labResults.push(parsedLab);
      }
    }
  }

  return {
    labResults,
    facilityName,
    reportDate,
    patientName,
    patientAge,
    patientGender,
    doctorName,
    unreliableFields
  };
}

function evaluateAndBuildLabResult(
  testNameCandidate: string,
  rawValCandidate: string,
  unitCandidate: string,
  rawRefRangeCandidate: string,
  explicitFlag: string,
  lineSnippet: string,
  docId: string,
  docName: string,
  extractionMethod: 'PDF_TEXT' | 'OCR' | 'SAMPLE',
  index: number
): ExtractedLabResult | null {
  const cleanName = cleanTestName(testNameCandidate);

  // Validate test name length and quality
  if (cleanName.length < 2 || cleanName.length > 70) {
    return null;
  }

  // Reject non-test header/footer labels
  if (/^(?:date|doctor|verified\s+by|signature|page|note|ref\s+by|sample|barcode|interpretation|method|result|investigation|unit|reference)/i.test(cleanName)) {
    return null;
  }

  // Parse numeric value (handles commas like 7,200 or 2,40,000 -> 240000)
  const numericVal = parseFloat(rawValCandidate.replace(/,/g, '').replace(/[^0-9.]/g, ''));
  if (isNaN(numericVal)) return null;

  // Extract reference range details
  const refDetails = extractReferenceRangeDetails(rawRefRangeCandidate);
  const minVal = refDetails.min;
  const maxVal = refDetails.max;
  const hasSourceRange = refDetails.hasRange;
  const cleanRefStr = refDetails.raw;

  // Abnormality determination strictly based on document-provided source reference range
  let flag: 'HIGH' | 'LOW' | 'NORMAL' | 'INDETERMINATE' = 'NORMAL';
  let isAbnormal = false;
  let status = 'normal';

  if (hasSourceRange) {
    if (maxVal !== undefined && numericVal > maxVal) {
      flag = 'HIGH';
      isAbnormal = true;
      status = 'high';
    } else if (minVal !== undefined && numericVal < minVal) {
      flag = 'LOW';
      isAbnormal = true;
      status = 'low';
    } else {
      flag = 'NORMAL';
      isAbnormal = false;
      status = 'normal';
    }
  } else if (explicitFlag) {
    if (/HIGH|ABNORMAL|ELEVATED|\*|▲/i.test(explicitFlag)) {
      flag = 'HIGH';
      isAbnormal = true;
      status = 'high';
    } else if (/LOW|DECREASED|▼/i.test(explicitFlag)) {
      flag = 'LOW';
      isAbnormal = true;
      status = 'low';
    } else if (/BORDERLINE/i.test(explicitFlag)) {
      flag = 'HIGH';
      isAbnormal = true;
      status = 'borderline';
    } else {
      flag = 'NORMAL';
      isAbnormal = false;
      status = 'normal';
    }
  } else {
    flag = 'INDETERMINATE';
    isAbnormal = false;
    status = 'unknown';
  }

  return {
    id: `lab-${docId}-${index}`,
    testName: cleanName,
    resultValue: rawValCandidate,
    numericValue: numericVal,
    value: numericVal,
    unit: unitCandidate,
    sourceReferenceRange: {
      raw: cleanRefStr,
      min: minVal,
      max: maxVal,
      hasSourceRange
    },
    referenceRange: cleanRefStr,
    flag,
    status,
    isAbnormal,
    source: 'uploaded_lab_report',
    evidence: {
      documentId: docId,
      documentName: docName,
      pageNumber: 1,
      snippet: lineSnippet,
      confidenceScore: hasSourceRange ? 0.98 : 0.85,
      extractionMethod,
      requiresVerification: flag === 'INDETERMINATE'
    }
  };
}
