import React from 'react';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { useIntake } from '../../shared/contexts/IntakeContext';
import { Activity, ShieldAlert, Sparkles } from 'lucide-react';

export const ProgressHeader: React.FC = () => {
  const { t } = useLanguage();
  const { currentStepIndex, questions, mode, activeRedFlags } = useIntake();

  const total = questions.length;
  const progressPercent = Math.round(((currentStepIndex + 1) / total) * 100);

  return (
    <div className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 py-3 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              mode === 'AYUSH' 
                ? 'bg-ayush-100 text-ayush-800 border border-ayush-200' 
                : 'bg-clinical-100 text-clinical-800 border border-clinical-200'
            }`}>
              <Sparkles className="w-3.5 h-3.5" />
              {mode === 'AYUSH' ? 'AYUSH Dashavidha Mode' : 'General Clinical SOCRATES'}
            </span>
            {activeRedFlags.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                Priority Triage
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-xs font-medium text-slate-500">
              {t('intake.progress')}: <strong className="text-slate-800">{currentStepIndex + 1}</strong> / {total} ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out rounded-full ${
              mode === 'AYUSH'
                ? 'bg-gradient-to-r from-ayush-400 to-ayush-600'
                : 'bg-gradient-to-r from-clinical-400 to-clinical-600'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
