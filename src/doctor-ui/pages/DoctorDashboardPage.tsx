import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FilePlus2, 
  Calendar, 
  FileText, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  LogOut, 
  Stethoscope, 
  RefreshCw, 
  Plus, 
  Activity, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  ArrowLeft,
  AlertTriangle,
  Menu,
  X,
  Search,
  ExternalLink,
  Filter
} from 'lucide-react';
import { localStore } from '../../backend/storage/localStore';
import { useAuth } from '../../auth/AuthContext';
import { PatientIdentity } from '../../data-models/patient';
import { generateDoctorSummaryDraft } from '../../ai-services/summaryGenerator';
import { StructuredPatientReportView } from '../components/StructuredPatientReportView';
import { StatCard } from '../../shared/components/ui/DesignSystem';

interface DoctorDashboardPageProps {
  initialCaseId?: string | null;
  onBackToPatientFlow: () => void;
  onNewPatientIntake: () => void;
}

type DoctorSidebarTab = 
  | 'dashboard' 
  | 'patients' 
  | 'new_submissions' 
  | 'appointments' 
  | 'reports' 
  | 'analytics'
  | 'messages' 
  | 'settings';

export const DoctorDashboardPage: React.FC<DoctorDashboardPageProps> = ({
  initialCaseId,
  onBackToPatientFlow,
  onNewPatientIntake
}) => {
  const { user, logout } = useAuth();
  const [patients, setPatients] = useState(() => localStore.getPatients());
  const [cases, setCases] = useState(() => localStore.getCases());
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(() => {
    return initialCaseId || (cases.length > 0 ? cases[0].caseId : null);
  });
  const [activeTab, setActiveTab] = useState<DoctorSidebarTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingReport, setViewingReport] = useState(false);

  const refreshData = () => {
    const updatedCases = localStore.getCases();
    const updatedPatients = localStore.getPatients();
    setPatients(updatedPatients);
    setCases(updatedCases);
    if (!selectedCaseId && updatedCases.length > 0) {
      setSelectedCaseId(updatedCases[0].caseId);
    }
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('careprep_queue_updated', refreshData);
    window.addEventListener('storage', refreshData);
    return () => {
      window.removeEventListener('careprep_queue_updated', refreshData);
      window.removeEventListener('storage', refreshData);
    };
  }, [selectedCaseId]);

  const selectedCase = cases.find(c => c.caseId === selectedCaseId) || cases[0] || null;

  const getPatient = (patientId: string): PatientIdentity => {
    return patients.find(p => p.id === patientId) || {
      id: patientId,
      fullName: 'Patient Record',
      age: 45,
      gender: 'other' as const,
      phoneNumber: '',
      city: '',
      preferredLanguage: 'en' as const,
      createdAt: ''
    };
  };

  // Retrieve or dynamically synthesize summary draft for the selected case
  let selectedSummary = selectedCase ? localStore.getSummaryByCaseId(selectedCase.caseId) : null;
  if (selectedCase && !selectedSummary) {
    const pat = getPatient(selectedCase.patientId);
    const docs = localStore.getDocuments(pat.id, selectedCase.caseId);
    selectedSummary = generateDoctorSummaryDraft(pat, selectedCase, docs);
    localStore.saveSummary(selectedSummary);
  }

  // Compute authentic KPI counts
  const totalPatientsCount = patients.length;
  const newAssessmentsCount = cases.filter(c => c.status === 'COMPLETED' || c.status === 'SUBMITTED_TO_DOCTOR' || c.status === 'RED_FLAG_TRIAGE').length;
  const upcomingAppointmentsCount = cases.filter(c => c.status === 'REVIEWED_BY_DOCTOR' || Boolean(c.doctorReview)).length;
  const pendingReviewsCount = cases.filter(c => c.status !== 'REVIEWED_BY_DOCTOR').length;

  // Filtered cases for search
  const filteredCases = cases.filter(c => {
    const pat = patients.find(p => p.id === c.patientId);
    const text = `${pat?.fullName || ''} ${c.chiefComplaint || ''} ${c.tokenNumber || ''}`.toLowerCase();
    return text.includes(searchQuery.toLowerCase());
  });

  const pendingCases = filteredCases.filter(c => c.status !== 'REVIEWED_BY_DOCTOR');

  const doctorName = user?.name || 'Dr. A. K. Varma, MD';

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 flex flex-col lg:flex-row relative">
      {/* 1. Mobile Top Toggle */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 text-white sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center font-bold">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-white">Doctor Workstation</span>
            <span className="block text-[10px] text-emerald-400">{doctorName}</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 rounded-xl bg-slate-800 text-slate-200"
        >
          {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 2. Clean Doctor Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 lg:top-16 z-40 h-full lg:h-[calc(100vh-64px)] w-64 
        bg-slate-900 text-slate-200 p-4 sm:p-5 flex flex-col justify-between 
        transition-transform duration-200 ease-in-out shadow-xs border-r border-slate-800
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="space-y-6">
          {/* Doctor Profile Card */}
          <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center font-bold text-sm">
              Dr
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">{doctorName}</div>
              <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Internal Medicine</div>
              <div className="text-[10px] text-slate-400 font-mono">Reg: MCI-782910</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'patients', label: 'Patients', icon: <Users className="w-4 h-4" />, count: totalPatientsCount },
              { id: 'new_submissions', label: 'New Assessments', icon: <FilePlus2 className="w-4 h-4" />, count: newAssessmentsCount, highlight: true },
              { id: 'appointments', label: 'Appointments', icon: <Calendar className="w-4 h-4" />, count: upcomingAppointmentsCount },
              { id: 'reports', label: 'Patient Reports', icon: <FileText className="w-4 h-4" /> },
              { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
              { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
            ].map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as DoctorSidebarTab);
                    if (item.id === 'reports') {
                      setViewingReport(true);
                    } else if (item.id === 'dashboard') {
                      setViewingReport(false);
                    }
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : item.highlight
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-slate-800 space-y-2">
          <button
            onClick={onBackToPatientFlow}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Switch to Patient View</span>
          </button>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-950/40 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 3. Main Clinical Workspace */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        
        {/* Workspace Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 text-emerald-400 text-xs font-semibold mb-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Physician Clinical Workstation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Clinical Triage & Case Management'}
              {activeTab === 'patients' && 'Patient Directory'}
              {activeTab === 'new_submissions' && 'New Patient Submissions Queue'}
              {activeTab === 'appointments' && 'Consultation Schedule'}
              {activeTab === 'reports' && 'Structured Clinical Reports'}
              {activeTab === 'analytics' && 'OPD Clinical Analytics'}
              {activeTab === 'messages' && 'Clinical Team Communications'}
              {activeTab === 'settings' && 'Doctor Console Settings'}
            </h1>
            <p className="text-xs text-slate-500">
              Review pre-consultation case drafts, SOCRATES parameters &amp; AI diagnostic intelligence.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={refreshData}
              className="inline-flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-all shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Queue</span>
            </button>

            <button
              onClick={onNewPatientIntake}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Patient Intake</span>
            </button>
          </div>
        </div>

        {/* Top 4 KPI Dashboard Cards (Always visible on Dashboard and New Submissions) */}
        {(activeTab === 'dashboard' || activeTab === 'new_submissions') && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total Patients"
              value={totalPatientsCount}
              subtitle="Registered in clinic"
              icon={<Users className="w-5 h-5" />}
              iconColor="bg-blue-50 text-blue-600 border-blue-200"
            />

            <StatCard
              label="New Assessments"
              value={newAssessmentsCount}
              subtitle="Ready for doctor review"
              icon={<FilePlus2 className="w-5 h-5" />}
              iconColor="bg-emerald-50 text-emerald-600 border-emerald-200"
            />

            <StatCard
              label="Upcoming Appointments"
              value={upcomingAppointmentsCount}
              subtitle="Scheduled consultations"
              icon={<Calendar className="w-5 h-5" />}
              iconColor="bg-indigo-50 text-indigo-600 border-indigo-200"
            />

            <StatCard
              label="Pending Reviews"
              value={pendingReviewsCount}
              subtitle="Awaiting physician sign"
              icon={<Clock className="w-5 h-5" />}
              iconColor="bg-amber-50 text-amber-600 border-amber-200"
            />
          </div>
        )}

        {/* =========================================================================
            VIEW 1: DASHBOARD & QUEUE VIEW
            ========================================================================= */}
        {(activeTab === 'dashboard' || activeTab === 'new_submissions') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Patient Case Cards */}
            <div className={`${viewingReport ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-4`}>
              {/* Search and Filters */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search patient, token, or symptom..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                  {activeTab === 'new_submissions' ? `${pendingCases.length} Pending` : `${filteredCases.length} Cases`}
                </span>
              </div>

              {/* Case Cards Grid */}
              <div className={`grid ${viewingReport ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
                {(activeTab === 'new_submissions' ? pendingCases : filteredCases).length === 0 ? (
                  <div className="col-span-full p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
                    No matching patient submissions found.
                  </div>
                ) : (
                  (activeTab === 'new_submissions' ? pendingCases : filteredCases).map((c) => {
                    const pat = getPatient(c.patientId);
                    const isSelected = c.caseId === selectedCaseId;
                    const hasRedFlags = c.redFlagsDetected && c.redFlagsDetected.length > 0;
                    const isReviewed = c.status === 'REVIEWED_BY_DOCTOR';
                    const priority = hasRedFlags ? 'High Priority' : 'Low Risk';

                    return (
                      <div 
                        key={c.caseId}
                        className={`p-5 rounded-2xl bg-white border transition-all text-left flex flex-col justify-between ${
                          isSelected && viewingReport
                            ? 'border-2 border-emerald-600 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/10'
                            : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div>
                          {/* Card Top: Patient Info & Priority */}
                          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-sm">
                                {pat.fullName.charAt(0)}
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-slate-900">{pat.fullName}</h3>
                                <p className="text-[11px] text-slate-500">
                                  {pat.age} yrs • {pat.gender} • Token #{c.tokenNumber || 'CP-101'}
                                </p>
                              </div>
                            </div>

                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              hasRedFlags
                                ? 'bg-rose-50 text-rose-700 border-rose-200 flex items-center gap-1'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {hasRedFlags && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                              <span>{priority}</span>
                            </span>
                          </div>

                          {/* Chief Symptoms */}
                          <div className="py-3 space-y-1">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Chief Complaint</div>
                            <div className="text-xs font-semibold text-slate-800 line-clamp-2">
                              {c.chiefComplaint || 'Clinical consultation intake'}
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom: Timestamp & View Report Button */}
                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(c.completedAt || c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </span>

                          <button
                            onClick={() => {
                              setSelectedCaseId(c.caseId);
                              setViewingReport(true);
                            }}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              isSelected && viewingReport
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            <span>{isSelected && viewingReport ? 'Active Report' : 'View Report'}</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Structured Report Viewer */}
            {viewingReport && selectedCase && selectedSummary && (
              <div className="lg:col-span-7 sticky top-20">
                <StructuredPatientReportView
                  summary={selectedSummary}
                  caseRecord={selectedCase}
                  onBack={() => setViewingReport(false)}
                  onUpdate={refreshData}
                />
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            VIEW 2: PATIENTS DIRECTORY VIEW
            ========================================================================= */}
        {activeTab === 'patients' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900">Registered Patient Directory ({patients.length})</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Patient Name</th>
                    <th className="p-3">ABHA ID</th>
                    <th className="p-3">Demographics</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Intake History</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((p) => {
                    const patientCaseCount = cases.filter(c => c.patientId === p.id).length;
                    const latestPatCase = cases.find(c => c.patientId === p.id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="p-3 font-bold text-slate-900">{p.fullName}</td>
                        <td className="p-3 font-mono text-emerald-700">{p.abhaId || 'Not linked'}</td>
                        <td className="p-3">{p.age} yrs • {p.gender}</td>
                        <td className="p-3">{p.city || 'Not provided'}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">
                            {patientCaseCount} intake{patientCaseCount === 1 ? '' : 's'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {latestPatCase ? (
                            <button
                              onClick={() => {
                                setSelectedCaseId(latestPatCase.caseId);
                                setActiveTab('dashboard');
                                setViewingReport(true);
                              }}
                              className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
                            >
                              Open Case
                            </button>
                          ) : (
                            <span className="text-slate-400">No records</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 3: APPOINTMENTS SCHEDULE VIEW
            ========================================================================= */}
        {activeTab === 'appointments' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">Consultation Schedule &amp; Slots</h2>
            <div className="space-y-3">
              {cases.filter(c => c.status === 'REVIEWED_BY_DOCTOR').map(c => {
                const pat = getPatient(c.patientId);
                return (
                  <div key={c.caseId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{pat.fullName} (Token #{c.tokenNumber})</h4>
                      <p className="text-[11px] text-slate-500">Chief complaint: {c.chiefComplaint}</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      Confirmed OPD
                    </span>
                  </div>
                );
              })}
              {cases.filter(c => c.status === 'REVIEWED_BY_DOCTOR').length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No verified appointments currently active. Accept a patient assessment to schedule consultation.
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 4: REPORTS VIEW
            ========================================================================= */}
        {activeTab === 'reports' && selectedCase && selectedSummary && (
          <div className="space-y-4">
            <StructuredPatientReportView
              summary={selectedSummary}
              caseRecord={selectedCase}
              onBack={() => setActiveTab('dashboard')}
              onUpdate={refreshData}
            />
          </div>
        )}

        {/* =========================================================================
            VIEW 5: ANALYTICS VIEW
            ========================================================================= */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Emergency Red Flag Gate</span>
              <div className="text-2xl font-black text-rose-600">
                {cases.filter(c => c.redFlagsDetected && c.redFlagsDetected.length > 0).length} Flags
              </div>
              <p className="text-xs text-slate-500">Acute symptoms automatically routed to emergency triage</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">SOCRATES / AYUSH Ratio</span>
              <div className="text-2xl font-black text-slate-900">
                {cases.filter(c => c.mode === 'GENERAL_CLINICAL').length} : {cases.filter(c => c.mode === 'AYUSH').length}
              </div>
              <p className="text-xs text-slate-500">General Clinical vs. AYUSH Dashavidha intake</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Avg Physician Time Saved</span>
              <div className="text-2xl font-black text-emerald-600">
                6.8 mins
              </div>
              <p className="text-xs text-slate-500">Per patient consultation through structured AI drafts</p>
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 6: MESSAGES VIEW
            ========================================================================= */}
        {activeTab === 'messages' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">Clinical Messages &amp; OPD Notifications</h2>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              <span className="font-bold text-slate-900 block mb-1">OPD Triage Desk Notification</span>
              Automated sync active with Ayushman Bharat ABHA registry and CarePrep edge OCR service.
            </div>
          </div>
        )}

        {/* =========================================================================
            VIEW 7: SETTINGS VIEW
            ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">Physician Account &amp; EMR Credentials</h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Physician Name</span>
                <span className="font-bold text-slate-900">{doctorName}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Medical Registration</span>
                <span className="font-bold font-mono text-emerald-700">MCI-2014-98421</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Affiliation</span>
                <span className="font-bold text-slate-900">AIIMS New Delhi / CarePrep Tele-Clinic</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Digital Sign-off Mode</span>
                <span className="font-bold text-blue-700">One-click Clinical Verification (Enabled)</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
