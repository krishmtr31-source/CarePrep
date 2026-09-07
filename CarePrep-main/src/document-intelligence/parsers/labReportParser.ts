import { ExtractedLabResult } from '../models/document';

export interface LabReportParseResult {
  labResults: ExtractedLabResult[];
  facilityName?: string;
  reportDate?: string;
  unreliableFields: string[];
}

const COMMON_LAB_UNITS = [
  'mg/dl', 'g/dl', '%', 'mmol/l', 'u/l', 'iu/l', 'cells/cu.mm', 'cells/cumm',
  'x10^3/ul', 'x10^6/ul', 'ng/ml', 'pg/ml', 'ug/dl', 'mcg/dl', 'fl', 'pg',
  'meq/l', 'sec', 'seconds', 'ratio', 'index'
];

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

  // 1. Header & Facility Detection
  for (const line of lines.slice(0, 10)) {
    if (/(?:pathology|diagnostic|laboratory|labs|biochemistry|hospital)/i.test(line) && !facilityName) {
      facilityName = line.replace(/^[-\s:=]+|[-\s:=]+$/g, '').trim();
    }
    const dateMatch = line.match(/(?:report\s+date|date|collection\s+date)[:\s]+(\d{1,2}[-/][A-Za-z0-9]{3,}[-/]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}|\d{4}-\d{2}-\d{2})/i);
    if (dateMatch && !reportDate) {
      reportDate = dateMatch[1].trim();
    }
  }

  // 2. Table Row Parsing
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip table header rows, divider rules, and footer notes
    if (
      /^(?:investigation|test\s+name|department|patient|interpretation|verified|doctor|nabl|specimen|certificate|ref\s+by|age|gender|sample|barcode)/i.test(line) ||
      line.startsWith('---') ||
      line.startsWith('===') ||
      line.startsWith('***')
    ) {
      continue;
    }

    // Attempt 1: Multi-column split by 2+ spaces
    const cols = line.split(/\s{2,}/).map(c => c.trim()).filter(Boolean);

    if (cols.length >= 3) {
      const testNameCandidate = cols[0];
      const rawValCandidate = cols[1];
      const unitCandidate = cols[2];
      const rawRefRangeCandidate = cols[3] || '';
      const explicitFlag = (cols[4] || (cols[3] && /^(HIGH|LOW|NORMAL|ABNORMAL)$/i.test(cols[3]) ? cols[3] : '')).toUpperCase();

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

      if (parsedLab) {
        labResults.push(parsedLab);
        continue;
      }
    }

    // Attempt 2: Regex pattern for space-normalized lines (e.g. OCR single spaces)
    // "HbA1c 8.4 % 4.0 - 5.6 HIGH" or "Fasting Glucose 162 mg/dL 70 - 100"
    const lineRegex = /^([A-Za-z0-9\s\(\)/,–-]+?)\s+(\d+(?:\.\d+)?)\s*(%|mg\/dL|g\/dL|mmol\/L|U\/L|IU\/L|uIU\/mL|uIU\/ml|mIU\/L|IU\/mL|IU\/ml|pmol\/L|nmol\/L|umol\/L|mcg\/L|g\/L|mg\/L|mEq\/L|meq\/l|cells\/cu\.mm|cells\/mcL|cells\/uL|x10\^?\d+\/uL|ng\/ml|pg\/ml|ug\/dl|fl|pg)\b(?:\s+([<>]?\s*\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?))?(?:\s+(HIGH|LOW|NORMAL|ABNORMAL))?/i;
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

      if (parsedLab) {
        labResults.push(parsedLab);
      }
    }
  }

  return {
    labResults,
    facilityName,
    reportDate,
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
  const cleanName = testNameCandidate.replace(/^[-\*\d\.\s]+/, '').replace(/[-–:,\s]+$/, '').trim();
  if (cleanName.length < 2 || cleanName.length > 70 || /[=\{\}\\_~^\|<>@\$\*]/.test(cleanName)) {
    return null;
  }

  // Reject non-test header/footer labels
  if (/^(?:date|doctor|verified\s+by|signature|page|note|ref\s+by|sample\s+collection|barcode|interpretation)/i.test(cleanName)) {
    return null;
  }

  const numericVal = parseFloat(rawValCandidate.replace(/[^0-9.]/g, ''));
  if (isNaN(numericVal)) return null;

  // Parse reference range
  let minVal: number | undefined;
  let maxVal: number | undefined;
  let hasSourceRange = false;
  let cleanRefStr = rawRefRangeCandidate;

  if (rawRefRangeCandidate && !/^(HIGH|LOW|NORMAL|ABNORMAL)$/i.test(rawRefRangeCandidate)) {
    const rangeMatch = rawRefRangeCandidate.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      minVal = parseFloat(rangeMatch[1]);
      maxVal = parseFloat(rangeMatch[2]);
      hasSourceRange = true;
    } else if (rawRefRangeCandidate.startsWith('<')) {
      maxVal = parseFloat(rawRefRangeCandidate.replace(/[^0-9.]/g, ''));
      hasSourceRange = true;
    } else if (rawRefRangeCandidate.startsWith('>')) {
      minVal = parseFloat(rawRefRangeCandidate.replace(/[^0-9.]/g, ''));
      hasSourceRange = true;
    }
  }

  // Abnormality determination strictly based on document-provided source reference range
  let flag: 'HIGH' | 'LOW' | 'NORMAL' | 'INDETERMINATE' = 'NORMAL';
  let isAbnormal = false;

  if (hasSourceRange) {
    if (maxVal !== undefined && numericVal > maxVal) {
      flag = 'HIGH';
      isAbnormal = true;
    } else if (minVal !== undefined && numericVal < minVal) {
      flag = 'LOW';
      isAbnormal = true;
    } else {
      flag = 'NORMAL';
      isAbnormal = false;
    }
  } else if (explicitFlag) {
    if (explicitFlag === 'HIGH' || explicitFlag === 'ABNORMAL') {
      flag = 'HIGH';
      isAbnormal = true;
    } else if (explicitFlag === 'LOW') {
      flag = 'LOW';
      isAbnormal = true;
    } else {
      flag = 'NORMAL';
      isAbnormal = false;
    }
  } else {
    // If no reference range in document, mark INDETERMINATE (do not invent reference ranges)
    flag = 'INDETERMINATE';
    isAbnormal = false;
    cleanRefStr = 'Not specified in report';
  }

  return {
    id: `lab-${docId}-${index}`,
    testName: cleanName,
    resultValue: rawValCandidate,
    numericValue: numericVal,
    unit: unitCandidate,
    sourceReferenceRange: {
      raw: hasSourceRange ? rawRefRangeCandidate : cleanRefStr,
      min: minVal,
      max: maxVal,
      hasSourceRange
    },
    flag,
    isAbnormal,
    evidence: {
      documentId: docId,
      documentName: docName,
      pageNumber: 1,
      snippet: lineSnippet,
      confidenceScore: hasSourceRange ? 0.96 : 0.80,
      extractionMethod,
      requiresVerification: flag === 'INDETERMINATE'
    }
  };
}
