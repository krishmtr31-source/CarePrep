import React from 'react';
import { 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  ShieldAlert, 
  Hospital, 
  ArrowRight, 
  RotateCcw, 
  Loader2, 
  CheckCircle2, 
  X 
} from 'lucide-react';
import { RedFlagAnalysisResult, RiskLevel } from '../../ai-services/redFlagDetection';

export interface RedFlagAlertBannerProps {
  analysis: RedFlagAnalysisResult | null;
  isLoading?: boolean;
  onContinue: () => void;
  onFindHospitals?: () => void;
  onReviewAnswers?: () => void;
  onDismiss?: () => void;
}

export const RedFlagAlertBanner: React.FC<RedFlagAlertBannerProps> = ({
  analysis,
  isLoading = false,
  onContinue,
  onFindHospitals,
  onReviewAnswers,
  onDismiss
}) => {
  // 1. Loading State (Subtle and non-intrusive)
  if (isLoading) {
    return (
      <div 
        role="status"
        aria-live="polite"
        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-between gap-3 animate-in fade-in"
      >
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-800">Reviewing your responses...</p>
            <p className="text-[11px] text-slate-500">Checking for symptoms requiring prompt or urgent attention</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          AI Triage
        </span>
      </div>
    );
  }

  if (!analysis) return null;

  // 2. Service Unavailable Fallback
  if (!analysis.isAvailable || analysis.fallbackNotice) {
    return (
      <div 
        role="status"
        className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 space-y-2 animate-in fade-in"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-950">Symptom screening notice</p>
              <p className="text-xs text-amber-800 mt-0.5">
                {analysis.fallbackNotice || 'AI symptom screening is temporarily unavailable. You can continue your intake and your responses will still be available for your healthcare provider.'}
              </p>
            </div>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss notice"
              className="text-amber-600 hover:text-amber-800 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  const { riskLevel, redFlagsDetected, recommendedAction, patientMessage } = analysis;

  // 3. LOW RISK: Render clean, subtle reassurance without interrupting the patient
  if (riskLevel === 'LOW') {
    return null; // Ordinary symptoms do not interrupt the patient
  }

  // 4. EMERGENCY RISK: Prominent, clear, calm urgency alert
  if (riskLevel === 'EMERGENCY') {
    return (
      <div 
        role="alert"
        aria-live="assertive"
        className="p-5 sm:p-6 rounded-2xl bg-rose-50/95 border-2 border-rose-400 text-rose-950 shadow-md space-y-4 animate-in fade-in duration-300"
      >
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white rounded-md">
                Urgent Attention Required
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-rose-950 tracking-tight">
              🚨 Urgent Symptoms Detected
            </h3>
            <p className="text-xs sm:text-sm text-rose-900 font-medium">
              {patientMessage || 'Your responses may indicate symptoms that require urgent medical attention.'}
            </p>
          </div>
        </div>

        {/* Reported Concerns List */}
        {redFlagsDetected.length > 0 && (
          <div className="bg-white/80 rounded-xl p-3.5 border border-rose-200/90 space-y-1.5">
            <p className="text-xs font-bold text-rose-950 uppercase tracking-wider">
              Reported concern:
            </p>
            <ul className="space-y-1">
              {redFlagsDetected.map((rf, idx) => (
                <li key={idx} className="text-xs text-rose-900 flex items-start gap-2">
                  <span className="text-rose-500 font-bold">•</span>
                  <span>
                    <strong className="font-bold text-rose-950">{rf.symptom}:</strong> {rf.reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Action */}
        <div className="bg-rose-100/60 rounded-xl p-3 border border-rose-200">
          <p className="text-[11px] font-bold text-rose-900 uppercase tracking-wider mb-0.5">
            Recommended Action:
          </p>
          <p className="text-xs font-semibold text-rose-950 leading-relaxed">
            {recommendedAction || 'Please seek emergency medical care immediately or contact your local emergency service (e.g. Call 108 / 112).'}
          </p>
        </div>

        {/* Action Buttons: Patient Remains in Control */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {onFindHospitals && (
            <button
              type="button"
              onClick={onFindHospitals}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all min-h-[44px] cursor-pointer"
            >
              <Hospital className="w-4 h-4" />
              <span>Find Nearby Hospitals</span>
            </button>
          )}

          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-rose-50 border border-rose-300 text-rose-900 font-bold text-xs transition-all min-h-[44px] cursor-pointer"
          >
            <span>Continue Intake</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Clear Medical AI Disclaimer */}
        <p className="text-[10px] text-rose-700/90 pt-1 leading-normal border-t border-rose-200">
          CarePrep is not a substitute for emergency medical care. This alert is not a diagnosis. If you believe you are experiencing a medical emergency, seek emergency medical care immediately.
        </p>
      </div>
    );
  }

  // 5. HIGH RISK: Prominent warning requiring prompt medical review
  if (riskLevel === 'HIGH') {
    return (
      <div 
        role="alert"
        aria-live="polite"
        className="p-5 rounded-2xl bg-amber-50/95 border-2 border-amber-300 text-amber-950 space-y-3.5 shadow-sm animate-in fade-in"
      >
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 rounded-md">
              Prompt Evaluation Advised
            </span>
            <h3 className="text-base font-extrabold text-amber-950 mt-1">
              ⚠️ Important Symptoms Detected
            </h3>
            <p className="text-xs sm:text-sm text-amber-900 mt-0.5 font-medium">
              {patientMessage || 'Some of your responses may require prompt medical evaluation.'}
            </p>
          </div>
        </div>

        {redFlagsDetected.length > 0 && (
          <div className="bg-white/90 rounded-xl p-3 border border-amber-200 space-y-1">
            <p className="text-[11px] font-bold text-amber-950 uppercase tracking-wider">
              Identified Concerns:
            </p>
            <ul className="space-y-1">
              {redFlagsDetected.map((rf, idx) => (
                <li key={idx} className="text-xs text-amber-900 flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>
                    <strong className="font-bold text-amber-950">{rf.symptom}:</strong> {rf.reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          {onReviewAnswers && (
            <button
              type="button"
              onClick={onReviewAnswers}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-2xs transition-all min-h-[40px] cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Review My Answers</span>
            </button>
          )}

          {onFindHospitals && (
            <button
              type="button"
              onClick={onFindHospitals}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs transition-all min-h-[40px] cursor-pointer"
            >
              <Hospital className="w-3.5 h-3.5" />
              <span>Find Nearby Healthcare</span>
            </button>
          )}

          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-amber-900 hover:bg-amber-100/60 font-semibold text-xs transition-all min-h-[40px] cursor-pointer"
          >
            <span>Continue Intake</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[10px] text-amber-700 pt-0.5 leading-normal">
          AI-assisted screening is for informational and triage support only. It does not provide a medical diagnosis.
        </p>
      </div>
    );
  }

  // 6. MODERATE RISK: Calm informational reminder for doctor consultation
  return (
    <div 
      role="status"
      className="p-4 rounded-2xl bg-teal-50/90 border border-teal-200 text-teal-950 space-y-2.5 animate-in fade-in"
    >
      <div className="flex items-start gap-2.5">
        <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-teal-950">Clinical consultation note</p>
          <p className="text-xs text-teal-800">
            {patientMessage || 'Some information in your responses may be important for your doctor to review during your consultation.'}
          </p>
          {redFlagsDetected.length > 0 && (
            <div className="text-[11px] text-teal-800 pt-1">
              <span className="font-semibold">Noted items:</span> {redFlagsDetected.map(r => r.symptom).join(', ')}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all min-h-[36px] cursor-pointer"
        >
          <span>Continue Intake</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <p className="text-[10px] text-teal-600 pt-0.5">
        AI-assisted screening is for informational and triage support only. It does not provide a medical diagnosis.
      </p>
    </div>
  );
};
