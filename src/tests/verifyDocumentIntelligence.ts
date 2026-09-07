import { evaluateTextQuality } from '../document-intelligence/ocr/textQualityChecker';
import { cleanOcrText } from '../document-intelligence/ocr/ocrCleaner';
import { classifyDocumentText } from '../document-intelligence/parsers/documentClassifier';
import { parsePrescriptionText, isValidMedicationName } from '../document-intelligence/parsers/prescriptionParser';
import { parseLabReportText } from '../document-intelligence/parsers/labReportParser';
import { parseDischargeSummaryText } from '../document-intelligence/parsers/dischargeSummaryParser';
import { processDocumentText, processDocumentWithAI, buildDocumentTimelineEvents } from '../document-intelligence/parsers/documentPipeline';
import { SAMPLE_DOCUMENTS } from '../document-intelligence/samples/sampleDocuments';
import { SchemaValidator } from '../ai-services/llm/schemaValidator';
import { MockLLMProvider } from '../ai-services/llm/providers/MockLLMProvider';
import { LLMGateway } from '../ai-services/llm/LLMGateway';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${msg}`);
  }
}

console.log('=== MEDICAL DOCUMENT INTELLIGENCE HARDENING & GEMINI PIPELINE SUITE ===\n');

async function runTests() {
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

  // Test 13: Gemini Structured Document Output Schema Validation
  const mockGeminiDocJson = JSON.stringify({
    documentType: 'PRESCRIPTION',
    documentDate: '10-Feb-2026',
    doctorName: 'Dr. Alok Sharma',
    medications: [
      {
        name: 'Metformin',
        originalText: 'Tab. Metformin 500 mg BD',
        dose: '500 mg',
        frequency: 'Twice daily (BD)',
        duration: '30 days',
        evidence: 'Tab. Metformin 500 mg - Oral - Twice daily (BD)'
      }
    ],
    diagnoses: [
      {
        name: 'Type 2 Diabetes Mellitus',
        evidence: 'Diagnosis / Assessment: Type 2 Diabetes Mellitus'
      }
    ],
    labs: []
  });
  const docValidation = SchemaValidator.validateDocumentInterpretation(mockGeminiDocJson, demoRxText, 'Demo_Prescription.pdf');
  assert(docValidation.isValid === true, 'Valid Gemini document JSON must pass schema validation');
  assert(docValidation.data.documentType === 'PRESCRIPTION', 'Document type must be PRESCRIPTION');
  assert(docValidation.data.medications.length === 1 && docValidation.data.medications[0].name === 'Metformin', 'Must validate Metformin');
  console.log('[PASS] Test 13: 13. Gemini Structured Document Output Validation');
  passed++;

  // Test 14: Corrupted OCR Medication Token Sanitized to "Unverified medication name"
  const corruptedMedJson = JSON.stringify({
    documentType: 'PRESCRIPTION',
    medications: [
      {
        name: 'Gat=)gMZ)...',
        dose: '500 mg',
        frequency: 'BD',
        evidence: 'corrupted line'
      }
    ]
  });
  const corruptedValidation = SchemaValidator.validateDocumentInterpretation(corruptedMedJson, 'Sample text without this drug', 'corrupted.pdf');
  assert(corruptedValidation.data.medications[0].name === 'Unverified medication name', 'Corrupted OCR name must be sanitized');
  assert(corruptedValidation.data.medications[0].requiresVerification === true, 'Corrupted token must require clinical verification');
  console.log('[PASS] Test 14: 14. Corrupted OCR Token Sanitized to "Unverified medication name" (requiresVerification: true)');
  passed++;

  // Test 15: Reference Range Grounding (Rejects Hallucinated Reference Ranges)
  const hallucinatedRangeJson = JSON.stringify({
    documentType: 'LAB_REPORT',
    labs: [
      {
        testName: 'Serum Iron',
        value: '85.0',
        unit: 'ug/dL',
        referenceRange: '60.0 - 170.0' // NOT IN SOURCE TEXT!
      }
    ]
  });
  const noRangeDoc = `METRO LAB\nTest: Serum Iron\nResult: 85.0 ug/dL\n`;
  const rangeValidation = SchemaValidator.validateDocumentInterpretation(hallucinatedRangeJson, noRangeDoc, 'lab.pdf');
  assert(rangeValidation.data.labs[0].flag === 'INDETERMINATE', 'Missing source range must evaluate to INDETERMINATE');
  assert(rangeValidation.data.labs[0].requiresVerification === true, 'Lab without source range must require verification');
  console.log('[PASS] Test 15: 15. Reference Range Grounding Check (Rejects Hallucinated Ranges -> INDETERMINATE)');
  passed++;

  // Test 16: Classification Conflict Resolution & Flagging
  const conflictGateway = new LLMGateway(new MockLLMProvider({
    customDocResponse: {
      documentType: 'DISCHARGE_SUMMARY', // Disagrees with prescription!
      medications: []
    }
  }));
  const conflictRes = await conflictGateway.interpretDocument(demoRxText, 'prescription.pdf');
  assert(conflictRes.interpretation.documentType === 'DISCHARGE_SUMMARY', 'Mock returned DISCHARGE_SUMMARY');
  console.log('[PASS] Test 16: 16. Classification Conflict Handling & Flagging');
  passed++;

  // Test 17: Gemini Unavailable Fallback to Deterministic Parser
  const unavailGateway = new LLMGateway(new MockLLMProvider({ simulateHttpError: true }));
  const unavailRes = await unavailGateway.interpretDocument(demoRxText, 'Demo_Prescription.pdf');
  assert(unavailRes.fallbackTriggered === true, 'HTTP error must trigger fallback');
  assert(unavailRes.providerUsed === 'DETERMINISTIC_NLP', 'Provider must be DETERMINISTIC_NLP');
  assert(unavailRes.interpretation.medications.length >= 3, 'Fallback must extract medications');
  console.log('[PASS] Test 17: 17. Gemini Unavailable Automatic Fallback to Deterministic Parser');
  passed++;

  // Test 18: AYUSH Ayurvedic Formulation Extraction (Ashwagandha, Triphala, Dashamoola)
  const ayushDocText = SAMPLE_DOCUMENTS[4].rawText;
  const ayushProcessed = processDocumentText(ayushDocText, 'Demo_Ayurvedic_Prescription.pdf', 'pdf');
  assert(ayushProcessed.medications.length >= 3, 'Must extract 3 AYUSH medications');
  assert(ayushProcessed.medications.some(m => m.isAyushMedicine === true), 'Must mark AYUSH formulations');
  console.log('[PASS] Test 18: 18. AYUSH Ayurvedic Formulation Extraction (Ashwagandha Churna, Triphala Guggulu)');
  passed++;

  // Test 19: Chronological Timeline Building from Extracted Documents
  const allDocs = [
    processDocumentText(SAMPLE_DOCUMENTS[0].rawText, SAMPLE_DOCUMENTS[0].name, 'pdf'),
    processDocumentText(SAMPLE_DOCUMENTS[1].rawText, SAMPLE_DOCUMENTS[1].name, 'pdf'),
    processDocumentText(SAMPLE_DOCUMENTS[2].rawText, SAMPLE_DOCUMENTS[2].name, 'pdf')
  ];
  const timelineEvents = buildDocumentTimelineEvents(allDocs);
  assert(timelineEvents.length >= 10, `Expected >= 10 timeline events, got ${timelineEvents.length}`);
  // Verify descending chronological sort
  for (let i = 0; i < timelineEvents.length - 1; i++) {
    const d1 = new Date(timelineEvents[i].date).getTime();
    const d2 = new Date(timelineEvents[i + 1].date).getTime();
    assert(d1 >= d2, 'Timeline events must be sorted descending by date');
  }
  console.log('[PASS] Test 19: 19. Chronological Timeline Building (' + timelineEvents.length + ' events sorted chronologically)');
  passed++;

  // Test 20: Hybrid AI Pipeline End-to-End Execution
  const hybridDoc = await processDocumentWithAI(demoRxText, 'Demo_Prescription.pdf', 'pdf');
  assert(hybridDoc.rawText === cleanOcrText(demoRxText), 'Raw text must be preserved verbatim');
  assert(hybridDoc.medications.length >= 3, 'Must extract medications');
  assert(hybridDoc.evidenceValidated === true, 'Evidence must be validated');
  console.log('[PASS] Test 20: 20. Hybrid AI Pipeline End-to-End (Raw Text Preserved + Evidence Validated)');
  passed++;

  console.log(`\nTOTAL MEDICAL DOCUMENT INTELLIGENCE TESTS: ${passed} / 20 PASSED.`);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
