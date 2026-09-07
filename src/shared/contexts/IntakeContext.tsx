import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { PatientIdentity, ConsentRecord } from '../../data-models/patient';
import { IntakeMode, IntakeAnswer, PatientCaseRecord, IntakeQuestion } from '../../data-models/intake';
import { getAdaptiveSocratesQuestions } from '../../ai-services/socratesEngine';
import { AYUSH_INTAKE_QUESTIONS } from '../../ai-services/ayushEngine';
import { checkRedFlags } from '../../clinical-rules/redFlags';
import { RedFlagRule } from '../../data-models/redFlag';
import { localStore } from '../../backend/storage/localStore';
import { conversationService } from '../../ai-services/conversation/ConversationService';
import { useLanguage, LanguageCode } from './LanguageContext';
import { carePrepApi } from '../api/apiClient';

const SESSION_KEY = 'sih_intake_session_v1';

interface IntakeSessionCache {
  currentStepIndex: number;
  answers: Record<string, IntakeAnswer>;
  mode: IntakeMode;
  activeRedFlags: RedFlagRule[];
}

interface IntakeContextType {
  patient: PatientIdentity | null;
  setPatient: (pat: PatientIdentity) => void;
  consent: ConsentRecord | null;
  setConsent: (con: ConsentRecord) => void;
  mode: IntakeMode;
  setMode: (mode: IntakeMode) => void;
  currentStepIndex: number;
  questions: IntakeQuestion[];
  currentQuestion: IntakeQuestion | null;
  answers: Record<string, IntakeAnswer>;
  activeRedFlags: RedFlagRule[];
  submitAnswer: (
    questionId: string, 
    step: any, 
    selectedOptionIds?: string[], 
    customText?: string,
    audioProvenance?: 'VOICE' | 'TYPED' | 'TOUCH_CHIP'
  ) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  resetSession: () => void;
  completeIntakeSession: () => string;
}

const IntakeContext = createContext<IntakeContextType | undefined>(undefined);

export const IntakeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [patient, setPatientState] = useState<PatientIdentity | null>(() => localStore.getCurrentPatient());
  const [consent, setConsentState] = useState<ConsentRecord | null>(null);

  // Sync patient state with authenticated patient user
  useEffect(() => {
    if (user && user.role === 'patient') {
      const existing = localStore.getPatients().find(p => p.id === user.id);
      if (existing) {
        setPatientState(existing);
      } else {
        const newPat: PatientIdentity = {
          id: user.id,
          fullName: user.name,
          age: user.patientProfile?.age || 40,
          gender: user.patientProfile?.gender || 'male',
          phoneNumber: user.phoneNumber || user.email,
          abhaId: user.patientProfile?.abhaId,
          city: user.patientProfile?.city || 'Jaipur',
          preferredLanguage: user.patientProfile?.preferredLanguage || language,
          createdAt: user.createdAt
        };
        setPatientState(newPat);
        localStore.savePatient(newPat);
      }
    } else if (!user) {
      setPatientState(null);
    }
  }, [user, language]);

  // Restore cached session on load / refresh
  const [mode, setModeState] = useState<IntakeMode>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed: IntakeSessionCache = JSON.parse(raw);
        return parsed.mode || 'GENERAL_CLINICAL';
      }
    } catch (e) {}
    return 'GENERAL_CLINICAL';
  });

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed: IntakeSessionCache = JSON.parse(raw);
        return typeof parsed.currentStepIndex === 'number' ? parsed.currentStepIndex : 0;
      }
    } catch (e) {}
    return 0;
  });

  const [answers, setAnswers] = useState<Record<string, IntakeAnswer>>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed: IntakeSessionCache = JSON.parse(raw);
        return parsed.answers || {};
      }
    } catch (e) {}
    return {};
  });

  const [activeRedFlags, setActiveRedFlags] = useState<RedFlagRule[]>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed: IntakeSessionCache = JSON.parse(raw);
        return parsed.activeRedFlags || [];
      }
    } catch (e) {}
    return [];
  });

  // Extract chief complaint text to adaptively generate questions
  const chiefComplaintText = useMemo(() => {
    const firstAns = answers['socrates_chief_complaint'] || answers['ayush_chief_complaint'] || Object.values(answers)[0];
    if (!firstAns) return '';
    return [firstAns.selectedOptionIds?.join(' '), firstAns.customText].filter(Boolean).join(' ');
  }, [answers]);

  // Compute adaptive questions
  const questions = useMemo<IntakeQuestion[]>(() => {
    if (mode === 'AYUSH') {
      return AYUSH_INTAKE_QUESTIONS;
    }
    return getAdaptiveSocratesQuestions(chiefComplaintText);
  }, [mode, chiefComplaintText]);

  const currentQuestion = questions[currentStepIndex] || questions[0] || null;

  // Persist session changes to sessionStorage
  useEffect(() => {
    try {
      const cache: IntakeSessionCache = {
        currentStepIndex,
        answers,
        mode,
        activeRedFlags
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(cache));
    } catch (e) {}
  }, [currentStepIndex, answers, mode, activeRedFlags]);

  const setPatient = (pat: PatientIdentity) => {
    setPatientState(pat);
    localStore.savePatient(pat);
  };

  const setConsent = (con: ConsentRecord) => {
    setConsentState(con);
    localStore.saveConsent(con);
  };

  const setMode = (m: IntakeMode) => {
    setModeState(m);
    setCurrentStepIndex(0);
    setAnswers({});
    setActiveRedFlags([]);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const submitAnswer = (
    questionId: string,
    step: any,
    selectedOptionIds?: string[],
    customText?: string,
    audioProvenance: 'VOICE' | 'TYPED' | 'TOUCH_CHIP' = 'TYPED'
  ) => {
    const rawUtterance = [
      ...(selectedOptionIds || []),
      customText
    ].filter(Boolean).join(' ');

    const structured = conversationService.parsePatientUtterance(rawUtterance, language);

    const newAnswer: IntakeAnswer = {
      questionId,
      step,
      selectedOptionIds,
      customText,
      rawPatientResponse: customText || (selectedOptionIds?.join(', ') || ''),
      audioProvenance,
      structuredInterpretation: {
        detectedChiefComplaint: structured.detectedChiefComplaint,
        detectedDuration: structured.detectedDuration,
        detectedSeverity: structured.detectedSeverity,
        detectedBodySite: structured.detectedBodySite,
        detectedAssociatedSymptoms: structured.detectedAssociatedSymptoms
      },
      timestamp: new Date().toISOString()
    };

    setAnswers(prev => ({
      ...prev,
      [questionId]: newAnswer
    }));

    // Deterministic Red Flag evaluation
    const combinedStr = `${selectedOptionIds?.join(' ') || ''} ${customText || ''}`;
    const detected = checkRedFlags(combinedStr);
    if (detected.length > 0) {
      setActiveRedFlags(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        const newOnes = detected.filter(d => !existingIds.has(d.id));
        return [...prev, ...newOnes];
      });
    }
  };

  const goToNextStep = () => {
    if (currentStepIndex < questions.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const completeIntakeSession = (): string => {
    const caseId = `case-${Date.now().toString(36)}`;
    const curPat = patient || {
      id: `pat-${Date.now().toString(36)}`,
      fullName: 'Walk-in Patient',
      age: 40,
      gender: 'other',
      phoneNumber: '+91 99999 00000',
      preferredLanguage: language,
      createdAt: new Date().toISOString()
    };

    const firstAns = answers['socrates_chief_complaint'] || answers['ayush_chief_complaint'] || Object.values(answers)[0];
    const chiefComplaintStr = firstAns 
      ? [firstAns.selectedOptionIds?.join(', '), firstAns.customText].filter(Boolean).join(' - ')
      : 'General Pre-Consultation';

    const existingCases = localStore.getCases();
    const tokenNumber = `C-${100 + existingCases.length + 1}`;
    const queuePosition = existingCases.filter(c => c.status !== 'REVIEWED_BY_DOCTOR').length + 1;

    const newCase: PatientCaseRecord = {
      caseId,
      patientId: curPat.id,
      mode,
      status: activeRedFlags.length > 0 ? 'RED_FLAG_TRIAGE' : 'SUBMITTED_TO_DOCTOR',
      chiefComplaint: chiefComplaintStr,
      answers: Object.values(answers),
      startedAt: new Date(Date.now() - 300000).toISOString(),
      completedAt: new Date().toISOString(),
      tokenNumber,
      queuePosition,
      redFlagsDetected: activeRedFlags.map(r => r.id),
      language: language as LanguageCode
    };

    localStore.saveCase(newCase);

    // Save to permanent MongoDB Atlas database
    carePrepApi.saveAssessment({
      assessmentId: caseId,
      chiefComplaint: newCase.chiefComplaint,
      symptoms: Object.values(answers).map(a => a.customText || a.selectedOptionIds?.join(', ')).filter(Boolean),
      socratesData: {
        mode: newCase.mode,
        answersCount: Object.keys(answers).length
      },
      triageStatus: activeRedFlags.length > 0 ? 'RED_FLAG_TRIAGE' : 'NORMAL',
      priority: activeRedFlags.length > 0 ? 'URGENT' : 'ROUTINE',
      status: activeRedFlags.length > 0 ? 'RED_FLAG_TRIAGE' : 'SUBMITTED_TO_DOCTOR',
      tokenNumber,
      queuePosition,
      redFlagsDetected: activeRedFlags.map(r => r.id),
      answers: newCase.answers,
      language: newCase.language
    }).catch(e => console.warn('[MongoDB] IntakeContext assessment sync warning:', e));

    sessionStorage.removeItem(SESSION_KEY);
    return caseId;
  };

  const resetSession = () => {
    setCurrentStepIndex(0);
    setAnswers({});
    setActiveRedFlags([]);
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <IntakeContext.Provider
      value={{
        patient,
        setPatient,
        consent,
        setConsent,
        mode,
        setMode,
        currentStepIndex,
        questions,
        currentQuestion,
        answers,
        activeRedFlags,
        submitAnswer,
        goToNextStep,
        goToPreviousStep,
        resetSession,
        completeIntakeSession
      }}
    >
      {children}
    </IntakeContext.Provider>
  );
};

export const useIntake = () => {
  const context = useContext(IntakeContext);
  if (!context) {
    throw new Error('useIntake must be used within an IntakeProvider');
  }
  return context;
};
