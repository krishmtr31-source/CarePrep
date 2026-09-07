/**
 * OCR Text Normalizer & Cleaning Engine
 * 
 * Safely normalizes whitespace, line breaks, and obvious OCR artifact characters
 * while strictly preserving medical terminology, exact numerical values, decimals, and units.
 */

export interface OcrCleaningReport {
  cleanedText: string;
  correctionsCount: number;
  corrections: string[];
}

export function cleanOcrText(rawText: string): string {
  const { cleanedText } = cleanAndReportOcrText(rawText);
  return cleanedText;
}

export function cleanAndReportOcrText(rawText: string): OcrCleaningReport {
  if (!rawText) {
    return { cleanedText: '', correctionsCount: 0, corrections: [] };
  }

  const corrections: string[] = [];

  let text = rawText
    // Normalize Windows/Mac line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove non-printable control characters except newline and tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 1. Correct "m9" vs "mg" in dosage contexts (e.g. "500 m9" -> "500 mg")
  const m9Matches = text.match(/\b(\d+(?:\.\d+)?)\s*m9\b/gi);
  if (m9Matches) {
    corrections.push(`Corrected ${m9Matches.length} instance(s) of "m9" to "mg"`);
    text = text.replace(/\b(\d+(?:\.\d+)?)\s*m9\b/gi, '$1 mg');
  }

  // 2. Correct "O" vs "0" in numeric contexts (e.g. "O.5" -> "0.5", "1O0" -> "100")
  const oDecimalMatches = text.match(/\bO\.(\d+)\b/g);
  if (oDecimalMatches) {
    corrections.push(`Corrected ${oDecimalMatches.length} instance(s) of letter 'O' to number '0' before decimal`);
    text = text.replace(/\bO\.(\d+)\b/g, '0.$1');
  }

  const oInDigitsMatches = text.match(/\b(\d+)O(\d*)\b/g);
  if (oInDigitsMatches) {
    corrections.push(`Corrected ${oInDigitsMatches.length} instance(s) of letter 'O' inside digits`);
    text = text.replace(/\b(\d+)O(\d*)\b/g, '$1' + '0' + '$2');
  }

  // 3. Correct "I" or "l" vs "1" in dosage unit contexts (e.g. "I0 mg" -> "10 mg", "l00 mg" -> "100 mg")
  const iUnitMatches = text.match(/\b[Il](\d+)\s*(mg|mcg|ml|g|gm|tablet|cap|puff)/gi);
  if (iUnitMatches) {
    corrections.push(`Corrected ${iUnitMatches.length} instance(s) of 'I'/'l' to '1' before dosage unit`);
    text = text.replace(/\b[Il](\d+)\s*(mg|mcg|ml|g|gm|tablet|cap|puff)/gi, '1$1 $2');
  }

  // 4. Fix broken unit spacing (e.g. "m g" -> "mg", "m l" -> "ml", "m c g" -> "mcg")
  text = text
    .replace(/\b(\d+)\s*m\s*g\b/gi, '$1 mg')
    .replace(/\b(\d+)\s*m\s*l\b/gi, '$1 ml')
    .replace(/\b(\d+)\s*m\s*c\s*g\b/gi, '$1 mcg')
    .replace(/\b(\d+)\s*m\s*m\s*o\s*l\b/gi, '$1 mmol')
    .replace(/\b(\d+)\s*i\s*u\b/gi, '$1 IU')
    .replace(/\bmg\s*\/\s*d\s*l\b/gi, 'mg/dL')
    .replace(/\bg\s*\/\s*d\s*l\b/gi, 'g/dL')
    .replace(/\bcells\s*\/\s*(?:mcL|uL|µL)\b/gi, 'cells/µL');

  // 5. Clean up common OCR bullet / decorative noise at start of lines
  text = text.replace(/^[•·▪■\*\-~]+\s*/gm, '- ');

  // 6. Deduplicate immediately repeated identical lines produced by OCR jitter
  const lines = text.split('\n');
  const dedupedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const current = lines[i].trim();
    const prev = dedupedLines.length > 0 ? dedupedLines[dedupedLines.length - 1].trim() : null;
    if (current && current === prev && current.length > 6) {
      corrections.push(`Removed duplicate OCR line: "${current.slice(0, 30)}..."`);
      continue;
    }
    dedupedLines.push(lines[i]);
  }

  // 7. Normalize multiple blank lines
  const cleaned = dedupedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  return {
    cleanedText: cleaned,
    correctionsCount: corrections.length,
    corrections
  };
}
