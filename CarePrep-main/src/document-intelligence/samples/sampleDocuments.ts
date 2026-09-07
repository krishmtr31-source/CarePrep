export interface SampleDocMeta {
  id: string;
  name: string;
  type: 'PRESCRIPTION' | 'LAB_REPORT' | 'DISCHARGE_SUMMARY' | 'OTHER';
  label: string;
  description: string;
  rawText: string;
  mockDate: string;
  isPoorQuality?: boolean;
}

export const SAMPLE_DOCUMENTS: SampleDocMeta[] = [
  {
    id: 'sample-rx-01',
    name: 'Demo_Prescription_Devendra_Patel.pdf',
    type: 'PRESCRIPTION',
    label: '1. Prescription (Demo - Devendra Patel)',
    description: 'Clinical prescription containing Metformin 500mg, Atorvastatin 20mg, and Ashwagandha Churna.',
    mockDate: '2026-02-10',
    rawText: `DR. ALOK SHARMA, MD (INTERNAL MEDICINE)
Reg. No: MCI-284910
Aarogya Clinic, Civil Lines, New Delhi
Date: 10-Feb-2026

PATIENT DETAILS:
Name: Devendra Patel | Age: 54 Y / Male | Weight: 74 kg
Diagnosis / Assessment: Type 2 Diabetes Mellitus, Mild Dyslipidemia

Rx (Medications Prescribed):
1. Tab. Metformin 500 mg - Oral - Twice daily (BD) after food - Duration: 30 days
2. Tab. Atorvastatin 20 mg - Oral - Once daily (OD) at bedtime - Duration: 30 days
3. Cap. Ashwagandha Churna 250 mg - Oral - Twice daily (BD) with warm milk - Duration: 15 days

Advice / Instructions:
- Avoid refined sugars and fried foods
- Daily 30 minutes brisk walking
- Follow up after 1 month with Fasting Blood Sugar report

Dr. Alok Sharma (Signed)`
  },
  {
    id: 'sample-lab-01',
    name: 'Demo_Lab_Report_Devendra_Patel.pdf',
    type: 'LAB_REPORT',
    label: '2. Lab Report (Demo - Devendra Patel)',
    description: 'Biochemistry panel with HbA1c 8.4% [HIGH], Fasting Glucose 162 mg/dL [HIGH], and Creatinine 0.92 mg/dL [NORMAL].',
    mockDate: '2026-02-14',
    rawText: `METRO PATHOLOGY & DIAGNOSTIC LABS
NABL Accredited Laboratory | Certificate No: MC-4190
Patient: Devendra Patel | Ref By: Dr. Alok Sharma
Sample Collection Date: 14-Feb-2026 08:30 AM
Report Date: 14-Feb-2026 04:15 PM

DEPARTMENT OF CLINICAL BIOCHEMISTRY

INVESTIGATION NAME                   RESULT     UNIT      REFERENCE RANGE     STATUS
--------------------------------------------------------------------------------
Fasting Plasma Glucose (Hexokinase)  162.0      mg/dL     70.0 - 100.0        HIGH
HbA1c (Glycosylated Hemoglobin)      8.4        %         4.0 - 5.6           HIGH
Estimated Average Glucose (eAG)      194.0      mg/dL     70.0 - 126.0        HIGH
Serum Creatinine (Enzymatic)         0.92       mg/dL     0.70 - 1.30         NORMAL
Serum Total Bilirubin                0.80       mg/dL     0.20 - 1.20         NORMAL
Hemoglobin (Colorimetric)            13.6       g/dL      12.0 - 16.0         NORMAL

INTERPRETATION NOTE:
HbA1c > 6.5% indicates uncontrolled glycemic status. Clinical correlation advised.

Verified by: Dr. Sunita Rao, MD (Biochemistry)`
  },
  {
    id: 'sample-discharge-01',
    name: 'Demo_Discharge_Summary_Devendra_Patel.pdf',
    type: 'DISCHARGE_SUMMARY',
    label: '3. Hospital Discharge Summary (Demo - Devendra Patel)',
    description: 'Inpatient discharge summary for Acute Gastroenteritis with IV hydration and discharge advice.',
    mockDate: '2026-01-18',
    rawText: `CITY MULTISPECIALITY HOSPITAL
Discharge Summary | IPD No: 2026/IP-88412
Patient Name: Devendra Patel | Age: 54 Y / M
Date of Admission: 15-Jan-2026 | Date of Discharge: 18-Jan-2026
Department: General Medicine | Treating Consultant: Dr. K. M. Joshi

FINAL DIAGNOSIS:
Acute Infectious Gastroenteritis with Moderate Dehydration (Resolved)

HOSPITAL COURSE:
Patient was admitted with complaints of multiple episodes of vomiting, loose stools, and abdominal cramping for 2 days. Physical exam revealed dehydration and tachycardia. Patient was managed with intravenous fluids (Ringer Lactate & Normal Saline), IV Ondansetron, and oral probiotics. Vital signs stabilized, tolerating soft diet well at discharge.

DISCHARGE MEDICATIONS:
1. Tab. Rifaximin 400 mg - Oral - Three times daily (TID) - Duration: 3 days
2. Sachet Probiotic (Lactobacillus) - Oral - Once daily - Duration: 5 days
3. Sachet Oral Rehydration Salts (ORS) - As needed

FOLLOW-UP ADVICE:
Review in OPD if fever, severe abdominal pain, or blood in stools recurs.`
  },
  {
    id: 'sample-poor-quality-01',
    name: 'Faded_Handwritten_Slip_Scan.jpg',
    type: 'OTHER',
    label: '4. Poor-Quality / Ambiguous Document',
    description: 'Degraded scan with faded text and incomplete fields requiring clinical verification.',
    mockDate: '2025-11-04',
    isPoorQuality: true,
    rawText: `CLINIC ... [Illegible header]
Date: 04-Nov-2025 (Faded)
Pt: ... Patel ... ? 50 Y

Rx:
- Tab ...cillin ... 250... ? TDS ... [dosage faded]
- Syrup ...coff... 5ml ... [frequency unreadable]
- Test: ... Sugar ... Value: ~140? [No reference range printed]

Note: Faded receipt - signature unverified. Requires physical document verification.`
  },
  {
    id: 'sample-unseen-rx-01',
    name: 'Unseen_Cardiology_Clinic_Note.txt',
    type: 'PRESCRIPTION',
    label: '5. Unseen Cardiology Prescription (Synthetic Test)',
    description: 'Outpatient cardiology visit note with Telmisartan 40mg and Amlodipine 5mg.',
    mockDate: '2026-03-01',
    rawText: `APOLLO HEART CLINIC
Dr. Rajesh Verma, MD, DM (Cardiology)
Reg: DL-992144 | Date: 01-Mar-2026
Patient: Meera Sen, 58/F
Assessment: Essential Systemic Hypertension, Stage 2

Medications Prescribed:
1. Tab. Telmisartan 40 mg - Once daily (OD) in morning - Duration: 60 days
2. Tab. Amlodipine 5 mg - Once daily (OD) at bedtime - Duration: 60 days
3. Tab. Pantoprazole 40 mg - Once daily (OD) before breakfast - Duration: 14 days

Instructions:
- Low sodium diet (< 2g/day)
- Monitor BP weekly at home`
  },
  {
    id: 'sample-unseen-lab-01',
    name: 'Unseen_Thyroid_Kidney_Panel.txt',
    type: 'LAB_REPORT',
    label: '6. Unseen Lab Report (Thyroid & Renal Panel)',
    description: 'Laboratory diagnostic panel with Serum Creatinine, Blood Urea, and TSH.',
    mockDate: '2026-03-05',
    rawText: `LAL PATHLABS CLINICAL DIAGNOSTICS
Patient Name: Meera Sen | Ref By: Dr. Rajesh Verma
Date: 05-Mar-2026

LABORATORY INVESTIGATION REPORT
Test Name                     Observed Value   Unit      Reference Range   Status
---------------------------------------------------------------------------------
Serum Creatinine              1.65             mg/dL     0.60 - 1.20       HIGH
Blood Urea Nitrogen           28.0             mg/dL     7.0 - 20.0        HIGH
TSH (Ultrasensitive)          2.40             uIU/mL    0.40 - 4.20       NORMAL
Total Serum Cholesterol       245.0            mg/dL     125.0 - 200.0     HIGH`
  }
];
