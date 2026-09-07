import React, { useState } from 'react';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { useIntake } from '../../shared/contexts/IntakeContext';
import { ConsentRecord } from '../../data-models/patient';
import { 
  ShieldCheck, 
  HelpCircle, 
  Bot, 
  UserCheck, 
  XCircle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Volume2
} from 'lucide-react';

interface ConsentPageProps {
  onAgree: () => void;
  onDecline: () => void;
  onBack: () => void;
}

export const ConsentPage: React.FC<ConsentPageProps> = ({
  onAgree,
  onDecline,
  onBack
}) => {
  const { t, language } = useLanguage();
  const { patient, setConsent } = useIntake();
  const [isChecked, setIsChecked] = useState(true);
  const [isReadingAudio, setIsReadingAudio] = useState(false);

  const consentClauses = [
    {
      icon: <HelpCircle className="w-5 h-5 text-teal-600" />,
      title: t('consent.scope_1_title'),
      desc: t('consent.scope_1_desc')
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      title: t('consent.scope_2_title'),
      desc: t('consent.scope_2_desc')
    },
    {
      icon: <Bot className="w-5 h-5 text-indigo-600" />,
      title: t('consent.scope_3_title'),
      desc: t('consent.scope_3_desc'),
      highlight: true
    },
    {
      icon: <UserCheck className="w-5 h-5 text-amber-600" />,
      title: t('consent.scope_4_title'),
      desc: t('consent.scope_4_desc'),
      highlight: true
    },
    {
      icon: <XCircle className="w-5 h-5 text-slate-500" />,
      title: t('consent.scope_5_title'),
      desc: t('consent.scope_5_desc')
    }
  ];

  const handleAudioExplain = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const textToSpeak = language === 'hi'
        ? 'सहमति पत्र: यह प्रणाली आपके लक्षणों का विवरण एकत्रित करती है ताकि डॉक्टर के लिए केस सारांश तैयार किया जा सके। एआई कभी भी बीमारी का निदान नहीं करता, सभी निर्णय आपके डॉक्टर ही लेंगे।'
        : language === 'ta'
          ? 'ஒப்புதல் படிவம்: உங்கள் மருத்துவ ஆலோசனைக்கு உதவ மட்டுமே இந்த விவரங்கள் சேகரிக்கப்படுகின்றன. மருத்துவரே இறுதி முடிவை எடுப்பார்.'
          : 'Informed Consent: Your health information is collected to assist your doctor. The AI only organizes notes and never provides medical diagnoses or prescriptions.';

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      if (language === 'hi') utterance.lang = 'hi-IN';
      else if (language === 'ta') utterance.lang = 'ta-IN';
      else utterance.lang = 'en-US';

      utterance.onstart = () => setIsReadingAudio(true);
      utterance.onend = () => setIsReadingAudio(false);
      utterance.onerror = () => setIsReadingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleAccept = () => {
    const record: ConsentRecord = {
      patientId: patient?.id || 'anonymous-pat',
      hasConsented: true,
      timestamp: new Date().toISOString(),
      scope: {
        symptomCollection: true,
        aiHistoryDrafting: true,
        physicianReviewOnly: true,
        anonymousQualityAudit: true
      },
      disclaimerAcknowledged: true,
      version: 'v1.0-sih-prototype'
    };
    setConsent(record);
    onAgree();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto w-full my-auto py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={handleAudioExplain}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              isReadingAudio 
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{isReadingAudio ? 'Reading Consent...' : 'Audio Explanation'}</span>
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3 shadow-inner">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('consent.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {t('consent.subtitle')}
          </p>
        </div>

        {/* Consent Clauses List */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3.5">
          {consentClauses.map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border transition-all ${
                item.highlight
                  ? 'bg-amber-50/50 border-amber-200'
                  : 'bg-slate-50/60 border-slate-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-0.5">{item.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Explicit Agreement Checkbox */}
          <div className="pt-3 border-t border-slate-100">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => setIsChecked(e.target.checked)}
                className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs sm:text-sm font-medium text-slate-800 leading-snug">
                {t('consent.agree_checkbox')}
              </span>
            </label>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onDecline}
            className="w-full sm:w-1/3 py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors text-center"
          >
            {t('consent.decline_btn')}
          </button>

          <button
            type="button"
            disabled={!isChecked}
            onClick={handleAccept}
            className={`w-full sm:w-2/3 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-bold text-base transition-all duration-200 shadow-md ${
              isChecked
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>{t('consent.accept_btn')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
