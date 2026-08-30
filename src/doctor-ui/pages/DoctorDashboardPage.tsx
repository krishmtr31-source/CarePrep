import React, { useState, useEffect } from 'react';
import { localStore } from '../../backend/storage/localStore';
import { PatientQueueList } from '../components/PatientQueueList';
import { CaseSummaryReview } from '../components/CaseSummaryReview';
import { 
  Stethoscope, 
  ArrowLeft, 
  RefreshCw, 
  Users, 
  Activity, 
  ShieldAlert, 
  Sparkles,
  PlusCircle,
  Plus
} from 'lucide-react';

interface DoctorDashboardPageProps {
  initialCaseId?: string | null;
  onBackToPatientFlow: () => void;
  onNewPatientIntake: () => void;
}

export const DoctorDashboardPage: React.FC<DoctorDashboardPageProps> = ({
  initialCaseId,
  onBackToPatientFlow,
  onNewPatientIntake
}) => {
  const [patients, setPatients] = useState(() => localStore.getPatients());
  const [cases, setCases] = useState(() => localStore.getCases());
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(() => {
    return initialCaseId || (cases.length > 0 ? cases[0].caseId : null);
  });

  const refreshData = () => {
    setPatients(localStore.getPatients());
    setCases(localStore.getCases());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const selectedCase = cases.find(c => c.caseId === selectedCaseId) || cases[0] || null;
  const selectedSummary = selectedCase ? localStore.getSummaryByCaseId(selectedCase.caseId) : null;

  const totalCases = cases.length;
  const redFlagCount = cases.filter(c => c.redFlagsDetected && c.redFlagsDetected.length > 0).length;
  const ayushCount = cases.filter(c => c.mode === 'AYUSH').length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Doctor Portal Top Bar */}
      <header className="bg-slate-900 text-white px-4 py-3 sm:px-6 shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToPatientFlow}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Return to Patient Intake View"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center font-bold">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold leading-none flex items-center gap-2">
                  AarogyaSutra Physician Console
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                    Doctor Portal
                  </span>
                </h1>
                <p className="text-[11px] text-slate-400 mt-0.5">Pre-Consultation Case History & Dashavidha Pariksha Review</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={refreshData}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={onNewPatientIntake}
              className="inline-flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Patient Intake</span>
            </button>
          </div>
        </div>
      </header>

      {/* Top Clinical Stats Metrics */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Total Cases</div>
              <div className="text-sm font-extrabold text-slate-900">{totalCases}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">AYUSH Intakes</div>
              <div className="text-sm font-extrabold text-slate-900">{ayushCount}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">Red Flag Alerts</div>
              <div className="text-sm font-extrabold text-rose-700">{redFlagCount}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400">AI Verification</div>
              <div className="text-sm font-extrabold text-indigo-900">Doctor Drafted</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Queue, Right Detail */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Patient Queue (4 cols) */}
          <div className="lg:col-span-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
            <PatientQueueList
              cases={cases}
              patients={patients}
              selectedCaseId={selectedCase?.caseId || null}
              onSelectCase={(id) => setSelectedCaseId(id)}
            />
          </div>

          {/* Right Column: Case Detail & Physician Summary (8 cols) */}
          <div className="lg:col-span-8">
            {selectedSummary && selectedCase ? (
              <CaseSummaryReview
                summary={selectedSummary}
                caseRecord={selectedCase}
                onUpdate={refreshData}
              />
            ) : (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 space-y-3">
                <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-700">No Patient Case Selected</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Select a patient from the queue on the left to review their AI-generated history draft and clinical parameters.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
