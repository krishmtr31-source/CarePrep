import React, { useState } from 'react';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { useIntake } from '../../shared/contexts/IntakeContext';
import { localStore } from '../../backend/storage/localStore';
import { 
  CheckCircle2, 
  RotateCcw, 
  FileText, 
  ShieldCheck, 
  Clock, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Activity,
  AlertTriangle,
  Building2,
  Ticket
} from 'lucide-react';

interface IntakeSuccessPageProps {
  caseId: string;
  onRestart: () => void;
}

export const IntakeSuccessPage: React.FC<IntakeSuccessPageProps> = ({
  caseId,
  onRestart
}) => {
  const { t } = useLanguage();
  const { patient, mode } = useIntake();
  const [showSubmissionDetails, setShowSubmissionDetails] = useState(false);

  const caseRecord = localStore.getCaseById(caseId);
  const curPatient = (caseRecord && localStore.getPatients().find(p => p.id === caseRecord.patientId)) || patient;
  const isEmergency = caseRecord?.status === 'RED_FLAG_TRIAGE' || (caseRecord?.redFlagsDetected && caseRecord.redFlagsDetected.length > 0);

  const tokenNumber = caseRecord?.tokenNumber || `C-${100 + localStore.getCases().length}`;
  const queuePosition = caseRecord?.queuePosition || localStore.getCases().filter(c => c.status !== 'REVIEWED_BY_DOCTOR').length || 1;

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative z-10">
      <div className="max-w-xl mx-auto w-full my-auto py-6 text-center space-y-6 animate-in fade-in">
        
        {/* Success Icon Badge */}
        <div className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-lg animate-in zoom-in ${
          isEmergency ? 'bg-rose-100 text-rose-600 shadow-rose-200' : 'bg-emerald-100 text-emerald-600 shadow-emerald-200'
        }`}>
          {isEmergency ? (
            <AlertTriangle className="w-10 h-10 animate-bounce" />
          ) : (
            <CheckCircle2 className="w-10 h-10" />
          )}
        </div>

        {/* Header Text */}
        <div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full border ${
            isEmergency 
              ? 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse' 
              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isEmergency ? 'bg-rose-600' : 'bg-emerald-600 animate-ping'}`} />
            {isEmergency ? 'Urgent Triage Case Submitted' : 'Pre-Consultation Complete'}
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">
            {isEmergency ? 'Immediate Clinical Attention Flagged' : 'Assessment Queued for Doctor'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
            Thank you, <strong>{curPatient?.fullName || 'Patient'}</strong>. Your case history and {mode === 'AYUSH' ? 'AYUSH Dashavidha' : 'Clinical SOCRATES'} data have been securely queued for physician review.
          </p>
        </div>

        {/* Official Token & Queue Handover Card */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl border border-white/60 shadow-xl shadow-slate-900/10 p-6 text-left space-y-4">
          
          {/* Token & Queue Highlight */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-inner">
            <div className="border-r border-slate-700/80 pr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Ticket className="w-3.5 h-3.5" />
                Token Number
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white mt-0.5">
                {tokenNumber}
              </div>
            </div>

            <div className="pl-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Queue Position
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-400 mt-0.5">
                #{queuePosition}
              </div>
            </div>
          </div>

          {/* Patient Details & Status */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">Patient Name:</span>
              <span className="font-extrabold text-slate-900">{curPatient?.fullName} ({curPatient?.age}y, {curPatient?.gender})</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">Consultation Mode:</span>
              <span className="font-bold text-slate-800 capitalize">
                {mode === 'AYUSH' ? 'AYUSH / Ayurveda (Dashavidha)' : 'General Clinical (SOCRATES)'}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-500">Submission Status:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sent to Doctor • Awaiting Call
              </span>
            </div>

            <div>
              <span className="text-slate-500 block mb-1">Chief Complaint Recorded:</span>
              <p className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-800 leading-relaxed">
                {caseRecord?.chiefComplaint || 'Pre-consultation history captured'}
              </p>
            </div>
          </div>

          {/* Next Steps Guidance */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1">
            <div className="font-extrabold flex items-center gap-1.5 text-emerald-900">
              <Building2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              What to do next:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-emerald-900 text-[11px] leading-relaxed">
              <li>Please proceed to Waiting Hall / Consultation Desk.</li>
              <li>Keep your Token Number (<strong>{tokenNumber}</strong>) ready.</li>
              <li>Your consulting doctor is reviewing your structured history and will call your token shortly.</li>
            </ul>
          </div>

          {/* Expandable Submission Details for Patient Receipt */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowSubmissionDetails(!showSubmissionDetails)}
              className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <span>View My Intake Submission Receipt</span>
              {showSubmissionDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showSubmissionDetails && (
              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 max-h-48 overflow-y-auto">
                <div className="font-mono text-[10px] text-slate-400">Case ID: {caseId}</div>
                {caseRecord?.answers && caseRecord.answers.length > 0 ? (
                  caseRecord.answers.map((ans, idx) => (
                    <div key={idx} className="pb-1.5 border-b border-slate-200 last:border-0">
                      <div className="font-bold text-slate-700">{ans.step.replace(/_/g, ' ')}:</div>
                      <div className="text-slate-600">{ans.rawPatientResponse || ans.customText || ans.selectedOptionIds?.join(', ')}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500">Summary notes recorded and handed off to doctor.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls for Patient */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={onRestart}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-200 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Return to Patient Portal / New Intake</span>
          </button>
        </div>

        {/* Privacy Footer */}
        <p className="text-[10px] text-slate-400">
          CarePrep Digital Case Handover • Confidential Patient Health Record
        </p>
      </div>
    </div>
  );
};
