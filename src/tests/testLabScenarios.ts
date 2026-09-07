import { parseLabReportText } from '../document-intelligence/parsers/labReportParser';

const sampleLines = [
  'FASTING BLOOD SUGAR    145.0    High    mg/dL    70.0 - 100.0',
  'HbA1c    7.2    %    4.0 - 5.6',
  'Vitamin B12    210    pg/mL    200 - 900',
  'Total Cholesterol    220 mg/dL    < 200 mg/dL',
  'Serum Creatinine : 1.1 mg/dL (Ref: 0.7 - 1.3)',
  '1. Fasting Blood Glucose ....... 135 mg/dL (70 - 100)',
  'Hemoglobin    14.2    13.0 - 17.0    g/dL',
  'CA 125    45.0    U/mL    0 - 35',
  'Platelet Count    1.4    Lakhs/cumm    1.5 - 4.5',
  'ESR    25    mm/hr    0 - 15',
  'Bilirubin Total    1.8    mg/dL    0.2 - 1.2    HIGH',
  'Uric Acid    8.2    mg/dL    Male: 3.5 - 7.2',
  'GLUCOSE, FASTING (FBS) : 126.0 mg/dL [ 70.0 - 100.0 ]',
  'S. CHOLESTEROL - 240 mg/dL (Normal: < 200)',
  'SERUM BILIRUBIN (TOTAL) 1.50 mg/dL 0.20 to 1.20 mg/dL',
  'W.B.C COUNT 11,500 /cumm 4,000 - 11,000 /cumm',
  'HAEMOGLOBIN (Hb) 10.8 gm% 12.0 - 15.0 gm%',
  'BLOOD UREA 45.0 mg% 15.0 - 40.0 mg%',
  'S. ELECTROLYTES - SODIUM 138 mEq/L 135 - 145',
  'POTASSIUM 4.2 mEq/L 3.5 - 5.0',
  'CHLORIDE 102 mEq/L 98 - 106',
  'FREE TRIIODOTHYRONINE (FT3) 3.2 pg/mL 2.0 - 4.4',
  'FREE THYROXINE (FT4) 1.4 ng/dL 0.93 - 1.7',
  'THYROID STIMULATING HORMONE (TSH) 6.8 uIU/mL 0.27 - 4.2',
  'R.B.C. Count 4.8 mill/cu.mm 4.5 - 5.5',
  'Total W.B.C. Count 8,400 /cu.mm 4,000 - 11,000',
  'Polymorphs 65 % 40 - 75',
  'Platelet Count 2,40,000 /cu.mm 1,50,000 - 4,50,000'
];

const res = parseLabReportText(sampleLines.join('\n'), 'doc-test', 'test.pdf');
console.log(`Parsed ${res.labResults.length} / ${sampleLines.length} lab tests:`);
res.labResults.forEach((l, idx) => {
  console.log(`[${idx + 1}] ${l.testName} | Val: ${l.resultValue} ${l.unit} | Ref: ${l.sourceReferenceRange.raw} (hasRange: ${l.sourceReferenceRange.hasSourceRange}) | Flag: ${l.flag}`);
});
