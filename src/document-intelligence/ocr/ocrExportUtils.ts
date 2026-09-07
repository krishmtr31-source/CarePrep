/**
 * OCR Data Export and Clipboard Utilities
 * 
 * Generates doctor-friendly markdown, JSON, and text representations
 * of OCR-extracted medical information with strict safety disclaimers.
 */

import { StructuredOcrMedicalData } from './medicalInfoExtractor';

export type { StructuredOcrMedicalData };

export function generateDoctorFriendlyMarkdown(data: StructuredOcrMedicalData): string {
  const { patientOverview, medications, labResults, diagnoses, doctorInstructions, quality } = data;

  const abnormalLabs = labResults.filter(l => l.isAbnormal || l.flag === 'HIGH' || l.flag === 'LOW');

  return `# Clinical Decision-Support Summary (OCR Extracted)

> **SAFETY DISCLAIMER**: This summary was automatically extracted via Optical Character Recognition (OCR). OCR results must be physically verified against the original medical document before relying on it for clinical care. This system does not diagnose or alter treatment regimens.

## Patient Overview
- **Name**: ${patientOverview.name}
- **Age / Gender**: ${patientOverview.age} / ${patientOverview.gender}
- **Patient ID / UHID**: ${patientOverview.patientId}
- **Document Date**: ${patientOverview.documentDate}
- **Consultant Doctor**: ${patientOverview.doctorName}
- **Facility / Lab**: ${patientOverview.hospitalName}

## Clinical History & Diagnoses
${diagnoses.length > 0 ? diagnoses.map(d => `- ${d}`).join('\n') : '- No explicit previous diagnoses recorded in document.'}

## Current Medications Prescribed
${
  medications.length > 0
    ? `| Medicine | Strength | Dosage | Frequency | Duration | Instructions |
|---|---|---|---|---|---|
${medications.map(m => `| ${m.name} | ${m.strength || '-'} | ${m.dosage} | ${m.frequency} | ${m.duration} | ${m.instructions || '-'} |`).join('\n')}`
    : '- No prescription medications detected in this document.'
}

## Laboratory Results
${
  labResults.length > 0
    ? `| Test | Result | Unit | Reference Range | Alert Status |
|---|---|---|---|---|
${labResults.map(l => {
  const isHigh = l.flag === 'HIGH' || l.flag === 'CRITICAL' || l.isAbnormal;
  const isLow = l.flag === 'LOW';
  const statusLabel = isHigh 
    ? '🚨 HIGH ALERT (Exceeds Range)' 
    : isLow 
    ? '⚠️ LOW (Below Range)' 
    : l.flag === 'NORMAL' 
    ? '✓ NORMAL' 
    : 'UNCLEAR';
  return `| ${l.testName} | **${l.resultValue}** | ${l.unit} | ${l.sourceReferenceRange.raw || '-'} | ${statusLabel} |`;
}).join('\n')}`
    : '- No laboratory investigations detected in this document.'
}

## Important Abnormalities
${
  abnormalLabs.length > 0
    ? abnormalLabs.map(l => `- **${l.testName}**: ${l.resultValue} ${l.unit} (Ref: ${l.sourceReferenceRange.raw || 'None'}) → Flagged as **${l.flag}**`).join('\n')
    : '- No abnormal values detected matching source reference ranges.'
}

## Doctor-Focused Summary
- **Document Type**: ${data.documentType.replace('_', ' ')}
- **OCR Quality Score**: ${quality.score}% (${quality.readability})
${doctorInstructions.length > 0 ? doctorInstructions.map(inst => `- Clinical Instruction: ${inst}`).join('\n') : ''}
- Automated extraction verified with evidence traceability.

## Items Requiring Attention
${
  quality.uncertainItems.length > 0
    ? quality.uncertainItems.map(item => `- ⚠ ${item}`).join('\n')
    : '- All detected parameters matched structured reference ranges.'
}

## Missing / Unclear Information
${
  quality.missingFields.length > 0
    ? quality.missingFields.map(field => `- ${field} was not detected in OCR text`).join('\n')
    : '- Core demographic and clinical header fields were detected.'
}
`;
}

export async function copyOcrSummaryToClipboard(data: StructuredOcrMedicalData): Promise<boolean> {
  const markdown = generateDoctorFriendlyMarkdown(data);
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(markdown);
      return true;
    }
  } catch {
    // fallback
  }

  // Fallback for older browsers
  if (typeof document !== 'undefined') {
    const textArea = document.createElement('textarea');
    textArea.value = markdown;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
  return false;
}

export function downloadOcrAsJson(data: StructuredOcrMedicalData, fileName = 'medical-ocr-extraction.json'): void {
  if (typeof document === 'undefined') return;

  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadOcrAsText(data: StructuredOcrMedicalData, fileName = 'medical-ocr-summary.txt'): void {
  if (typeof document === 'undefined') return;

  const text = generateDoctorFriendlyMarkdown(data);
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.txt') || fileName.endsWith('.md') ? fileName : `${fileName}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
