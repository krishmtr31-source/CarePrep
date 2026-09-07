import React, { useState } from 'react';
import {
  User,
  BadgeCheck,
  Edit3,
  Stethoscope,
  Plus,
  Trash2,
  Pill,
  ShieldAlert,
  Users,
  Activity,
  Heart,
  FileText,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Check,
  Cigarette,
  Wine,
  Moon,
  Briefcase,
  Scale,
  Thermometer,
  Droplet,
  Sparkles,
  Upload,
  ArrowRight
} from 'lucide-react';
import {
  carePrepApi,
  MedicalHistoryData,
  PatientProfileData,
  ConditionItem,
  SurgeryItem,
  HospitalizationItem,
  AllergyItem,
  MedicationItem,
  FamilyHistoryItem,
  LifestyleData,
  VitalsData
} from '../../shared/api/apiClient';
import { ExtractedDocumentData } from '../../document-intelligence/models/document';
import { HealthTimelineView, TimelineEntry } from './HealthTimelineView';
import { DeleteDocumentConfirmModal } from './DeleteDocumentConfirmModal';

interface PatientHealthProfileViewProps {
  patientName: string;
  patientDob: string | null;
  patientAge: number | null;
  patientGender: string | null;
  patientAbha: string | null;
  patientPhone: string | null;
  patientEmail: string | null;
  patientCity: string | null;
  dbPatientProfile: PatientProfileData | null;
  setDbPatientProfile: React.Dispatch<React.SetStateAction<PatientProfileData | null>>;
  dbMedicalHistory: MedicalHistoryData | null;
  setDbMedicalHistory: React.Dispatch<React.SetStateAction<MedicalHistoryData | null>>;
  patientDocs: ExtractedDocumentData[];
  dbConsultations: any[];
  dbStatus: { isConnected: boolean; error?: string };
  lastSyncTimestamp: string | null;
  profileCompletionItems: { id: string; label: string; isComplete: boolean }[];
  completionPercentage: number;
  onUploadReportClick: () => void;
  onViewReport: (doc: ExtractedDocumentData) => void;
  onViewExtractedDoc: (doc: ExtractedDocumentData) => void;
  onDeleteDocument?: (doc: ExtractedDocumentData) => void;
  onRetryDocument?: (doc: ExtractedDocumentData) => void;
}

export const PatientHealthProfileView: React.FC<PatientHealthProfileViewProps> = ({
  patientName,
  patientDob,
  patientAge,
  patientGender,
  patientAbha,
  patientPhone,
  patientEmail,
  patientCity,
  setDbPatientProfile,
  dbMedicalHistory,
  setDbMedicalHistory,
  patientDocs,
  dbConsultations,
  dbStatus,
  lastSyncTimestamp,
  profileCompletionItems,
  completionPercentage,
  onUploadReportClick,
  onViewReport,
  onViewExtractedDoc,
  onDeleteDocument,
  onRetryDocument
}) => {
  const [docToDelete, setDocToDelete] = useState<ExtractedDocumentData | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // Modal State
  const [activeModal, setActiveModal] = useState<
    | null
    | 'personal'
    | 'condition'
    | 'surgery'
    | 'hospitalization'
    | 'medication'
    | 'allergy'
    | 'family'
    | 'lifestyle'
    | 'vitals'
    | 'consultation'
  >(null);

  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for modals
  const [editPersonalName, setEditPersonalName] = useState('');
  const [editPersonalDob, setEditPersonalDob] = useState('');
  const [editPersonalAge, setEditPersonalAge] = useState('');
  const [editPersonalGender, setEditPersonalGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [editPersonalMobile, setEditPersonalMobile] = useState('');
  const [editPersonalEmail, setEditPersonalEmail] = useState('');
  const [editPersonalAbha, setEditPersonalAbha] = useState('');
  const [editPersonalCity, setEditPersonalCity] = useState('');

  // Condition Form State
  const [conditionName, setConditionName] = useState('');
  const [conditionSince, setConditionSince] = useState('');
  const [conditionStatus, setConditionStatus] = useState<'Ongoing' | 'Managed' | 'Resolved'>('Ongoing');
  const [conditionNotes, setConditionNotes] = useState('');
  const [editingConditionIndex, setEditingConditionIndex] = useState<number | null>(null);

  // Surgery Form State
  const [surgeryProcedure, setSurgeryProcedure] = useState('');
  const [surgeryYear, setSurgeryYear] = useState('');
  const [surgeryHospital, setSurgeryHospital] = useState('');

  // Hospitalization Form State
  const [hospReason, setHospReason] = useState('');
  const [hospYear, setHospYear] = useState('');
  const [hospHospital, setHospHospital] = useState('');

  // Medication Form State
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [medReason, setMedReason] = useState('');
  const [medStartDate, setMedStartDate] = useState('');
  const [medPrescribedBy, setMedPrescribedBy] = useState('');
  const [editingMedIndex, setEditingMedIndex] = useState<number | null>(null);

  // Allergy Form State
  const [allergyName, setAllergyName] = useState('');
  const [allergyCategory, setAllergyCategory] = useState<'Drug' | 'Food' | 'Environmental' | 'Other'>('Drug');
  const [allergyReaction, setAllergyReaction] = useState('');
  const [allergySeverity, setAllergySeverity] = useState<'Mild' | 'Moderate' | 'Severe'>('Mild');

  // Family History Form State
  const [familyRelation, setFamilyRelation] = useState<'Father' | 'Mother' | 'Sibling' | 'Grandparent' | 'Other'>('Father');
  const [familyCondition, setFamilyCondition] = useState('');

  // Lifestyle Form State
  const [lifestyleSmoking, setLifestyleSmoking] = useState('');
  const [lifestyleAlcohol, setLifestyleAlcohol] = useState('');
  const [lifestyleActivity, setLifestyleActivity] = useState('');
  const [lifestyleDiet, setLifestyleDiet] = useState('');
  const [lifestyleSleep, setLifestyleSleep] = useState('');
  const [lifestyleOccupation, setLifestyleOccupation] = useState('');

  // Vitals Form State
  const [vitalsBp, setVitalsBp] = useState('');
  const [vitalsHr, setVitalsHr] = useState('');
  const [vitalsWeight, setVitalsWeight] = useState('');
  const [vitalsHeight, setVitalsHeight] = useState('');
  const [vitalsBmi, setVitalsBmi] = useState('');
  const [vitalsSpo2, setVitalsSpo2] = useState('');
  const [vitalsTemp, setVitalsTemp] = useState('');

  // Consultation Detail State
  const [viewingConsultation, setViewingConsultation] = useState<any | null>(null);

  const triggerFeedback = (message: string, isError = false) => {
    setSyncFeedback({ type: isError ? 'error' : 'success', message });
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const openPersonalModal = () => {
    setEditPersonalName(patientName !== 'Patient' ? patientName : '');
    setEditPersonalDob(patientDob || '');
    setEditPersonalAge(patientAge !== null ? String(patientAge) : '');
    setEditPersonalGender((patientGender as any) || '');
    setEditPersonalMobile(patientPhone || '');
    setEditPersonalEmail(patientEmail || '');
    setEditPersonalAbha(patientAbha || '');
    setEditPersonalCity(patientCity || '');
    setActiveModal('personal');
  };

  // Helper to calculate or format BMI
  const effectiveBmi = React.useMemo(() => {
    if (dbMedicalHistory?.vitals?.bmi && dbMedicalHistory.vitals.bmi !== 'Not recorded') {
      return dbMedicalHistory.vitals.bmi;
    }
    const w = parseFloat(dbMedicalHistory?.vitals?.weight || '');
    const h = parseFloat(dbMedicalHistory?.vitals?.height || '');
    if (w > 0 && h > 0) {
      const heightInMeters = h > 3 ? h / 100 : h;
      return (w / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return null;
  }, [dbMedicalHistory?.vitals]);

  // Compute longitudinal timeline entries from real MongoDB records
  const timelineEntries = React.useMemo<TimelineEntry[]>(() => {
    const list: TimelineEntry[] = [];

    // 1. Consultations
    (dbConsultations || []).forEach((c) => {
      list.push({
        id: c._id || c.consultationId || `consult-${Math.random()}`,
        date: c.createdAt || c.scheduledAt || new Date().toISOString(),
        eventType: 'CONSULTATION',
        title: 'Clinical Consultation Encounter',
        subtitle: `Physician: ${c.doctorId || 'Consulting Physician'}`,
        details: c.doctorNotes || 'Consultation summary and clinical review completed.',
        badgeText: c.status || 'COMPLETED',
        badgeType: c.status === 'COMPLETED' ? 'emerald' : 'blue',
        doctorOrFacility: c.doctorId || 'Outpatient Clinic',
        rawPayload: c
      });
    });

    // 2. Uploaded Medical Reports
    (patientDocs || []).forEach((doc) => {
      list.push({
        id: doc.documentId || `doc-${Math.random()}`,
        date: doc.uploadedAt || new Date().toISOString(),
        eventType: 'REPORT',
        title: doc.fileName || 'Diagnostic Medical Report',
        subtitle: doc.classification ? `${doc.classification.replace('_', ' ')} • Processed with AI` : 'Diagnostic Report',
        details: (doc.geminiAnalysis as any)?.patient_friendly_summary || (doc.geminiAnalysis?.summary as any)?.patient_friendly_summary || doc.geminiAnalysis?.summary?.main_purpose || (doc.labResults?.length ? `${doc.labResults.length} laboratory test markers extracted.` : 'Medical record securely archived.'),
        badgeText: doc.geminiAnalyzed ? 'AI Extracted' : 'Archived',
        badgeType: 'teal',
        doctorOrFacility: doc.facilityName || 'Diagnostic Laboratory',
        rawPayload: doc
      });
    });

    // 3. Hospitalizations from Medical History
    (dbMedicalHistory?.hospitalizationsList || []).forEach((h, idx) => {
      const year = h.year ? `${h.year}-01-01` : '2023-01-01';
      list.push({
        id: h.id || `hosp-${idx}`,
        date: year,
        eventType: 'HOSPITALIZATION',
        title: `Inpatient Admission: ${h.reason}`,
        subtitle: h.hospital ? `Hospital: ${h.hospital}` : undefined,
        details: `Recorded hospitalization for ${h.reason}.`,
        badgeText: 'Inpatient Record',
        badgeType: 'amber',
        doctorOrFacility: h.hospital
      });
    });

    // 4. Surgeries from Medical History
    (dbMedicalHistory?.surgeriesList || []).forEach((s, idx) => {
      const year = s.year ? `${s.year}-01-01` : '2022-01-01';
      list.push({
        id: s.id || `surg-${idx}`,
        date: year,
        eventType: 'HOSPITALIZATION',
        title: `Surgical Procedure: ${s.procedure}`,
        subtitle: s.hospital ? `Facility: ${s.hospital}` : undefined,
        details: `Recorded surgical procedure in ${s.year || 'past years'}.`,
        badgeText: 'Surgery',
        badgeType: 'slate',
        doctorOrFacility: s.hospital
      });
    });

    return list;
  }, [dbConsultations, patientDocs, dbMedicalHistory]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 sm:space-y-9 animate-in fade-in duration-300 pb-16">
      {/* Feedback Toast */}
      {syncFeedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 shadow-sm ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {syncFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{syncFeedback.message}</span>
        </div>
      )}

      {/* =========================================================================
          1. PAGE HEADER
          ========================================================================= */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">My Health Profile</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Your personal and medical information used to prepare for better consultations.
            </p>
            {/* Real Database Synchronization Status */}
            <div className="flex items-center gap-2 mt-3 text-xs">
              {dbStatus.isConnected !== false ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Health Record Synced</span>
                  <span className="text-[11px] text-slate-400 border-l border-emerald-200 pl-2">
                    Last updated: {lastSyncTimestamp || 'Just now'}
                  </span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Unable to sync</span>
                </div>
              )}
            </div>
          </div>

          <div className="self-start sm:self-center">
            <button
              onClick={openPersonalModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs hover:shadow"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. PROFILE SUMMARY CARD
          ========================================================================= */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 pb-6 border-b border-slate-100">
          {/* Left: Avatar, Name, Verified Badge & Demographics */}
          <div className="space-y-4 flex-1">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-700 text-white font-bold text-2xl flex items-center justify-center ring-4 ring-emerald-50 shadow-sm shrink-0">
                {patientName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{patientName}</h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Patient
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Patient Health Profile</p>
              </div>
            </div>

            {/* Below Avatar: 4 highlight metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">ABHA ID</div>
                <div className="font-mono text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">
                  {patientAbha || 'Not recorded'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Age</div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1">
                  {patientAge !== null ? `${patientAge} years` : 'Not recorded'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gender</div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1 capitalize">
                  {patientGender || 'Not recorded'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">City / Region</div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 mt-1 truncate">
                  {patientCity || 'Not recorded'}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Large Circular Progress Indicator & Dynamic Checklist */}
          <div className="w-full lg:w-auto bg-slate-50/70 p-5 rounded-2xl border border-slate-200/80 space-y-4 shrink-0">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center lg:text-left">
              Profile Completion
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* SVG Radial Gauge */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-slate-200"
                    strokeWidth="7"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-emerald-600 transition-all duration-700 ease-out"
                    strokeWidth="7"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * completionPercentage) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-slate-900 leading-none">{completionPercentage}%</span>
                  <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Complete</span>
                </div>
              </div>

              {/* Checklist items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {profileCompletionItems.map(item => (
                  <div key={item.id} className="flex items-center gap-1.5">
                    {item.isComplete ? (
                      <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                        ✓
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                        ○
                      </span>
                    )}
                    <span className={item.isComplete ? 'font-medium text-slate-700' : 'text-slate-400'}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. PERSONAL INFORMATION
          ========================================================================= */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Personal Information</h3>
              <p className="text-xs text-slate-500">Official identification and contact information</p>
            </div>
          </div>
          <button
            onClick={openPersonalModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition-colors shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Personal Information</span>
          </button>
        </div>

        {/* 2-Column Information Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Full Legal Name</div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-1">{patientName}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Date of Birth</div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-1">{patientDob || 'Not recorded'}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Age</div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-1">
              {patientAge !== null ? `${patientAge} years` : 'Not recorded'}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gender</div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-1 capitalize">
              {patientGender || 'Not recorded'}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mobile Number</div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-1">{patientPhone || 'Not recorded'}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Email</div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-1">{patientEmail || 'Not recorded'}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">ABHA Health ID</div>
            <div className="text-sm sm:text-base font-bold text-emerald-800 font-mono mt-1">{patientAbha || 'Not recorded'}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/60 border border-slate-200/80">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">City / Region</div>
            <div className="text-sm sm:text-base font-bold text-slate-900 mt-1">{patientCity || 'Not recorded'}</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. MEDICAL HISTORY
          ========================================================================= */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-7">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Medical History</h3>
              <p className="text-xs text-slate-500">Your previous and ongoing health conditions.</p>
            </div>
          </div>
        </div>

        {/* 3 Separate Cards */}
        <div className="space-y-6">
          {/* Card A: Existing Conditions */}
          <div className="p-5 rounded-xl bg-slate-50/50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Existing Conditions</h4>
              <button
                onClick={() => {
                  setConditionName('');
                  setConditionSince('');
                  setConditionStatus('Ongoing');
                  setConditionNotes('');
                  setEditingConditionIndex(null);
                  setActiveModal('condition');
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Condition</span>
              </button>
            </div>

            {dbMedicalHistory?.conditionsList && dbMedicalHistory.conditionsList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {dbMedicalHistory.conditionsList.map((cond, idx) => (
                  <div
                    key={cond.id || idx}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">{cond.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            cond.status === 'Resolved'
                              ? 'bg-slate-100 text-slate-700'
                              : cond.status === 'Managed'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {cond.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Since: {cond.since || 'Not specified'}
                      </div>
                      {cond.notes && (
                        <div className="text-[11px] text-slate-600 mt-1.5 italic line-clamp-2">
                          "{cond.notes}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2.5 mt-2 border-t border-slate-100 text-xs font-semibold">
                      <button
                        onClick={() => {
                          setConditionName(cond.name);
                          setConditionSince(cond.since || '');
                          setConditionStatus(cond.status || 'Ongoing');
                          setConditionNotes(cond.notes || '');
                          setEditingConditionIndex(idx);
                          setActiveModal('condition');
                        }}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        Edit
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        onClick={async () => {
                          const updated = (dbMedicalHistory.conditionsList || []).filter((_, i) => i !== idx);
                          setIsSavingRecord(true);
                          const res = await carePrepApi.updateMedicalHistory({ conditionsList: updated });
                          setIsSavingRecord(false);
                          if (res.success) {
                            setDbMedicalHistory(res.history);
                            triggerFeedback('Condition removed.');
                          }
                        }}
                        className="text-rose-600 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : dbMedicalHistory?.existingConditions && dbMedicalHistory.existingConditions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {dbMedicalHistory.existingConditions.map((c, i) => (
                  <div key={i} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-slate-800">
                    {c}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-1">No existing conditions recorded.</p>
            )}
          </div>

          {/* Card B: Previous Surgeries */}
          <div className="p-5 rounded-xl bg-slate-50/50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Previous Surgeries</h4>
              <button
                onClick={() => {
                  setSurgeryProcedure('');
                  setSurgeryYear('');
                  setSurgeryHospital('');
                  setActiveModal('surgery');
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Surgery</span>
              </button>
            </div>

            {dbMedicalHistory?.surgeriesList && dbMedicalHistory.surgeriesList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dbMedicalHistory.surgeriesList.map((surg, idx) => (
                  <div key={surg.id || idx} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{surg.procedure}</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Year: {surg.year || 'Not specified'} {surg.hospital ? `• ${surg.hospital}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const updated = (dbMedicalHistory.surgeriesList || []).filter((_, i) => i !== idx);
                        setIsSavingRecord(true);
                        const res = await carePrepApi.updateMedicalHistory({ surgeriesList: updated });
                        setIsSavingRecord(false);
                        if (res.success) {
                          setDbMedicalHistory(res.history);
                          triggerFeedback('Surgery record removed.');
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Remove surgery"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-1">No previous surgeries recorded.</p>
            )}
          </div>

          {/* Card C: Previous Hospitalizations */}
          <div className="p-5 rounded-xl bg-slate-50/50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Previous Hospitalizations</h4>
              <button
                onClick={() => {
                  setHospReason('');
                  setHospYear('');
                  setHospHospital('');
                  setActiveModal('hospitalization');
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Hospitalization</span>
              </button>
            </div>

            {dbMedicalHistory?.hospitalizationsList && dbMedicalHistory.hospitalizationsList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dbMedicalHistory.hospitalizationsList.map((hosp, idx) => (
                  <div key={hosp.id || idx} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{hosp.reason}</div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Year: {hosp.year || 'Not specified'} {hosp.hospital ? `• ${hosp.hospital}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        const updated = (dbMedicalHistory.hospitalizationsList || []).filter((_, i) => i !== idx);
                        setIsSavingRecord(true);
                        const res = await carePrepApi.updateMedicalHistory({ hospitalizationsList: updated });
                        setIsSavingRecord(false);
                        if (res.success) {
                          setDbMedicalHistory(res.history);
                          triggerFeedback('Hospitalization record removed.');
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1"
                      title="Remove hospitalization"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-1">No previous hospitalizations recorded.</p>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. CURRENT MEDICATIONS
          ========================================================================= */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Current Medications</h3>
              <p className="text-xs text-slate-500">Prescribed and over-the-counter daily medications</p>
            </div>
          </div>
          <button
            onClick={() => {
              setMedName('');
              setMedDosage('');
              setMedFrequency('');
              setMedReason('');
              setMedStartDate('');
              setMedPrescribedBy('');
              setEditingMedIndex(null);
              setActiveModal('medication');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Medication</span>
          </button>
        </div>

        {dbMedicalHistory?.currentMedications && dbMedicalHistory.currentMedications.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {dbMedicalHistory.currentMedications.map((med, idx) => (
              <div
                key={med.id || idx}
                className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Pill className="w-4 h-4 text-emerald-600 shrink-0" />
                      <h4 className="font-bold text-slate-900 text-sm">{med.name}</h4>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                      {med.dosage || 'Standard'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 font-medium pl-6">{med.frequency || 'As directed'}</p>
                  {med.reason && (
                    <div className="mt-2 text-[11px] text-slate-500 pl-6">
                      <span className="font-semibold text-slate-700">Reason:</span> {med.reason}
                    </div>
                  )}
                  {med.prescribedBy && (
                    <div className="text-[10px] text-slate-400 mt-1 pl-6">
                      Prescribed by: {med.prescribedBy}
                    </div>
                  )}
                  {med.startDate && (
                    <div className="text-[10px] text-slate-400 mt-0.5 pl-6">
                      Started: {med.startDate}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-slate-200/60 text-xs font-semibold">
                  <button
                    onClick={() => {
                      setMedName(med.name || '');
                      setMedDosage(med.dosage || '');
                      setMedFrequency(med.frequency || '');
                      setMedReason(med.reason || '');
                      setMedStartDate(med.startDate || '');
                      setMedPrescribedBy(med.prescribedBy || '');
                      setEditingMedIndex(idx);
                      setActiveModal('medication');
                    }}
                    className="text-slate-600 hover:text-slate-900"
                  >
                    Edit
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={async () => {
                      const updated = (dbMedicalHistory.currentMedications || []).filter((_, i) => i !== idx);
                      setIsSavingRecord(true);
                      const res = await carePrepApi.updateMedicalHistory({ currentMedications: updated });
                      setIsSavingRecord(false);
                      if (res.success) {
                        setDbMedicalHistory(res.history);
                        triggerFeedback('Medication removed.');
                      }
                    }}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 text-center space-y-1.5">
            <p className="text-xs text-slate-500">No current medications recorded.</p>
            <button
              onClick={() => {
                setMedName('');
                setMedDosage('');
                setMedFrequency('');
                setMedReason('');
                setMedStartDate('');
                setMedPrescribedBy('');
                setEditingMedIndex(null);
                setActiveModal('medication');
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Medication</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          6. ALLERGIES
          ========================================================================= */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Allergies</h3>
              <p className="text-xs text-slate-500">Known drug, food, or environmental hypersensitivities</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                const newNka = !dbMedicalHistory?.noKnownAllergies;
                setIsSavingRecord(true);
                const res = await carePrepApi.updateMedicalHistory({
                  noKnownAllergies: newNka,
                  allergiesList: newNka ? [] : (dbMedicalHistory?.allergiesList || []),
                  allergies: newNka ? [] : (dbMedicalHistory?.allergies || [])
                });
                setIsSavingRecord(false);
                if (res.success) {
                  setDbMedicalHistory(res.history);
                  triggerFeedback(newNka ? 'Recorded: No Known Allergies.' : 'Updated allergies.');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                dbMedicalHistory?.noKnownAllergies
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              {dbMedicalHistory?.noKnownAllergies ? '✓ No Known Allergies' : '○ No known allergies'}
            </button>
            <button
              onClick={() => {
                setAllergyName('');
                setAllergyCategory('Drug');
                setAllergyReaction('');
                setAllergySeverity('Mild');
                setActiveModal('allergy');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Allergy</span>
            </button>
          </div>
        </div>

        {dbMedicalHistory?.noKnownAllergies ? (
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Patient has declared No Known Drug, Food, or Environmental Allergies (NKA).</span>
            </div>
            <button
              onClick={() => {
                setAllergyName('');
                setAllergyCategory('Drug');
                setAllergyReaction('');
                setAllergySeverity('Mild');
                setActiveModal('allergy');
              }}
              className="text-xs font-bold text-emerald-700 hover:underline"
            >
              Add allergy
            </button>
          </div>
        ) : dbMedicalHistory?.allergiesList && dbMedicalHistory.allergiesList.length > 0 ? (
          <div className="space-y-4">
            {(['Drug', 'Food', 'Environmental', 'Other'] as const).map(cat => {
              const items = (dbMedicalHistory.allergiesList || []).filter(a => a.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{cat} Allergies</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {items.map((item, idx) => (
                      <div
                        key={item.id || idx}
                        className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex justify-between items-start"
                      >
                        <div>
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{item.allergen}</span>
                          {item.reaction && (
                            <div className="text-[11px] text-slate-600 mt-1">Reaction: {item.reaction}</div>
                          )}
                          {item.severity && (
                            <span
                              className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                item.severity === 'Severe'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : item.severity === 'Moderate'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {item.severity} Severity
                            </span>
                          )}
                        </div>
                        <button
                          onClick={async () => {
                            const updated = (dbMedicalHistory.allergiesList || []).filter(a => a !== item);
                            setIsSavingRecord(true);
                            const res = await carePrepApi.updateMedicalHistory({ allergiesList: updated });
                            setIsSavingRecord(false);
                            if (res.success) {
                              setDbMedicalHistory(res.history);
                              triggerFeedback('Allergy removed.');
                            }
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Remove allergy"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : dbMedicalHistory?.allergies && dbMedicalHistory.allergies.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {dbMedicalHistory.allergies.map((all, i) => (
              <div key={i} className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                {all}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Not recorded</p>
        )}
      </div>

      {/* =========================================================================
          7. FAMILY MEDICAL HISTORY
          ========================================================================= */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Family Medical History</h3>
              <p className="text-xs text-slate-500">Hereditary conditions across immediate relatives</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFamilyRelation('Father');
              setFamilyCondition('');
              setActiveModal('family');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Family History</span>
          </button>
        </div>

        {dbMedicalHistory?.familyHistoryList && dbMedicalHistory.familyHistoryList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {dbMedicalHistory.familyHistoryList.map((item, idx) => (
              <div key={item.id || idx} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {item.relationship}
                  </span>
                  <div className="font-bold text-slate-900 text-xs sm:text-sm mt-2">{item.condition}</div>
                </div>
                <button
                  onClick={async () => {
                    const updated = (dbMedicalHistory.familyHistoryList || []).filter((_, i) => i !== idx);
                    setIsSavingRecord(true);
                    const res = await carePrepApi.updateMedicalHistory({ familyHistoryList: updated });
                    setIsSavingRecord(false);
                    if (res.success) {
                      setDbMedicalHistory(res.history);
                      triggerFeedback('Family history record removed.');
                    }
                  }}
                  className="text-slate-400 hover:text-rose-600 p-1"
                  title="Remove family record"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No family medical history recorded.</p>
        )}
      </div>

      {/* =========================================================================
          8. LIFESTYLE & HABITS
          ========================================================================= */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Lifestyle &amp; Habits</h3>
              <p className="text-xs text-slate-500">Personal wellness habits, diet, and physical activity</p>
            </div>
          </div>
          <button
            onClick={() => {
              setLifestyleSmoking(dbMedicalHistory?.lifestyle?.smoking || '');
              setLifestyleAlcohol(dbMedicalHistory?.lifestyle?.alcohol || '');
              setLifestyleActivity(dbMedicalHistory?.lifestyle?.physicalActivity || '');
              setLifestyleDiet(dbMedicalHistory?.lifestyle?.diet || '');
              setLifestyleSleep(dbMedicalHistory?.lifestyle?.sleepHours || '');
              setLifestyleOccupation(dbMedicalHistory?.lifestyle?.occupation || '');
              setActiveModal('lifestyle');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition-colors shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Edit Lifestyle</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Cigarette className="w-3.5 h-3.5" />
              <span>Smoking</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1.5">
              {dbMedicalHistory?.lifestyle?.smoking || 'Not recorded'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Wine className="w-3.5 h-3.5" />
              <span>Alcohol</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1.5">
              {dbMedicalHistory?.lifestyle?.alcohol || 'Not recorded'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5" />
              <span>Physical Activity</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1.5">
              {dbMedicalHistory?.lifestyle?.physicalActivity || 'Not recorded'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Heart className="w-3.5 h-3.5" />
              <span>Diet</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1.5">
              {dbMedicalHistory?.lifestyle?.diet || 'Not recorded'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Moon className="w-3.5 h-3.5" />
              <span>Sleep</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1.5">
              {dbMedicalHistory?.lifestyle?.sleepHours || 'Not recorded'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Occupation</span>
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1.5">
              {dbMedicalHistory?.lifestyle?.occupation || 'Not recorded'}
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          9. HEALTH VITALS
          ========================================================================= */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Health Vitals</h3>
              <p className="text-xs text-slate-500">Key physiological measurements and baseline indicators</p>
            </div>
          </div>
          <button
            onClick={() => {
              setVitalsBp(dbMedicalHistory?.vitals?.bloodPressure || '');
              setVitalsHr(dbMedicalHistory?.vitals?.heartRate || '');
              setVitalsWeight(dbMedicalHistory?.vitals?.weight || '');
              setVitalsHeight(dbMedicalHistory?.vitals?.height || '');
              setVitalsBmi(effectiveBmi || '');
              setVitalsSpo2(dbMedicalHistory?.vitals?.spo2 || '');
              setVitalsTemp(dbMedicalHistory?.vitals?.temperature || '');
              setActiveModal('vitals');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 text-xs font-bold transition-colors shadow-2xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Record / Update Vitals</span>
          </button>
        </div>

        {/* 7 Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Blood Pressure</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {dbMedicalHistory?.vitals?.bloodPressure || 'Not recorded'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">mmHg</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Heart Rate</span>
              <Heart className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2">
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {dbMedicalHistory?.vitals?.heartRate || 'Not recorded'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">bpm</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Weight</span>
              <Scale className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2">
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {dbMedicalHistory?.vitals?.weight || 'Not recorded'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">kg</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Height</span>
              <ArrowRight className="w-4 h-4 text-indigo-500 rotate-90" />
            </div>
            <div className="mt-2">
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {dbMedicalHistory?.vitals?.height || 'Not recorded'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">cm</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">BMI</span>
              <Activity className="w-4 h-4 text-teal-600" />
            </div>
            <div className="mt-2">
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {effectiveBmi || 'Not recorded'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">kg/m²</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">SpO₂</span>
              <Droplet className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="mt-2">
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {dbMedicalHistory?.vitals?.spo2 || 'Not recorded'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">%</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col justify-between sm:col-span-2">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Body Temperature</span>
              <Thermometer className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                {dbMedicalHistory?.vitals?.temperature || 'Not recorded'}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">°F</div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          10. MEDICAL RECORDS & REPORTS
          ========================================================================= */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Medical Records &amp; Reports</h3>
              <p className="text-xs text-slate-500">Diagnostic reports, lab summaries, and prescriptions</p>
            </div>
          </div>
          <button
            onClick={onUploadReportClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Report</span>
          </button>
        </div>

        {patientDocs.length > 0 ? (
          <div className="space-y-3">
            {patientDocs.map(doc => {
              const isFailed = (doc as any).extractionStatus === 'FAILED';
              const displayDate = doc.uploadedAt 
                ? new Date(doc.uploadedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
                : '12 June 2026';

              return (
                <div
                  key={doc.documentId}
                  className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        📄 {doc.fileName}
                      </span>
                      {isFailed ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                          <span>⚠ Processing Failed</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          ✓ Processed
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 pl-6.5">
                      {displayDate}
                    </div>
                    {doc.geminiAnalyzed && !isFailed && (
                      <div className="text-[10px] text-teal-700 pl-6.5 flex items-center gap-1 font-semibold pt-0.5">
                        <Sparkles className="w-3 h-3 text-teal-600 shrink-0" />
                        <span>AI-assisted information extraction. Structured report review aid only; not a medical diagnosis.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {isFailed && onRetryDocument && (
                      <button
                        onClick={() => onRetryDocument(doc)}
                        className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors shadow-2xs"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      onClick={() => onViewReport(doc)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors shadow-2xs"
                    >
                      View Report
                    </button>
                    {doc.geminiAnalyzed && !isFailed && (
                      <button
                        onClick={() => onViewExtractedDoc(doc)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>View Extracted Information</span>
                      </button>
                    )}
                    {onDeleteDocument && (
                      <button
                        onClick={() => setDocToDelete(doc)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 text-center space-y-1.5">
            <p className="text-xs text-slate-500">No medical reports uploaded yet.</p>
            <button
              onClick={onUploadReportClick}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Report</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Document Confirmation Modal */}
      {docToDelete && (
        <DeleteDocumentConfirmModal
          isOpen={Boolean(docToDelete)}
          onClose={() => setDocToDelete(null)}
          documentTitle={docToDelete.fileName}
          isDeleting={isDeletingDoc}
          onConfirm={async () => {
            if (!docToDelete || !onDeleteDocument) return;
            setIsDeletingDoc(true);
            try {
              await onDeleteDocument(docToDelete);
            } finally {
              setIsDeletingDoc(false);
              setDocToDelete(null);
            }
          }}
        />
      )}

      {/* =========================================================================
          11. CONSULTATION HISTORY
          ========================================================================= */}
      <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Consultation History</h3>
              <p className="text-xs text-slate-500">Past doctor visits and clinical review summaries</p>
            </div>
          </div>
        </div>

        {dbConsultations.length > 0 ? (
          <div className="space-y-3">
            {dbConsultations.map(c => (
              <div
                key={c._id || c.consultationId}
                className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">General Consultation</h4>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">Physician: {c.doctorId || 'Consulting Physician'}</p>
                  <div className="text-[11px] text-slate-400">
                    Date: {new Date(c.createdAt || c.scheduledAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  {c.doctorNotes && (
                    <p className="text-xs text-slate-500 italic line-clamp-1 mt-1">"{c.doctorNotes}"</p>
                  )}
                </div>

                <button
                  onClick={() => {
                    setViewingConsultation(c);
                    setActiveModal('consultation');
                  }}
                  className="self-end sm:self-auto px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors shadow-2xs"
                >
                  View Summary
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No previous consultations recorded.</p>
        )}
      </div>

      {/* =========================================================================
          12. LONGITUDINAL HEALTH TIMELINE (SWASTHYA AI SPECIFICATION)
          ========================================================================= */}
      <HealthTimelineView
        entries={timelineEntries}
        onSelectEntry={(entry) => {
          if (entry.eventType === 'CONSULTATION' && entry.rawPayload) {
            setViewingConsultation(entry.rawPayload);
            setActiveModal('consultation');
          } else if (entry.eventType === 'REPORT' && entry.rawPayload) {
            onViewExtractedDoc(entry.rawPayload);
          }
        }}
      />

      {/* =========================================================================
          MODALS
          ========================================================================= */}

      {/* Modal: Edit Personal Information */}
      {activeModal === 'personal' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Personal Information</h3>
                <p className="text-xs text-slate-500">Saves directly to authenticated patient record in MongoDB</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  value={editPersonalName}
                  onChange={(e) => setEditPersonalName(e.target.value)}
                  placeholder="e.g. Rameshwar Sharma"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={editPersonalDob}
                  onChange={(e) => setEditPersonalDob(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Age</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={editPersonalAge}
                  onChange={(e) => setEditPersonalAge(e.target.value)}
                  placeholder="e.g. 52"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Gender</label>
                <select
                  value={editPersonalGender}
                  onChange={(e) => setEditPersonalGender(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={editPersonalMobile}
                  onChange={(e) => setEditPersonalMobile(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={editPersonalEmail}
                  onChange={(e) => setEditPersonalEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">City / Region</label>
                <input
                  type="text"
                  value={editPersonalCity}
                  onChange={(e) => setEditPersonalCity(e.target.value)}
                  placeholder="e.g. Mumbai, Maharashtra"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">ABHA Health ID</label>
                <input
                  type="text"
                  value={editPersonalAbha}
                  onChange={(e) => setEditPersonalAbha(e.target.value)}
                  placeholder="e.g. 91-4562-7819-2041"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingRecord}
                onClick={async () => {
                  setIsSavingRecord(true);
                  const res = await carePrepApi.updatePatientProfile({
                    fullName: editPersonalName.trim() || patientName,
                    dateOfBirth: editPersonalDob.trim() || undefined,
                    age: editPersonalAge ? Number(editPersonalAge) : undefined,
                    gender: editPersonalGender ? (editPersonalGender as any) : undefined,
                    mobile: editPersonalMobile.trim() || undefined,
                    email: editPersonalEmail.trim() || undefined,
                    abhaId: editPersonalAbha.trim() || undefined,
                    city: editPersonalCity.trim() || undefined
                  });
                  setIsSavingRecord(false);
                  if (res.success && res.patient) {
                    setDbPatientProfile(res.patient);
                    setActiveModal(null);
                    triggerFeedback('✓ Health profile updated');
                  } else {
                    triggerFeedback(res.error || 'Failed to update personal information.', true);
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs transition-colors"
              >
                {isSavingRecord ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Condition */}
      {activeModal === 'condition' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingConditionIndex !== null ? 'Edit Medical Condition' : 'Add Medical Condition'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Condition Name *</label>
                <input
                  type="text"
                  value={conditionName}
                  onChange={(e) => setConditionName(e.target.value)}
                  placeholder="e.g. Hypertension, Type 2 Diabetes"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Diagnosed Since</label>
                  <input
                    type="text"
                    value={conditionSince}
                    onChange={(e) => setConditionSince(e.target.value)}
                    placeholder="e.g. 2021"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Clinical Status</label>
                  <select
                    value={conditionStatus}
                    onChange={(e) => setConditionStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Managed">Managed</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Notes / Care Guidance</label>
                <input
                  type="text"
                  value={conditionNotes}
                  onChange={(e) => setConditionNotes(e.target.value)}
                  placeholder="e.g. Controlled with daily medications"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Cancel
              </button>
              <button
                disabled={!conditionName.trim() || isSavingRecord}
                onClick={async () => {
                  const newCond: ConditionItem = {
                    id: `c-${Date.now()}`,
                    name: conditionName.trim(),
                    since: conditionSince.trim() || undefined,
                    status: conditionStatus,
                    notes: conditionNotes.trim() || undefined
                  };
                  const currentList = [...(dbMedicalHistory?.conditionsList || [])];
                  if (editingConditionIndex !== null && editingConditionIndex >= 0) {
                    currentList[editingConditionIndex] = newCond;
                  } else {
                    currentList.push(newCond);
                  }
                  setIsSavingRecord(true);
                  const res = await carePrepApi.updateMedicalHistory({ conditionsList: currentList });
                  setIsSavingRecord(false);
                  if (res.success) {
                    setDbMedicalHistory(res.history);
                    setActiveModal(null);
                    triggerFeedback('✓ Health profile updated');
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50"
              >
                {isSavingRecord ? 'Saving...' : 'Save Condition'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Surgery */}
      {activeModal === 'surgery' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Previous Surgery</h3>
              <button onClick={() => setActiveModal(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Procedure Name *</label>
                <input
                  type="text"
                  value={surgeryProcedure}
                  onChange={(e) => setSurgeryProcedure(e.target.value)}
                  placeholder="e.g. Appendectomy, Knee Arthroscopy"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Year</label>
                  <input
                    type="text"
                    value={surgeryYear}
                    onChange={(e) => setSurgeryYear(e.target.value)}
                    placeholder="e.g. 2019"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hospital</label>
                  <input
                    type="text"
                    value={surgeryHospital}
                    onChange={(e) => setSurgeryHospital(e.target.value)}
                    placeholder="e.g. City General Hospital"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Cancel
              </button>
              <button
                disabled={!surgeryProcedure.trim() || isSavingRecord}
                onClick={async () => {
                  const newSurg: SurgeryItem = {
                    id: `s-${Date.now()}`,
                    procedure: surgeryProcedure.trim(),
                    year: surgeryYear.trim() || undefined,
                    hospital: surgeryHospital.trim() || undefined
                  };
                  const currentList = dbMedicalHistory?.surgeriesList || [];
                  const updated = [...currentList, newSurg];
                  setIsSavingRecord(true);
                  const res = await carePrepApi.updateMedicalHistory({ surgeriesList: updated });
                  setIsSavingRecord(false);
                  if (res.success) {
                    setDbMedicalHistory(res.history);
                    setActiveModal(null);
                    triggerFeedback('✓ Health profile updated');
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50"
              >
                {isSavingRecord ? 'Saving...' : 'Add Surgery'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Hospitalization */}
      {activeModal === 'hospitalization' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Hospitalization Record</h3>
              <button onClick={() => setActiveModal(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Hospitalization *</label>
                <input
                  type="text"
                  value={hospReason}
                  onChange={(e) => setHospReason(e.target.value)}
                  placeholder="e.g. Acute Gastroenteritis, Pneumonia"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Year</label>
                  <input
                    type="text"
                    value={hospYear}
                    onChange={(e) => setHospYear(e.target.value)}
                    placeholder="e.g. 2022"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hospital Facility</label>
                  <input
                    type="text"
                    value={hospHospital}
                    onChange={(e) => setHospHospital(e.target.value)}
                    placeholder="e.g. Metro Care Clinic"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Cancel
              </button>
              <button
                disabled={!hospReason.trim() || isSavingRecord}
                onClick={async () => {
                  const newHosp: HospitalizationItem = {
                    id: `h-${Date.now()}`,
                    reason: hospReason.trim(),
                    year: hospYear.trim() || undefined,
                    hospital: hospHospital.trim() || undefined
                  };
                  const currentList = dbMedicalHistory?.hospitalizationsList || [];
                  const updated = [...currentList, newHosp];
                  setIsSavingRecord(true);
                  const res = await carePrepApi.updateMedicalHistory({ hospitalizationsList: updated });
                  setIsSavingRecord(false);
                  if (res.success) {
                    setDbMedicalHistory(res.history);
                    setActiveModal(null);
                    triggerFeedback('✓ Health profile updated');
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50"
              >
                {isSavingRecord ? 'Saving...' : 'Add Hospitalization'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add/Edit Medication */}
      {activeModal === 'medication' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingMedIndex !== null ? 'Edit Medication' : 'Add Medication'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Medicine Name *</label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="e.g. Amlodipine, Metformin"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Dosage</label>
                  <input
                    type="text"
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    placeholder="e.g. 5 mg, 500 mg"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Frequency</label>
                  <input
                    type="text"
                    value={medFrequency}
                    onChange={(e) => setMedFrequency(e.target.value)}
                    placeholder="e.g. Once daily, Twice daily"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Reason for Taking</label>
                <input
                  type="text"
                  value={medReason}
                  onChange={(e) => setMedReason(e.target.value)}
                  placeholder="e.g. Blood pressure management"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Start Date</label>
                  <input
                    type="text"
                    value={medStartDate}
                    onChange={(e) => setMedStartDate(e.target.value)}
                    placeholder="e.g. Jan 2024"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prescribed By</label>
                  <input
                    type="text"
                    value={medPrescribedBy}
                    onChange={(e) => setMedPrescribedBy(e.target.value)}
                    placeholder="e.g. Dr. Varma"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Cancel
              </button>
              <button
                disabled={!medName.trim() || isSavingRecord}
                onClick={async () => {
                  const item: MedicationItem = {
                    id: `m-${Date.now()}`,
                    name: medName.trim(),
                    dosage: medDosage.trim() || undefined,
                    frequency: medFrequency.trim() || undefined,
                    reason: medReason.trim() || undefined,
                    startDate: medStartDate.trim() || undefined,
                    prescribedBy: medPrescribedBy.trim() || undefined
                  };
                  const current = [...(dbMedicalHistory?.currentMedications || [])];
                  if (editingMedIndex !== null && editingMedIndex >= 0) {
                    current[editingMedIndex] = item;
                  } else {
                    current.push(item);
                  }
                  setIsSavingRecord(true);
                  const res = await carePrepApi.updateMedicalHistory({ currentMedications: current });
                  setIsSavingRecord(false);
                  if (res.success) {
                    setDbMedicalHistory(res.history);
                    setActiveModal(null);
                    triggerFeedback('✓ Health profile updated');
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50"
              >
                {isSavingRecord ? 'Saving...' : 'Save Medication'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Allergy */}
      {activeModal === 'allergy' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Allergy</h3>
              <button onClick={() => setActiveModal(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Allergen Name *</label>
                <input
                  type="text"
                  value={allergyName}
                  onChange={(e) => setAllergyName(e.target.value)}
                  placeholder="e.g. Penicillin, Peanuts, Latex"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={allergyCategory}
                    onChange={(e) => setAllergyCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="Drug">Drug Allergy</option>
                    <option value="Food">Food Allergy</option>
                    <option value="Environmental">Environmental</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Severity</label>
                  <select
                    value={allergySeverity}
                    onChange={(e) => setAllergySeverity(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    <option value="Mild">Mild</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Severe">Severe (Anaphylaxis)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Observed Reaction</label>
                <input
                  type="text"
                  value={allergyReaction}
                  onChange={(e) => setAllergyReaction(e.target.value)}
                  placeholder="e.g. Skin rash, Hives, Swelling"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Cancel
              </button>
              <button
                disabled={!allergyName.trim() || isSavingRecord}
                onClick={async () => {
                  const newAllergy: AllergyItem = {
                    id: `a-${Date.now()}`,
                    allergen: allergyName.trim(),
                    category: allergyCategory,
                    reaction: allergyReaction.trim() || undefined,
                    severity: allergySeverity
                  };
                  const current = [...(dbMedicalHistory?.allergiesList || [])];
                  current.push(newAllergy);
                  setIsSavingRecord(true);
                  const res = await carePrepApi.updateMedicalHistory({
                    allergiesList: current,
                    noKnownAllergies: false
                  });
                  setIsSavingRecord(false);
                  if (res.success) {
                    setDbMedicalHistory(res.history);
                    setActiveModal(null);
                    triggerFeedback('✓ Health profile updated');
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50"
              >
                {isSavingRecord ? 'Saving...' : 'Add Allergy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Family History */}
      {activeModal === 'family' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Add Family Medical History</h3>
              <button onClick={() => setActiveModal(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Relationship</label>
                <select
                  value={familyRelation}
                  onChange={(e) => setFamilyRelation(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Sibling">Sibling (Brother / Sister)</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Other">Other Relative</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Known Condition *</label>
                <input
                  type="text"
                  value={familyCondition}
                  onChange={(e) => setFamilyCondition(e.target.value)}
                  placeholder="e.g. Type 2 Diabetes, Hypertension, Coronary Artery Disease"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Cancel
              </button>
              <button
                disabled={!familyCondition.trim() || isSavingRecord}
                onClick={async () => {
                  const newItem: FamilyHistoryItem = {
                    id: `f-${Date.now()}`,
                    relationship: familyRelation,
                    condition: familyCondition.trim()
                  };
                  const current = [...(dbMedicalHistory?.familyHistoryList || [])];
                  current.push(newItem);
                  setIsSavingRecord(true);
                  const res = await carePrepApi.updateMedicalHistory({ familyHistoryList: current });
                  setIsSavingRecord(false);
                  if (res.success) {
                    setDbMedicalHistory(res.history);
                    setActiveModal(null);
                    triggerFeedback('✓ Health profile updated');
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50"
              >
                {isSavingRecord ? 'Saving...' : 'Add Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Lifestyle */}
      {activeModal === 'lifestyle' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Edit Lifestyle &amp; Habits</h3>
              <button onClick={() => setActiveModal(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Smoking</label>
                <select
                  value={lifestyleSmoking}
                  onChange={(e) => setLifestyleSmoking(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="">Select</option>
                  <option value="Never">Never</option>
                  <option value="Former">Former smoker</option>
                  <option value="Current">Current smoker</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Alcohol Consumption</label>
                <select
                  value={lifestyleAlcohol}
                  onChange={(e) => setLifestyleAlcohol(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="">Select</option>
                  <option value="None">None</option>
                  <option value="Occasional">Occasional</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Regular">Regular</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Physical Activity</label>
                <select
                  value={lifestyleActivity}
                  onChange={(e) => setLifestyleActivity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="">Select</option>
                  <option value="Sedentary">Sedentary (Little to no exercise)</option>
                  <option value="Light">Light (1-2 days/week)</option>
                  <option value="Moderate">Moderate (3-4 days/week)</option>
                  <option value="Active">Active (5+ days/week)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Diet</label>
                <select
                  value={lifestyleDiet}
                  onChange={(e) => setLifestyleDiet(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 bg-white"
                >
                  <option value="">Select</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Eggetarian">Eggetarian</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Sleep</label>
                <input
                  type="text"
                  value={lifestyleSleep}
                  onChange={(e) => setLifestyleSleep(e.target.value)}
                  placeholder="e.g. 7 hours/night"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Occupation</label>
                <input
                  type="text"
                  value={lifestyleOccupation}
                  onChange={(e) => setLifestyleOccupation(e.target.value)}
                  placeholder="e.g. Software Engineer, Teacher, Retired"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Cancel
              </button>
              <button
                disabled={isSavingRecord}
                onClick={async () => {
                  const newLifestyle: LifestyleData = {
                    smoking: lifestyleSmoking.trim() || undefined,
                    alcohol: lifestyleAlcohol.trim() || undefined,
                    physicalActivity: lifestyleActivity.trim() || undefined,
                    diet: lifestyleDiet.trim() || undefined,
                    sleepHours: lifestyleSleep.trim() || undefined,
                    occupation: lifestyleOccupation.trim() || undefined
                  };
                  setIsSavingRecord(true);
                  const res = await carePrepApi.updateMedicalHistory({ lifestyle: newLifestyle });
                  setIsSavingRecord(false);
                  if (res.success) {
                    setDbMedicalHistory(res.history);
                    setActiveModal(null);
                    triggerFeedback('✓ Health profile updated');
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs"
              >
                {isSavingRecord ? 'Saving...' : 'Save Lifestyle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Record Vitals */}
      {activeModal === 'vitals' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Health Vitals</h3>
                <p className="text-xs text-slate-500">Clinical observations and vital baseline</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Blood Pressure</label>
                <input
                  type="text"
                  value={vitalsBp}
                  onChange={(e) => setVitalsBp(e.target.value)}
                  placeholder="e.g. 120/80 mmHg"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Heart Rate</label>
                <input
                  type="text"
                  value={vitalsHr}
                  onChange={(e) => setVitalsHr(e.target.value)}
                  placeholder="e.g. 72 bpm"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Weight</label>
                <input
                  type="text"
                  value={vitalsWeight}
                  onChange={(e) => {
                    setVitalsWeight(e.target.value);
                    const w = parseFloat(e.target.value);
                    const h = parseFloat(vitalsHeight);
                    if (w > 0 && h > 0) {
                      const hm = h > 3 ? h / 100 : h;
                      setVitalsBmi((w / (hm * hm)).toFixed(1));
                    }
                  }}
                  placeholder="e.g. 68 kg"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Height</label>
                <input
                  type="text"
                  value={vitalsHeight}
                  onChange={(e) => {
                    setVitalsHeight(e.target.value);
                    const h = parseFloat(e.target.value);
                    const w = parseFloat(vitalsWeight);
                    if (w > 0 && h > 0) {
                      const hm = h > 3 ? h / 100 : h;
                      setVitalsBmi((w / (hm * hm)).toFixed(1));
                    }
                  }}
                  placeholder="e.g. 175 cm"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">BMI</label>
                <input
                  type="text"
                  value={vitalsBmi}
                  onChange={(e) => setVitalsBmi(e.target.value)}
                  placeholder="e.g. 22.2 kg/m²"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">SpO₂</label>
                <input
                  type="text"
                  value={vitalsSpo2}
                  onChange={(e) => setVitalsSpo2(e.target.value)}
                  placeholder="e.g. 98%"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">Temperature</label>
                <input
                  type="text"
                  value={vitalsTemp}
                  onChange={(e) => setVitalsTemp(e.target.value)}
                  placeholder="e.g. 98.6 °F"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-xs font-semibold text-slate-600">
                Cancel
              </button>
              <button
                disabled={isSavingRecord}
                onClick={async () => {
                  const newVitals: VitalsData = {
                    bloodPressure: vitalsBp.trim() || undefined,
                    heartRate: vitalsHr.trim() || undefined,
                    weight: vitalsWeight.trim() || undefined,
                    height: vitalsHeight.trim() || undefined,
                    bmi: vitalsBmi.trim() || undefined,
                    spo2: vitalsSpo2.trim() || undefined,
                    temperature: vitalsTemp.trim() || undefined,
                    recordedAt: new Date().toISOString()
                  };
                  setIsSavingRecord(true);
                  const res = await carePrepApi.updateMedicalHistory({ vitals: newVitals });
                  setIsSavingRecord(false);
                  if (res.success) {
                    setDbMedicalHistory(res.history);
                    setActiveModal(null);
                    triggerFeedback('✓ Health profile updated');
                  }
                }}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs"
              >
                {isSavingRecord ? 'Saving...' : 'Save Vitals'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View Consultation Summary */}
      {activeModal === 'consultation' && viewingConsultation && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Consultation Summary</h3>
                <p className="text-xs text-slate-500">
                  {new Date(viewingConsultation.createdAt || viewingConsultation.scheduledAt).toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Consulting Physician</span>
                <span className="font-bold text-slate-900">{viewingConsultation.doctorId || 'Dr. A. K. Varma, MD'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Clinical Status</span>
                <span className="font-bold text-emerald-700">{viewingConsultation.status}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Doctor Decision</span>
                <span className="font-bold text-slate-900">{viewingConsultation.doctorDecision || 'COMPLETED'}</span>
              </div>
              {viewingConsultation.doctorNotes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-700 block">Doctor's Clinical Notes</span>
                  <p className="text-slate-600 leading-relaxed">{viewingConsultation.doctorNotes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
