/**
 * OCR Text Normalizer
 * 
 * Safely normalizes whitespace, line breaks, and obvious OCR artifact characters
 * while preserving medical terminology and exact numbers.
 */

export function cleanOcrText(rawText: string): string {
  if (!rawText) return '';

  return rawText
    // Normalize Windows/Mac line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove non-printable ASCII control characters except newline and tab
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize repeated blank lines
    .replace(/\n{3,}/g, '\n\n')
    // Fix broken unit spacing (e.g. "m g" -> "mg", "m l" -> "ml")
    .replace(/\b(\d+)\s*m\s*g\b/gi, '$1 mg')
    .replace(/\b(\d+)\s*m\s*l\b/gi, '$1 ml')
    .replace(/\b(\d+)\s*m\s*c\s*g\b/gi, '$1 mcg')
    .replace(/\bmg\s*\/\s*dl\b/gi, 'mg/dL')
    .replace(/\bg\s*\/\s*dl\b/gi, 'g/dL')
    // Clean up OCR bullet artifacts
    .replace(/^[•·▪■\*\-~]+\s*/gm, '- ')
    .trim();
}
