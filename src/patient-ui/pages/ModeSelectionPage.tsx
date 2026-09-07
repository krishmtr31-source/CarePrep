import React from 'react';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { useIntake } from '../../shared/contexts/IntakeContext';
import { IntakeMode } from '../../data-models/intake';
import { Sparkles, Stethoscope, Leaf, Check, ArrowRight, ArrowLeft } from 'lucide-react';

interface ModeSelectionPageProps {
  onSelectMode: (mode: IntakeMode) => void;
  onBack: () => void;
}

export const ModeSelectionPage: React.FC<ModeSelectionPageProps> = ({
  onSelectMode,
  onBack
}) => {
  const { t } = useLanguage();
  const { mode, setMode } = useIntake();

  const handleStart = (selected: IntakeMode) => {
    setMode(selected);
    onSelectMode(selected);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative z-10">
      <div className="max-w-3xl mx-auto w-full my-auto py-6">
        <button
          onClick={onBack}
          type="button"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 mx-auto flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('mode_select.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {t('mode_select.subtitle')}
          </p>
        </div>

        {/* Mode Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* General Clinical Mode */}
          <div
            onClick={() => handleStart('GENERAL_CLINICAL')}
            className={`group cursor-pointer p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between relative bg-white/85 backdrop-blur-xl hover:shadow-xl ${
              mode === 'GENERAL_CLINICAL'
                ? 'border-clinical-500 shadow-clinical-100 ring-2 ring-clinical-300/30'
                : 'border-slate-200 hover:border-clinical-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-clinical-50 text-clinical-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-clinical-50 text-clinical-700 border border-clinical-200">
                  {t('mode_select.clinical_tag')}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {t('mode_select.clinical_title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                {t('mode_select.clinical_desc')}
              </p>

              <div className="space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-clinical-500" />
                  <span>Site, Onset & Character of Pain</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-clinical-500" />
                  <span>Radiation & Severity Scale</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-clinical-500" />
                  <span>Aggravating / Relieving Factors</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                className="w-full py-3 px-4 rounded-xl bg-clinical-600 group-hover:bg-clinical-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>Select General Clinical</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* AYUSH Mode */}
          <div
            onClick={() => handleStart('AYUSH')}
            className={`group cursor-pointer p-6 rounded-3xl border-2 transition-all duration-300 flex flex-col justify-between relative bg-white/85 backdrop-blur-xl hover:shadow-xl ${
              mode === 'AYUSH'
                ? 'border-ayush-500 shadow-ayush-100 ring-2 ring-ayush-300/30'
                : 'border-slate-200 hover:border-ayush-400'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-ayush-50 text-ayush-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Leaf className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-ayush-50 text-ayush-800 border border-ayush-200">
                  {t('mode_select.ayush_tag')}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {t('mode_select.ayush_title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                {t('mode_select.ayush_desc')}
              </p>

              <div className="space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-ayush-500" />
                  <span>Prakriti & Dosha Constitution</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-ayush-500" />
                  <span>Jatharagni (Metabolic Fire) & Koshtha</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-ayush-500" />
                  <span>Ahara Shakti & Vyayama Endurance</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                className="w-full py-3 px-4 rounded-xl bg-ayush-600 group-hover:bg-ayush-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>Select AYUSH Intake</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
