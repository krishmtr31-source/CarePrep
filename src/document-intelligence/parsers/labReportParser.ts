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

const UNIT_PATTERN = '(?:%|mg\\/dL|g\\/dL|mmol\\/L|U\\/L|IU\\/L|uIU\\/mL|uIU\\/ml|mIU\\/L|IU\\/mL|pmol\\/L|nmol\\/L|umol\\/L|mcg\\/L|g\\/L|mg\\/L|mEq\\/L|meq\\/l|cells\\/cu\\.mm|cells\\/cumm|cells\\/mcL|cells\\/uL|cells\\/[µ\u00b5\u03bc]L|[µ\u00b5\u03bc]L|uL|mcL|x10\\^?\\d+\\/uL|x10\\^?\\d+\\/[µ\u00b5\u03bc]L|ng\\/ml|pg\\/ml|ug\\/dl|mcg\\/dl|fl|fL|pg|ratio|index)';

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

    // Attempt 1: Multi-column split by 2+ spaces
    const cols = normalizedLine.split(/\s{2,}/).map(c => c.trim()).filter(Boolean);

    if (cols.length >= 3) {
      const testNameCandidate = cols[0];
      const rawValCandidate = cols[1];
      const unitCandidate = cols[2];
      const rawRefRangeCandidate = cols[3] || '';
      const explicitFlag = (cols[4] || (cols[3] && /^(HIGH|LOW|NORMAL|ABNORMAL|BORDERLINE)$/i.test(cols[3]) ? cols[3] : '')).toUpperCase();

      const parsedLab = evaluateAndBuildLabResult(
        testNameCandidate,
        rawValCandidate,
        unitCandidate,
        rawRefRangeCandidate,
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

    // Attempt 2: Flexible Regex for colon-formatted or single-spaced rows
    const lineRegex = new RegExp(
      `^([A-Za-z0-9\\s\\(\\)\\/,–-]+?)(?:\\s*[:\\-]\\s*|\\s{2,}|\\s+)(\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?|\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})\\b(?:\\s*\\(?([<>]?\\s*\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?(?:\\s*[-–—]\\s*\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?)?(?:\\s*${UNIT_PATTERN})?)\\)?)?(?:\\s+(HIGH|LOW|NORMAL|ABNORMAL|BORDERLINE|CRITICAL|DESIRABLE|OPTIMAL))?`,
      'i'
    );

    const match = line.match(lineRegex);
    if (match) {
      const testName = match[1].trim();
      const rawVal = match[2].trim();
      const unit = match[3].trim();
      const rawRef = match[4] ? match[4].trim() : '';
      const explicitFlag = match[5] ? match[5].toUpperCase() : '';

      const parsedLab = evaluateAndBuildLabResult(
        testName,
        rawVal,
        unit,
        rawRef,
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
  // Validate test name (allow letters, numbers, spaces, hyphens, slashes, parentheses)
  const cleanName = testNameCandidate
    .replace(/^[-\*\d\.\s#]+/, '')
    .replace(/[-–:,\s|]+$/, '')
    .trim();

  if (cleanName.length < 2 || cleanName.length > 70 || /[=\{\}\\_~^\|<>@\$\*]/.test(cleanName)) {
    return null;
  }

  // Reject non-test header/footer labels
  if (/^(?:date|doctor|verified\s+by|signature|page|note|ref\s+by|sample|barcode|interpretation|method|result|investigation|unit|reference)/i.test(cleanName)) {
    return null;
  }

  // Parse numeric value (handles commas like 7,200 -> 7200)
  const numericVal = parseFloat(rawValCandidate.replace(/,/g, '').replace(/[^0-9.]/g, ''));
  if (isNaN(numericVal)) return null;

  // Parse reference range
  let minVal: number | undefined;
  let maxVal: number | undefined;
  let hasSourceRange = false;
  let cleanRefStr = rawRefRangeCandidate.trim();

  if (cleanRefStr && !/^(HIGH|LOW|NORMAL|ABNORMAL|BORDERLINE)$/i.test(cleanRefStr)) {
    // Range: 13.0–17.0 or 4,500–11,000
    const rangeMatch = cleanRefStr.match(/(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*[-–—]\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      minVal = parseFloat(rangeMatch[1].replace(/,/g, ''));
      maxVal = parseFloat(rangeMatch[2].replace(/,/g, ''));
      hasSourceRange = true;
    } else {
      // Less than: < 200 or < 5.7
      const lessMatch = cleanRefStr.match(/(?:<|<=|less\s+than)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/i);
      if (lessMatch) {
        maxVal = parseFloat(lessMatch[1].replace(/,/g, ''));
        hasSourceRange = true;
      } else {
        // Greater than: > 40
        const greaterMatch = cleanRefStr.match(/(?:>|>=|greater\s+than)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)/i);
        if (greaterMatch) {
          minVal = parseFloat(greaterMatch[1].replace(/,/g, ''));
          hasSourceRange = true;
        }
      }
    }
  }

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
    if (/HIGH|ABNORMAL|ELEVATED/i.test(explicitFlag)) {
      flag = 'HIGH';
      isAbnormal = true;
      status = 'high';
    } else if (/LOW|DECREASED/i.test(explicitFlag)) {
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
    // If no reference range in document, mark INDETERMINATE (do not invent reference ranges)
    flag = 'INDETERMINATE';
    isAbnormal = false;
    status = 'unknown';
    cleanRefStr = 'Not specified in report';
  }

  return {
    id: `lab-${docId}-${index}`,
    testName: cleanName,
    resultValue: rawValCandidate,
    numericValue: numericVal,
    value: numericVal,
    unit: unitCandidate,
    sourceReferenceRange: {
      raw: hasSourceRange ? cleanRefStr : (cleanRefStr || 'Not specified in report'),
      min: minVal,
      max: maxVal,
      hasSourceRange
    },
    referenceRange: hasSourceRange ? cleanRefStr : (cleanRefStr || 'Not specified in report'),
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
