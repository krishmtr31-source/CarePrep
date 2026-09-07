import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Heart, 
  Pill, 
  Activity, 
  ShieldAlert, 
  FileText, 
  Sparkles,
  Check,
  Stethoscope,
  ChevronRight,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  Hospital,
  X
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useIntake } from '../../shared/contexts/IntakeContext';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { localStore } from '../../backend/storage/localStore';
import { PatientIdentity } from '../../data-models/patient';
import { PatientCaseRecord } from '../../data-models/intake';
import { checkRedFlags } from '../../clinical-rules/redFlags';
import { GlassCard, AnimatedButton, StatusBadge } from '../../shared/components/ui/DesignSystem';
import { carePrepApi } from '../../shared/api/apiClient';
import { VoiceAnswerInput } from '../components/VoiceAnswerInput';
import { detectRedFlags, RedFlagAnalysisResult } from '../../ai-services/redFlagDetection';
import { RedFlagAlertBanner } from '../components/RedFlagAlertBanner';
import { HealthcareDiscoveryView } from '../components/HealthcareDiscoveryView';

interface PatientMultiStepFormProps {
  onComplete: (caseId: string) => void;
  onCancel?: () => void;
}

const STEPS = [
  { id: 1, name: 'Personal Information' },
  { id: 2, name: 'Medical History' },
  { id: 3, name: 'Symptoms' },
  { id: 4, name: 'Medications' },
  { id: 5, name: 'Allergies' },
  { id: 6, name: 'Lifestyle' },
  { id: 7, name: 'Review' },
  { id: 8, name: 'Submit' }
];

export const PatientMultiStepForm: React.FC<PatientMultiStepFormProps> = ({
  onComplete,
  onCancel
}) => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { patient, setPatient, mode, setMode } = useIntake();

  // Storage key for saving incomplete form progress so refresh doesn't destroy user inputs
  const DRAFT_STORAGE_KEY = `careprep_form_draft_${patient?.id || user?.id || 'guest'}`;

  // Helper to load persisted draft
  const loadSavedDraft = () => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  };

  const initialDraft = loadSavedDraft();

  const [currentStep, setCurrentStep] = useState<number>(() => initialDraft?.currentStep || 1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [generatedCaseId, setGeneratedCaseId] = useState<string>('');

  // Phase 2: AI-Assisted Red-Flag Detection State
  const [redFlagAnalysis, setRedFlagAnalysis] = useState<RedFlagAnalysisResult | null>(() => initialDraft?.redFlagAnalysis || null);
  const [isAnalyzingRedFlags, setIsAnalyzingRedFlags] = useState<boolean>(false);
  const [acknowledgedRedFlagRisk, setAcknowledgedRedFlagRisk] = useState<string | null>(() => initialDraft?.acknowledgedRedFlagRisk || null);
  const [isHospitalModalOpen, setIsHospitalModalOpen] = useState<boolean>(false);

  // 1. Personal Information State (initialized from draft, active patient, or auth user)
  const [personalInfo, setPersonalInfo] = useState(() => initialDraft?.personalInfo || {
    fullName: patient?.fullName || user?.name || '',
    age: (patient?.age !== undefined && patient?.age !== null) ? String(patient.age) : '',
    gender: patient?.gender || 'male',
    phoneNumber: patient?.phoneNumber || '',
    city: patient?.city || '',
    abhaId: patient?.abhaId || '',
    emergencyContact: patient?.emergencyContactPhone || ''
  });

  // 2. Medical History State
  const [medicalHistory, setMedicalHistory] = useState<string[]>(() => initialDraft?.medicalHistory || []);
  const [customCondition, setCustomCondition] = useState('');

  // 3. Symptoms State
  const [symptoms, setSymptoms] = useState(() => initialDraft?.symptoms || {
    chiefComplaint: '',
    duration: '',
    severity: 5,
    character: '',
    intakeMode: mode || 'GENERAL_CLINICAL'
  });

  // 4. Medications State
  const [medications, setMedications] = useState<Array<{ name: string; dosage: string; frequency: string }>>(() => initialDraft?.medications || []);
  const [newMed, setNewMed] = useState({ name: '', dosage: '', frequency: '' });

  // 5. Allergies State
  const [allergies, setAllergies] = useState<string[]>(() => initialDraft?.allergies || []);
  const [customAllergy, setCustomAllergy] = useState('');

  // 6. Lifestyle State
  const [lifestyle, setLifestyle] = useState(() => initialDraft?.lifestyle || {
    diet: 'Vegetarian (Satvik)',
    physicalActivity: 'Moderate (20-min morning walking)',
    sleepHours: '7-8 hours',
    habits: 'Non-smoker, no alcohol'
  });

  // Explicit Clinical & AI Structuring Consent State (SWASTHYA AI Compliance)
  const [patientConsent, setPatientConsent] = useState<boolean>(() => Boolean(initialDraft?.patientConsent));

  // Save form draft to localStorage whenever fields change (Refresh safety)
  useEffect(() => {
    if (isSubmitted) return;
    try {
      const draftPayload = {
        currentStep,
        personalInfo,
        medicalHistory,
        symptoms,
        medications,
        allergies,
        lifestyle,
        patientConsent,
        redFlagAnalysis,
        acknowledgedRedFlagRisk
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
    } catch (e) {}
  }, [currentStep, personalInfo, medicalHistory, symptoms, medications, allergies, lifestyle, patientConsent, redFlagAnalysis, acknowledgedRedFlagRisk, isSubmitted, DRAFT_STORAGE_KEY]);

  // Automatically track completed steps based on validations
  useEffect(() => {
    const completed: number[] = [];
    if (personalInfo.fullName.trim() && personalInfo.age && Number(personalInfo.age) > 0 && personalInfo.phoneNumber.trim() && patientConsent) {
      completed.push(1);
    }
    if (medicalHistory.length > 0) {
      completed.push(2);
    }
    if (symptoms.chiefComplaint.trim().length >= 3 && symptoms.duration.trim()) {
      completed.push(3);
    }
    if (medications.length >= 0) {
      completed.push(4); // Optional section
    }
    if (allergies.length > 0) {
      completed.push(5);
    }
    if (lifestyle.diet) {
      completed.push(6);
    }
    if (completed.includes(1) && completed.includes(3) && completed.includes(5) && patientConsent) {
      completed.push(7);
    }
    setCompletedSteps(completed);
  }, [personalInfo, medicalHistory, symptoms, medications, allergies, lifestyle, patientConsent]);

  // Validation: are all required steps (1, 3, 5) filled and consent granted?
  const isAllRequiredFilled = 
    Boolean(personalInfo.fullName.trim() && personalInfo.age && Number(personalInfo.age) > 0 && personalInfo.phoneNumber.trim()) &&
    Boolean(symptoms.chiefComplaint.trim().length >= 3 && symptoms.duration.trim()) &&
    allergies.length > 0 &&
    patientConsent;

  // Validate current step before advancing
  const validateStep = (stepNumber: number): boolean => {
    setValidationError(null);
    if (stepNumber === 1) {
      if (!personalInfo.fullName.trim()) {
        setValidationError('Please enter your full legal name.');
        return false;
      }
      if (!personalInfo.age || Number(personalInfo.age) <= 0 || Number(personalInfo.age) > 130) {
        setValidationError('Please enter a valid age in years (1 - 130).');
        return false;
      }
      if (!personalInfo.phoneNumber.trim() || personalInfo.phoneNumber.trim().length < 8) {
        setValidationError('Please enter a valid contact phone number.');
        return false;
      }
      if (!patientConsent) {
        setValidationError('Please provide consent for AI clinical intake structuring and secure transmission to your healthcare provider.');
        return false;
      }
    }
    if (stepNumber === 3) {
      if (!symptoms.chiefComplaint.trim() || symptoms.chiefComplaint.trim().length < 3) {
        setValidationError('Please enter your primary symptom or reason for visit (at least 3 characters).');
        return false;
      }
      if (!symptoms.duration.trim()) {
        setValidationError('Please specify how long you have experienced this symptom.');
        return false;
      }
    }
    if (stepNumber === 5) {
      if (allergies.length === 0) {
        setValidationError('Please select or add any allergies, or choose "No known drug allergies (NKDA)".');
        return false;
      }
    }
    return true;
  };

  const continueAfterRedFlag = () => {
    const currentSignature = (symptoms.chiefComplaint || '').trim().toLowerCase() + '::' + (symptoms.character || '').trim().toLowerCase();
    setAcknowledgedRedFlagRisk(currentSignature);
    if (currentStep < 8) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    // Phase 2: AI-Assisted Red-Flag Screening at workflow boundary (Step 3: Symptoms)
    if (currentStep === 3 && symptoms.chiefComplaint.trim().length >= 3) {
      const currentSignature = (symptoms.chiefComplaint || '').trim().toLowerCase() + '::' + (symptoms.character || '').trim().toLowerCase();
      if (acknowledgedRedFlagRisk !== currentSignature) {
        setIsAnalyzingRedFlags(true);
        try {
          const analysis = await detectRedFlags({
            patient: {
              age: personalInfo.age,
              gender: personalInfo.gender
            },
            symptoms: {
              primarySymptom: symptoms.chiefComplaint,
              duration: symptoms.duration,
              description: symptoms.character,
              painSeverity: symptoms.severity
            },
            medicalHistory,
            medications,
            allergies
          });

          setRedFlagAnalysis(analysis);
          setIsAnalyzingRedFlags(false);

          if (analysis.riskLevel === 'EMERGENCY' || analysis.riskLevel === 'HIGH') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return; // Prominently display alert; patient can click Continue Intake or Find Nearby Hospitals
          }
        } catch (e) {
          console.warn('[CarePrep Intake] Red flag screening error fallback:', e);
          setIsAnalyzingRedFlags(false);
        }
      }
    }

    if (currentStep < 8) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setValidationError(null);
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinalSubmit = () => {
    if (!isAllRequiredFilled) {
      setValidationError('Please ensure all required sections are completed before submitting.');
      return;
    }

    // 1. Run deterministic Red Flag clinical engine rules
    const combinedSymptomText = `${symptoms.chiefComplaint} ${symptoms.character} ${symptoms.duration}`;
    const detectedRedFlags = checkRedFlags(combinedSymptomText);

    // 2. Trigger celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    // 3. Save/Update Patient in localStore
    const newPat: PatientIdentity = {
      id: patient?.id || user?.id || `pat-${Date.now().toString(36)}`,
      fullName: personalInfo.fullName.trim(),
      age: Number(personalInfo.age) || 45,
      gender: personalInfo.gender as any,
      phoneNumber: personalInfo.phoneNumber.trim(),
      city: personalInfo.city.trim() || undefined,
      abhaId: personalInfo.abhaId.trim() || undefined,
      emergencyContactPhone: personalInfo.emergencyContact.trim() || undefined,
      preferredLanguage: language,
      createdAt: patient?.createdAt || new Date().toISOString()
    };
    localStore.savePatient(newPat);
    setPatient(newPat);

    // 4. Create Patient Case Record
    const caseId = `case-${Date.now().toString(36)}`;
    const existingCases = localStore.getCases();
    const tokenNumber = `CP-${Math.floor(100 + existingCases.length + 1)}`;
    const isRedFlag = detectedRedFlags.length > 0;

    const newCase: PatientCaseRecord = {
      caseId,
      patientId: newPat.id,
      tokenNumber,
      mode: (symptoms.intakeMode as any) || 'GENERAL_CLINICAL',
      status: isRedFlag ? 'RED_FLAG_TRIAGE' : 'COMPLETED',
      chiefComplaint: symptoms.chiefComplaint.trim(),
      language: language as any,
      startedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      completedAt: new Date().toISOString(),
      redFlagsDetected: detectedRedFlags.map(rf => rf.id),
      answers: [
        {
          questionId: 'chief_complaint',
          step: 'CHIEF_COMPLAINT',
          selectedOptionIds: [symptoms.chiefComplaint.trim()],
          customText: symptoms.character,
          rawPatientResponse: `${symptoms.chiefComplaint.trim()}. Severity: ${symptoms.severity}/10. Duration: ${symptoms.duration.trim()}.`,
          audioProvenance: 'TYPED',
          timestamp: new Date().toISOString()
        },
        {
          questionId: 'medical_history',
          step: 'PAST_HISTORY',
          selectedOptionIds: medicalHistory.length > 0 ? medicalHistory : ['No prior chronic conditions reported'],
          customText: medicalHistory.length > 0 ? medicalHistory.join(', ') : 'None reported',
          rawPatientResponse: medicalHistory.length > 0 ? medicalHistory.join(', ') : 'None reported',
          audioProvenance: 'TOUCH_CHIP',
          timestamp: new Date().toISOString()
        },
        {
          questionId: 'medications_active',
          step: 'MEDICATIONS',
          selectedOptionIds: medications.map(m => `${m.name} ${m.dosage}`.trim()),
          customText: medications.length > 0 ? medications.map(m => `${m.name} (${m.dosage}, ${m.frequency})`).join('; ') : 'None reported',
          rawPatientResponse: medications.length > 0 ? medications.map(m => `${m.name} (${m.dosage})`).join('; ') : 'None reported',
          audioProvenance: 'TYPED',
          timestamp: new Date().toISOString()
        },
        {
          questionId: 'allergies',
          step: 'ALLERGIES',
          selectedOptionIds: allergies,
          customText: allergies.join(', '),
          rawPatientResponse: allergies.join(', '),
          audioProvenance: 'TOUCH_CHIP',
          timestamp: new Date().toISOString()
        },
        {
          questionId: 'lifestyle_info',
          step: 'AYUSH_AHARA_SHAKTI',
          selectedOptionIds: [lifestyle.diet, lifestyle.physicalActivity, lifestyle.sleepHours, lifestyle.habits].filter(Boolean),
          customText: `Diet: ${lifestyle.diet}. Activity: ${lifestyle.physicalActivity}. Sleep: ${lifestyle.sleepHours}. Habits: ${lifestyle.habits}`,
          rawPatientResponse: `Diet: ${lifestyle.diet}. Habits: ${lifestyle.habits}`,
          audioProvenance: 'TOUCH_CHIP',
          timestamp: new Date().toISOString()
        }
      ]
    };

    // Save case to localStore (automatically triggers doctor summary generation)
    localStore.saveCase(newCase);

    // Save to permanent MongoDB Atlas database
    carePrepApi.updatePatientProfile({
      fullName: newPat.fullName,
      age: newPat.age,
      gender: newPat.gender,
      mobile: newPat.phoneNumber,
      city: newPat.city,
      abhaId: newPat.abhaId,
      preferredLanguage: newPat.preferredLanguage
    }).catch(e => console.warn('[MongoDB] Profile sync warning:', e));

    carePrepApi.updateMedicalHistory({
      existingConditions: medicalHistory.filter(c => c !== 'No Chronic Conditions'),
      allergies: allergies,
      currentMedications: medications,
      lifestyle: {
        diet: lifestyle.diet,
        physicalActivity: lifestyle.physicalActivity,
        sleepHours: lifestyle.sleepHours
      }
    }).catch(e => console.warn('[MongoDB] Medical history sync warning:', e));

    carePrepApi.saveAssessment({
      assessmentId: caseId,
      chiefComplaint: newCase.chiefComplaint,
      symptoms: [symptoms.chiefComplaint, symptoms.character].filter(Boolean),
      symptomDuration: symptoms.duration,
      socratesData: {
        severity: symptoms.severity,
        character: symptoms.character,
        duration: symptoms.duration
      },
      ayushData: {
        mode: newCase.mode
      },
      lifestyleData: lifestyle,
      triageStatus: (redFlagAnalysis?.riskLevel === 'EMERGENCY' || isRedFlag) ? 'RED_FLAG_TRIAGE' : 'NORMAL',
      priority: (redFlagAnalysis?.riskLevel === 'EMERGENCY' || isRedFlag) ? 'URGENT' : (redFlagAnalysis?.riskLevel === 'HIGH' ? 'PRIORITY' : 'ROUTINE'),
      status: (redFlagAnalysis?.riskLevel === 'EMERGENCY' || isRedFlag) ? 'RED_FLAG_TRIAGE' : 'SUBMITTED_TO_DOCTOR',
      tokenNumber,
      redFlagsDetected: redFlagAnalysis?.redFlagsDetected && redFlagAnalysis.redFlagsDetected.length > 0
        ? redFlagAnalysis.redFlagsDetected.map(r => r.symptom)
        : detectedRedFlags.map(rf => rf.id),
      answers: newCase.answers,
      language: language,
      aiRedFlagAnalysis: redFlagAnalysis || undefined
    }).catch(e => console.warn('[MongoDB] Assessment sync warning:', e));

    // Clear saved draft on completion
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (e) {}

    // Dispatch queue update event so doctor workstation refreshes in real-time
    window.dispatchEvent(new CustomEvent('careprep_queue_updated', { detail: { caseId } }));

    setGeneratedCaseId(caseId);
    setIsSubmitted(true);
  };

  const handleAddCondition = () => {
    if (customCondition.trim() && !medicalHistory.includes(customCondition.trim())) {
      setMedicalHistory(prev => [...prev.filter(c => c !== 'No Chronic Conditions'), customCondition.trim()]);
      setCustomCondition('');
    }
  };

  const handleAddMedication = () => {
    if (newMed.name.trim()) {
      setMedications(prev => [...prev, { ...newMed }]);
      setNewMed({ name: '', dosage: '', frequency: '' });
    }
  };

  const handleAddAllergy = () => {
    if (customAllergy.trim() && !allergies.includes(customAllergy.trim())) {
      setAllergies(prev => prev.filter(a => a !== 'No known drug allergies (NKDA)').concat(customAllergy.trim()));
      setCustomAllergy('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 space-y-6">
      {/* 1. Header & Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
            CarePrep Intake
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Pre-Consultation Clinical Intake Form
          </h2>
          <p className="text-xs text-slate-500">
            Step {currentStep} of 8: {STEPS[currentStep - 1]?.name}
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Exit Form
          </button>
        )}
      </div>

      {/* 2. Step Progress Indicator */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {STEPS.map((step) => {
            const isCurrent = currentStep === step.id;
            const isCompleted = completedSteps.includes(step.id);

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (completedSteps.includes(step.id) || step.id <= currentStep) {
                    setCurrentStep(step.id);
                  }
                }}
                className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                  isCurrent 
                    ? 'bg-emerald-50 border-2 border-emerald-500 shadow-xs' 
                    : isCompleted
                    ? 'bg-slate-50 hover:bg-emerald-50/50 border border-emerald-200'
                    : 'opacity-60 border border-transparent'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mb-1 transition-all ${
                  isCompleted 
                    ? 'bg-emerald-600 text-white shadow-2xs' 
                    : isCurrent 
                    ? 'bg-slate-900 text-white' 
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : step.id}
                </div>

                <span className="text-[10px] font-bold text-slate-800 truncate max-w-full">
                  {step.name.split(' ')[0]}
                </span>

                {isCompleted && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold text-emerald-700 mt-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                    <span>Completed</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Multi-Step Form Screens */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
        <AnimatePresence mode="wait">
          {/* STEP 1: PERSONAL INFORMATION */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">1. Personal Information</h3>
                  <p className="text-xs text-slate-500">Verify your patient identity and contact details</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    value={personalInfo.fullName}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    placeholder="e.g. Rameshwar Sharma"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Age (Years) *
                  </label>
                  <input
                    type="number"
                    value={personalInfo.age}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, age: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    placeholder="e.g. 52"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Biological Gender *
                  </label>
                  <select
                    value={personalInfo.gender}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, gender: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={personalInfo.phoneNumber}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, phoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    placeholder="+91 98451 22319"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    ABHA Health ID (Ayushman Bharat)
                  </label>
                  <input
                    type="text"
                    value={personalInfo.abhaId}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, abhaId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    placeholder="e.g. 91-4562-7819-2041"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={personalInfo.city}
                    onChange={(e) => setPersonalInfo({ ...personalInfo, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    placeholder="Jaipur, Rajasthan"
                  />
                </div>
              </div>

              {/* Explicit Clinical & AI Structuring Consent Card */}
              <div className={`mt-5 p-4 rounded-2xl border transition-all ${
                patientConsent 
                  ? 'bg-emerald-50/60 border-emerald-300' 
                  : 'bg-amber-50/40 border-amber-200'
              }`}>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={patientConsent}
                    onChange={(e) => setPatientConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 transition"
                  />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Clinical Data & AI Structuring Consent</span>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Required</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      I consent to have my clinical case answers and audio structured using AI (SWASTHYA clinical rules engine) and securely shared with my consulting healthcare provider for pre-visit clinical triage. I understand this does not replace doctor evaluation.
                    </p>
                  </div>
                </label>
              </div>
            </motion.div>
          )}

          {/* STEP 2: MEDICAL HISTORY */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">2. Medical History</h3>
                  <p className="text-xs text-slate-500">Select or add past conditions, chronic illnesses and surgeries</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    'Hypertension (Blood Pressure)',
                    'Type 2 Diabetes',
                    'Mild Osteoarthritis',
                    'Asthma / Respiratory',
                    'Thyroid Disorder',
                    'Acid Reflux (GERD)',
                    'Appendectomy',
                    'No Chronic Conditions'
                  ].map((cond) => {
                    const isSelected = medicalHistory.includes(cond);
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setMedicalHistory(prev => prev.filter(c => c !== cond));
                          } else {
                            setMedicalHistory(prev => [...prev.filter(c => c !== 'No Chronic Conditions'), cond]);
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {cond}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-2 items-center">
                  <div className="flex-1">
                    <VoiceAnswerInput
                      value={customCondition}
                      onChange={(val) => setCustomCondition(val)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCondition()}
                      placeholder="Add other medical condition (type or speak)..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCondition}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: SYMPTOMS */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">3. Symptoms (Chief Complaint)</h3>
                  <p className="text-xs text-slate-500">Describe the primary reason for your medical visit today</p>
                </div>
              </div>

              {/* Phase 2: AI-Assisted Red-Flag Alert Banner / Screening Status */}
              {(isAnalyzingRedFlags || (redFlagAnalysis && (redFlagAnalysis.riskLevel !== 'LOW' || !redFlagAnalysis.isAvailable))) && (
                <RedFlagAlertBanner
                  analysis={redFlagAnalysis}
                  isLoading={isAnalyzingRedFlags}
                  onContinue={continueAfterRedFlag}
                  onFindHospitals={() => setIsHospitalModalOpen(true)}
                  onReviewAnswers={() => {
                    setAcknowledgedRedFlagRisk(null);
                  }}
                  onDismiss={() => {
                    setRedFlagAnalysis(null);
                  }}
                />
              )}

              <div className="space-y-4">
                <div>
                  <VoiceAnswerInput
                    label="What primary symptom are you experiencing?"
                    required
                    multiline
                    rows={3}
                    value={symptoms.chiefComplaint}
                    onChange={(val) => setSymptoms({ ...symptoms, chiefComplaint: val })}
                    placeholder="e.g. Pain in both knees when climbing stairs, stiffness in morning..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <VoiceAnswerInput
                      label="Duration of Symptoms"
                      value={symptoms.duration}
                      onChange={(val) => setSymptoms({ ...symptoms, duration: val })}
                      placeholder="e.g. 3 weeks, 2 months"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Pain Severity Level: {symptoms.severity} / 10
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={symptoms.severity}
                      onChange={(e) => setSymptoms({ ...symptoms, severity: Number(e.target.value) })}
                      className="w-full accent-emerald-600"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>1 (Mild)</span>
                      <span>5 (Moderate)</span>
                      <span>10 (Severe)</span>
                    </div>
                  </div>
                </div>

                <div>
                  <VoiceAnswerInput
                    label="Symptom Description & Additional Details"
                    sublabel="Optional - How does it feel, what triggers it, or notes for your doctor"
                    multiline
                    rows={2}
                    value={symptoms.character}
                    onChange={(val) => setSymptoms({ ...symptoms, character: val })}
                    placeholder="e.g. Sharp pain after prolonged walking, relieved by warm compress, worse in cold weather..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Intake Framework
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSymptoms({ ...symptoms, intakeMode: 'AYUSH' });
                        setMode('AYUSH');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        symptoms.intakeMode === 'AYUSH'
                          ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">🌿 AYUSH Mode</div>
                      <div className="text-[11px] text-slate-500">Prakriti, Agni, Koshtha &amp; Dosha pariksha</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSymptoms({ ...symptoms, intakeMode: 'GENERAL_CLINICAL' });
                        setMode('GENERAL_CLINICAL');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        symptoms.intakeMode === 'GENERAL_CLINICAL'
                          ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">🩺 Clinical Mode</div>
                      <div className="text-[11px] text-slate-500">Standard SOCRATES pain analysis</div>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: MEDICATIONS */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Pill className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">4. Current Medications</h3>
                  <p className="text-xs text-slate-500">List all prescription drugs, herbal tonics, and supplements you currently take</p>
                </div>
              </div>

              <div className="space-y-3">
                {medications.map((med, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">{med.name}</div>
                      <div className="text-[11px] text-slate-500">{med.dosage} • {med.frequency}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMedications(prev => prev.filter((_, i) => i !== idx))}
                      className="text-rose-500 hover:text-rose-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="p-3.5 border-2 border-dashed border-slate-200 rounded-2xl space-y-3 bg-slate-50/40">
                  <div className="text-xs font-bold text-slate-700">Add New Medication</div>

                  {/* Three medication fields in a clean, consistent row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-start">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Medicine Name
                      </label>
                      <VoiceAnswerInput
                        voiceControlPlacement="below"
                        speakLabel="Speak medication name"
                        placeholder="e.g. Paracetamol"
                        value={newMed.name}
                        onChange={(val) => setNewMed({ ...newMed, name: val })}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Dosage
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 500mg"
                        value={newMed.dosage}
                        onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                        className="w-full h-10 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 font-medium bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                        Frequency
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Twice daily"
                        value={newMed.frequency}
                        onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
                        className="w-full h-10 px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 font-medium bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleAddMedication}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                    >
                      + Add Medication
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 5: ALLERGIES */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">5. Allergies &amp; Sensitivities</h3>
                  <p className="text-xs text-slate-500">Identify any adverse reactions to drugs, foods, or substances</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    'No known drug allergies (NKDA)',
                    'Penicillin',
                    'Sulfa Antibiotics',
                    'NSAIDs / Aspirin',
                    'Peanuts / Nuts',
                    'Latex',
                    'Pollen / Dust'
                  ].map((all) => {
                    const isSelected = allergies.includes(all);
                    return (
                      <button
                        key={all}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setAllergies(prev => prev.filter(a => a !== all));
                          } else {
                            if (all === 'No known drug allergies (NKDA)') {
                              setAllergies([all]);
                            } else {
                              setAllergies(prev => [...prev.filter(a => a !== 'No known drug allergies (NKDA)'), all]);
                            }
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {all}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-2 items-center">
                  <div className="flex-1">
                    <VoiceAnswerInput
                      value={customAllergy}
                      onChange={(val) => setCustomAllergy(val)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddAllergy()}
                      placeholder="Add specific allergy (type or speak)..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAllergy}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs"
                  >
                    Add
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 6: LIFESTYLE */}
          {currentStep === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">6. Lifestyle &amp; Habits</h3>
                  <p className="text-xs text-slate-500">Diet, daily physical activity, sleep schedule, and habits</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Dietary Pattern
                  </label>
                  <select
                    value={lifestyle.diet}
                    onChange={(e) => setLifestyle({ ...lifestyle, diet: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  >
                    <option value="Vegetarian (Satvik)">Vegetarian (Satvik)</option>
                    <option value="Non-Vegetarian">Non-Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Eggetarian">Eggetarian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Physical Activity &amp; Exercise
                  </label>
                  <select
                    value={lifestyle.physicalActivity}
                    onChange={(e) => setLifestyle({ ...lifestyle, physicalActivity: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                  >
                    <option value="Sedentary (Little or no exercise)">Sedentary (Little or no exercise)</option>
                    <option value="Moderate (20-min morning walking)">Moderate (20-min morning walking)</option>
                    <option value="Active (Daily yoga / workouts)">Active (Daily yoga / workouts)</option>
                  </select>
                </div>

                <div>
                  <VoiceAnswerInput
                    label="Night Sleep Hours"
                    value={lifestyle.sleepHours}
                    onChange={(val) => setLifestyle({ ...lifestyle, sleepHours: val })}
                    placeholder="e.g. 6-7 hours uninterrupted"
                  />
                </div>

                <div>
                  <VoiceAnswerInput
                    label="Habits & Health Notes"
                    value={lifestyle.habits}
                    onChange={(val) => setLifestyle({ ...lifestyle, habits: val })}
                    placeholder="e.g. Non-smoker, no alcohol"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 7: REVIEW */}
          {currentStep === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">7. Review Your Health Summary</h3>
                  <p className="text-xs text-slate-500">Confirm all information before submission to your doctor</p>
                </div>
              </div>

              {/* Phase 2: Active Red-Flag Summary Notice in Review Step */}
              {redFlagAnalysis && (redFlagAnalysis.riskLevel === 'EMERGENCY' || redFlagAnalysis.riskLevel === 'HIGH') && (
                <RedFlagAlertBanner
                  analysis={redFlagAnalysis}
                  isLoading={false}
                  onContinue={() => {}}
                  onFindHospitals={() => setIsHospitalModalOpen(true)}
                  onReviewAnswers={() => {
                    setCurrentStep(3);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Patient Demographics</div>
                  <div className="font-bold text-slate-900 text-sm">{personalInfo.fullName}</div>
                  <div className="text-slate-600">{personalInfo.age}y • {personalInfo.gender} • {personalInfo.city}</div>
                  <div className="font-mono text-[11px] text-slate-500">ABHA: {personalInfo.abhaId}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Chief Symptoms</div>
                  <div className="font-bold text-slate-900">{symptoms.chiefComplaint}</div>
                  <div className="text-slate-600">Severity: {symptoms.severity}/10 • Duration: {symptoms.duration}</div>
                  <div className="text-emerald-700 font-semibold">Mode: {symptoms.intakeMode}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Medical History ({medicalHistory.length})</div>
                  <div className="text-slate-800">{medicalHistory.join(', ')}</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Allergies &amp; Medications</div>
                  <div className="text-rose-700 font-semibold">Allergies: {allergies.join(', ')}</div>
                  <div className="text-slate-600">Meds: {medications.map(m => `${m.name} (${m.dosage})`).join(', ') || 'None'}</div>
                </div>

                <div className="sm:col-span-2 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900">Clinical AI Structuring Consent Granted</span>
                      <p className="text-[11px] text-slate-600">Authorized for physician pre-visit intake synthesis</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Consent Active
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 8: SUBMIT */}
          {currentStep === 8 && (
            <motion.div
              key="step8"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 text-center py-4"
            >
              {!isSubmitted ? (
                <div className="space-y-4 max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  {isAllRequiredFilled ? (
                    <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl">
                      <div className="text-sm font-extrabold text-emerald-900">
                        Your health information is complete.
                      </div>
                      <p className="text-xs text-emerald-700 mt-1">
                        All clinical intake sections are recorded. You may now submit your verified case summary directly to your consulting physician.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                      <div className="text-sm font-bold text-amber-900">
                        Some required information is incomplete
                      </div>
                      <p className="text-xs text-amber-700 mt-1">
                        Please review steps 1 through 6 before submitting.
                      </p>
                    </div>
                  )}

                  <div className="pt-2 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
                      <span>Clinical Intake Completion</span>
                      <span className="text-emerald-700 font-extrabold">{Math.round((completedSteps.length / 7) * 100)}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round((completedSteps.length / 7) * 100))}%` }}
                      />
                    </div>

                    <AnimatedButton
                      onClick={handleFinalSubmit}
                      disabled={!isAllRequiredFilled}
                      variant="primary"
                      size="lg"
                      className="w-full shadow-xl shadow-emerald-500/25 mt-2"
                    >
                      Submit to Doctor
                    </AnimatedButton>
                  </div>
                </div>
              ) : (
                /* Post-Submission Celebration View */
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-5 max-w-md mx-auto"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30 animate-bounce">
                    <Check className="w-10 h-10 stroke-[3]" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      Successfully submitted to your doctor.
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Your clinical case has been transmitted to Dr. A. K. Varma's triage queue. An AI-synthesized draft with SOCRATES parameters and AYUSH doshas has been attached for physician signoff.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl inline-block text-xs font-mono font-bold text-slate-800">
                    Case Token: {generatedCaseId || 'CP-902'}
                  </div>

                  <div className="pt-3">
                    <AnimatedButton
                      onClick={() => onComplete(generatedCaseId)}
                      variant="dark"
                      size="md"
                      iconRight={<ArrowRight className="w-4 h-4" />}
                    >
                      Return to Patient Dashboard
                    </AnimatedButton>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Validation Error Message Alert */}
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 font-bold"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{validationError}</span>
          </motion.div>
        )}

        {/* 4. Bottom Stepper Actions (Prev / Next) */}
        {currentStep < 8 && (
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <AnimatedButton
              type="button"
              onClick={handleNext}
              variant="primary"
              size="md"
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              {currentStep === 7 ? 'Proceed to Submission' : 'Next Step'}
            </AnimatedButton>
          </div>
        )}
      </div>

      {/* Existing Hospital Finder Modal Integration for Emergency Red Flags */}
      {isHospitalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <Hospital className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Find Nearby Emergency Healthcare</h3>
                  <p className="text-xs text-slate-500">Locate closest facilities using your current GPS coordinates</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHospitalModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close hospital finder"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <HealthcareDiscoveryView />

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsHospitalModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Close & Return to Intake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
