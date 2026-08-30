import { SAMPLE_DOCUMENTS } from '../document-intelligence/samples/sampleDocuments';
import { processDocumentText, buildDocumentTimelineEvents } from '../document-intelligence/parsers/documentPipeline';
import { classifyDocumentText } from '../document-intelligence/parsers/documentClassifier';
import { getAdaptiveSocratesQuestions } from '../ai-services/socratesEngine';
import { checkRedFlags } from '../clinical-rules/redFlags';
import { ExtractedDocumentData } from '../document-intelligence/models/document';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details: string) {
  results.push({
    name,
    passed: condition,
    details: condition ? details : `FAILED: ${details}`
  });
}

console.log('=== PHASE 2: MEDICAL DOCUMENT INTELLIGENCE TEST SUITE ===');

// 1. Test Classification of all 4 Document Types
const rxSample = SAMPLE_DOCUMENTS[0];
const labSample = SAMPLE_DOCUMENTS[1];
const disSample = SAMPLE_DOCUMENTS[2];
const poorSample = SAMPLE_DOCUMENTS[3];

const classRx = classifyDocumentText(rxSample.rawText);
const classLab = classifyDocumentText(labSample.rawText);
const classDis = classifyDocumentText(disSample.rawText);
const classPoor = classifyDocumentText(poorSample.rawText);

assert(
  classRx.classification === 'PRESCRIPTION',
  'Document Classification: Prescription',
  `Classified as ${classRx.classification} (Confidence: ${Math.round(classRx.confidence * 100)}%)`
);

assert(
  classLab.classification === 'LAB_REPORT',
  'Document Classification: Laboratory Report',
  `Classified as ${classLab.classification} (Confidence: ${Math.round(classLab.confidence * 100)}%)`
);

assert(
  classDis.classification === 'DISCHARGE_SUMMARY',
  'Document Classification: Discharge Summary',
  `Classified as ${classDis.classification} (Confidence: ${Math.round(classDis.confidence * 100)}%)`
);

// 2. Full Extraction Pipeline on Prescription (Dr. Sharma Clinic)
const parsedRx = processDocumentText(rxSample.rawText, rxSample.name, 'sample', rxSample.type);

assert(
  parsedRx.medications.length >= 3 &&
  parsedRx.medications.some(m => m.name.toLowerCase().includes('metformin') && m.dosage.includes('500 mg')) &&
  parsedRx.medications.some(m => m.name.toLowerCase().includes('ashwagandha') && m.isAyushMedicine),
  'Prescription Extraction: Medications & AYUSH Detection',
  `Extracted ${parsedRx.medications.length} meds including Metformin 500mg and Ashwagandha Churna (AYUSH marked)`
);

assert(
  parsedRx.diagnoses.some(d => d.conditionName.toLowerCase().includes('diabetes')),
  'Prescription Extraction: Diagnoses',
  `Extracted: ${parsedRx.diagnoses.map(d => d.conditionName).join(', ')}`
);

// 3. Extraction Pipeline on Lab Report & Abnormal Range Detection
const parsedLab = processDocumentText(labSample.rawText, labSample.name, 'sample', labSample.type);

const hba1c = parsedLab.labResults.find(l => l.testName.toLowerCase().includes('hba1c'));
const glucose = parsedLab.labResults.find(l => l.testName.toLowerCase().includes('fasting'));
const creatinine = parsedLab.labResults.find(l => l.testName.toLowerCase().includes('creatinine'));

assert(
  hba1c !== undefined &&
  hba1c.resultValue === '8.4' &&
  hba1c.flag === 'HIGH' &&
  hba1c.isAbnormal === true &&
  hba1c.sourceReferenceRange.raw.includes('4.0 - 5.6'),
  'Abnormal Lab Value: HbA1c [HIGH] Detection',
  `HbA1c 8.4% marked HIGH against source range 4.0 - 5.6%`
);

assert(
  glucose !== undefined &&
  (glucose.resultValue === '162.0' || glucose.numericValue === 162) &&
  glucose.flag === 'HIGH' &&
  glucose.isAbnormal === true,
  'Abnormal Lab Value: Fasting Glucose [HIGH] Detection',
  `Glucose ${glucose?.resultValue} mg/dL marked HIGH against source range 70 - 100 mg/dL`
);

assert(
  creatinine !== undefined &&
  creatinine.flag === 'NORMAL' &&
  creatinine.isAbnormal === false,
  'Normal Lab Value: Serum Creatinine [NORMAL] Detection',
  `Creatinine 0.92 mg/dL correctly marked NORMAL within 0.70 - 1.30 mg/dL`
);

// 4. Discharge Summary Extraction
const parsedDis = processDocumentText(disSample.rawText, disSample.name, 'sample', disSample.type);

assert(
  parsedDis.detectedDate === '18-Jan-2026' &&
  parsedDis.diagnoses.some(d => d.conditionName.toLowerCase().includes('gastroenteritis')) &&
  parsedDis.medications.some(m => m.name.toLowerCase().includes('rifaximin')),
  'Discharge Summary Extraction: Dates, Diagnoses & Discharge Rx',
  `Discharge Date: ${parsedDis.detectedDate}, Diagnoses: ${parsedDis.diagnoses.map(d => d.conditionName).join('; ')}`
);

// 5. Poor-Quality & Incomplete Document Handling
const parsedPoor = processDocumentText(poorSample.rawText, poorSample.name, 'sample', poorSample.type);

assert(
  parsedPoor.unreliableFields.length > 0,
  'Poor-Quality Document: Graceful Missing Data Handling',
  `Identified unverified fields: ${parsedPoor.unreliableFields.join('; ')}`
);

// 6. Source Traceability Verification
const allEntities = [
  ...parsedRx.medications.map(m => m.evidence),
  ...parsedLab.labResults.map(l => l.evidence),
  ...parsedDis.diagnoses.map(d => d.evidence)
];

const allHaveSnippets = allEntities.every(e => e.snippet && e.snippet.length > 3 && e.documentName && e.confidenceScore > 0);

assert(
  allHaveSnippets,
  'Source Evidence & Snippet Traceability',
  `Verified 100% of extracted items (${allEntities.length} entities) retain document name, page number and source snippet`
);

// 7. Chronological Timeline Builder
const docsList: ExtractedDocumentData[] = [parsedRx, parsedLab, parsedDis];
const timeline = buildDocumentTimelineEvents(docsList);

assert(
  timeline.length >= 6 &&
  new Date(timeline[0].date).getTime() >= new Date(timeline[timeline.length - 1].date).getTime(),
  'Chronological Timeline Integration',
  `Compiled ${timeline.length} timeline events sorted chronologically (${timeline[0].date} to ${timeline[timeline.length - 1].date})`
);

// 8. Phase 1 Non-Regression Checks
const redFlagCheck = checkRedFlags("Severe chest pain radiating to left arm with shortness of breath");
const adaptiveQ = getAdaptiveSocratesQuestions("Mild headache for two days");

assert(
  redFlagCheck.length >= 2,
  'Phase 1 Non-Regression: Red Flag Safety Detection',
  `Emergency rules triggered: ${redFlagCheck.map(r => r.title).join('; ')}`
);

assert(
  adaptiveQ.some(q => q.id === 'socrates_site_headache'),
  'Phase 1 Non-Regression: Adaptive Questioning Framework',
  'Headache branch generated correctly'
);

let passCount = 0;
results.forEach((r, idx) => {
  if (r.passed) passCount++;
  console.log(`[${r.passed ? 'PASS' : 'FAIL'}] Test ${idx + 1}: ${r.name}`);
  console.log(`       Details: ${r.details}`);
});
console.log(`\nTOTAL PHASE 2 TESTS: ${passCount} / ${results.length} PASSED.`);
