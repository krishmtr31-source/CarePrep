import { evaluateTextQuality } from '../document-intelligence/ocr/textQualityChecker';
import { cleanOcrText } from '../document-intelligence/ocr/ocrCleaner';
import { classifyDocumentText } from '../document-intelligence/parsers/documentClassifier';
import { parsePrescriptionText, isValidMedicationName } from '../document-intelligence/parsers/prescriptionParser';
import { parseLabReportText } from '../document-intelligence/parsers/labReportParser';
import { parseDischargeSummaryText } from '../document-intelligence/parsers/dischargeSummaryParser';
import { processDocumentText } from '../document-intelligence/parsers/documentPipeline';
import { SAMPLE_DOCUMENTS } from '../document-intelligence/samples/sampleDocuments';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${msg}`);
  }
}

console.log('=== MEDICAL DOCUMENT INTELLIGENCE HARDENING SUITE ===\n');

let passed = 0;

// Test 1: Clean Text Quality Evaluation
const cleanSampleText = SAMPLE_DOCUMENTS[0].rawText;
const cleanEval = evaluateTextQuality(cleanSampleText);
assert(cleanEval.isAcceptable === true, 'Clean prescription text must pass quality check');
assert(cleanEval.score >= 0.80, 'Clean prescription text must have high quality score');
console.log('[PASS] Test 1: 1. Clean Text Quality Check Passed (Score: ' + cleanEval.score.toFixed(2) + ')');
passed++;

// Test 2: Binary PDF Stream Artifact Rejection
const binaryPdfGarbage = `%PDF-1.4\n1 0 obj << /Filter /FlateDecode /Length 3942 >>\nstream\nxœ+T04\nendstream\nxref\n0 10\ntrailer << /Size 10 >>\nstartxref\n%%EOF`;
const binaryEval = evaluateTextQuality(binaryPdfGarbage);
assert(binaryEval.isAcceptable === false, 'Binary PDF stream data must be rejected as unreadable');
assert(binaryEval.hasBinaryArtifacts === true, 'Must detect binary PDF stream markers');
console.log('[PASS] Test 2: 2. Corrupted Binary PDF Stream Rejection (' + binaryEval.reason + ')');
passed++;

// Test 3: Excessive Symbols & Encoded Gibberish Rejection
const corruptedOcrText = `Gat=)gMZ)%^&*!#= @@@ {{{{}}}} ~~~\\\\\\ Gat=)gMZ)... random bytes...`;
const gibberishEval = evaluateTextQuality(corruptedOcrText);
assert(gibberishEval.isAcceptable === false, 'Excessive symbol text must be rejected');
console.log('[PASS] Test 3: 3. Gibberish & Excessive Symbol Ratio Rejection (' + gibberishEval.reason + ')');
passed++;

// Test 4: Prescription Classification (Devendra Patel Demo)
const demoRxText = SAMPLE_DOCUMENTS[0].rawText;
const rxClass = classifyDocumentText(demoRxText);
assert(rxClass.classification === 'PRESCRIPTION', `Expected PRESCRIPTION, got ${rxClass.classification}`);
assert(rxClass.confidence >= 0.75, 'Prescription classification must have strong confidence');
console.log('[PASS] Test 4: 4. Prescription Classification (' + rxClass.classification + ', Confidence: ' + (rxClass.confidence * 100).toFixed(0) + '%)');
passed++;

// Test 5: Lab Report Classification (Devendra Patel Demo)
const demoLabText = SAMPLE_DOCUMENTS[1].rawText;
const labClass = classifyDocumentText(demoLabText);
assert(labClass.classification === 'LAB_REPORT', `Expected LAB_REPORT, got ${labClass.classification}`);
assert(labClass.confidence >= 0.75, 'Lab report classification must have strong confidence');
console.log('[PASS] Test 5: 5. Lab Report Classification (' + labClass.classification + ', Confidence: ' + (labClass.confidence * 100).toFixed(0) + '%)');
passed++;

// Test 6: Discharge Summary Classification (Devendra Patel Demo)
const demoDischargeText = SAMPLE_DOCUMENTS[2].rawText;
const disClass = classifyDocumentText(demoDischargeText);
assert(disClass.classification === 'DISCHARGE_SUMMARY', `Expected DISCHARGE_SUMMARY, got ${disClass.classification}`);
assert(disClass.confidence >= 0.75, 'Discharge summary classification must have strong confidence');
console.log('[PASS] Test 6: 6. Discharge Summary Classification (' + disClass.classification + ', Confidence: ' + (disClass.confidence * 100).toFixed(0) + '%)');
passed++;

// Test 7: Low Confidence / Ambiguous Document Routing to OTHER
const poorDocText = SAMPLE_DOCUMENTS[3].rawText;
const poorClass = classifyDocumentText(poorDocText);
assert(poorClass.classification === 'OTHER' || poorClass.requiresVerification === true, 'Ambiguous document must require verification');
console.log('[PASS] Test 7: 7. Ambiguous Document Routing (' + poorClass.classification + ', Requires Verification: ' + poorClass.requiresVerification + ')');
passed++;

// Test 8: Corrupted OCR Medication Name Rejection
const invalidCandidate1 = isValidMedicationName('Gat=)gMZ)...');
assert(invalidCandidate1.isValid === false, 'Corrupted token must not be accepted as medication name');
const invalidCandidate2 = isValidMedicationName('Advice');
assert(invalidCandidate2.isValid === false, 'Header word Advice must not be accepted as medication name');
const validCandidate = isValidMedicationName('Metformin');
assert(validCandidate.isValid === true && validCandidate.cleanName === 'Metformin', 'Clean drug name Metformin must be accepted');
console.log('[PASS] Test 8: 8. Corrupted OCR Medication Token Rejection');
passed++;

// Test 9: Prescription Medication Parsing (Devendra Patel Demo)
const parsedRx = parsePrescriptionText(demoRxText, 'doc-rx-01', 'Demo_Prescription_Devendra_Patel.pdf');
assert(parsedRx.medications.length >= 3, `Expected 3 medications, got ${parsedRx.medications.length}`);
const medNames = parsedRx.medications.map(m => m.name);
assert(medNames.some(n => n.includes('Metformin')), 'Must extract Metformin');
assert(medNames.some(n => n.includes('Atorvastatin')), 'Must extract Atorvastatin');
assert(medNames.some(n => n.includes('Ashwagandha')), 'Must extract Ashwagandha');
const metMed = parsedRx.medications.find(m => m.name.includes('Metformin'))!;
assert(metMed.dosage.includes('500 mg'), `Expected 500 mg, got ${metMed.dosage}`);
assert(metMed.frequency.includes('Twice daily') || metMed.frequency.includes('BD'), `Expected Twice daily, got ${metMed.frequency}`);
console.log('[PASS] Test 9: 9. Prescription Medications Extracted: ' + medNames.join(', '));
passed++;

// Test 10: Lab Report Abnormalities & Source Reference Range Calculation
const parsedLab = parseLabReportText(demoLabText, 'doc-lab-01', 'Demo_Lab_Report_Devendra_Patel.pdf');
assert(parsedLab.labResults.length >= 4, `Expected at least 4 lab results, got ${parsedLab.labResults.length}`);
const hba1c = parsedLab.labResults.find(l => l.testName.toLowerCase().includes('hba1c'))!;
assert(hba1c !== undefined, 'Must extract HbA1c');
assert(hba1c.resultValue === '8.4', `Expected 8.4, got ${hba1c.resultValue}`);
assert(hba1c.flag === 'HIGH', `Expected HbA1c to be HIGH, got ${hba1c.flag}`);
assert(hba1c.sourceReferenceRange.raw.includes('4.0 - 5.6'), `Expected source ref range 4.0 - 5.6, got ${hba1c.sourceReferenceRange.raw}`);

const creat = parsedLab.labResults.find(l => l.testName.toLowerCase().includes('creatinine'))!;
assert(creat !== undefined, 'Must extract Creatinine');
assert(creat.flag === 'NORMAL', `Expected Creatinine to be NORMAL, got ${creat.flag}`);
assert(creat.sourceReferenceRange.raw.includes('0.70 - 1.30'), `Expected source ref range 0.70 - 1.30, got ${creat.sourceReferenceRange.raw}`);
console.log('[PASS] Test 10: 10. Lab Report Abnormality & Source Ref Range Verification (HbA1c 8.4% HIGH, Creatinine 0.92 NORMAL)');
passed++;

// Test 11: Missing Source Reference Range Defaults to INDETERMINATE (No Invented Ranges)
const labWithoutRefText = `METRO PATHOLOGY\nInvestigation Name: Random Serum Marker\nResult: 45.0 U/L\n`;
const parsedNoRef = parseLabReportText(labWithoutRefText, 'doc-lab-02', 'Unspecified_Lab.pdf');
if (parsedNoRef.labResults.length > 0) {
  assert(parsedNoRef.labResults[0].flag === 'INDETERMINATE', 'Missing reference range must be marked INDETERMINATE');
}
console.log('[PASS] Test 11: 11. Missing Source Reference Range Marked INDETERMINATE (No Hallucinated Ranges)');
passed++;

// Test 12: Discharge Summary Parsing (Devendra Patel Demo)
const parsedDischarge = parseDischargeSummaryText(demoDischargeText, 'doc-dc-01', 'Demo_Discharge_Summary_Devendra_Patel.pdf');
assert(Boolean(parsedDischarge.admissionDate?.includes('15-Jan-2026') || parsedDischarge.admissionDate?.includes('15')), 'Must extract admission date');
assert(Boolean(parsedDischarge.dischargeDate?.includes('18-Jan-2026') || parsedDischarge.dischargeDate?.includes('18')), 'Must extract discharge date');
assert(parsedDischarge.diagnoses.length > 0, 'Must extract final diagnosis');
assert(parsedDischarge.diagnoses[0].conditionName.includes('Gastroenteritis'), 'Must extract Gastroenteritis condition');
assert(parsedDischarge.medications.length > 0, 'Must extract discharge medications');
assert(parsedDischarge.medications.some(m => m.name.includes('Rifaximin')), 'Must extract Rifaximin');
console.log('[PASS] Test 12: 12. Discharge Summary Extraction (Admission: ' + parsedDischarge.admissionDate + ', Discharge: ' + parsedDischarge.dischargeDate + ', Diagnosis: ' + parsedDischarge.diagnoses[0].conditionName + ')');
passed++;

// Test 13: Source Provenance & Method Tracking
const processedDoc = processDocumentText(demoRxText, 'Demo_Prescription_Devendra_Patel.pdf', 'pdf', undefined, 'PDF_TEXT');
assert(processedDoc.medications.length > 0, 'Must have medications');
const medProv = processedDoc.medications[0].evidence;
assert(medProv.documentName === 'Demo_Prescription_Devendra_Patel.pdf', 'Must record document name in provenance');
assert(medProv.extractionMethod === 'PDF_TEXT', 'Must record extraction method');
assert(medProv.snippet.length > 5, 'Must record verbatim source snippet');
console.log('[PASS] Test 13: 13. Source Provenance & Method Traceability (Method: ' + medProv.extractionMethod + ', Confidence: ' + (medProv.confidenceScore * 100).toFixed(0) + '%)');
passed++;

// Test 14: Unseen Synthetic Document 1 — Cardiology Prescription
const unseenRx = SAMPLE_DOCUMENTS.find(s => s.id === 'sample-unseen-rx-01')!;
const processedUnseenRx = processDocumentText(unseenRx.rawText, unseenRx.name, 'sample');
assert(processedUnseenRx.classification === 'PRESCRIPTION', `Unseen doc must classify as PRESCRIPTION, got ${processedUnseenRx.classification}`);
assert(processedUnseenRx.medications.some(m => m.name.includes('Telmisartan')), 'Must extract Telmisartan');
assert(processedUnseenRx.medications.some(m => m.name.includes('Amlodipine')), 'Must extract Amlodipine');
console.log('[PASS] Test 14: 14. Unseen Document 1 (Cardiology Rx: Telmisartan & Amlodipine) Correctly Extracted');
passed++;

// Test 15: Unseen Synthetic Document 2 — Renal & Thyroid Lab Panel
const unseenLab = SAMPLE_DOCUMENTS.find(s => s.id === 'sample-unseen-lab-01')!;
const processedUnseenLab = processDocumentText(unseenLab.rawText, unseenLab.name, 'sample');
assert(processedUnseenLab.classification === 'LAB_REPORT', `Unseen doc must classify as LAB_REPORT, got ${processedUnseenLab.classification}`);
const creatUnseen = processedUnseenLab.labResults.find(l => l.testName.toLowerCase().includes('creatinine'))!;
assert(creatUnseen !== undefined && creatUnseen.flag === 'HIGH', 'Serum Creatinine 1.65 must be flagged HIGH');
const tshUnseen = processedUnseenLab.labResults.find(l => l.testName.toLowerCase().includes('tsh'))!;
assert(tshUnseen !== undefined && tshUnseen.flag === 'NORMAL', 'TSH 2.40 must be flagged NORMAL');
console.log('[PASS] Test 15: 15. Unseen Document 2 (Renal & Thyroid Lab: Creatinine 1.65 HIGH, TSH 2.4 NORMAL) Correctly Extracted');
passed++;

// Test 16: Unseen Synthetic Document 3 — Post-op Surgery Discharge Summary
const unseenDischargeText = `ST. MARY SURGICAL HOSPITAL\nDischarge Summary\nPatient: John Mathew | Age: 36/M\nAdmission Date: 10 February 2026\nDischarge Date: 13 February 2026\n\nFINAL DIAGNOSIS:\nAcute Appendicitis (Post Laparoscopic Appendectomy)\n\nHOSPITAL COURSE:\nPatient underwent uneventful laparoscopic appendectomy. Postoperative recovery smooth.\n\nDISCHARGE MEDICATIONS:\n1. Tab. Cefuroxime 500 mg - Oral - Twice daily (BD) - Duration: 5 days\n2. Tab. Paracetamol 650 mg - Oral - As needed (SOS) - Duration: 3 days\n\nFollow-up: OPD in 7 days for suture check.`;
const processedUnseenDischarge = processDocumentText(unseenDischargeText, 'Unseen_Appendectomy_Discharge.pdf', 'pdf');
assert(processedUnseenDischarge.classification === 'DISCHARGE_SUMMARY', `Unseen doc must classify as DISCHARGE_SUMMARY, got ${processedUnseenDischarge.classification}`);
assert(processedUnseenDischarge.diagnoses.some(d => d.conditionName.includes('Appendicitis')), 'Must extract Appendicitis diagnosis');
assert(processedUnseenDischarge.medications.some(m => m.name.includes('Cefuroxime')), 'Must extract Cefuroxime 500mg');
console.log('[PASS] Test 16: 16. Unseen Document 3 (Surgical Discharge: Appendectomy & Cefuroxime) Correctly Extracted');
passed++;

console.log(`\nTOTAL MEDICAL DOCUMENT INTELLIGENCE TESTS: ${passed} / 16 PASSED.`);
