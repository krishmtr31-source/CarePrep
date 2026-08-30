import { PatientIdentity } from '../../data-models/patient';
import { PatientCaseRecord, IntakeAnswer } from '../../data-models/intake';
import { ExtractedDocumentData } from '../../document-intelligence/models/document';
import { SAMPLE_DOCUMENTS } from '../../document-intelligence/samples/sampleDocuments';
import { processDocumentText } from '../../document-intelligence/parsers/documentPipeline';
import { generateDoctorSummaryDraft } from '../../ai-services/summaryGenerator';
import { DoctorSummaryDraft } from '../../data-models/doctorSummary';

export interface DemoScenario {
  id: 'DEMO_A' | 'DEMO_B' | 'DEMO_C' | 'DEMO_D';
  name: string;
  badge: string;
  category: string;
  patient: PatientIdentity;
  caseRecord: PatientCaseRecord;
  documents: ExtractedDocumentData[];
  summary: DoctorSummaryDraft;
  description: string;
  highlights: string[];
}

// 1. DEMO A — Normal Patient (Abdominal Pain / पेट में दर्द)
const demoAPatient: PatientIdentity = {
  id: 'pat-demo-a',
  abhaId: '91-1001-2002-3003',
  fullName: 'Aarav Sharma (Sample Patient)',
  age: 34,
  gender: 'male',
  phoneNumber: '+91 98000 11111',
  city: 'Jaipur',
  preferredLanguage: 'hi',
  createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
};

const demoACase: PatientCaseRecord = {
  caseId: 'case-demo-a',
  patientId: 'pat-demo-a',
  mode: 'GENERAL_CLINICAL',
  status: 'COMPLETED',
  chiefComplaint: 'Mujhe 3 din se pet mein dard hai (Stomach pain for 3 days)',
  language: 'hi',
  startedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  completedAt: new Date(Date.now() - 3600000 * 1.8).toISOString(),
  redFlagsDetected: [],
  answers: [
    {
      questionId: 'socrates_chief_complaint',
      step: 'CHIEF_COMPLAINT',
      selectedOptionIds: ['Acidity, Gas & Stomach Discomfort'],
      customText: 'Mujhe 3 din se pet ke nichle hisse mein dard hai.',
      rawPatientResponse: 'Mujhe 3 din se pet ke nichle hisse mein dard hai.',
      audioProvenance: 'VOICE',
      timestamp: new Date().toISOString()
    },
    {
      questionId: 'socrates_site_general',
      step: 'SOCRATES_SITE',
      selectedOptionIds: ['Lower abdomen (Pet ka nichla hissa)'],
      customText: 'Lower right abdomen discomfort.',
      rawPatientResponse: 'Lower right abdomen discomfort.',
      audioProvenance: 'TOUCH_CHIP',
      timestamp: new Date().toISOString()
    },
    {
      questionId: 'socrates_character_general',
      step: 'SOCRATES_CHARACTER',
      selectedOptionIds: ['Dull aching pain (Meetha dard)'],
      customText: 'Mild cramping after meals.',
      rawPatientResponse: 'Mild cramping after meals.',
      audioProvenance: 'TOUCH_CHIP',
      timestamp: new Date().toISOString()
    },
    {
      questionId: 'socrates_severity_general',
      step: 'SOCRATES_SEVERITY',
      selectedOptionIds: ['4 - 6 (Moderate, limits some activities)'],
      customText: 'Moderate severity (5/10)',
      rawPatientResponse: 'Moderate severity (5/10)',
      audioProvenance: 'TYPED',
      timestamp: new Date().toISOString()
    }
  ]
};

// 2. DEMO B — Emergency Red Flag Presentation (Chest Pain + Shortness of Breath)
const demoBPatient: PatientIdentity = {
  id: 'pat-demo-b',
  abhaId: '88-4444-5555-6666',
  fullName: 'Sunil Kumar (Sample Emergency Case)',
  age: 58,
  gender: 'male',
  phoneNumber: '+91 98111 22222',
  city: 'New Delhi',
  preferredLanguage: 'en',
  createdAt: new Date(Date.now() - 1800000).toISOString()
};

const demoBCase: PatientCaseRecord = {
  caseId: 'case-demo-b',
  patientId: 'pat-demo-b',
  mode: 'GENERAL_CLINICAL',
  status: 'IN_PROGRESS',
  chiefComplaint: 'Severe crushing chest pain radiating to left arm with difficulty breathing',
  language: 'en',
  startedAt: new Date(Date.now() - 1800000).toISOString(),
  completedAt: new Date().toISOString(),
  redFlagsDetected: ['RED_ACS_01', 'RED_DYSPNEA_01'],
  answers: [
    {
      questionId: 'socrates_chief_complaint',
      step: 'CHIEF_COMPLAINT',
      selectedOptionIds: ['Chest Discomfort, Heavy Sensation or Pain'],
      customText: 'I feel a heavy crushing pressure in center of chest radiating to my left arm.',
      rawPatientResponse: 'I feel a heavy crushing pressure in center of chest radiating to my left arm.',
      audioProvenance: 'VOICE',
      timestamp: new Date().toISOString()
    },
    {
      questionId: 'socrates_associated_general',
      step: 'SOCRATES_ASSOCIATION',
      selectedOptionIds: ['Severe breathlessness, sweating and dizziness'],
      customText: 'Cold sweats and extreme shortness of breath.',
      rawPatientResponse: 'Cold sweats and extreme shortness of breath.',
      audioProvenance: 'VOICE',
      timestamp: new Date().toISOString()
    }
  ]
};

// 3. DEMO C — Document-Heavy Patient (Prescription + High HbA1c Lab + Discharge Summary)
const demoCPatient: PatientIdentity = {
  id: 'pat-demo-c',
  abhaId: '14-7777-8888-9999',
  fullName: 'Devendra Patel (Sample Multi-Doc Case)',
  age: 62,
  gender: 'male',
  phoneNumber: '+91 94222 33333',
  city: 'Ahmedabad',
  preferredLanguage: 'en',
  createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
};

const demoCDocs: ExtractedDocumentData[] = SAMPLE_DOCUMENTS.slice(0, 3).map(s => {
  const doc = processDocumentText(s.rawText, s.name, 'sample', s.type);
  doc.patientId = 'pat-demo-c';
  doc.caseId = 'case-demo-c';
  return doc;
});

const demoCCase: PatientCaseRecord = {
  caseId: 'case-demo-c',
  patientId: 'pat-demo-c',
  mode: 'GENERAL_CLINICAL',
  status: 'COMPLETED',
  chiefComplaint: 'Follow-up for chronic diabetes management and recent fatigue',
  language: 'en',
  startedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  completedAt: new Date(Date.now() - 86400000 * 2.8).toISOString(),
  redFlagsDetected: [],
  answers: [
    {
      questionId: 'socrates_chief_complaint',
      step: 'CHIEF_COMPLAINT',
      selectedOptionIds: ['Diabetes Follow-Up & Fatigue'],
      customText: 'Here for routine follow-up with previous prescription and latest blood reports.',
      rawPatientResponse: 'Here for routine follow-up with previous prescription and latest blood reports.',
      audioProvenance: 'VOICE',
      timestamp: new Date().toISOString()
    }
  ]
};

// 4. DEMO D — AYUSH Intake (Dashavidha Pariksha)
const demoDPatient: PatientIdentity = {
  id: 'pat-demo-d',
  abhaId: '45-3333-2222-1111',
  fullName: 'Ananya Iyer (Sample AYUSH Intake)',
  age: 42,
  gender: 'female',
  phoneNumber: '+91 97000 44444',
  city: 'Chennai',
  preferredLanguage: 'en',
  createdAt: new Date(Date.now() - 86400000).toISOString()
};

const demoDCase: PatientCaseRecord = {
  caseId: 'case-demo-d',
  patientId: 'pat-demo-d',
  mode: 'AYUSH',
  status: 'COMPLETED',
  chiefComplaint: 'Chronic joint stiffness, dry skin and sluggish digestion (Sandhivata / Agnimandya)',
  language: 'en',
  startedAt: new Date(Date.now() - 86400000).toISOString(),
  completedAt: new Date(Date.now() - 86400000 + 1200000).toISOString(),
  redFlagsDetected: [],
  answers: [
    {
      questionId: 'ayush_chief_complaint',
      step: 'CHIEF_COMPLAINT',
      selectedOptionIds: ['Joint Pain, Stiffness & Sciatica (Sandhivata / Kati Shula)'],
      customText: 'Stiffness in knee joints and low energy after evening.',
      rawPatientResponse: 'Stiffness in knee joints and low energy after evening.',
      audioProvenance: 'VOICE',
      timestamp: new Date().toISOString()
    },
    {
      questionId: 'ayush_prakriti_q',
      step: 'AYUSH_PRAKRITI',
      selectedOptionIds: ['Vata Predominant (Lean, Light, Quick, Sensitive to cold, Dry skin)'],
      customText: 'Prone to body coldness and joint cracking sounds.',
      rawPatientResponse: 'Prone to body coldness and joint cracking sounds.',
      audioProvenance: 'TOUCH_CHIP',
      timestamp: new Date().toISOString()
    },
    {
      questionId: 'ayush_agni_q',
      step: 'AYUSH_AGNI',
      selectedOptionIds: ['Vishamagni (Irregular: sometimes intense hunger, sometimes no appetite)'],
      customText: 'Irregular appetite with mild gas.',
      rawPatientResponse: 'Irregular appetite with mild gas.',
      audioProvenance: 'TYPED',
      timestamp: new Date().toISOString()
    }
  ]
};

export const DEMO_SCENARIOS: Record<string, DemoScenario> = {
  DEMO_A: {
    id: 'DEMO_A',
    name: 'Normal Patient (Abdominal Pain / पेट में दर्द)',
    badge: 'Standard Intake',
    category: 'General Clinical (Multilingual)',
    patient: demoAPatient,
    caseRecord: demoACase,
    documents: [],
    summary: generateDoctorSummaryDraft(demoAPatient, demoACase, []),
    description: 'Patient reports 3-day abdominal pain in Hindi. Progresses through SOCRATES questions, verifies GREEN safety status, and prepares clean physician summary draft.',
    highlights: [
      'Hindi / English speech parsing & transcription',
      'Adaptive SOCRATES abdominal pain pathway',
      'Deterministic GREEN triage (Safe for outpatient review)',
      'Clean Version 1 structured draft'
    ]
  },
  DEMO_B: {
    id: 'DEMO_B',
    name: 'Emergency Red-Flag Gate (Chest Pain + Dyspnea)',
    badge: 'Emergency Triage',
    category: 'Safety Controller Priority',
    patient: demoBPatient,
    caseRecord: demoBCase,
    documents: [],
    summary: generateDoctorSummaryDraft(demoBPatient, demoBCase, []),
    description: 'Patient speaks symptoms of crushing retrosternal pain and shortness of breath. Deterministic Safety Controller intercepts immediately into RED Emergency Triage.',
    highlights: [
      'Instant RED emergency triage intercept',
      'Suspected Acute Coronary Syndrome & Dyspnea alerts',
      'Mandatory "Human triage required" guidance',
      'Zero false-negative bypass risk'
    ]
  },
  DEMO_C: {
    id: 'DEMO_C',
    name: 'Document-Heavy Patient (3 Medical Records)',
    badge: 'Document Intelligence',
    category: 'OCR & Timeline Synthesis',
    patient: demoCPatient,
    caseRecord: demoCCase,
    documents: demoCDocs,
    summary: generateDoctorSummaryDraft(demoCPatient, demoCCase, demoCDocs),
    description: 'Ingests prescription, high-abnormality laboratory report (HbA1c 8.6% HIGH), and discharge summary with chronological timeline and clickable source evidence.',
    highlights: [
      'Prescription & dosage extraction (Metformin, Atorvastatin)',
      'Lab abnormality detection (HbA1c 8.6% HIGH, Glucose 168 mg/dL)',
      'Chronological clinical event timeline',
      'Verbatim document source snippet links'
    ]
  },
  DEMO_D: {
    id: 'DEMO_D',
    name: 'AYUSH Holistic Pathway (Dashavidha Pariksha)',
    badge: 'AYUSH Assessment',
    category: 'Holistic Constitutional Intake',
    patient: demoDPatient,
    caseRecord: demoDCase,
    documents: [],
    summary: generateDoctorSummaryDraft(demoDPatient, demoDCase, []),
    description: 'Patient completes AYUSH intake with Dashavidha Pariksha parameters (Prakriti, Agni, Koshtha) with clear demarcation for physician clinical examination.',
    highlights: [
      'Patient-reported Prakriti & Agni indicators',
      'Dashavidha Pariksha clinical structure',
      'Mandatory clinician Nadi Pariksha notice',
      'Full deterministic safety screening active'
    ]
  }
};
