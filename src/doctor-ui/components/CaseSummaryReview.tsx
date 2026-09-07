import React, { useState, useEffect } from 'react';
import { DoctorSummaryDraft } from '../../data-models/doctorSummary';
import { PatientCaseRecord } from '../../data-models/intake';
import { ExtractedDocumentData } from '../../document-intelligence/models/document';
import { localStore } from '../../backend/storage/localStore';
import { DashavidhaParikshaView } from './DashavidhaParikshaView';
import { DocumentTimelineView } from '../../document-intelligence/components/DocumentTimelineView';
import { ExtractedEntitiesView } from '../../document-intelligence/components/ExtractedEntitiesView';
import { OriginalDocumentModal } from '../../document-intelligence/components/OriginalDocumentModal';
import { 
  Bot, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  AlertTriangle, 
  FileText, 
  ShieldCheck, 
  Stethoscope,
  Activity,
  FolderOpen,
  Calendar,
  Pill,
  History,
  AlertCircle,
  Sparkles,
  Info,
  X
} from 'lucide-react';

interface CaseSummaryReviewProps {
  summary: DoctorSummaryDraft;
  caseRecord: PatientCaseRecord;
  onUpdate: () => void;
}

export const CaseSummaryReview: React.FC<CaseSummaryReviewProps> = ({
  summary,
  caseRecord,
  onUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'medications' | 'labs' | 'ayush' | 'documents' | 'timeline' | 'audit'>('summary');
  const [doctorNotes, setDoctorNotes] = useState<string>(summary.doctorEdits?.physicianNotes || '');
  const [doctorName, setDoctorName] = useState<string>(summary.doctorEdits?.verifiedByDoctorName || 'Dr. A. K. Varma, MD');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [activeDocForModal, setActiveDocForModal] = useState<ExtractedDocumentData | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Log audit trail event when summary is opened
  useEffect(() => {
    localStore.logAuditAction(summary.caseId, 'OPENED', doctorName, 'Physician opened clinical summary for review.');
  }, [summary.caseId]);

  const handleAction = (status: 'ACCEPTED' | 'MODIFIED' | 'REJECTED', reasonDetail?: string) => {
    const actionNote = status === 'REJECTED' 
      ? `Rejection Reason: ${reasonDetail || 'Clinician rejected automated draft.'}` 
      : doctorNotes;

    localStore.updateDoctorReview(summary.caseId, doctorName, status, actionNote, reasonDetail);
    setStatusMessage(
      status === 'ACCEPTED' 
        ? `Clinician confirmation recorded (Version ${(summary.currentVersionNumber || 1) + 1} generated)`
        : status === 'MODIFIED'
        ? `Physician modifications saved (Version ${(summary.currentVersionNumber || 1) + 1} generated)`
        : `Draft rejected and recorded in prototype audit history (Version ${(summary.currentVersionNumber || 1) + 1} generated)`
    );
    setIsRejectModalOpen(false);
    onUpdate();
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const hpi = summary.hpiStructured || {
    onset: 'Not provided.',
    duration: 'Not provided.',
    location: 'Not provided.',
    character: 'Not provided.',
    severity: 'Not provided.',
    aggravatingFactors: 'Not provided.',
    relievingFactors: 'Not provided.',
    associatedSymptoms: 'Not provided.'
  };

  const redFlags = summary.redFlagTriage?.alerts || [];
  const currentStatus = summary.doctorEdits?.status || 'DRAFT';
  const documents = localStore.getDocuments(summary.patientId, summary.caseId);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header with Case Metadata & Versioning */}
      <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800">
              Case #{summary.caseId}
            </span>
            <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
              summary.mode === 'AYUSH'
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              {summary.mode === 'AYUSH' ? 'AYUSH Case Intake' : 'General Clinical Intake'}
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Version {summary.currentVersionNumber || 1} ({currentStatus})
            </span>
            
            {/* Safety status badge */}
            <span className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
              summary.redFlagTriage?.hasTriggered
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}>
              {summary.redFlagTriage?.hasTriggered ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                  🔴 Potential urgent presentation
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  🟢 No prototype red flag
                </>
              )}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {summary.patientName}
            <span className="text-sm font-normal text-slate-500 ml-2">
              ({summary.age}y / {summary.gender})
            </span>
          </h2>

          <p className="text-xs text-slate-500 mt-0.5">
            Language: <strong className="uppercase font-mono">{summary.selectedLanguage}</strong> • ABHA ID: <strong className="font-mono text-slate-700">{summary.abhaId || 'Not provided'}</strong> • Intake Date: {new Date(summary.dateGenerated).toLocaleString()}
          </p>
        </div>

        {/* Reviewing Physician Input Box */}
        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <div className="text-left">
            <div className="text-[10px] font-bold uppercase text-slate-400">Reviewing Clinician</div>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="text-xs font-semibold text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* ITEMS REQUIRING YOUR ATTENTION (Prominent Top Alert Section) */}
      {(summary.redFlagTriage?.hasTriggered || 
        (summary.abnormalLabFindings && summary.abnormalLabFindings.length > 0) || 
        (summary.medicationConflicts && summary.medicationConflicts.length > 0) ||
        (summary.verificationItems && summary.verificationItems.length > 0)) && (
        <div className="p-4 sm:p-5 bg-amber-50/70 border-b border-amber-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              ⚠️ Items Requiring Your Attention
            </h4>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">
              Clinical Priority Items
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* 1. Red Flag Presentation if any */}
            {summary.redFlagTriage?.hasTriggered && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 col-span-1 md:col-span-2">
                <div className="font-bold flex items-center gap-1.5 text-rose-900 mb-1">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Potential Urgent Presentation Detected (Deterministic Prototype Red-Flag Rules):</span>
                </div>
                {redFlags.map((rf, idx) => (
                  <p key={idx} className="text-xs text-rose-800 font-medium">
                    • <strong>{rf.ruleTitle} ({rf.ruleId}):</strong> {rf.matchedTrigger} — <em>Human triage required</em>
                  </p>
                ))}
              </div>
            )}

            {/* 2. Abnormal Lab Findings */}
            {summary.abnormalLabFindings && summary.abnormalLabFindings.length > 0 && (
              <div className="p-3 rounded-xl bg-white border border-amber-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="flex items-center gap-1.5 text-amber-900">
                    <Activity className="w-3.5 h-3.5 text-amber-600" />
                    Abnormal Laboratory Findings ({summary.abnormalLabFindings.length})
                  </span>
                  <button
                    onClick={() => setActiveTab('labs')}
                    className="text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    View Source →
                  </button>
                </div>
                <div className="space-y-1">
                  {summary.abnormalLabFindings.map((l, i) => (
                    <div key={i} className="flex items-center justify-between text-slate-700 bg-amber-50/50 p-1.5 rounded-lg">
                      <span className="font-semibold">{l.testName}</span>
                      <span className="font-mono font-bold text-rose-700">
                        {l.resultValue} {l.unit} [{l.flag}]
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Medication Discrepancies */}
            {summary.medicationConflicts && summary.medicationConflicts.length > 0 && (
              <div className="p-3 rounded-xl bg-white border border-rose-200 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="flex items-center gap-1.5 text-rose-900">
                    <Pill className="w-3.5 h-3.5 text-rose-600" />
                    Medication Discrepancies ({summary.medicationConflicts.length})
                  </span>
                  <button
                    onClick={() => setActiveTab('medications')}
                    className="text-[11px] font-bold text-rose-700 hover:underline"
                  >
                    Review Meds →
                  </button>
                </div>
                <div className="space-y-1">
                  {summary.medicationConflicts.map((c, i) => (
                    <p key={i} className="text-slate-700 text-[11px] leading-snug">
                      • <strong>{c.medicationName}:</strong> Patient reported "{c.patientStatement}" vs. Document "{c.documentStatement}".
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Information Requiring Verification */}
            {summary.verificationItems && summary.verificationItems.length > 0 && (
              <div className="p-3 rounded-xl bg-white border border-amber-200 space-y-1.5 col-span-1 md:col-span-2">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Information Requiring Clinician Verification ({summary.verificationItems.length}):</span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-700">
                  {summary.verificationItems.map((item, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-amber-500">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clinical Disclaimer Bar */}
      <div className="px-6 py-2 bg-slate-100 border-b border-slate-200 text-slate-600 text-xs flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-medium">
          <Bot className="w-3.5 h-3.5 text-slate-500" />
          SYSTEM-GENERATED INTAKE DRAFT — {summary.clinicalDisclaimer}
        </span>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap border-b border-slate-200 px-6 bg-slate-50/40 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('summary')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'summary'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Case Summary & HPI</span>
        </button>

        <button
          onClick={() => setActiveTab('medications')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'medications'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          <span>Medications ({summary.extractedMedications?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('labs')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'labs'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Investigation Results ({summary.investigationResults?.length || 0})</span>
        </button>

        {summary.mode === 'AYUSH' && (
          <button
            onClick={() => setActiveTab('ayush')}
            className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'ayush'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>AYUSH Dashavidha</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('documents')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'documents'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Medical Documents ({documents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'timeline'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Chronological Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'audit'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Version History & Audit ({summary.versions?.length || 1})</span>
        </button>
      </div>

      {/* Tab Content Body */}
      <div className="p-6 space-y-6 flex-1 overflow-y-auto max-h-[calc(100vh-360px)]">
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* Chief Complaint & Original Patient Statement */}
            <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Chief Complaint (Patient Statement & Interpretation)
                </span>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  Automated interpretation — verify with patient/clinician
                </span>
              </div>
              <p className="text-base font-bold text-slate-900">
                {typeof summary.chiefComplaint === 'string' 
                  ? summary.chiefComplaint 
                  : summary.chiefComplaint?.normalizedText || 'Not provided.'}
              </p>

              {/* Patient Verbatim Transcript Box */}
              {summary.patientVerbatimStatements && summary.patientVerbatimStatements.length > 0 && (
                <div className="pt-3 border-t border-slate-200/80 space-y-2 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Patient Original Responses (Preserved Verbatim):
                  </span>
                  {summary.patientVerbatimStatements.map((stmt, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-2">
                      <div>
                        <span className="text-slate-500 font-semibold block text-[11px]">
                          Q: {stmt.step}
                        </span>
                        <p className="text-slate-900 font-medium italic mt-0.5">
                          "{stmt.rawText}"
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 flex-shrink-0">
                        {stmt.modality === 'VOICE' ? '🎤 Voice' : stmt.modality === 'TOUCH_CHIP' ? '👆 Touch' : '⌨️ Typed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Structured History of Present Illness (SOCRATES) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Structured History of Present Illness (SOCRATES)
                </h3>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                  Automated interpretation — verify with patient/clinician
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <strong className="text-slate-500 block mb-0.5">Site & Location:</strong>
                  <span className={hpi.location === 'Not provided.' ? 'text-slate-400 italic' : 'text-slate-800 font-medium'}>
                    {hpi.location}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <strong className="text-slate-500 block mb-0.5">Onset & Duration:</strong>
                  <span className={hpi.duration === 'Not provided.' ? 'text-slate-400 italic' : 'text-slate-800 font-medium'}>
                    {hpi.duration}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <strong className="text-slate-500 block mb-0.5">Character of Pain:</strong>
                  <span className={hpi.character === 'Not provided.' ? 'text-slate-400 italic' : 'text-slate-800 font-medium'}>
                    {hpi.character}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <strong className="text-slate-500 block mb-0.5">Severity Rating:</strong>
                  <span className={hpi.severity === 'Not provided.' ? 'text-slate-400 italic' : 'text-slate-800 font-medium'}>
                    {hpi.severity}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <strong className="text-slate-500 block mb-0.5">Aggravating & Relieving Factors:</strong>
                  <span className={hpi.aggravatingFactors === 'Not provided.' ? 'text-slate-400 italic' : 'text-slate-800 font-medium'}>
                    {hpi.aggravatingFactors}
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <strong className="text-slate-500 block mb-0.5">Associated Symptoms:</strong>
                  <span className={hpi.associatedSymptoms === 'Not provided.' ? 'text-slate-400 italic' : 'text-slate-800 font-medium'}>
                    {hpi.associatedSymptoms}
                  </span>
                </div>
              </div>
            </div>

            {/* Previously Documented Diagnoses */}
            {summary.previousDiagnoses && summary.previousDiagnoses.length > 0 && (
              <div className="p-4 bg-indigo-50/40 rounded-2xl border border-indigo-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <strong className="text-indigo-900 font-bold uppercase tracking-wider">
                    Previously Documented Diagnoses (from medical records)
                  </strong>
                  <span className="text-[10px] text-indigo-700">Does NOT convert current complaint into a diagnosis</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {summary.previousDiagnoses.map((diag, i) => (
                    <div key={i} className="p-2.5 bg-white rounded-xl border border-indigo-100">
                      <span className="font-bold text-slate-800">• {diag.conditionName}</span>
                      <span className="block text-[11px] text-slate-400 mt-0.5">Source: {diag.evidence.documentName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Information Requiring Verification Checklist */}
            {summary.verificationItems && summary.verificationItems.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-1.5">
                <strong className="text-amber-900 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  ⚠️ Information Requiring Verification ({summary.verificationItems.length})
                </strong>
                <ul className="space-y-1 mt-1">
                  {summary.verificationItems.map((item, i) => (
                    <li key={i} className="text-amber-800 font-medium">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Clinician-Authored Clinical Notes & Plan */}
            <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-emerald-700" />
                  Clinician Assessment, Examination Findings & Management Plan
                </label>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  Clinician-Authored Content
                </span>
              </div>
              <textarea
                rows={3}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Type clinician examination findings, differential assessment or treatment plan..."
                className="w-full bg-white p-3 rounded-xl border border-emerald-200 text-xs sm:text-sm text-slate-800 outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Medications Table */}
        {activeTab === 'medications' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-emerald-600" />
              Medication History from Prescriptions & Intake Records
            </h4>

            {summary.extractedMedications && summary.extractedMedications.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <th className="p-3">Medication Name</th>
                      <th className="p-3">Dose</th>
                      <th className="p-3">Frequency</th>
                      <th className="p-3">Duration</th>
                      <th className="p-3">Source Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.extractedMedications.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">
                          {m.name} {m.isAyushMedicine && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">AYUSH</span>}
                        </td>
                        <td className="p-3 font-medium text-slate-700">{m.dosage}</td>
                        <td className="p-3 text-slate-600">{m.frequency}</td>
                        <td className="p-3 text-slate-600">{m.duration}</td>
                        <td className="p-3 text-[11px] text-slate-400 font-mono">
                          {m.evidence?.documentName || 'Intake verbal history'} (p.{m.evidence?.pageNumber || 1})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No medications extracted from documents or reported during intake.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Investigation Results */}
        {activeTab === 'labs' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-600" />
              Investigation & Laboratory Results (Observations Only)
            </h4>

            {summary.investigationResults && summary.investigationResults.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <th className="p-3">Investigation Test</th>
                      <th className="p-3 text-right">Result</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3">Reported Reference Range</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">Source Evidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.investigationResults.map((lab, idx) => (
                      <tr key={idx} className={lab.isAbnormal ? 'bg-rose-50/60 font-semibold' : 'hover:bg-slate-50'}>
                        <td className="p-3 font-bold text-slate-900">{lab.testName}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">{lab.resultValue}</td>
                        <td className="p-3 text-slate-600">{lab.unit}</td>
                        <td className="p-3 font-mono text-slate-600">{lab.sourceReferenceRange?.raw || 'Not provided'}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lab.isAbnormal ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {lab.flag}
                          </span>
                        </td>
                        <td className="p-3 text-[11px] text-slate-400 font-mono">
                          {lab.evidence?.documentName} (p.{lab.evidence?.pageNumber || 1})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No laboratory reports attached to this case.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: AYUSH Section */}
        {activeTab === 'ayush' && summary.mode === 'AYUSH' && (
          <DashavidhaParikshaView summary={summary} />
        )}

        {/* Tab 5: Documents */}
        {activeTab === 'documents' && (
          <div className="space-y-4">
            {documents.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs text-slate-400">
                No medical documents uploaded for this case.
              </div>
            ) : (
              documents.map((doc) => (
                <ExtractedEntitiesView
                  key={doc.documentId}
                  document={doc}
                  onViewOriginal={setActiveDocForModal}
                />
              ))
            )}
          </div>
        )}

        {/* Tab 6: Timeline */}
        {activeTab === 'timeline' && (
          <DocumentTimelineView events={summary.timelineEvents || []} />
        )}

        {/* Tab 7: Version History & Audit Trail */}
        {activeTab === 'audit' && (
          <div className="space-y-5 text-xs">
            {/* Version List */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="font-bold uppercase tracking-wider text-slate-600">
                  Summary Version History
                </h4>
                <span className="text-[11px] text-slate-500">
                  Version 1: Original system-generated intake draft, preserved and not editable through the application workflow.
                </span>
              </div>

              <div className="space-y-2">
                {summary.versions?.map((v) => (
                  <div key={v.versionNumber} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">Version {v.versionNumber}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                          {v.authoredBy === 'AI_DRAFT' ? 'System-Generated Draft' : 'Clinician-Authored'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          v.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                          v.status === 'MODIFIED' ? 'bg-amber-100 text-amber-800' : 
                          v.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {v.status}
                        </span>
                      </div>
                      {v.physicianNotes && (
                        <p className="text-slate-600 mt-1 italic font-medium">Notes: "{v.physicianNotes}"</p>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(v.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Prototype Audit Trail */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="font-bold uppercase tracking-wider text-slate-600">
                  Prototype Audit History (Append-Oriented)
                </h4>
                <span className="text-[11px] text-slate-500">
                  Client-side prototype storage
                </span>
              </div>
              <div className="bg-slate-900 text-emerald-300 font-mono p-4 rounded-2xl space-y-1.5 text-[11px] shadow-inner">
                {summary.auditTrail?.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span className="font-bold text-amber-400">[{entry.action}]</span>
                    <span>{entry.details || (entry.doctorName ? `by ${entry.doctorName}` : '')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {statusMessage && (
        <div className="px-6 py-2 bg-emerald-600 text-white text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Doctor Action Controls Footer */}
      <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500">
          Status: <strong>{currentStatus}</strong> • Version: <strong>{summary.currentVersionNumber || 1}</strong>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsRejectModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-colors shadow-sm"
          >
            <XCircle className="w-4 h-4" />
            <span>Reject Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction('MODIFIED')}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-200 bg-white hover:bg-amber-50 text-amber-800 text-xs font-bold transition-colors shadow-sm"
          >
            <Edit3 className="w-4 h-4" />
            <span>Save Modifications</span>
          </button>

          <button
            type="button"
            onClick={() => handleAction('ACCEPTED')}
            title="Prototype clinician confirmation — not a production digital signature"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Accept & Confirm</span>
          </button>
        </div>
      </div>

      {/* Persistent Doctor Final Authority Notice */}
      <div className="px-6 py-2.5 bg-slate-900 text-slate-300 text-[11px] flex flex-wrap items-center justify-between gap-2 border-t border-slate-800">
        <span className="flex items-center gap-1.5">
          <Stethoscope className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span><strong>Physician Final Authority:</strong> Physician decision is final. System-generated information requires clinical verification.</span>
        </span>
        <span className="text-[10px] text-slate-500 font-mono">
          SIH26047 Clinical Console
        </span>
      </div>

      {/* Reject Reason Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <XCircle className="w-5 h-5" />
                <span>Reject Automated Intake Draft</span>
              </div>
              <button 
                onClick={() => setIsRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Please specify the reason for rejecting this intake summary draft. The draft and rejection reason will be retained in the audit history.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Inaccurate medication history, unverified symptoms, or wrong patient record..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-300 text-slate-900"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAction('REJECTED', rejectReason || 'Clinician rejected automated draft.')}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Original Document Modal */}
      {activeDocForModal && (
        <OriginalDocumentModal
          document={activeDocForModal}
          onClose={() => setActiveDocForModal(null)}
        />
      )}
    </div>
  );
};
