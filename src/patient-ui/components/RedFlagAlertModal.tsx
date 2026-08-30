import React from 'react';
import { RedFlagRule } from '../../data-models/redFlag';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { useIntake } from '../../shared/contexts/IntakeContext';
import { AlertTriangle, PhoneCall, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface RedFlagAlertModalProps {
  redFlags: RedFlagRule[];
  onDismiss: () => void;
  onProceedToDoctor: () => void;
}

export const RedFlagAlertModal: React.FC<RedFlagAlertModalProps> = ({
  redFlags,
  onDismiss,
  onProceedToDoctor
}) => {
  const { language } = useLanguage();
  const { answers } = useIntake();

  if (!redFlags || redFlags.length === 0) return null;

  const reportedSymptoms = Object.values(answers)
    .map(a => a.customText || a.rawPatientResponse || a.selectedOptionIds?.join(', ') || '')
    .filter(Boolean)
    .join('; ');

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border-2 border-rose-300 animate-in fade-in zoom-in duration-200 space-y-4">
        {/* Urgent Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-7 h-7 text-rose-600" />
          </div>
          <div>
            <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
              Deterministic Safety Controller Active
            </div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight mt-0.5">
              POTENTIAL URGENT PRESENTATION
            </h3>
          </div>
        </div>

        {/* Patient-reported text quotation */}
        {reportedSymptoms && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            <span className="font-bold text-slate-900 block mb-0.5">You reported:</span>
            <span className="italic">"{reportedSymptoms}"</span>
          </div>
        )}

        {/* Red Flag Items */}
        <div className="space-y-2">
          {redFlags.map(rf => (
            <div key={rf.id} className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
              <div className="flex items-center gap-2 font-bold text-rose-900 text-xs mb-1">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                {rf.title}
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                {rf.immediateActionNotice[language] || rf.immediateActionNotice.en}
              </p>
            </div>
          ))}
        </div>

        {/* Human Triage Directive */}
        <div className="p-3.5 bg-rose-100/70 border border-rose-300 rounded-2xl text-xs text-rose-950 space-y-1">
          <div className="font-extrabold flex items-center gap-1.5 uppercase tracking-wide text-rose-900">
            <ShieldAlert className="w-4 h-4 text-rose-700 flex-shrink-0" />
            HUMAN TRIAGE REQUIRED
          </div>
          <p className="text-rose-900 text-[11px] leading-relaxed">
            Please follow the hospital's urgent care triage process immediately. An attending clinician must evaluate your condition.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <a
            href="tel:108"
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-200 transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Call Ambulance (108)</span>
          </a>

          <button
            type="button"
            onClick={onProceedToDoctor}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            <span>Proceed to Urgent Triage</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Disclaimer Note */}
        <p className="text-[10px] text-center text-slate-400">
          Prototype safety screening — not clinically validated.
        </p>
      </div>
    </div>
  );
};
