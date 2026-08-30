import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Stethoscope, 
  Globe2, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Cpu,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { ActiveScreen } from '../../App';
import { llmGateway } from '../../ai-services/llm/LLMGateway';
import { WhatGeminiDoesModal } from './WhatGeminiDoesModal';

interface CarePrepAppHeaderProps {
  currentScreen: ActiveScreen;
  onNavigateToScreen?: (screen: ActiveScreen) => void;
  onSelectLanguage?: () => void;
}

export const CarePrepAppHeader: React.FC<CarePrepAppHeaderProps> = ({
  currentScreen,
  onNavigateToScreen,
  onSelectLanguage
}) => {
  const { language, setLanguage } = useLanguage();
  const [providerStatus, setProviderStatus] = useState(llmGateway.getProviderStatus());
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [isWhatGeminiModalOpen, setIsWhatGeminiModalOpen] = useState(false);

  useEffect(() => {
    // Check live connection on mount
    setIsCheckingConnection(true);
    llmGateway.checkLiveConnection()
      .then(() => {
        setProviderStatus(llmGateway.getProviderStatus());
      })
      .catch(() => {
        setProviderStatus(llmGateway.getProviderStatus());
      })
      .finally(() => {
        setIsCheckingConnection(false);
      });
  }, []);

  // Determine active step index (0: Tell us, 1: Your records, 2: Review, 3: Doctor)
  let activeStep = 0;
  if (['welcome', 'language', 'identity', 'consent', 'mode', 'intake'].includes(currentScreen)) {
    activeStep = 0; // Tell us
  } else if (currentScreen === 'documents') {
    activeStep = 1; // Your records
  } else if (currentScreen === 'success') {
    activeStep = 2; // Review
  } else if (currentScreen === 'doctor') {
    activeStep = 3; // Doctor
  }

  const steps = [
    { number: 1, label: 'Tell us', screenTarget: 'welcome' as ActiveScreen },
    { number: 2, label: 'Your records', screenTarget: 'documents' as ActiveScreen },
    { number: 3, label: 'Review', screenTarget: 'success' as ActiveScreen },
    { number: 4, label: 'Doctor', screenTarget: 'doctor' as ActiveScreen }
  ];

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand Identity */}
          <div className="flex items-center justify-between">
            <div 
              onClick={() => onNavigateToScreen && onNavigateToScreen('welcome')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-extrabold shadow-sm group-hover:scale-105 transition-transform">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 leading-tight">
                    CarePrep
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    AI-Assisted Intake
                  </span>

                  {/* Truthful Connection Status Badge */}
                  {isCheckingConnection ? (
                    <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      🟡 Checking Gemini...
                    </span>
                  ) : providerStatus.isGeminiLive ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsWhatGeminiModalOpen(true);
                      }}
                      className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 transition-colors"
                      title="Click to view what Gemini does and does not do"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600 animate-pulse" />
                      <span>🟢 Gemini 2.5 Flash • Connected</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsWhatGeminiModalOpen(true);
                      }}
                      className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-0.5 rounded-full border border-slate-300 transition-colors"
                      title="Click to view what Gemini does and does not do"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>🟠 Deterministic Fallback Active</span>
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-none mt-0.5">
                  Prepare before you meet your doctor
                </p>
              </div>
            </div>

            {/* Mobile Language Switcher */}
            <div className="sm:hidden flex items-center gap-1.5">
              <button
                onClick={() => {
                  const nextLang = language === 'en' ? 'hi' : language === 'hi' ? 'ta' : 'en';
                  setLanguage(nextLang);
                }}
                className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium"
              >
                {language === 'en' ? 'EN' : language === 'hi' ? 'हिन्दी' : 'தமிழ்'}
              </button>
            </div>
          </div>

          {/* 4-Step Patient Journey Indicator */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto py-1">
            {steps.map((step, idx) => {
              const isCompleted = idx < activeStep;
              const isCurrent = idx === activeStep;

              return (
                <React.Fragment key={step.number}>
                  <div 
                    className={`flex items-center gap-1.5 text-xs font-semibold select-none ${
                      isCurrent
                        ? 'text-emerald-700'
                        : isCompleted
                        ? 'text-slate-800'
                        : 'text-slate-400'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        isCurrent
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> : step.number}
                    </div>
                    <span className="whitespace-nowrap">{step.label}</span>
                  </div>

                  {idx < steps.length - 1 && (
                    <span className="text-slate-300 text-xs hidden sm:inline">→</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Header Right Actions */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* What Gemini Does Trigger */}
            <button
              onClick={() => setIsWhatGeminiModalOpen(true)}
              className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-800 font-semibold transition-colors"
            >
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>What Gemini Does</span>
            </button>

            {/* Language Selector Dropdown */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  language === 'en' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  language === 'hi' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                हिन्दी
              </button>
              <button
                onClick={() => setLanguage('ta')}
                className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                  language === 'ta' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                தமிழ்
              </button>
            </div>

            {/* Doctor Portal Button */}
            {currentScreen !== 'doctor' && onNavigateToScreen && (
              <button
                onClick={() => onNavigateToScreen('doctor')}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs transition-colors"
              >
                <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                <span>Doctor Portal</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* What Gemini Does Modal */}
      <WhatGeminiDoesModal
        isOpen={isWhatGeminiModalOpen}
        onClose={() => setIsWhatGeminiModalOpen(false)}
      />
    </>
  );
};
