import { parseLabReportText } from '../document-intelligence/parsers/labReportParser';

const testLines = [
  'Fasting Blood Sugar 145 mg/dL 70.0 - 100.0 mg/dL',
  'HEMOGLOBIN 14.5 g/dL (13.0 - 17.0 g/dL)',
  'Platelet Count: 1.4 Lakhs/cumm [1.5 - 4.5]',
  'Total Cholesterol 220 mg/dL Desirable < 200',
  'Serum Creatinine 1.1 mg/dL Male: 0.7-1.3, Female: 0.6-1.1',
  'HbA1c 7.2 % 4.0 - 5.6 Normal',
  'Fasting Blood Glucose 140 mg/dL (Ref: 70 - 100 mg/dL)',
  'W.B.C Count 11,200 /cumm 4,000 - 11,000',
  'SGOT / AST 45 U/L Up to 40 U/L',
  'SGPT / ALT 65 U/L Normal < 45',
  'Bilirubin Total 1.8 mg/dL 0.2 to 1.2',
  'Blood Urea 45 mg/dL 15.0 - 40.0',
  'TSH 6.5 uIU/mL 0.35 - 4.94'
];

console.log('=== TEST 1: SINGLE-LINE ROWS WITH VARIOUS FORMATS ===');
const res1 = parseLabReportText(testLines.join('\n'), 'test-doc-1', 'test1.pdf');
console.log(`Parsed: ${res1.labResults.length} / ${testLines.length}`);
res1.labResults.forEach(r => {
  console.log(`✓ ${r.testName.padEnd(25)} | Val: ${r.resultValue.padEnd(8)} | Unit: ${(r.unit || '').padEnd(10)} | Range: ${r.sourceReferenceRange.raw} | Flag: ${r.flag}`);
});

console.log('\n=== TEST 2: MULTI-LINE WRAPPED RANGE LINES ===');
const multiLineText = `
Fasting Blood Glucose 145 mg/dL
Biological Ref Interval: 70.0 - 100.0
HbA1c 8.4 %
Reference Range: 4.0 - 5.6 %
Serum Creatinine 1.8 mg/dL
Normal Range: 0.5 - 1.1 mg/dL
Platelet Count 1.2 Lakhs/cumm
1.5 - 4.5 Lakhs/cumm
`;

const res2 = parseLabReportText(multiLineText, 'test-doc-2', 'test2.pdf');
console.log(`Parsed: ${res2.labResults.length} tests (Expected: 4, NO fake test headers!)`);
res2.labResults.forEach(r => {
  console.log(`✓ ${r.testName.padEnd(25)} | Val: ${r.resultValue.padEnd(8)} | Unit: ${(r.unit || '').padEnd(10)} | Range: ${r.sourceReferenceRange.raw} | Flag: ${r.flag}`);
});

console.log('\n=== TEST 3: GENDER-SPECIFIC WITH PATIENT HEADER ===');
const genderText = `
Patient Name: Priya Patel
Gender: Female | Age: 34 Y
Serum Creatinine 1.3 mg/dL Male: 0.7-1.3, Female: 0.6-1.1
Uric Acid 6.8 mg/dL Male: 3.5 - 7.2, Female: 2.6 - 6.0
`;
const res3 = parseLabReportText(genderText, 'test-doc-3', 'test3.pdf');
console.log(`Patient Gender detected: ${res3.patientGender}`);
res3.labResults.forEach(r => {
  console.log(`✓ ${r.testName.padEnd(25)} | Val: ${r.resultValue.padEnd(8)} | Range: ${r.sourceReferenceRange.raw} | Min: ${r.sourceReferenceRange.min} | Max: ${r.sourceReferenceRange.max} | Flag: ${r.flag}`);
});
