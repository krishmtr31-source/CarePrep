import React from 'react';
import { PatientCaseRecord } from '../../data-models/intake';
import { PatientIdentity } from '../../data-models/patient';
import { 
  User, 
  Clock, 
  ShieldAlert, 
  CheckCircle, 
  ChevronRight, 
  Sparkles, 
  AlertTriangle,
  Stethoscope
} from 'lucide-react';

interface PatientQueueListProps {
  cases: PatientCaseRecord[];
  patients: PatientIdentity[];
  selectedCaseId: string | null;
  onSelectCase: (caseId: string) => void;
}

export const PatientQueueList: React.FC<PatientQueueListProps> = ({
  cases,
  patients,
  selectedCaseId,
  onSelectCase
}) => {
  const getPatient = (patientId: string) => {
    return patients.find(p => p.id === patientId);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Patient Intake Queue ({cases.length})
        </h3>
        <span className="text-xs text-slate-400">Live Mock Feed</span>
      </div>

      <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
        {cases.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
            No patient cases in queue yet.
          </div>
        ) : (
          cases.map((c) => {
            const pat = getPatient(c.patientId);
            const isSelected = c.caseId === selectedCaseId;
            const hasRedFlags = c.redFlagsDetected && c.redFlagsDetected.length > 0;
            const isReviewed = c.status === 'REVIEWED_BY_DOCTOR';

            return (
              <div
                key={c.caseId}
                onClick={() => onSelectCase(c.caseId)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-2 ring-emerald-400/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                      {pat?.fullName ? pat.fullName[0] : 'P'}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        {pat?.fullName || 'Patient'}
                      </h4>
                      <div className="text-[11px] text-slate-500">
                        {pat?.age}y • {pat?.gender} • ABHA: {pat?.abhaId ? pat.abhaId.slice(0, 12) + '...' : 'None'}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-emerald-700 translate-x-1' : 'text-slate-300'}`} />
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100 font-medium">
                  {c.chiefComplaint || 'Intake in progress...'}
                </p>

                <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md font-semibold ${
                      c.mode === 'AYUSH'
                        ? 'bg-ayush-100 text-ayush-800 border border-ayush-200'
                        : 'bg-clinical-100 text-clinical-800 border border-clinical-200'
                    }`}>
                      {c.mode === 'AYUSH' ? 'AYUSH' : 'Clinical'}
                    </span>

                    {hasRedFlags && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold border border-rose-200 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        Red Flag
                      </span>
                    )}
                  </div>

                  <span className={`font-semibold flex items-center gap-1 ${
                    isReviewed ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {isReviewed ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Signed
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        Pending Review
                      </>
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
