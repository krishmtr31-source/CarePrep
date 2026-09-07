import React from 'react';
import { IntakeQuestion } from '../../data-models/intake';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { Check } from 'lucide-react';

interface QuickAnswerChipsProps {
  question: IntakeQuestion;
  selectedIds: string[];
  onToggleOption: (optionText: string) => void;
}

export const QuickAnswerChips: React.FC<QuickAnswerChipsProps> = ({
  question,
  selectedIds,
  onToggleOption
}) => {
  const { language } = useLanguage();

  if (!question.options || question.options.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Tap Quick Answers:
        </label>
        <span className="text-xs text-slate-400">Select one or more that describe your symptom</span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {question.options.map((opt) => {
          const label = opt.label[language] || opt.label.en;
          const isSelected = selectedIds.includes(label) || selectedIds.includes(opt.id);

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onToggleOption(label)}
              className={`group inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-left border ${
                isSelected
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-200 ring-2 ring-emerald-400/40'
                  : 'bg-white hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-900 border-slate-200 hover:border-emerald-300 shadow-sm'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] transition-colors ${
                  isSelected
                    ? 'bg-white text-emerald-700 border-white font-bold'
                    : 'border-slate-300 group-hover:border-emerald-400 bg-slate-50'
                }`}
              >
                {isSelected ? <Check className="w-3 h-3 stroke-[3]" /> : null}
              </div>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
