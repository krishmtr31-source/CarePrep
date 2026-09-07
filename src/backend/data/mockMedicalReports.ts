export interface HardcodedMedicalReport {
  reportId: string;
  patientId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  processingStatus: 'COMPLETED';
  extractedData?: Record<string, any>;
  labResults: Array<{
    testName: string;
    value: string;
    numericValue?: number;
    unit: string;
    referenceRange?: string;
    status: string;
    isAbnormal: boolean;
  }>;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration?: string;
  }>;
  diagnoses: string[];
  hospitalDetails: {
    facilityName: string;
    doctorName: string;
    reportDate: string;
  };
  aiSummary: {
    mainPurpose: string;
    keyFindings: string[];
    importantObservations: string[];
    patientFriendlySummary: string;
    doctorReviewSummary: string;
  };
  sourceDocumentReference: string;
}

export const HARDCODED_MEDICAL_REPORTS: HardcodedMedicalReport[] = [
  {
    reportId: 'sample-001',
    patientId: 'patient-demo-01',
    fileName: 'Comprehensive_Metabolic_Lipid_Panel.pdf',
    fileType: 'pdf',
    fileSize: 245800,
    uploadedAt: '2025-01-15T09:30:00.000Z',
    processingStatus: 'COMPLETED',
    labResults: [
      {
        testName: 'Fasting Blood Glucose',
        value: '118',
        numericValue: 118,
        unit: 'mg/dL',
        referenceRange: '70-99',
        status: 'high',
        isAbnormal: true,
      },
      {
        testName: 'HbA1c (Glycated Hemoglobin)',
        value: '6.1',
        numericValue: 6.1,
        unit: '%',
        referenceRange: '4.0-5.6',
        status: 'high',
        isAbnormal: true,
      },
      {
        testName: 'Total Cholesterol',
        value: '235',
        numericValue: 235,
        unit: 'mg/dL',
        referenceRange: '<200',
        status: 'high',
        isAbnormal: true,
      },
      {
        testName: 'LDL Cholesterol',
        value: '154',
        numericValue: 154,
        unit: 'mg/dL',
        referenceRange: '<100',
        status: 'high',
        isAbnormal: true,
      },
      {
        testName: 'HDL Cholesterol',
        value: '42',
        numericValue: 42,
        unit: 'mg/dL',
        referenceRange: '>40',
        status: 'normal',
        isAbnormal: false,
      },
      {
        testName: 'Serum Triglycerides',
        value: '195',
        numericValue: 195,
        unit: 'mg/dL',
        referenceRange: '<150',
        status: 'high',
        isAbnormal: true,
      },
      {
        testName: 'Serum Creatinine',
        value: '0.92',
        numericValue: 0.92,
        unit: 'mg/dL',
        referenceRange: '0.6-1.2',
        status: 'normal',
        isAbnormal: false,
      },
      {
        testName: 'Estimated GFR (eGFR)',
        value: '95',
        numericValue: 95,
        unit: 'mL/min/1.73m2',
        referenceRange: '>60',
        status: 'normal',
        isAbnormal: false,
      },
    ],
    medications: [
      {
        name: 'Atorvastatin Calcium',
        dosage: '20mg',
        frequency: 'Once daily at bedtime',
        duration: '90 days',
      },
      {
        name: 'Metformin Hydrochloride',
        dosage: '500mg',
        frequency: 'Twice daily with meals',
        duration: '90 days',
      },
    ],
    diagnoses: [
      'Mixed Hyperlipidemia (ICD-10 E78.2)',
      'Impaired Fasting Glucose / Pre-diabetes (ICD-10 R73.01)',
      'Borderline Stage 1 Essential Hypertension',
    ],
    hospitalDetails: {
      facilityName: 'Metro General Hospital & Diagnostic Center',
      doctorName: 'Dr. Priya Sharma, MD (Internal Medicine)',
      reportDate: '2025-01-14',
    },
    aiSummary: {
      mainPurpose: 'Annual metabolic and cardiovascular risk profile assessment.',
      keyFindings: [
        'Fasting glucose (118 mg/dL) and HbA1c (6.1%) indicate pre-diabetes requiring glycemic intervention.',
        'Total cholesterol (235 mg/dL), LDL (154 mg/dL), and Triglycerides (195 mg/dL) are significantly elevated above healthy targets.',
      ],
      importantObservations: [
        'Renal function tests (eGFR 95, Serum Creatinine 0.92 mg/dL) are completely normal, permitting safe statin and metformin dosing.',
        'Lifestyle modifications: 30 minutes daily aerobic exercise and low glycemic/low saturated fat diet recommended.',
      ],
      patientFriendlySummary:
        'Your blood work highlights mildly elevated blood sugar (pre-diabetes) and cholesterol numbers above normal limits. Your kidneys and vital metabolic organs are completely healthy. Incorporating daily walking, cutting refined sugars, and taking your prescribed medications will bring your levels back to normal.',
      doctorReviewSummary:
        'Patient exhibits early metabolic syndrome features: impaired fasting glucose and atherogenic dyslipidemia. Initiated Atorvastatin 20mg nocte and Metformin 500mg bd. Recheck fasting lipid panel and HbA1c in 12 weeks.',
    },
    sourceDocumentReference: 'DOC-METRO-2025-0114',
  },
  {
    reportId: 'sample-002',
    patientId: 'patient-demo-01',
    fileName: 'Chest_XRay_Digital_PA.pdf',
    fileType: 'pdf',
    fileSize: 1845000,
    uploadedAt: '2025-02-04T14:15:00.000Z',
    processingStatus: 'COMPLETED',
    labResults: [
      {
        testName: 'SpO2 (Pulse Oximetry)',
        value: '96',
        numericValue: 96,
        unit: '%',
        referenceRange: '95-100',
        status: 'normal',
        isAbnormal: false,
      },
      {
        testName: 'Respiratory Rate',
        value: '18',
        numericValue: 18,
        unit: 'breaths/min',
        referenceRange: '12-20',
        status: 'normal',
        isAbnormal: false,
      },
      {
        testName: 'Serum C-Reactive Protein (CRP)',
        value: '28.4',
        numericValue: 28.4,
        unit: 'mg/L',
        referenceRange: '<5.0',
        status: 'high',
        isAbnormal: true,
      },
    ],
    medications: [
      {
        name: 'Amoxicillin + Potassium Clavulanate (Augmentin)',
        dosage: '625mg',
        frequency: 'Every 8 hours after meals',
        duration: '7 days',
      },
      {
        name: 'Levocetirizine + Montelukast',
        dosage: '5mg / 10mg',
        frequency: 'Once daily at bedtime',
        duration: '10 days',
      },
      {
        name: 'Paracetamol',
        dosage: '650mg',
        frequency: 'Every 6 hours as needed for fever/pain',
        duration: '5 days',
      },
    ],
    diagnoses: [
      'Right Lower Lobe Bronchopneumonia (ICD-10 J18.0)',
      'Resolving Acute Tracheobronchitis',
    ],
    hospitalDetails: {
      facilityName: 'Apex Multi-Specialty Hospital, Pulmonology Wing',
      doctorName: 'Dr. Rajesh Deshmukh, MD (Pulmonology)',
      reportDate: '2025-02-04',
    },
    aiSummary: {
      mainPurpose:
        'Diagnostic evaluation of persistent productive cough, pleuritic chest discomfort, and low-grade pyrexia.',
      keyFindings: [
        'Focal ill-defined patchy alveolar consolidation observed in right lower lung field, consistent with acute bronchopneumonia.',
        'No pleural effusion, pneumothorax, or hilar adenopathy detected; cardiothoracic ratio is normal (<0.5).',
      ],
      importantObservations: [
        'Elevated CRP (28.4 mg/L) corroborates active acute inflammatory response of bacterial etiology.',
        'SpO2 stable on room air (96%); patient remains hemodynamically stable without respiratory distress.',
      ],
      patientFriendlySummary:
        'Your chest X-ray explains your persistent cough and fever: there is a localized mild chest infection (pneumonia) in the bottom of your right lung. Your heart and the rest of your lungs look clear. Taking the full 7-day antibiotic course will clear up the infection completely.',
      doctorReviewSummary:
        'Radiological confirmation of community-acquired right lower lobe pneumonia. High-sensitivity inflammatory markers elevated. Prescribed oral Augmentin 625mg tid and bronchodilator support. Advised follow-up review if shortness of breath or persistent fevers occur.',
    },
    sourceDocumentReference: 'DOC-APEX-2025-0204',
  },
  {
    reportId: 'sample-003',
    patientId: 'patient-demo-01',
    fileName: 'Cardiology_ECG_Echo_Report.pdf',
    fileType: 'pdf',
    fileSize: 524000,
    uploadedAt: '2025-02-18T11:00:00.000Z',
    processingStatus: 'COMPLETED',
    labResults: [
      {
        testName: 'Heart Rate (Resting)',
        value: '74',
        numericValue: 74,
        unit: 'bpm',
        referenceRange: '60-100',
        status: 'normal',
        isAbnormal: false,
      },
      {
        testName: 'PR Interval',
        value: '158',
        numericValue: 158,
        unit: 'ms',
        referenceRange: '120-200',
        status: 'normal',
        isAbnormal: false,
      },
      {
        testName: 'QRS Duration',
        value: '92',
        numericValue: 92,
        unit: 'ms',
        referenceRange: '80-120',
        status: 'normal',
        isAbnormal: false,
      },
      {
        testName: 'QTc Interval (Bazett)',
        value: '418',
        numericValue: 418,
        unit: 'ms',
        referenceRange: '<440',
        status: 'normal',
        isAbnormal: false,
      },
      {
        testName: 'Left Ventricular Ejection Fraction (LVEF)',
        value: '62',
        numericValue: 62,
        unit: '%',
        referenceRange: '55-70',
        status: 'normal',
        isAbnormal: false,
      },
      {
        testName: 'Serum Potassium',
        value: '4.2',
        numericValue: 4.2,
        unit: 'mEq/L',
        referenceRange: '3.5-5.0',
        status: 'normal',
        isAbnormal: false,
      },
    ],
    medications: [
      {
        name: 'Metoprolol Succinate ER',
        dosage: '25mg',
        frequency: 'Once daily in the morning',
        duration: '30 days',
      },
    ],
    diagnoses: [
      'Normal Sinus Rhythm with Occasional Premature Ventricular Contractions (PVCs) (ICD-10 I49.3)',
      'Normal Left Ventricular Systolic Function (LVEF 62%)',
      'No Structural or Valvular Heart Disease',
    ],
    hospitalDetails: {
      facilityName: 'National Heart Institute & Research Foundation',
      doctorName: 'Dr. Arvind Swaminathan, DM (Cardiology)',
      reportDate: '2025-02-18',
    },
    aiSummary: {
      mainPurpose:
        'Investigation of episodic palpitations, mild exertion-induced flutter sensations, and syncope exclusion.',
      keyFindings: [
        '12-lead ECG demonstrates normal sinus rhythm at 74 bpm with rare, isolated benign unifocal PVCs.',
        'Transthoracic 2D Echocardiogram shows well-preserved left ventricular systolic function with an ejection fraction of 62%.',
      ],
      importantObservations: [
        'No regional wall motion abnormalities, pathological murmurs, or valvular regurgitation identified.',
        'Cardiac chambers are within normal size; normal electrolyte panel (Potassium 4.2 mEq/L).',
      ],
      patientFriendlySummary:
        'Your cardiac tests are reassuring! Your heart pumps at an optimal efficiency of 62% and all heart valves are in excellent structural condition. The fluttering sensation you felt is caused by harmless extra heartbeats (PVCs), which settle down with low-dose heart medication, hydration, and reducing caffeine.',
      doctorReviewSummary:
        'Normal 2D Echocardiogram (LVEF 62%) with benign isolated ventricular ectopy on ECG. No ischemic ST-T abnormalities or QT prolongation. Low-dose beta-blocker (Metoprolol 25mg OD) prescribed for symptom suppression. Patient counseled on stress reduction and limiting stimulants.',
    },
    sourceDocumentReference: 'DOC-NHI-2025-0218',
  },
  {
    reportId: 'sample-004',
    patientId: 'patient-demo-01',
    fileName: 'CBC_Thyroid_Profile.pdf',
    fileType: 'pdf',
    fileSize: 312000,
    uploadedAt: '2025-03-01T08:45:00.000Z',
    processingStatus: 'COMPLETED',
    labResults: [
      {
        testName: 'Hemoglobin (Hb)',
        value: '10.8',
        numericValue: 10.8,
        unit: 'g/dL',
        referenceRange: '12.0-16.0',
        status: 'low',
        isAbnormal: true,
      },
      {
        testName: 'Total RBC Count',
        value: '3.9',
        numericValue: 3.9,
        unit: 'million/mcL',
        referenceRange: '4.2-5.4',
        status: 'low',
        isAbnormal: true,
      },
      {
        testName: 'Mean Corpuscular Volume (MCV)',
        value: '74.2',
        numericValue: 74.2,
        unit: 'fL',
        referenceRange: '80.0-96.0',
        status: 'low',
        isAbnormal: true,
      },
      {
        testName: 'Platelet Count',
        value: '265,000',
        numericValue: 265000,
        unit: '/mcL',
        referenceRange: '150,000-450,000',
        status: 'normal',
        isAbnormal: false,
      },
      {
        testName: 'Thyroid Stimulating Hormone (TSH)',
        value: '6.45',
        numericValue: 6.45,
        unit: 'uIU/mL',
        referenceRange: '0.40-4.50',
        status: 'high',
        isAbnormal: true,
      },
      {
        testName: 'Free Thyroxine (FT4)',
        value: '1.15',
        numericValue: 1.15,
        unit: 'ng/dL',
        referenceRange: '0.80-1.80',
        status: 'normal',
        isAbnormal: false,
      },
      {
        testName: 'Serum Ferritin',
        value: '14',
        numericValue: 14,
        unit: 'ng/mL',
        referenceRange: '20-200',
        status: 'low',
        isAbnormal: true,
      },
    ],
    medications: [
      {
        name: 'Ferrous Ascorbate + Folic Acid',
        dosage: '100mg / 1.5mg',
        frequency: 'Once daily after dinner',
        duration: '60 days',
      },
      {
        name: 'Levothyroxine Sodium',
        dosage: '25mcg',
        frequency: 'Once daily early morning on empty stomach',
        duration: '90 days',
      },
      {
        name: 'Vitamin C (Ascorbic Acid)',
        dosage: '500mg',
        frequency: 'Once daily with iron supplement',
        duration: '60 days',
      },
    ],
    diagnoses: [
      'Microcytic Hypochromic Iron Deficiency Anemia (ICD-10 D50.9)',
      'Subclinical Hypothyroidism (ICD-10 E02)',
    ],
    hospitalDetails: {
      facilityName: 'CarePlus Clinical Laboratories & Endocrine Center',
      doctorName: 'Dr. Sunita Nambiar, MD (Endocrinology)',
      reportDate: '2025-03-01',
    },
    aiSummary: {
      mainPurpose:
        'Diagnostic evaluation of chronic daytime fatigue, hair thinning, poor stamina, and cold sensitivity.',
      keyFindings: [
        'Hemoglobin (10.8 g/dL), MCV (74.2 fL), and depleted Ferritin (14 ng/mL) confirm mild microcytic iron-deficiency anemia.',
        'Elevated TSH (6.45 uIU/mL) alongside normal Free T4 (1.15 ng/dL) indicates subclinical primary hypothyroidism.',
      ],
      importantObservations: [
        'Platelets and differential leukocyte count are strictly within normal reference limits, excluding marrow suppression.',
        'Iron supplement should be taken with Vitamin C and avoided within 2 hours of dairy or caffeine to optimize gut absorption.',
      ],
      patientFriendlySummary:
        'Your test results explain why you have felt tired and drained: you have mild iron-deficiency anemia (low red blood cells and iron stores) and a slightly underactive thyroid. A daily iron tablet combined with Vitamin C and low-dose thyroid medication will replenish your iron stores and boost your energy.',
      doctorReviewSummary:
        'Evidence of mild iron deficiency anemia with depleted stores (Ferritin 14 ng/mL) and concomitant subclinical hypothyroidism (TSH 6.45 uIU/mL). Initiated oral iron with Vitamin C and Levothyroxine 25 mcg. Recommended repeat CBC and serum TSH in 8-10 weeks.',
    },
    sourceDocumentReference: 'DOC-CAREPLUS-2025-0301',
  },
];
