import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  FileText, 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Pill, 
  Heart, 
  ShieldAlert, 
  ShieldCheck, 
  Stethoscope, 
  Activity, 
  User, 
  ChevronRight, 
  Info,
  Calendar,
  Layers,
  FileCheck2
} from 'lucide-react';
import { clinicalSummaryApi } from '../../shared/api/apiClient';
import { IClinicalSummaryRecord, IStructuredClinicalSummary } from '../../shared/types/clinicalSummaryTypes';
import { StatusBadge, GlassCard } from '../../shared/components/ui/DesignSystem';

interface PatientConsultationPreparationViewProps {
  patientId: string;
  onStartIntake?: () => void;
  onViewDoctorSummary?: () => void;
}

export const PatientConsultationPreparationView: React.FC<PatientConsultationPreparationViewProps> = ({
  patientId,
  onStartIntake
}) => {
  const [record, setRecord] = useState<IClinicalSummaryRecord | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'preparation' | 'clinical'>('preparation');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Fetch existing summary on mount
  useEffect(() => {
    loadSummary();
  }, [patientId]);

  const loadSummary = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await clinicalSummaryApi.getPatientSummary();
      if (res.success && res.record) {
        setRecord(res.record);
      }
    } catch {
      // Not found is normal on first load
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (force: boolean = false) => {
    setIsGenerating(true);
    setErrorMessage(null);
    setStatusNotice('Preparing your clinical summary...');

    try {
      const res = force 
        ? await clinicalSummaryApi.regenerateSummary({ patientId })
        : await clinicalSummaryApi.generateSummary({ patientId, forceRegenerate: false });

      if (res.success && res.record) {
        setRecord(res.record);
        setStatusNotice('Clinical summary ready');
        setTimeout(() => setStatusNotice(null), 4000);
      } else {
        if (res.code === 'AI_QUOTA_EXCEEDED') {
          setErrorMessage('AI summary is temporarily unavailable because the AI service quota has been reached. Your health information is still safely available.');
        } else {
          setErrorMessage('Unable to generate the AI summary right now. Your saved health information is still available.');
        }
      }
    } catch (err: any) {
      setErrorMessage('Unable to generate the AI summary right now. Your saved health information is still available.');
    } finally {
      setIsGenerating(false);
    }
  };

  const summary: IStructuredClinicalSummary | undefined = record?.aiGeneratedSummary;
  const prep = summary?.patientPreparation;
  const redFlags = summary?.redFlags || [];
  const hasEmergency = redFlags.some(r => r.severity === 'CRITICAL_EMERGENCY');
  const hasWarning = redFlags.length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Banner with Actions & Safety Disclaimer */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>AI-Assisted Consultation Preparation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Consultation Preparation & Summary
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Clear, organized preparation to help you communicate effectively with your doctor.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {record && (
              <button
                onClick={() => handleGenerate(true)}
                disabled={isGenerating}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                title="Regenerate summary with fresh clinical updates"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isGenerating ? 'animate-spin' : ''}`} />
                <span>Regenerate Summary</span>
              </button>
            )}

            {!record && (
              <button
                onClick={() => handleGenerate(false)}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>Generate Summary</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setActiveViewMode('preparation')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeViewMode === 'preparation'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                View Patient Preparation
              </button>
              <button
                onClick={() => setActiveViewMode('clinical')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeViewMode === 'clinical'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                View Clinical Summary
              </button>
            </div>
          </div>
        </div>

        {/* Status Notice or Feedback */}
        {isGenerating && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Preparing your clinical summary...</span>
          </div>
        )}

        {statusNotice && !isGenerating && (
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusNotice}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">Notice</span>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Safety Disclaimer Banner */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-800">
              AI-assisted clinical preparation — not a medical diagnosis.
            </span>
          </div>
          {record && (
            <span className="text-[11px] text-slate-400 font-mono shrink-0">
              Last Updated: {new Date(record.generatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* 2. Source Transparency Card */}
      {summary && (
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Information Sources Used
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Based on:</span>
            <span className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
              summary.sourcesUsed?.preConsultation !== false 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Pre-consultation responses
            </span>
            <span className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
              summary.sourcesUsed?.medicalHistory 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Medical history
            </span>
            <span className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
              summary.sourcesUsed?.medications 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Current medications
            </span>
            <span className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
              summary.sourcesUsed?.reports 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Uploaded reports
            </span>
            <span className={`px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 ${
              summary.sourcesUsed?.vitals 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Vitals
            </span>
          </div>
        </div>
      )}

      {/* 3. Red-Flag Emergency Alert Notice (Non-downgradable) */}
      {hasWarning && (
        <div className={`p-4 sm:p-5 rounded-2xl border flex items-start gap-3 shadow-2xs ${
          hasEmergency 
            ? 'bg-red-50 border-red-200 text-red-900' 
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <ShieldAlert className={`w-5 h-5 shrink-0 mt-0.5 ${hasEmergency ? 'text-red-600 animate-pulse' : 'text-amber-600'}`} />
          <div className="space-y-1 text-xs">
            <span className="font-bold text-sm block uppercase tracking-wider">
              {hasEmergency ? 'High Urgency / Emergency Warning' : 'Clinical Priority Alert'}
            </span>
            <p className="font-medium leading-relaxed">
              Pre-consultation screening identified potentially high-risk symptoms ({redFlags.map(r => r.ruleTitle).join(', ')}).
              If you experience severe chest pain, shortness of breath, sudden weakness, or acute distress, seek emergency medical care immediately.
            </p>
          </div>
        </div>
      )}

      {/* 4. Empty State if No Summary Generated Yet */}
      {!isLoading && !record && (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Clinical Summary Generated Yet</h3>
            <p className="text-xs text-slate-500">
              Generate an AI-assisted summary using your intake answers, medical history, and uploaded lab reports to prepare for your consultation.
            </p>
          </div>
          <button
            onClick={() => handleGenerate(false)}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Clinical Summary</span>
          </button>
        </div>
      )}

      {/* 5. VIEW MODE A: PATIENT PREPARATION ("Prepare for Your Consultation") */}
      {summary && activeViewMode === 'preparation' && (
        <div className="space-y-6">
          {/* Pre-Consultation Summary Card */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Case Summary for Your Visit</span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
              {summary.preConsultationSummary || summary.caseOverview || summary.chiefComplaint}
            </p>
          </div>

          {/* 8 Patient Preparation Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. What to tell your doctor */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px]">1</div>
                <span>What to Tell Your Doctor</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                {(prep?.whatToTellDoctor || [summary.chiefComplaint]).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Important symptoms */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px]">2</div>
                <span>Important Symptoms</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                {(prep?.importantSymptoms || summary.historyOfPresentIllness.associatedSymptoms || ['None recorded']).map((symp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{symp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 3. Current medicines */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px]">3</div>
                <span>Current Medicines</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                {(prep?.currentMedicines || (summary.medications.length ? summary.medications.map(m => `${m.name} ${m.dosage || ''}`) : ['No active medicines recorded'])).map((med, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Pill className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
                    <span>{med}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 4. Allergies */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px]">4</div>
                <span>Allergies</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                {(prep?.allergies || (summary.allergies.length ? summary.allergies.map(a => a.allergen) : ['No allergies recorded'])).map((alg, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{alg}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 5. Relevant medical history */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px]">5</div>
                <span>Relevant Medical History</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                {(prep?.relevantHistory || (summary.medicalHistory.length ? summary.medicalHistory : ['No chronic conditions recorded'])).map((hist, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <FileCheck2 className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                    <span>{hist}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 6. Reports/documents to discuss */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px]">6</div>
                <span>Reports & Documents to Discuss</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                {(prep?.reportsToDiscuss || (summary.documentFindings.length ? summary.documentFindings.map(d => `${d.documentName} (${d.entityName})`) : ['No recent reports attached'])).map((doc, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 7. Questions you may want to ask */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px]">7</div>
                <span>Questions You May Want to Ask</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                {(prep?.questionsToAsk || summary.patientQuestionsToAsk || [
                  'What could be the primary cause of my symptoms?',
                  'Do I need any follow-up blood tests or scans?'
                ]).map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 8. Information that is still missing */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-[11px]">8</div>
                <span>Information That Is Still Missing</span>
              </div>
              <ul className="space-y-1.5 text-xs text-amber-900 font-medium">
                {(prep?.missingInfo && prep.missingInfo.length > 0 
                  ? prep.missingInfo 
                  : (summary.missingInformation?.length ? summary.missingInformation : ['No missing items identified'])
                ).map((miss, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>{miss}</span>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* 6. VIEW MODE B: CLINICAL SUMMARY ("Clinical Summary" - Doctor-Ready View) */}
      {summary && activeViewMode === 'clinical' && (
        <div className="space-y-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800">
              <Stethoscope className="w-4 h-4 text-emerald-600" />
              <span>Doctor-Ready Clinical Summary</span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
              Triage: {summary.urgency.level.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* PATIENT OVERVIEW */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                Patient Overview
              </span>
              <p className="font-medium text-slate-700">
                Age: {summary.patientOverview.age || 'Not recorded'} • Gender: {summary.patientOverview.gender} • ABHA: {summary.patientOverview.abhaId || 'Not linked'}
              </p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">
                {summary.patientOverview.keyContext.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            {/* CHIEF COMPLAINT */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                Chief Complaint
              </span>
              <p className="font-bold text-slate-900 text-sm">{summary.chiefComplaint}</p>
              <p className="text-slate-600 text-[11px]">Duration: {summary.historyOfPresentIllness.duration} • Severity: {summary.historyOfPresentIllness.severity}</p>
            </div>

            {/* CURRENT SYMPTOMS */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                Current Symptoms
              </span>
              <p className="text-slate-700 font-medium">
                {summary.historyOfPresentIllness.associatedSymptoms.join(', ') || summary.symptomSummary || 'None listed'}
              </p>
            </div>

            {/* RELEVANT MEDICAL HISTORY */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                Relevant Medical History
              </span>
              <p className="text-slate-700 font-medium">
                {summary.medicalHistory.join(', ') || 'No prior chronic conditions recorded'}
              </p>
            </div>

            {/* MEDICATIONS & ALLERGIES */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                Medications & Allergies
              </span>
              <p className="text-slate-700 font-medium">
                <strong className="text-slate-900">Rx:</strong> {summary.medications.length ? summary.medications.map(m => `${m.name} ${m.dosage || ''}`).join(', ') : 'None recorded'}
              </p>
              <p className="text-slate-700 font-medium">
                <strong className="text-slate-900">Allergies:</strong> {summary.allergies.length ? summary.allergies.map(a => a.allergen).join(', ') : 'No known allergies'}
              </p>
            </div>

            {/* VITALS */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                Vitals
              </span>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-medium text-slate-700">
                <span>BP: {summary.vitals.bloodPressure || 'Not recorded'}</span>
                <span>HR: {summary.vitals.heartRate || 'Not recorded'}</span>
                <span>SpO2: {summary.vitals.spo2 || 'Not recorded'}</span>
                <span>Temp: {summary.vitals.temperature || 'Not recorded'}</span>
              </div>
            </div>

            {/* REPORT FINDINGS */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                Report Findings
              </span>
              {summary.documentFindings.length ? (
                <ul className="space-y-1 text-[11px] text-slate-700">
                  {summary.documentFindings.slice(0, 3).map((f, i) => (
                    <li key={i} className="truncate">
                      <strong>{f.entityName}:</strong> {f.value} {f.unit} ({f.flag || 'NORMAL'})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 italic">No lab or imaging reports recorded</p>
              )}
            </div>

            {/* RED-FLAG STATUS */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                Red-Flag Status
              </span>
              <p className={`font-bold ${summary.redFlags.length ? 'text-red-600' : 'text-emerald-700'}`}>
                {summary.redFlagStatus || (summary.redFlags.length ? 'Emergency criteria identified' : 'Routine presentation')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
