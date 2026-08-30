import React, { useState, useEffect } from 'react';
import { IntakeQuestion } from '../../data-models/intake';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { textToSpeechService } from '../../ai-services/speech/speechProvider';
import { Bot, HelpCircle, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface QuestionCardProps {
  question: IntakeQuestion;
  stepNumber: number;
  totalSteps: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, stepNumber, totalSteps }) => {
  const { language } = useLanguage();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const questionText = question.questionText[language] || question.questionText.en;
  const explanation = question.explanation?.[language] || question.explanation?.en;

  // Stop previous speech when question or step changes
  useEffect(() => {
    textToSpeechService.stop();
    setIsSpeaking(false);
  }, [question.id, language]);

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      textToSpeechService.stop();
      setIsSpeaking(false);
    } else {
      textToSpeechService.speak(questionText, language, {
        onStart: () => setIsSpeaking(true),
        onEnd: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false)
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 relative overflow-hidden transition-all duration-300">
      {/* Decorative gradient aura */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-emerald-100/40 via-teal-50/30 to-transparent rounded-bl-full pointer-events-none -z-0" />

      <div className="relative z-10 flex items-start gap-4">
        {/* AI Assistant Avatar */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-200 flex-shrink-0">
          <Bot className="w-6 h-6" />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Question {stepNumber} of {totalSteps}
            </span>

            {/* Audio Speech Synthesis Toggle Button */}
            <button
              onClick={handleToggleSpeak}
              type="button"
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all ${
                isSpeaking 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse font-bold' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 font-semibold'
              }`}
              title={isSpeaking ? 'Stop Audio' : 'Listen to Question in your language'}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-emerald-700" /> : <Volume2 className="w-3.5 h-3.5 text-slate-500" />}
              <span>{isSpeaking ? 'Stop Audio' : 'Listen Audio'}</span>
            </button>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug tracking-tight">
            {questionText}
          </h2>

          {explanation && (
            <div className="mt-3 flex items-start gap-2 text-xs sm:text-sm text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <HelpCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <p>{explanation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
