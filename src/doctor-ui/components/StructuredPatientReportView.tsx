import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Activity, 
  Stethoscope, 
  Pill, 
  AlertTriangle, 
  AlertCircle,
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Sparkles, 
  ChevronDown, 
  Heart, 
  Edit3, 
  Printer, 
  ArrowLeft,
  XCircle,
  FolderOpen,
  Eye
} from 'lucide-react';
import { DoctorSummaryDraft } from '../../data-models/doctorSummary';
import { PatientCaseRecord } from '../../data-models/intake';
import { localStore } from '../../backend/storage/localStore';
import { PrescriptionEmrModal } from './PrescriptionEmrModal';
import { GlassCard, StatusBadge, AnimatedButton } from '../../shared/components/ui/DesignSystem';
import { OriginalDocumentModal } from '../../document-intelligence/components/OriginalDocumentModal';
import { GeminiReportSummaryView } from '../../document-intelligence/components/GeminiReportSummaryView';
import { ExtractedDocumentData } from '../../document-intelligence/models/document';
import { carePrepApi, clinicalSummaryApi } from '../../shared/api/apiClient';
import { IClinicalSummaryRecord, IStructuredClinicalSummary } from '../../shared/types/clinicalSummaryTypes';

interface StructuredPatientReportViewProps {
  summary: DoctorSummaryDraft;
  caseRecord: PatientCaseRecord;
  onBack?: () => void;
  onUpdate: () => void;
}

export const StructuredPatientReportView: React.FC<StructuredPatientReportViewProps> = ({
  summary,
  caseRecord,
  onBack,
  onUpdate
}) => {
  // Collapsible state for each section
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    complaint: true,
    symptoms: true,
    history: true,
    medications: true,
    allergies: true,
    lifestyle: true,
    risks: true,
    aiSummary: true,
    doctorNotes: true,
    auditTrail: false
  });

  const [doctorNotes, setDoctorNotes] = useState<string>(summary.doctorEdits?.physicianNotes || '');
  const [doctorName, setDoctorName] = useState<string>(summary.doctorEdits?.verifiedByDoctorName || 'Dr. A. K. Varma, MD');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState<boolean>(false);
  const [activeDocForModal, setActiveDocForModal] = useState<ExtractedDocumentData | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  // Phase 4 Smart Clinical Summary States
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiRecord, setAiRecord] = useState<IClinicalSummaryRecord | null>(null);
  const [editableHpi, setEditableHpi] = useState<string>('');
  const [editableImpression, setEditableImpression] = useState<string>('');
  const [selectedDecision, setSelectedDecision] = useState<'ACCEPTED' | 'MODIFIED' | 'REJECTED' | 'FLAGGED'>('ACCEPTED');

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Initial load of existing clinical summary if available
  useEffect(() => {
    clinicalSummaryApi.getSummary(summary.caseId).then(res => {
      if (res.success && res.record) {
        setAiRecord(res.record);
        const currentSummary = res.record.doctorEditedSummary || res.record.aiGeneratedSummary;
        if (currentSummary) {
          setEditableHpi(currentSummary.historyOfPresentIllness?.summary || '');
          setEditableImpression(currentSummary.clinicalHighlights?.join('\n') || '');
        }
        if (res.record.doctorNotes) {
          setDoctorNotes(res.record.doctorNotes);
        }
      }
    }).catch(() => {});
  }, [summary.caseId]);

  const handleGenerateAiSummary = async () => {
    setIsGeneratingAi(true);
    setStatusMessage('');
    try {
      const res = await clinicalSummaryApi.generateSummary({
        patientId: summary.patientId,
        assessmentId: summary.caseId,
        caseId: summary.caseId
      });

      if (res.success && res.record) {
        setAiRecord(res.record);
        setEditableHpi(res.record.aiGeneratedSummary.historyOfPresentIllness.summary);
        setEditableImpression(res.record.aiGeneratedSummary.clinicalHighlights.join('\n'));
        setStatusMessage('AI Clinical Summary generated successfully using Gemini 3.6 Flash.');
        onUpdate();
      } else {
        setStatusMessage(res.error || 'AI summary generation is temporarily unavailable.');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'AI summary generation is temporarily unavailable.');
    } finally {
      setIsGeneratingAi(false);
      setTimeout(() => setStatusMessage(''), 5000);
    }
  };

  const handleSaveEdits = async () => {
    if (!aiRecord) {
      handleAction('MODIFIED');
      return;
    }

    try {
      const updatedSummary: IStructuredClinicalSummary = {
        ...(aiRecord.doctorEditedSummary || aiRecord.aiGeneratedSummary),
        historyOfPresentIllness: {
          ...(aiRecord.doctorEditedSummary?.historyOfPresentIllness || aiRecord.aiGeneratedSummary.historyOfPresentIllness),
          summary: editableHpi
        },
        clinicalHighlights: editableImpression.split('\n').map(s => s.trim()).filter(Boolean)
      };

      const res = await clinicalSummaryApi.reviewSummary(aiRecord.summaryId, {
        doctorNotes,
        doctorDecision: selectedDecision,
        doctorName,
        doctorEditedSummary: updatedSummary
      });

      if (res.success && res.record) {
        setAiRecord(res.record);
        setStatusMessage('Physician clinical amendments saved to audit record.');
        onUpdate();
      }
    } catch (err: any) {
      setStatusMessage('Error saving doctor review.');
    }
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handleConfirmAndSign = async () => {
    if (aiRecord) {
      try {
        const finalSummary: IStructuredClinicalSummary = {
          ...(aiRecord.doctorEditedSummary || aiRecord.aiGeneratedSummary),
          historyOfPresentIllness: {
            ...(aiRecord.doctorEditedSummary?.historyOfPresentIllness || aiRecord.aiGeneratedSummary.historyOfPresentIllness),
            summary: editableHpi
          },
          clinicalHighlights: editableImpression.split('\n').map(s => s.trim()).filter(Boolean)
        };

        const res = await clinicalSummaryApi.confirmSummary(aiRecord.summaryId, {
          doctorNotes,
          doctorDecision: selectedDecision,
          doctorName,
          finalSummary
        });

        if (res.success && res.record) {
          setAiRecord(res.record);
        }
      } catch {}
    }

    handleAction(selectedDecision);
  };

  const handleAction = (status: 'ACCEPTED' | 'MODIFIED' | 'REJECTED' | 'FLAGGED') => {
    const storeStatus = status === 'FLAGGED' ? 'MODIFIED' : status;
    localStore.updateDoctorReview(summary.caseId, doctorName, storeStatus, status === 'FLAGGED' ? `[FLAGGED FOR FURTHER REVIEW] ${doctorNotes}` : doctorNotes);

    // Save doctor review to MongoDB
    carePrepApi.updateAssessment(summary.caseId, {
      doctorReview: {
        doctorName,
        status: storeStatus,
        doctorNotes: status === 'FLAGGED' ? `[FLAGGED FOR FURTHER REVIEW] ${doctorNotes}` : doctorNotes
      }
    }).catch(e => console.warn('[MongoDB] Doctor review update warning:', e));

    carePrepApi.saveConsultation({
      patientId: summary.patientId,
      assessmentId: summary.caseId,
      doctorNotes: status === 'FLAGGED' ? `[FLAGGED FOR FURTHER REVIEW] ${doctorNotes}` : doctorNotes,
      doctorDecision: storeStatus,
      status: status === 'FLAGGED' ? 'IN_PROGRESS' : 'COMPLETED'
    }).catch(e => console.warn('[MongoDB] Consultation save warning:', e));

    setStatusMessage(
      status === 'ACCEPTED'
        ? 'Case confirmed & verified by physician.'
        : status === 'FLAGGED'
        ? 'Case flagged for specialist review & workup.'
        : status === 'MODIFIED'
        ? 'Physician clinical amendments saved.'
        : 'Case draft rejected.'
    );
    onUpdate();
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const patient = localStore.getPatients().find(p => p.id === summary.patientId) || {
    id: summary.patientId,
    fullName: 'Patient Record',
    age: 0,
    gender: 'other' as const,
    phoneNumber: 'Not recorded',
    city: 'Not recorded',
    abhaId: 'Not linked'
  };

  const redFlags = summary.redFlagTriage?.alerts || [];
  const hasHighPriority = redFlags.length > 0;
  const riskStatusChip = hasHighPriority ? 'high_priority' : 'low_risk';

  const answers = caseRecord.answers || [];
  const getAnswerText = (qid: string, defaultVal: string = 'None reported.') => {
    const found = answers.find(a => 
      (a.questionId && a.questionId.toLowerCase().includes(qid.toLowerCase())) || 
      (a.step && a.step.toLowerCase().includes(qid.toLowerCase()))
    );
    return found?.customText || found?.rawPatientResponse || (found?.selectedOptionIds?.join(', ')) || defaultVal;
  };

  // Retrieve any attached medical documents / OCR lab reports for this patient & case
  const attachedDocs = localStore.getDocuments(patient.id, caseRecord.caseId);

  return (
    <div className="space-y-5">
      {/* 1. Top Case Header & Actions Bar */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                title="Back to queue"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-slate-900 text-emerald-400">
                  {caseRecord.tokenNumber || `CASE-${summary.caseId.slice(-4)}`}
                </span>
                <h2 className="text-lg font-black text-slate-900">
                  {patient.fullName}
                </h2>
                <StatusBadge status={riskStatusChip} size="sm" />
                <StatusBadge status={summary.doctorEdits?.status || 'needs_review'} size="sm" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {patient.age ? `${patient.age}y` : 'Age not recorded'} • {patient.gender} • ABHA: {patient.abhaId || 'None'} • Mode: {summary.mode}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPrescriptionModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Pill className="w-3.5 h-3.5" />
              <span>Prescription &amp; Rx</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* 2. Structured Collapsible Sections */}
      <div className="space-y-3">
        
        {/* Section 1: Patient Overview */}
        <CollapsibleSection
          title="Patient Overview"
          icon={<User className="w-4 h-4 text-emerald-600" />}
          isOpen={openSections.overview}
          onToggle={() => toggleSection('overview')}
          badge={<StatusBadge status="low_risk" size="sm" />}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Full Name</span>
              <div className="font-extrabold text-slate-900 mt-0.5">{patient.fullName}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Age / Gender</span>
              <div className="font-extrabold text-slate-900 mt-0.5">{patient.age ? `${patient.age} years` : 'Not recorded'} / {patient.gender}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Phone / City</span>
              <div className="font-extrabold text-slate-900 mt-0.5">{patient.phoneNumber || 'N/A'} • {patient.city || 'N/A'}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">ABHA Health ID</span>
              <div className="font-mono font-bold text-emerald-700 mt-0.5">{patient.abhaId || 'Not linked'}</div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 2: Chief Complaint */}
        <CollapsibleSection
          title="Chief Complaint"
          icon={<Stethoscope className="w-4 h-4 text-blue-600" />}
          isOpen={openSections.complaint}
          onToggle={() => toggleSection('complaint')}
          badge={<StatusBadge status={summary.mode} size="sm" />}
        >
          <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-2">
            <div className="text-sm font-bold text-slate-900 leading-snug">
              {caseRecord.chiefComplaint || 'No chief complaint recorded.'}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
              <span>Submitted: {new Date(caseRecord.completedAt || caseRecord.startedAt).toLocaleTimeString()}</span>
              <span>•</span>
              <span>Intake Mode: {caseRecord.mode}</span>
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 3: Symptoms (SOCRATES / AYUSH) */}
        <CollapsibleSection
          title="Symptoms &amp; Clinical Parameters"
          icon={<Activity className="w-4 h-4 text-teal-600" />}
          isOpen={openSections.symptoms}
          onToggle={() => toggleSection('symptoms')}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Site &amp; Location</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {summary.hpiStructured?.location || getAnswerText('site', caseRecord.chiefComplaint || 'Not specified')}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Onset &amp; Duration</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {summary.hpiStructured?.onset || summary.hpiStructured?.duration || getAnswerText('duration', 'Not specified')}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Character &amp; Radiation</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {summary.hpiStructured?.character || getAnswerText('character', 'Not specified')}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400">Severity &amp; Aggravating Factors</span>
              <p className="font-semibold text-slate-800 mt-0.5">
                {summary.hpiStructured?.severity || getAnswerText('severity', 'Not specified')} • {summary.hpiStructured?.aggravatingFactors || 'None reported'}
              </p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 4: Medical History */}
        <CollapsibleSection
          title="Medical History"
          icon={<Clock className="w-4 h-4 text-indigo-600" />}
          isOpen={openSections.history}
          onToggle={() => toggleSection('history')}
        >
          <div className="text-xs space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-800">
            {getAnswerText('history', 'No chronic conditions reported.')}
          </div>
        </CollapsibleSection>

        {/* Section 5: Medications */}
        <CollapsibleSection
          title="Current Medications"
          icon={<Pill className="w-4 h-4 text-purple-600" />}
          isOpen={openSections.medications}
          onToggle={() => toggleSection('medications')}
        >
          <div className="text-xs space-y-2">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-800">
              {getAnswerText('medication', 'No current active medications reported.')}
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 6: Allergies */}
        <CollapsibleSection
          title="Allergies &amp; Sensitivities"
          icon={<ShieldAlert className="w-4 h-4 text-rose-600" />}
          isOpen={openSections.allergies}
          onToggle={() => toggleSection('allergies')}
          badge={<StatusBadge status="low_risk" label="Allergy Status" size="sm" />}
        >
          <div className="text-xs font-semibold text-slate-800 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
            {getAnswerText('allerg', 'No known drug allergies reported (NKDA).')}
          </div>
        </CollapsibleSection>

        {/* Section 7: Lifestyle Information */}
        <CollapsibleSection
          title="Lifestyle Information"
          icon={<Heart className="w-4 h-4 text-teal-600" />}
          isOpen={openSections.lifestyle}
          onToggle={() => toggleSection('lifestyle')}
        >
          <div className="text-xs text-slate-700 p-3 bg-slate-50 rounded-xl border border-slate-100 leading-relaxed font-medium">
            {getAnswerText('lifestyle', 'Not documented.')}
          </div>
        </CollapsibleSection>

        {/* Section: Attached Documents & Lab OCR */}
        <CollapsibleSection
          title={`Attached Reports & Lab OCR (${attachedDocs.length})`}
          icon={<FolderOpen className="w-4 h-4 text-blue-600" />}
          isOpen={true}
          onToggle={() => {}}
        >
          {attachedDocs.length > 0 ? (
            <div className="space-y-4">
              {attachedDocs.map((doc) => {
                const isExpanded = expandedDocId === doc.documentId;
                return (
                  <div key={doc.documentId} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 text-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <span className="font-bold text-slate-900">{doc.fileName}</span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          {doc.classification.replace('_', ' ')}
                        </span>
                        {doc.geminiAnalyzed && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                            Gemini Verified
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveDocForModal(doc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold transition-colors text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>View Original</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedDocId(isExpanded ? null : doc.documentId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold transition-colors text-[11px]"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isExpanded ? 'Hide Details' : 'View AI Summary'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Collapsed quick summary */}
                    {!isExpanded && doc.labResults && doc.labResults.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {doc.labResults.map((lab, li) => (
                          <div key={li} className={`p-2 rounded-lg border text-[11px] ${
                            lab.isAbnormal ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                          }`}>
                            <div className="text-[10px] text-slate-400">{lab.testName}</div>
                            <div>{lab.resultValue} {lab.unit} {lab.isAbnormal && '⚠️'}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expanded rich summary */}
                    {isExpanded && (
                      <div className="pt-2 animate-in fade-in">
                        <GeminiReportSummaryView
                          document={doc}
                          isDoctorView={true}
                          onViewOriginal={() => setActiveDocForModal(doc)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-400 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center font-medium">
              No previous lab reports or medical records attached to this case.
            </div>
          )}
        </CollapsibleSection>

        {/* Section 8: Risk Factors & Red Flags */}
        <CollapsibleSection
          title="Risk Factors &amp; Triage Flags"
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          isOpen={openSections.risks}
          onToggle={() => toggleSection('risks')}
          badge={<StatusBadge status={hasHighPriority ? 'high_priority' : 'low_risk'} size="sm" />}
        >
          {hasHighPriority ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold space-y-1">
              {redFlags.map((rf, i) => (
                <div key={i} className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{rf.ruleTitle}: {rf.actionMessage}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>No critical red flags detected during automated triage intake.</span>
            </div>
          )}
        </CollapsibleSection>

        {/* Section 9: Smart AI Clinical Summary & Doctor In The Loop */}
        <CollapsibleSection
          title="Smart Clinical Summary (Gemini 3.6 Flash)"
          icon={<Sparkles className="w-4 h-4 text-emerald-600" />}
          isOpen={openSections.aiSummary}
          onToggle={() => toggleSection('aiSummary')}
          badge={
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                aiRecord?.reviewStatus === 'DOCTOR_CONFIRMED' 
                  ? 'bg-emerald-100 text-emerald-800'
                  : aiRecord?.reviewStatus === 'DOCTOR_EDITED'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {aiRecord?.reviewStatus || 'DRAFT'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                v{aiRecord?.summaryVersion || summary.currentVersionNumber || 1}
              </span>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Disclaimer & AI Control Bar */}
            <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-900">
                    AI-Assisted Clinical Summary (Powered by Gemini 3.6 Flash)
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    AI-generated information for clinician review. This is not a medical diagnosis or treatment recommendation.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateAiSummary}
                disabled={isGeneratingAi}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 transition-all flex-shrink-0"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                <span>{isGeneratingAi ? 'Synthesizing with Gemini 3.6 Flash...' : 'Generate / Refresh AI Summary'}</span>
              </button>
            </div>

            {/* Clinical Highlights */}
            {aiRecord?.aiGeneratedSummary?.clinicalHighlights && (
              <div className="p-3.5 bg-slate-900 text-slate-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-emerald-400 font-bold border-b border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Key Clinical Highlights &amp; Priority Context
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Model: {aiRecord.modelUsed || 'gemini-3.6-flash'}
                  </span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 font-medium">
                  {aiRecord.aiGeneratedSummary.clinicalHighlights.map((hl, i) => (
                    <li key={i}>{hl}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Editable HPI Narrative */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  History of Present Illness (HPI) Narrative
                </label>
                <span className="text-[10px] text-slate-500 font-medium italic">
                  Physician may edit or correct AI narrative below
                </span>
              </div>
              <textarea
                rows={4}
                value={editableHpi || (summary.hpiStructured as any)?.summary || `${patient.fullName}, ${patient.age} years old, presents with ${summary.chiefComplaint?.normalizedText || caseRecord.chiefComplaint}.`}
                onChange={(e) => setEditableHpi(e.target.value)}
                placeholder="Physician HPI synthesis..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white leading-relaxed"
              />
            </div>

            {/* Missing Information & Clinician Questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
                <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Missing Clinical Information
                </span>
                <ul className="text-xs text-amber-800 font-medium list-disc list-inside space-y-0.5">
                  {(aiRecord?.aiGeneratedSummary?.missingImportantInformation && aiRecord.aiGeneratedSummary.missingImportantInformation.length > 0)
                    ? aiRecord.aiGeneratedSummary.missingImportantInformation.map((m, i) => <li key={i}>{m}</li>)
                    : <li>All standard intake attributes recorded.</li>
                  }
                </ul>
              </div>

              <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-1.5">
                <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                  <Stethoscope className="w-3.5 h-3.5 text-indigo-600" />
                  Suggested Questions for Physical Exam
                </span>
                <ul className="text-xs text-indigo-800 font-medium list-disc list-inside space-y-0.5">
                  {(aiRecord?.aiGeneratedSummary?.questionsForClinician && aiRecord.aiGeneratedSummary.questionsForClinician.length > 0)
                    ? aiRecord.aiGeneratedSummary.questionsForClinician.map((q, i) => <li key={i}>{q}</li>)
                    : (
                      <>
                        <li>Confirm symptom onset timing and progression.</li>
                        <li>Assess active medication adherence and tolerance.</li>
                      </>
                    )
                  }
                </ul>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 10: Doctor Notes & Signoff */}
        <CollapsibleSection
          title="Doctor Review &amp; Confirmation Signoff"
          icon={<Edit3 className="w-4 h-4 text-slate-800" />}
          isOpen={openSections.doctorNotes}
          onToggle={() => toggleSection('doctorNotes')}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Attending Physician Clinical Notes &amp; Advice
              </label>
              <textarea
                rows={3}
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="Enter physical examination observations, confirmed clinical assessment, prescription plan, or follow-up instructions..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            {/* Doctor Decision Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Clinical Review Decision
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'ACCEPTED', label: 'Accepted As-Is', desc: 'Summary accurate' },
                  { id: 'MODIFIED', label: 'Clinical Amendments', desc: 'Doctor edits saved' },
                  { id: 'FLAGGED', label: 'Flag for Specialist', desc: 'Needs workup' },
                  { id: 'REJECTED', label: 'Reject Draft', desc: 'Inaccurate intake' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedDecision(opt.id as any)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      selectedDecision === opt.id
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold ring-1 ring-emerald-500'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-bold">{opt.label}</div>
                    <div className="text-[10px] text-slate-500 font-normal">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Signing Doctor:</span>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-900 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdits}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 hover:bg-slate-50 text-xs font-bold transition-colors"
                >
                  Save Amendments
                </button>
                <AnimatedButton
                  onClick={handleConfirmAndSign}
                  variant="primary"
                  size="sm"
                  iconLeft={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Confirm &amp; Sign Off
                </AnimatedButton>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 11: Audit Trail */}
        <CollapsibleSection
          title={`Consultation Audit Trail (${aiRecord?.auditTrail?.length || summary.auditTrail?.length || 1})`}
          icon={<Clock className="w-4 h-4 text-slate-500" />}
          isOpen={openSections.auditTrail}
          onToggle={() => toggleSection('auditTrail')}
        >
          <div className="space-y-2 text-xs">
            {(aiRecord?.auditTrail || summary.auditTrail || []).map((audit, i) => (
              <div key={i} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 uppercase text-[10px] px-2 py-0.5 rounded-md bg-slate-200">
                    {audit.action}
                  </span>
                  <span className="font-medium text-slate-700">
                    {(audit as any).notes || (audit as any).details || 'Audit event logged'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {new Date(audit.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      </div>

      {/* Prescription & EMR Modal */}
      {isPrescriptionModalOpen && (
        <PrescriptionEmrModal
          summary={summary}
          caseRecord={caseRecord}
          onClose={() => {
            setIsPrescriptionModalOpen(false);
            onUpdate();
          }}
        />
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

/* Collapsible Section Helper Component */
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  isOpen,
  onToggle,
  badge,
  children
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden transition-all">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center font-bold">
            {icon}
          </div>
          <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {badge}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5 pt-1 border-t border-slate-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
