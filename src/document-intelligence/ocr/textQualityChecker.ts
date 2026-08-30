/**
 * Text Quality Validation Layer for Medical Documents
 * 
 * Determines whether raw text extracted from PDF or OCR is readable and authentic,
 * or corrupted/encoded binary stream data requiring OCR fallback.
 */

export interface TextQualityResult {
  isAcceptable: boolean;
  score: number; // 0.0 to 1.0
  reason?: string;
  validWordCount: number;
  symbolRatio: number;
  hasBinaryArtifacts: boolean;
}

const BINARY_PDF_MARKERS = [
  '%pdf-',
  '/flatedecode',
  '/filter',
  '/length',
  'endstream',
  'xref',
  'trailer',
  'startxref',
  '/type /catalog',
  '/fontdescriptor',
  '/encoding'
];

/**
 * Common English and medical words / prefixes / suffixes used for vocabulary validation
 */
const COMMON_READABLE_TOKENS = new Set([
  'patient', 'name', 'age', 'sex', 'gender', 'male', 'female', 'date', 'time',
  'dr', 'doctor', 'clinic', 'hospital', 'department', 'medicine', 'medical',
  'prescription', 'rx', 'diagnosis', 'assessment', 'impression', 'history',
  'tab', 'tablet', 'cap', 'capsule', 'syp', 'syrup', 'inj', 'injection',
  'mg', 'mcg', 'gm', 'g', 'ml', 'units', 'daily', 'twice', 'three', 'times',
  'once', 'od', 'bd', 'tid', 'qid', 'hs', 'sos', 'oral', 'days', 'duration',
  'lab', 'laboratory', 'report', 'test', 'result', 'unit', 'reference', 'range',
  'interval', 'normal', 'high', 'low', 'abnormal', 'observed', 'value', 'specimen',
  'blood', 'serum', 'plasma', 'glucose', 'fasting', 'hba1c', 'creatinine', 'urea',
  'hemoglobin', 'lipid', 'cholesterol', 'triglycerides', 'bilirubin', 'sgot', 'sgpt',
  'discharge', 'summary', 'admission', 'course', 'final', 'condition', 'advice',
  'follow', 'up', 'review', 'pulse', 'bp', 'temperature', 'sterile', 'investigation',
  'metformin', 'atorvastatin', 'amlodipine', 'telmisartan', 'pantoprazole', 'paracetamol',
  'ashwagandha', 'churna', 'rifaximin', 'probiotic', 'ors', 'vitamin', 'calcium'
]);

/**
 * Evaluates whether extracted text is clean and legible for clinical parsing
 */
export function evaluateTextQuality(text: string): TextQualityResult {
  if (!text || text.trim().length < 15) {
    return {
      isAcceptable: false,
      score: 0.0,
      reason: 'Empty or insufficient text length (<15 characters)',
      validWordCount: 0,
      symbolRatio: 1.0,
      hasBinaryArtifacts: false
    };
  }

  const cleanText = text.trim();
  const lowerText = cleanText.toLowerCase();

  // 1. Check for raw binary PDF stream markers
  let binaryMarkerCount = 0;
  for (const marker of BINARY_PDF_MARKERS) {
    if (lowerText.includes(marker)) {
      binaryMarkerCount++;
    }
  }

  if (binaryMarkerCount >= 2) {
    return {
      isAcceptable: false,
      score: 0.1,
      reason: 'Detected raw binary PDF stream markers (FlateDecode / PDF stream fragments)',
      validWordCount: 0,
      symbolRatio: 0.8,
      hasBinaryArtifacts: true
    };
  }

  // 2. Character Distribution Analysis
  let alphabeticCount = 0;
  let numericCount = 0;
  let whitespaceCount = 0;
  let symbolCount = 0;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const code = cleanText.charCodeAt(i);

    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
      alphabeticCount++;
    } else if (code >= 48 && code <= 57) {
      numericCount++;
    } else if (/\s/.test(char)) {
      whitespaceCount++;
    } else {
      symbolCount++;
    }
  }

  const nonWhitespaceCount = cleanText.length - whitespaceCount;
  if (nonWhitespaceCount === 0) {
    return {
      isAcceptable: false,
      score: 0.0,
      reason: 'Only whitespace found',
      validWordCount: 0,
      symbolRatio: 1.0,
      hasBinaryArtifacts: false
    };
  }

  const symbolRatio = symbolCount / nonWhitespaceCount;
  const alphaRatio = alphabeticCount / nonWhitespaceCount;

  // If symbol ratio > 35% or letters < 50%, text is heavily corrupted/encoded
  if (symbolRatio > 0.35 || alphaRatio < 0.45) {
    return {
      isAcceptable: false,
      score: Math.max(0.1, alphaRatio),
      reason: `Unusually high symbol-to-letter ratio (symbols: ${Math.round(symbolRatio * 100)}%, letters: ${Math.round(alphaRatio * 100)}%)`,
      validWordCount: 0,
      symbolRatio,
      hasBinaryArtifacts: false
    };
  }

  // 3. Word / Token Validity Analysis
  const tokens = cleanText
    .split(/[\s,;:|/\-\(\)\[\]]+/)
    .map(t => t.trim().toLowerCase())
    .filter(t => t.length > 0);

  let recognizedWords = 0;
  let plausibleWords = 0;
  let gibberishTokens = 0;

  for (const token of tokens) {
    // Strip trailing digits/units
    const cleanToken = token.replace(/[^a-z]/g, '');
    if (cleanToken.length < 2) continue;

    if (COMMON_READABLE_TOKENS.has(cleanToken)) {
      recognizedWords++;
      plausibleWords++;
    } else if (isPlausibleWord(cleanToken)) {
      plausibleWords++;
    } else {
      gibberishTokens++;
    }
  }

  const totalEvaluatedWords = plausibleWords + gibberishTokens;
  const validityRatio = totalEvaluatedWords > 0 ? plausibleWords / totalEvaluatedWords : 0;

  if (plausibleWords < 6 && recognizedWords < 3) {
    return {
      isAcceptable: false,
      score: 0.25,
      reason: `Insufficient readable words detected (plausible: ${plausibleWords}, recognized: ${recognizedWords})`,
      validWordCount: plausibleWords,
      symbolRatio,
      hasBinaryArtifacts: false
    };
  }

  if (validityRatio < 0.55 && totalEvaluatedWords > 10) {
    return {
      isAcceptable: false,
      score: Math.max(0.2, validityRatio),
      reason: `High proportion of unreadable gibberish tokens (${Math.round((1 - validityRatio) * 100)}% gibberish)`,
      validWordCount: plausibleWords,
      symbolRatio,
      hasBinaryArtifacts: false
    };
  }

  // Text is clean and acceptable
  const calculatedScore = Math.min(
    0.99,
    0.70 + (recognizedWords * 0.02) + (alphaRatio * 0.20) - (symbolRatio * 0.10)
  );

  return {
    isAcceptable: true,
    score: Math.max(0.75, calculatedScore),
    validWordCount: plausibleWords,
    symbolRatio,
    hasBinaryArtifacts: false
  };
}

/**
 * Checks if a word has plausible syllable and vowel structure (not random consonant clusters)
 */
function isPlausibleWord(word: string): boolean {
  if (word.length <= 1) return false;
  if (word.length > 30) return false;

  // Must contain at least one vowel or common vowel substitute (y)
  if (!/[aeiouy]/.test(word)) {
    // Exceptions for abbreviations: mg, bp, rx, dr, hr, ml
    if (['mg', 'bp', 'rx', 'dr', 'hr', 'ml', 'bd', 'od', 'hs', 'kg', 'dl'].includes(word)) {
      return true;
    }
    return false;
  }

  // Reject excessive consecutive identical characters (e.g. "aaaaa", "xxxx")
  if (/(.)\1{3,}/.test(word)) {
    return false;
  }

  // Reject long consonant clusters (> 4 consonants in a row)
  if (/[^aeiouy]{5,}/.test(word)) {
    return false;
  }

  return true;
}
