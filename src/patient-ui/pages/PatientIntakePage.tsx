import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { useIntake } from '../../shared/contexts/IntakeContext';
import { ProgressHeader } from '../components/ProgressHeader';
import { QuestionCard } from '../components/QuestionCard';
import { QuickAnswerChips } from '../components/QuickAnswerChips';
import { IntakeInputBar } from '../components/IntakeInputBar';
import { RedFlagAlertModal } from '../components/RedFlagAlertModal';
import { ArrowLeft, Sparkles, MessageSquare } from 'lucide-react';

interface PatientIntakePageProps {
  onComplete: (caseId: string) => void;
  onBackToMode: () => void;
  onOpenDoctor: () => void;
}

export const PatientIntakePage: React.FC<PatientIntakePageProps> = ({
  onComplete,
  onBackToMode,
  onOpenDoctor
}) => {
  const { t, language } = useLanguage();
  const {
    currentStepIndex,
    questions,
    currentQuestion,
    answers,
    submitAnswer,
    goToNextStep,
    goToPreviousStep,
    completeIntakeSession,
    activeRedFlags
  } = useIntake();

  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customText, setCustomText] = useState<string>('');
  const [showRedFlagModal, setShowRedFlagModal] = useState<boolean>(false);

  // Sync state with previously entered answers when navigating steps
  useEffect(() => {
    if (currentQuestion) {
      const existingAnswer = answers[currentQuestion.id];
      if (existingAnswer) {
        setSelectedChips(existingAnswer.selectedOptionIds || []);
        setCustomText(existingAnswer.customText || '');
      } else {
        setSelectedChips([]);
        setCustomText('');
      }
    }
  }, [currentStepIndex, currentQuestion]);

  // Show Red Flag modal if red flags are detected
  useEffect(() => {
    if (activeRedFlags.length > 0) {
      setShowRedFlagModal(true);
    }
  }, [activeRedFlags]);

  if (!currentQuestion) {
    return (
      <div className="p-8 text-center">
        <p>No questions available for this intake session.</p>
        <button onClick={onBackToMode} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-xl">
          Back
        </button>
      </div>
    );
  }

  const isLastQuestion = currentStepIndex === questions.length - 1;
  const canProceed = selectedChips.length > 0 || customText.trim().length > 0;

  const handleToggleOption = (optionLabel: string) => {
    setSelectedChips(prev => {
      if (prev.includes(optionLabel)) {
        return prev.filter(item => item !== optionLabel);
      } else {
        return [...prev, optionLabel];
      }
    });
  };

  const handleSubmitStep = (
    audioProvenance: 'VOICE' | 'TYPED' | 'TOUCH_CHIP' = 'TYPED'
  ) => {
    if (!canProceed) return;

    submitAnswer(
      currentQuestion.id,
      currentQuestion.step,
      selectedChips,
      customText.trim(),
      audioProvenance
    );

    if (isLastQuestion) {
      const caseId = completeIntakeSession();
      onComplete(caseId);
    } else {
      goToNextStep();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      goToPreviousStep();
    } else {
      onBackToMode();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Sticky Progress Header */}
      <ProgressHeader />

      {/* Main Intake Area */}
      <main className="max-w-3xl mx-auto w-full px-4 py-6 sm:py-8 flex-1 flex flex-col justify-center space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('intake.back_btn')}</span>
          </button>

          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            {t('intake.ai_clarification')}
          </span>
        </div>

        {/* AI Question Display */}
        <QuestionCard
          question={currentQuestion}
          stepNumber={currentStepIndex + 1}
          totalSteps={questions.length}
        />

        {/* Quick Answer Option Chips */}
        {currentQuestion.options && currentQuestion.options.length > 0 && (
          <QuickAnswerChips
            question={currentQuestion}
            selectedIds={selectedChips}
            onToggleOption={handleToggleOption}
          />
        )}

        {/* Multi-modal Input Bar */}
        <IntakeInputBar
          value={customText}
          placeholderText={currentQuestion.placeholder?.[language] || currentQuestion.placeholder?.en}
          onChange={setCustomText}
          onSubmit={handleSubmitStep}
          isLastQuestion={isLastQuestion}
          canProceed={canProceed}
        />
      </main>

      {/* Red Flag Alert Modal */}
      {showRedFlagModal && (
        <RedFlagAlertModal
          redFlags={activeRedFlags}
          onDismiss={() => setShowRedFlagModal(false)}
          onProceedToDoctor={onOpenDoctor}
        />
      )}

      {/* Minimal Footer */}
      <footer className="py-3 px-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white/50">
        AI assists in organizing case history • Final clinical decisions are made solely by the physician
      </footer>
    </div>
  );
};
