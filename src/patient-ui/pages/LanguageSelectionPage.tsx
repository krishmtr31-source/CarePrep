import React from 'react';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '../../shared/contexts/LanguageContext';
import { Globe, Check, ArrowRight, ArrowLeft } from 'lucide-react';

interface LanguageSelectionPageProps {
  onContinue: () => void;
  onBack: () => void;
}

export const LanguageSelectionPage: React.FC<LanguageSelectionPageProps> = ({
  onContinue,
  onBack
}) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative z-10">
      <div className="max-w-xl mx-auto w-full my-auto py-8 p-6 sm:p-8 rounded-3xl bg-white/85 backdrop-blur-xl border border-white/60 shadow-xl shadow-slate-900/10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Globe className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('language_select.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {t('language_select.subtitle')}
          </p>
        </div>

        {/* Language Options Grid */}
        <div className="space-y-3">
          {SUPPORTED_LANGUAGES.map((item) => {
            const isSelected = language === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setLanguage(item.code)}
                className={`w-full p-4 sm:p-5 rounded-2xl border-2 text-left transition-all duration-200 flex items-center justify-between shadow-sm ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-emerald-100 ring-2 ring-emerald-400/30'
                    : 'border-slate-200 hover:border-emerald-300 bg-white hover:bg-slate-50/70 text-slate-800'
                }`}
              >
                <div>
                  <div className="text-lg sm:text-xl font-bold flex items-center gap-2">
                    <span>{item.nativeName}</span>
                    <span className="text-xs font-normal text-slate-500">({item.englishName})</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{item.scriptLabel}</div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-300 bg-slate-50'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          <button
            onClick={onContinue}
            className="w-full inline-flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base shadow-lg shadow-emerald-200 transition-all"
          >
            <span>{t('language_select.continue')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
