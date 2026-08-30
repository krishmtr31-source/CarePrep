import React from 'react';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { 
  Sparkles, 
  Mic, 
  Activity, 
  ShieldCheck, 
  Stethoscope, 
  ArrowRight, 
  Globe2, 
  HeartHandshake,
  CheckCircle2
} from 'lucide-react';

interface WelcomePageProps {
  onStart: () => void;
  onOpenDoctor: () => void;
  onSelectLanguage: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({
  onStart,
  onOpenDoctor,
  onSelectLanguage
}) => {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-slate-50 to-white flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="max-w-5xl mx-auto w-full flex items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-200">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight flex items-center gap-1.5">
              {t('app_name')}
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                SIH26047
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">{t('app_subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onSelectLanguage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            <Globe2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="uppercase">{language}</span>
          </button>

          <button
            onClick={onOpenDoctor}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-sm transition-all"
          >
            <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{t('welcome.doctor_button')}</span>
            <span className="sm:hidden">Doctor</span>
          </button>
        </div>
      </header>

      {/* Main Hero */}
      <main className="max-w-4xl mx-auto w-full my-auto py-8 sm:py-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-900 text-xs font-semibold tracking-wide shadow-sm">
            <HeartHandshake className="w-4 h-4 text-emerald-700" />
            <span>{t('welcome.badge')}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-tight">
            {t('welcome.title_1')}{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-clinical-600 bg-clip-text text-transparent">
              {t('welcome.title_2')}
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
            Tell us about your health before meeting the doctor. We organize your symptoms and previous medical documents so your doctor can spend more time understanding you and less time collecting paperwork.
          </p>

          {/* 3 Input Modalities Banner */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
              🎤 Speak in Hindi / English / Tamil
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
              ⌨️ Type Naturally
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
              👆 Tap Quick Option Chips
            </span>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onStart}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base shadow-lg shadow-emerald-200 hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <span>{t('welcome.start_button')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={onSelectLanguage}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 shadow-sm transition-all"
            >
              <Globe2 className="w-4 h-4 text-slate-500" />
              <span>Change Language (भाषा / மொழி)</span>
            </button>
          </div>
        </div>

        {/* Patient Care Guarantees Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10 sm:mt-14">
          <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Privacy & Safety First</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your health answers are collected solely to prepare your intake summary for your doctor. We do not share your private health data.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Stethoscope className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Doctor Always Verifies</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The assistant creates a preliminary draft. Your consulting physician reviews, modifies, and confirms every clinical observation.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">Emergency Warning Gate</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If severe chest pain, breathing difficulty, or red flags are detected, the system immediately directs you to urgent emergency care.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full py-4 text-center border-t border-slate-200/60 space-y-1">
        <p className="text-xs text-slate-500 font-medium flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Pre-consultation clinical intake assistant · Mandatory physician review</span>
        </p>
        <p className="text-[11px] text-slate-400">
          Prototype safety screening — not clinically validated. Human triage required.
        </p>
      </footer>
    </div>
  );
};
