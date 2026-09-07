import { getAdaptiveSocratesQuestions } from '../ai-services/socratesEngine';
import { AYUSH_INTAKE_QUESTIONS } from '../ai-services/ayushEngine';
import { checkRedFlags } from '../clinical-rules/redFlags';
import { generateDoctorSummaryDraft } from '../ai-services/summaryGenerator';
import { PatientIdentity } from '../data-models/patient';
import { PatientCaseRecord } from '../data-models/intake';
import enTranslations from '../shared/translations/en.json';
import hiTranslations from '../shared/translations/hi.json';
import taTranslations from '../shared/translations/ta.json';

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

// 1. Adaptive Questioning Test (Patient A: Headache vs Patient B: Chest pain)
const patientAComplaint = "Mild headache for two days";
const patientBComplaint = "Severe chest pain with difficulty breathing";

const questionsA = getAdaptiveSocratesQuestions(patientAComplaint);
const questionsB = getAdaptiveSocratesQuestions(patientBComplaint);

const idsA = questionsA.map(q => q.id);
const idsB = questionsB.map(q => q.id);

assert(
  idsA.includes('socrates_site_headache') && idsA.includes('socrates_character_headache'),
  'Adaptive Questioning: Patient A (Headache)',
  `Tailored questions generated: ${idsA.join(', ')}`
);

assert(
  idsB.includes('socrates_site_chest') && idsB.includes('socrates_character_chest'),
  'Adaptive Questioning: Patient B (Chest Pain)',
  `Tailored questions generated: ${idsB.join(', ')}`
);

assert(
  JSON.stringify(idsA) !== JSON.stringify(idsB),
  'Adaptive Question Paths Differ',
  `Path A (${idsA.length} questions) differs distinctly from Path B (${idsB.length} questions)`
);

// 2. Red Flag Detection Tests
const redFlagsA = checkRedFlags(patientAComplaint);
const redFlagsB = checkRedFlags(patientBComplaint);
const redFlagsHindi = checkRedFlags("सीने में तेज दर्द और सांस लेने में बहुत तकलीफ");
const redFlagsTamil = checkRedFlags("கடுமையான நெஞ்சு வலி மற்றும் மூச்சு திணறல்");

assert(
  redFlagsA.length === 0,
  'Red Flag: Non-emergency (Patient A)',
  'Zero red flags triggered for mild headache'
);

assert(
  redFlagsB.length >= 2 && redFlagsB.some(r => r.category === 'CARDIOVASCULAR') && redFlagsB.some(r => r.category === 'RESPIRATORY'),
  'Red Flag: Critical Emergency (Patient B)',
  `Detected ${redFlagsB.length} rules: ${redFlagsB.map(r => r.title).join('; ')}`
);

assert(
  redFlagsHindi.length > 0,
  'Red Flag Multilingual: Hindi detection',
  `Detected in Hindi: ${redFlagsHindi.map(r => r.title).join('; ')}`
);

assert(
  redFlagsTamil.length > 0,
  'Red Flag Multilingual: Tamil detection',
  `Detected in Tamil: ${redFlagsTamil.map(r => r.title).join('; ')}`
);

// 3. AYUSH Dashavidha Pariksha Mode Test
assert(
  AYUSH_INTAKE_QUESTIONS.length >= 6 &&
  AYUSH_INTAKE_QUESTIONS.some(q => q.step === 'AYUSH_PRAKRITI') &&
  AYUSH_INTAKE_QUESTIONS.some(q => q.step === 'AYUSH_AGNI') &&
  AYUSH_INTAKE_QUESTIONS.some(q => q.step === 'AYUSH_KOSHTHA'),
  'AYUSH Dashavidha Pariksha Flow',
  `Contains ${AYUSH_INTAKE_QUESTIONS.length} parameters covering Prakriti, Agni, Koshtha, Ahara Shakti, Vyayama Shakti`
);

// 4. Physician Summary Generation Test
const mockPatient: PatientIdentity = {
  id: 'pat-test-01',
  fullName: 'Ananya Sharma',
  age: 28,
  gender: 'female',
  phoneNumber: '+91 98765 43210',
  abhaId: '91-4562-7819-1234',
  preferredLanguage: 'en',
  createdAt: new Date().toISOString()
};

const mockCase: PatientCaseRecord = {
  caseId: 'case-test-01',
  patientId: mockPatient.id,
  mode: 'GENERAL_CLINICAL',
  status: 'COMPLETED',
  chiefComplaint: patientAComplaint,
  language: 'en',
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
  redFlagsDetected: [],
  answers: [
    {
      questionId: 'socrates_chief_complaint',
      step: 'CHIEF_COMPLAINT',
      customText: patientAComplaint,
      timestamp: new Date().toISOString()
    },
    {
      questionId: 'socrates_site_headache',
      step: 'SOCRATES_SITE',
      selectedOptionIds: ['Forehead & Eyebrows (Frontal)'],
      customText: 'Both sides of forehead',
      timestamp: new Date().toISOString()
    },
    {
      questionId: 'socrates_character_headache',
      step: 'SOCRATES_CHARACTER',
      selectedOptionIds: ['Dull heavy pressure / Tension'],
      timestamp: new Date().toISOString()
    },
    {
      questionId: 'socrates_severity_headache',
      step: 'SOCRATES_SEVERITY',
      selectedOptionIds: ['1 - 3 (Mild, can work easily)'],
      timestamp: new Date().toISOString()
    }
  ]
};

const summary = generateDoctorSummaryDraft(mockPatient, mockCase);

assert(
  summary.patientName === 'Ananya Sharma' &&
  Boolean(summary.hpiStructured.location?.toLowerCase().includes('forehead')) &&
  Boolean(summary.hpiStructured.character?.toLowerCase().includes('dull heavy pressure')) &&
  summary.clinicalDisclaimer.includes('AI-GENERATED INTAKE DRAFT'),
  'Doctor Summary Synthesis',
  'Summary draft correctly organized HPI with safety disclaimer'
);

// 5. Multilingual Translation Key Parity
function checkKeysMatch(base: any, target: any, lang: string): boolean {
  for (const k in base) {
    if (typeof base[k] === 'object') {
      if (!target[k] || !checkKeysMatch(base[k], target[k], lang)) return false;
    } else {
      if (!target[k]) return false;
    }
  }
  return true;
}

const hiMatch = checkKeysMatch(enTranslations, hiTranslations, 'Hindi');
const taMatch = checkKeysMatch(enTranslations, taTranslations, 'Tamil');

assert(hiMatch, 'Translation Completeness: Hindi (hi.json)', 'All translation keys present in Hindi');
assert(taMatch, 'Translation Completeness: Tamil (ta.json)', 'All translation keys present in Tamil');

console.log('=== PHASE 1 VERIFICATION TEST RUNNER ===');
let passCount = 0;
results.forEach((r, idx) => {
  if (r.passed) passCount++;
  console.log(`[${r.passed ? 'PASS' : 'FAIL'}] Test ${idx + 1}: ${r.name}`);
  console.log(`       Details: ${r.details}`);
});
console.log(`\nTOTAL: ${passCount} / ${results.length} PASSED.`);
