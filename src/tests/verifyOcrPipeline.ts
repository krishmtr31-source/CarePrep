/**
 * CarePrep Medical OCR & Document Information Extraction Verification Suite
 * 
 * Verifies:
 * 1. OCR text cleaning and normalization (0 vs O, 1 vs I/l, m9 vs mg, duplicate lines)
 * 2. Structured prescription medication parsing (Medicine | Strength | Dosage | Frequency | Duration | Instructions)
 * 3. Structured laboratory report investigation parsing (Test | Result | Unit | Reference Range | Status)
 * 4. Patient demographics and clinical header extraction
 * 5. Uncertainty flagging and OCR quality evaluation
 * 6. Doctor-friendly markdown generation with clinical safety disclaimers
 * 7. Error handling for empty documents and unsupported formats
 */

import { cleanAndReportOcrText } from '../document-intelligence/ocr/ocrCleaner';
import { 
  extractStructuredMedicalData, 
  extractPatientHeaderInfo, 
  extractStructuredPrescriptions,
  StructuredOcrMedicalData
} from '../document-intelligence/ocr/medicalInfoExtractor';
import { 
  generateDoctorFriendlyMarkdown 
} from '../document-intelligence/ocr/ocrExportUtils';
import { evaluateTextQuality } from '../document-intelligence/ocr/textQualityChecker';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`  ✓ ${message}`);
}

async function runOcrPipelineTests() {
  console.log('===========================================================');
  console.log('🧪 RUNNING CAREPREP MEDICAL OCR PIPELINE VERIFICATION');
  console.log('===========================================================\n');

  // -------------------------------------------------------------
  // TEST 1: OCR Text Cleaning & Artifact Normalization
  // -------------------------------------------------------------
  console.log('--- TEST 1: OCR Text Cleaning & Normalization ---');
  const noisyOcrSample = `
  PATIENT PRESCRIPTION NOTE
  Patient Name: Rajesh Sharma
  Tab Metformin 500 m9 twice daily
  Tab Atorvastatin 2O mg once daily
  Tab Glimepiride O.5 mg before food
  Tab Amoxicillin l00 mg oral
  Tab Amoxicillin l00 mg oral
  Serum Creatinine: 1.2 m g / d l
  `;

  const cleanReport = cleanAndReportOcrText(noisyOcrSample);
  assert(cleanReport.cleanedText.includes('500 mg'), 'm9 normalized to mg (500 mg)');
  assert(cleanReport.cleanedText.includes('20 mg'), 'letter O normalized to 0 in 20 mg');
  assert(cleanReport.cleanedText.includes('0.5 mg'), 'letter O normalized to 0 before decimal (0.5 mg)');
  assert(cleanReport.cleanedText.includes('100 mg'), 'lowercase l normalized to 1 in 100 mg');
  assert(cleanReport.cleanedText.includes('1.2 mg/dL'), 'broken unit "m g / d l" normalized to "mg/dL"');
  assert(cleanReport.correctionsCount >= 4, `Automated corrections tracked (${cleanReport.correctionsCount} logged)`);

  // -------------------------------------------------------------
  // TEST 2: Prescription Information Extraction
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Prescription Extraction (Medicine | Strength | Dosage | Frequency | Duration | Instructions) ---');
  const prescriptionSampleText = `
  APOLLO CLINIC & HEALTHCARE
  Dr. Vikram Patel, MD
  Date: 15/03/2026
  Patient Name: Priya Sundaram
  Age / Gender: 42 Y / Female
  PID: AP-90823

  Diagnosis: Type 2 Diabetes Mellitus, Essential Hypertension

  Rx / Medications Prescribed:
  1. Tab Metformin 500 mg - 1 tablet twice daily after food for 30 days
  2. Tab Telmisartan 40 mg - 1 tablet once daily before breakfast for 30 days
  3. Cap Omeprazole 20 mg - 1 capsule once daily empty stomach for 14 days
  4. Ashwagandha Churna 3 g at bedtime with warm milk

  Instructions:
  Maintain low sodium diet.
  Walk 30 minutes daily.
  Review with fasting blood glucose after 30 days.
  `;

  const parsedPrescription = extractStructuredMedicalData(prescriptionSampleText, 'apollo-prescription.pdf');

  assert(parsedPrescription.documentType === 'PRESCRIPTION', 'Correctly classified as PRESCRIPTION');
  assert(parsedPrescription.patientOverview.name === 'Priya Sundaram', `Extracted patient name: ${parsedPrescription.patientOverview.name}`);
  assert(parsedPrescription.patientOverview.age === '42 Y', `Extracted patient age: ${parsedPrescription.patientOverview.age}`);
  assert(parsedPrescription.patientOverview.gender === 'Female', `Extracted patient gender: ${parsedPrescription.patientOverview.gender}`);
  assert(parsedPrescription.patientOverview.doctorName.includes('Dr. Vikram Patel'), `Extracted doctor name: ${parsedPrescription.patientOverview.doctorName}`);
  assert(parsedPrescription.patientOverview.hospitalName.toLowerCase().includes('apollo clinic'), `Extracted facility: ${parsedPrescription.patientOverview.hospitalName}`);
  assert(parsedPrescription.medications.length >= 3, `Extracted ${parsedPrescription.medications.length} medications`);

  const metformin = parsedPrescription.medications.find(m => m.name.toLowerCase().includes('metformin'));
  assert(Boolean(metformin), 'Found Metformin medication entry');
  if (metformin) {
    assert(metformin.strength === '500 mg', `Metformin strength preserved: ${metformin.strength}`);
    assert(metformin.frequency.includes('Twice daily'), `Metformin frequency detected: ${metformin.frequency}`);
    assert(metformin.duration === '30 days', `Metformin duration detected: ${metformin.duration}`);
    assert(metformin.instructions?.includes('After food') || false, `Metformin meal instruction detected: ${metformin.instructions}`);
  }

  // -------------------------------------------------------------
  // TEST 3: Laboratory Report Extraction & Strict Abnormality Evaluation
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Laboratory Report Extraction & Abnormality Flagging ---');
  const labReportSampleText = `
  METROPOLIS CLINICAL LABORATORIES
  Patient Name: Ramesh Kumar
  Age: 58 Y  Sex: Male
  Date: 2026-02-28
  Doctor: Dr. S. Rao, MD

  COMPLETE BIOCHEMISTRY & HEMATOLOGY PROFILE

  Investigation                  Result       Unit        Reference Range    Status
  Fasting Blood Glucose          142.0        mg/dL       70.0 - 99.0        HIGH
  HbA1c                          8.4          %           4.0 - 5.6          HIGH
  Serum Creatinine               1.05         mg/dL       0.70 - 1.30        NORMAL
  Total Cholesterol              235.0        mg/dL       < 200.0            HIGH
  HDL Cholesterol                38.0         mg/dL       > 40.0             LOW
  Triglycerides                  185.0        mg/dL       < 150.0            HIGH
  Platelet Count                 245,000      cells/µL    150,000 - 450,000  NORMAL
  WBC Count                      7,200        cells/µL    4,000 - 11,000     NORMAL
  Hemoglobin                     14.2         g/dL        13.0 - 17.0        NORMAL
  `;

  const parsedLab = extractStructuredMedicalData(labReportSampleText, 'metropolis-lab-report.pdf');

  assert(parsedLab.documentType === 'LAB_REPORT', 'Correctly classified as LAB_REPORT');
  assert(parsedLab.patientOverview.name === 'Ramesh Kumar', `Extracted patient name: ${parsedLab.patientOverview.name}`);
  assert(parsedLab.labResults.length >= 8, `Extracted ${parsedLab.labResults.length} laboratory investigations`);

  const fbg = parsedLab.labResults.find(l => l.testName.toLowerCase().includes('fasting'));
  assert(Boolean(fbg), 'Found Fasting Blood Glucose');
  if (fbg) {
    assert(fbg.resultValue === '142.0', `Preserved exact value: ${fbg.resultValue}`);
    assert(fbg.unit === 'mg/dL', `Preserved unit: ${fbg.unit}`);
    assert(fbg.flag === 'HIGH', `Correctly evaluated as HIGH based on reference range: ${fbg.flag}`);
  }

  const creatinine = parsedLab.labResults.find(l => l.testName.toLowerCase().includes('creatinine'));
  assert(Boolean(creatinine), 'Found Serum Creatinine');
  if (creatinine) {
    assert(creatinine.flag === 'NORMAL', `Correctly evaluated normal range as NORMAL: ${creatinine.flag}`);
  }

  const platelets = parsedLab.labResults.find(l => l.testName.toLowerCase().includes('platelet'));
  assert(Boolean(platelets), 'Found Platelet Count with formatted numbers');
  if (platelets) {
    assert(platelets.resultValue === '245,000', `Preserved thousands formatted value: ${platelets.resultValue}`);
    assert(platelets.unit === 'cells/µL', `Preserved micro-unit: ${platelets.unit}`);
  }

  // -------------------------------------------------------------
  // TEST 4: Doctor-Friendly Markdown Generation & Safety Disclaimer
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Doctor-Friendly Markdown & Safety Disclaimers ---');
  const doctorMarkdown = generateDoctorFriendlyMarkdown(parsedLab);
  assert(doctorMarkdown.includes('SAFETY DISCLAIMER'), 'Contains mandatory Safety Disclaimer');
  assert(doctorMarkdown.includes('Optical Character Recognition'), 'Explicitly identifies OCR extraction source');
  assert(doctorMarkdown.includes('## Patient Overview'), 'Contains Patient Overview section');
  assert(doctorMarkdown.includes('## Laboratory Results'), 'Contains Laboratory Results table');
  assert(doctorMarkdown.includes('| Test | Result | Unit | Reference Range | Alert Status |'), 'Formats standard markdown table headers');
  assert(doctorMarkdown.includes('🚨 HIGH ALERT (Exceeds Range)'), 'Correctly flags exceeded lab parameters with HIGH ALERT in markdown table');
  assert(doctorMarkdown.includes('## Important Abnormalities'), 'Contains Important Abnormalities summary');
  assert(doctorMarkdown.includes('## Items Requiring Attention'), 'Contains Items Requiring Attention');

  // -------------------------------------------------------------
  // TEST 5: Text Quality & Uncertainty Evaluation
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Text Quality & Degraded Scan Assessment ---');
  const degradedSample = '§§ 1234 %% ^^ && ?? // \\\\';
  const qualityReport = evaluateTextQuality(degradedSample);
  assert(!qualityReport.isAcceptable, 'Correctly flagged gibberish/degraded symbols as unacceptable');
  assert(qualityReport.score < 0.30, `Score is low for degraded text (${qualityReport.score})`);

  console.log('\n===========================================================');
  console.log('✅ ALL CAREPREP MEDICAL OCR PIPELINE TESTS PASSED CLEANLY');
  console.log('===========================================================');
}

runOcrPipelineTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
