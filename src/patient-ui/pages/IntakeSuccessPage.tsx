import React from 'react';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { useIntake } from '../../shared/contexts/IntakeContext';
import { localStore } from '../../backend/storage/localStore';
import { 
  CheckCircle2, 
  Stethoscope, 
  RotateCcw, 
  FileText, 
  ShieldCheck, 
  ArrowRight, 
  Clock 
} from 'lucide-react';

interface IntakeSuccessPageProps {
  caseId: string;
  onOpenDoctor: (caseId: string) => void;
  onRestart: () => void;
}

export const IntakeSuccessPage: React.FC<IntakeSuccessPageProps> = ({
  caseId,
  onOpenDoctor,
  onRestart
}) => {
  const { t } = useLanguage();
  const { patient, mode } = useIntake();
  const caseRecord = localStore.getCaseById(caseId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/70 via-slate-50 to-white flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl mx-auto w-full my-auto py-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center shadow-lg shadow-emerald-200 animate-in zoom-in">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Case Intake Successfully Completed
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
            Your Health Summary is Ready for Doctor Review
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
            Thank you, <strong>{patient?.fullName || 'Patient'}</strong>. Your case history and {mode === 'AYUSH' ? 'AYUSH Dashavidha' : 'Clinical SOCRATES'} parameters have been compiled and sent to the physician dashboard.
          </p>
        </div>

        {/* Case card summary */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-left space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-2 border-b border-slate-100">
            <span className="flex items-center gap-1 font-mono font-semibold text-slate-700">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Case ID: {caseId}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Just Now
            </span>
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chief Complaint</div>
            <div className="text-sm font-semibold text-slate-800">
              {caseRecord?.chiefComplaint || 'Pre-consultation history recorded'}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 text-xs text-emerald-700 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            <span>Case stored locally in prototype registry. Doctor can now open, review, and edit.</span>
          </div>
        </div>

        {/* Navigation Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={() => onOpenDoctor(caseId)}
            className="w-full inline-flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white font-bold text-base shadow-xl shadow-slate-300 transition-all"
          >
            <Stethoscope className="w-5 h-5 text-emerald-400" />
            <span>Open Physician Dashboard (Doctor View)</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 py-2 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Another Patient Intake</span>
          </button>
        </div>
      </div>
    </div>
  );
};
