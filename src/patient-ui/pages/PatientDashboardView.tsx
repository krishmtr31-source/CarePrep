import React, { useState, useRef } from 'react';
import { 
  LayoutDashboard, 
  User, 
  FileText, 
  Calendar, 
  FileCheck2, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Sparkles, 
  Stethoscope, 
  Activity, 
  Heart, 
  ShieldCheck, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Plus, 
  Menu, 
  X, 
  ChevronRight, 
  Pill, 
  Droplet,
  Edit3,
  ExternalLink,
  Info,
  Upload,
  RefreshCw,
  AlertTriangle,
  Eye,
  Download,
  Check,
  ArrowLeft,
  FileUp,
  Trash2,
  Thermometer,
  Scale,
  Cigarette,
  Wine,
  Moon,
  Briefcase,
  Users,
  Scissors,
  ShieldAlert,
  Building2,
  BadgeCheck,
  CalendarCheck,
  FileHeart,
  Database
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useIntake } from '../../shared/contexts/IntakeContext';
import { localStore } from '../../backend/storage/localStore';
import { StatusBadge, HealthMetric } from '../../shared/components/ui/DesignSystem';
import { GeminiReportSummaryView } from '../../document-intelligence/components/GeminiReportSummaryView';
import { OriginalDocumentModal } from '../../document-intelligence/components/OriginalDocumentModal';
import { extractTextFromFile } from '../../document-intelligence/ocr/textExtractor';
import { processDocumentWithAI } from '../../document-intelligence/parsers/documentPipeline';
import { ExtractedDocumentData } from '../../document-intelligence/models/document';
import { PatientHealthProfileView } from '../components/PatientHealthProfileView';
import { HealthcareDiscoveryView } from '../components/HealthcareDiscoveryView';
import { PatientConsultationPreparationView } from '../components/PatientConsultationPreparationView';
import { AbnormalFindingsCard, AbnormalFindingItem } from '../components/AbnormalFindingsCard';
import { MedicalDocumentUploadModal } from '../components/MedicalDocumentUploadModal';
import { MedicalDocumentReviewModal } from '../components/MedicalDocumentReviewModal';
import { ViewOriginalDocumentModal } from '../components/ViewOriginalDocumentModal';
import { StructuredMedicalReportModal } from '../components/StructuredMedicalReportModal';
import { medicalDocumentApi, StructuredExtractionResult, MedicalDocumentRecord } from '../../shared/api/medicalDocumentApi';
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

interface PatientDashboardViewProps {
  onStartIntake: () => void;
  onViewCaseReport?: (caseId: string) => void;
}

type PatientSidebarTab = 
  | 'dashboard' 
  | 'profile' 
  | 'clinical-summary'
  | 'nearby'
  | 'appointments' 
  | 'reports' 
  | 'messages' 
  | 'settings';

const ANALYSIS_STAGES = [
  'Uploading document...',
  'Reading document...',
  'Extracting medical information...',
  'Organizing report...',
  'Preparing summary...'
];

export const PatientDashboardView: React.FC<PatientDashboardViewProps> = ({
  onStartIntake,
  onViewCaseReport
}) => {
  const { user, logout } = useAuth();
  const { patient, answers } = useIntake();
  const [activeTab, setActiveTab] = useState<PatientSidebarTab>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // MongoDB async data states
  const [dbPatientProfile, setDbPatientProfile] = useState<PatientProfileData | null>(null);
  const [dbMedicalHistory, setDbMedicalHistory] = useState<MedicalHistoryData | null>(null);
  const [dbReports, setDbReports] = useState<any[]>([]);
  const [dbConsultations, setDbConsultations] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<{ isConnected: boolean; error?: string }>({ isConnected: true });
  const [isLoadingHealthData, setIsLoadingHealthData] = useState<boolean>(true);
  const [healthDataError, setHealthDataError] = useState<string | null>(null);

  // Profile save & sync feedback states
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active Health Profile Modal
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

  // Document analysis & viewer states
  const [selectedReportDoc, setSelectedReportDoc] = useState<ExtractedDocumentData | null>(null);
  const [modalOriginalDoc, setModalOriginalDoc] = useState<ExtractedDocumentData | null>(null);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<number>(0);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [refreshDocsTrigger, setRefreshDocsTrigger] = useState<number>(0);
  const fileDropInputRef = useRef<HTMLInputElement>(null);

  // Phase 3 Document Digitization States
  const [isPhase3UploadOpen, setIsPhase3UploadOpen] = useState(false);
  const [phase3ReviewData, setPhase3ReviewData] = useState<{
    file: File;
    fileDataUrl: string;
    extraction: StructuredExtractionResult;
  } | null>(null);
  const [phase3OriginalDoc, setPhase3OriginalDoc] = useState<{
    isOpen: boolean;
    fileDataUrl: string | null;
    fileName: string;
  }>({ isOpen: false, fileDataUrl: null, fileName: '' });
  const [rawMongoDocs, setRawMongoDocs] = useState<MedicalDocumentRecord[]>([]);
  const [selectedMongoReportDoc, setSelectedMongoReportDoc] = useState<MedicalDocumentRecord | null>(null);

  // Strictly retrieve cases for the logged-in patient
  const patientId = patient?.id || user?.id || '';
  const allCases = localStore.getCases();
  const patientCases = patientId ? allCases.filter(c => c.patientId === patientId) : [];
  const latestCase = patientCases[0] || null;

  // Helper to trigger save feedback toast
  const triggerFeedback = (message: string, isError = false) => {
    setSyncFeedback({ type: isError ? 'error' : 'success', message });
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  // Fetch persistent patient profile, medical history, reports, and consultations from MongoDB
  React.useEffect(() => {
    let isMounted = true;
    async function loadDataFromDb() {
      if (!patientId) {
        setIsLoadingHealthData(false);
        return;
      }
      setIsLoadingHealthData(true);
      setHealthDataError(null);
      try {
        const [profile, history, reports, phase3Docs, consultations, dbHealth] = await Promise.all([
          carePrepApi.getPatientProfile(),
          carePrepApi.getMedicalHistory(),
          carePrepApi.getReports(),
          medicalDocumentApi.getDocuments(),
          carePrepApi.getConsultations(),
          carePrepApi.getDatabaseStatus()
        ]);
        if (isMounted) {
          if (profile) {
            setDbPatientProfile(profile);
          }
          if (history) {
            setDbMedicalHistory(history);
          }
          
          if (Array.isArray(phase3Docs)) {
            setRawMongoDocs(phase3Docs);
          }
          
          const combinedReports = [
            ...(Array.isArray(phase3Docs) ? phase3Docs.map((doc: any) => ({
              rawDoc: doc,
              reportId: doc.documentId,
              patientId: doc.patientId,
              fileName: doc.documentTitle || doc.fileName,
              fileType: doc.mimeType?.includes('pdf') ? 'pdf' : 'image',
              fileSize: doc.fileSize,
              uploadedAt: doc.createdAt || doc.processedAt,
              fileData: doc.fileData,
              documentType: doc.documentType,
              labResults: (doc.labResults || []).map((lr: any) => ({
                testName: lr.testName,
                value: lr.value,
                unit: lr.unit,
                referenceRange: lr.referenceRange,
                status: lr.flag ? String(lr.flag).toLowerCase() : 'normal',
                isAbnormal: lr.flag === 'HIGH' || lr.flag === 'LOW' || lr.flag === 'ABNORMAL'
              })),
              medications: (doc.medications || []).map((m: any) => ({
                name: m.name,
                dosage: m.dosage,
                frequency: m.frequency,
                duration: m.duration
              })),
              diagnoses: doc.diagnosesMentioned || [],
              hospitalDetails: {
                facilityName: doc.hospitalName,
                doctorName: doc.doctorName,
                reportDate: doc.documentDate
              },
              aiSummary: {
                mainPurpose: doc.summary,
                keyFindings: doc.importantNotes || [],
                importantObservations: doc.extractionWarnings || [],
                patientFriendlySummary: doc.summary,
                doctorReviewSummary: doc.summary
              },
              extractionStatus: doc.extractionStatus
            })) : []),
            ...(Array.isArray(reports) ? reports : [])
          ];

          setDbReports(combinedReports);

          if (Array.isArray(consultations)) {
            setDbConsultations(consultations);
          }
          if (dbHealth) {
            setDbStatus(dbHealth);
          }
          setIsLoadingHealthData(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setHealthDataError('Unable to load your health information.');
          setDbStatus({ isConnected: false, error: err.message });
          setIsLoadingHealthData(false);
        }
      }
    }

    loadDataFromDb();
    return () => { isMounted = false; };
  }, [patientId, refreshDocsTrigger]);

  // Combine MongoDB reports with any newly parsed local documents
  const localDocs = patientId ? localStore.getDocuments(patientId) : [];
  // Build unified patientDocs with MongoDB as primary source
  const patientDocs: ExtractedDocumentData[] = React.useMemo(() => {
    if (dbReports.length > 0) {
      return dbReports.map(rep => ({
        documentId: rep.reportId || rep._id,
        patientId: rep.patientId,
        fileName: rep.fileName,
        fileType: rep.fileType || 'pdf',
        fileSize: rep.fileSize,
        uploadedAt: rep.uploadedAt || rep.createdAt,
        classification: (rep.documentType as any) || 'LAB_REPORT',
        classificationConfidence: 0.95,
        originalFileUrl: rep.fileData || '',
        extractionStatus: rep.extractionStatus || 'PROCESSED',
        rawText: '',
        pagesCount: 1,
        unreliableFields: [],
        medications: (rep.medications || []).map((m: any, idx: number) => ({
          id: `med-${idx}`,
          name: m.name,
          dosage: m.dosage || '',
          frequency: m.frequency || '',
          duration: m.duration || '',
          evidence: { documentId: rep.reportId, documentName: rep.fileName, pageNumber: 1, snippet: '', confidenceScore: 0.9 }
        })),
        labResults: (rep.labResults || []).map((lr: any, idx: number) => ({
          id: `lab-${idx}`,
          testName: lr.testName,
          resultValue: lr.value,
          unit: lr.unit,
          sourceReferenceRange: { raw: lr.referenceRange || '', hasSourceRange: Boolean(lr.referenceRange) },
          flag: lr.isAbnormal ? 'HIGH' : 'NORMAL',
          isAbnormal: Boolean(lr.isAbnormal),
          evidence: { documentId: rep.reportId, documentName: rep.fileName, pageNumber: 1, snippet: '', confidenceScore: 0.95 }
        })),
        diagnoses: (rep.diagnoses || []).map((d: string, idx: number) => ({
          id: `diag-${idx}`,
          conditionName: d,
          status: 'ACTIVE',
          evidence: { documentId: rep.reportId, documentName: rep.fileName, pageNumber: 1, snippet: '', confidenceScore: 0.9 }
        })),
        geminiAnalyzed: Boolean(rep.aiSummary),
        geminiAnalysis: rep.aiSummary ? {
          document: {
            document_type: 'Medical Report',
            document_date: rep.hospitalDetails?.reportDate || '',
            hospital_or_lab: rep.hospitalDetails?.facilityName || '',
            doctor_name: rep.hospitalDetails?.doctorName || ''
          },
          patient: {
            name: user?.name || '',
            age: null,
            gender: '',
            patient_id: rep.patientId
          },
          summary: {
            main_purpose: rep.aiSummary.mainPurpose || '',
            key_findings: rep.aiSummary.keyFindings || [],
            important_observations: rep.aiSummary.importantObservations || []
          },
          laboratory_results: (rep.labResults || []).map((lr: any) => ({
            test_name: lr.testName,
            value: lr.value,
            unit: lr.unit || '',
            reference_range: lr.referenceRange || '',
            status: lr.isAbnormal ? 'abnormal' : 'normal'
          })),
          medications: (rep.medications || []).map((m: any) => ({
            name: m.name,
            dosage: m.dosage || '',
            frequency: m.frequency || '',
            duration: m.duration || ''
          })),
          diagnoses_or_conditions_mentioned: rep.diagnoses || [],
          symptoms_mentioned: [],
          allergies_mentioned: [],
          procedures_or_treatments: [],
          follow_up_information: [],
          missing_or_unclear_information: [],
          document_quality: {
            readability: 'Good',
            possible_ocr_errors: [],
            confidence_notes: []
          },
          patient_friendly_summary: rep.aiSummary.patientFriendlySummary || '',
          doctor_review_summary: rep.aiSummary.doctorReviewSummary || ''
        } : undefined
      }));
    }
    return localDocs;
  }, [dbReports, localDocs, user]);

  const handleOpenStructuredReport = async (doc: any) => {
    // 1. Direct match in loaded MongoDB records
    const match = rawMongoDocs.find(d => d.documentId === doc.documentId || (d as any)._id === doc.documentId);
    if (match) {
      setSelectedMongoReportDoc(match);
      return;
    }
    // 2. Fetch directly from MongoDB backend endpoint by id
    if (doc.documentId) {
      try {
        const fresh = await medicalDocumentApi.getDocument(doc.documentId);
        if (fresh.success && fresh.document) {
          setSelectedMongoReportDoc(fresh.document);
          return;
        }
      } catch (err) {
        console.warn('[PatientDashboardView] Could not fetch doc from MongoDB:', err);
      }
    }
    // 3. Construct canonical MedicalDocumentRecord from dashboard document state
    const constructed: MedicalDocumentRecord = {
      documentId: doc.documentId || 'doc-report',
      patientId: doc.patientId || patientId,
      fileName: doc.fileName,
      fileSize: doc.fileSize || 0,
      mimeType: doc.fileType === 'pdf' ? 'application/pdf' : 'image/jpeg',
      fileData: doc.originalFileUrl || '',
      documentType: doc.classification || 'LAB_REPORT',
      documentTitle: doc.fileName,
      summary: doc.geminiAnalysis?.summary?.main_purpose || '',
      labResults: (doc.labResults || []).map((l: any) => ({
        testName: l.testName,
        value: l.resultValue || l.value,
        unit: l.unit || '',
        referenceRange: l.sourceReferenceRange?.raw || l.referenceRange || '',
        flag: l.flag || (l.isAbnormal ? 'HIGH' : 'NORMAL')
      })),
      medications: (doc.medications || []).map((m: any) => ({
        name: m.name,
        dosage: m.dosage || '',
        frequency: m.frequency || '',
        duration: m.duration || '',
        route: 'Oral'
      })),
      diagnosesMentioned: (doc.diagnoses || []).map((d: any) => d.conditionName || d),
      proceduresMentioned: [],
      importantNotes: doc.geminiAnalysis?.summary?.key_findings || [],
      extractionWarnings: doc.geminiAnalysis?.summary?.important_observations || [],
      extractionStatus: doc.extractionStatus || 'PROCESSED',
      rawJson: {
        documentTitle: doc.fileName,
        documentType: doc.classification || 'LAB_REPORT',
        labResults: (doc.labResults || []).map((l: any) => ({
          testName: l.testName,
          value: l.resultValue || l.value,
          unit: l.unit || '',
          referenceRange: l.sourceReferenceRange?.raw || l.referenceRange || '',
          flag: l.flag || (l.isAbnormal ? 'HIGH' : 'NORMAL')
        })),
        medications: doc.medications || [],
        diagnoses: doc.diagnoses || [],
        summary: doc.geminiAnalysis?.summary?.main_purpose || ''
      }
    };
    setSelectedMongoReportDoc(constructed);
  };

  // Determine current assessment status dynamically
  let assessmentState: 'Incomplete' | 'In Progress' | 'Completed' | 'Submitted to Doctor' = 'Incomplete';
  if (latestCase) {
    if (latestCase.status === 'COMPLETED' || latestCase.status === 'REVIEWED_BY_DOCTOR' || latestCase.status === 'SUBMITTED_TO_DOCTOR') {
      assessmentState = 'Submitted to Doctor';
    } else {
      assessmentState = 'In Progress';
    }
  } else if (answers && Object.keys(answers).length > 0) {
    assessmentState = 'In Progress';
  }

  const patientName = dbPatientProfile?.fullName || patient?.fullName || user?.name || 'Patient';
  const patientDob = dbPatientProfile?.dateOfBirth || (patient as any)?.dateOfBirth || null;
  const patientAge = (dbPatientProfile?.age !== undefined && dbPatientProfile?.age !== null)
    ? dbPatientProfile.age
    : ((patient?.age !== undefined && patient?.age !== null) ? patient.age : null);
  const patientGender = dbPatientProfile?.gender || patient?.gender || null;
  const patientAbha = dbPatientProfile?.abhaId || patient?.abhaId || null;
  const patientPhone = dbPatientProfile?.mobile || patient?.phoneNumber || null;
  const patientEmail = dbPatientProfile?.email || user?.email || null;
  const patientCity = dbPatientProfile?.city || patient?.city || null;

  // Real MongoDB synchronization timestamp
  const lastSyncTimestamp = React.useMemo(() => {
    const rawDate = dbMedicalHistory?.updatedAt || (dbPatientProfile as any)?.updatedAt;
    if (!rawDate) return null;
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleString('en-US', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return null;
    }
  }, [dbMedicalHistory?.updatedAt, dbPatientProfile]);

  // Dynamic Profile Completion Calculation strictly derived from actual stored data
  const profileCompletionItems = React.useMemo(() => [
    {
      id: 'personal',
      label: 'Personal information',
      isComplete: Boolean(patientName && patientName !== 'Patient' && (patientAge !== null || patientDob) && patientGender)
    },
    {
      id: 'medicalHistory',
      label: 'Medical history',
      isComplete: Boolean((dbMedicalHistory?.conditionsList && dbMedicalHistory.conditionsList.length > 0) || (dbMedicalHistory?.existingConditions && dbMedicalHistory.existingConditions.length > 0))
    },
    {
      id: 'medications',
      label: 'Medications',
      isComplete: Boolean(dbMedicalHistory?.currentMedications && dbMedicalHistory.currentMedications.length > 0)
    },
    {
      id: 'allergies',
      label: 'Allergies',
      isComplete: Boolean((dbMedicalHistory?.allergiesList && dbMedicalHistory.allergiesList.length > 0) || (dbMedicalHistory?.allergies && dbMedicalHistory.allergies.length > 0) || dbMedicalHistory?.noKnownAllergies)
    },
    {
      id: 'familyHistory',
      label: 'Family history',
      isComplete: Boolean(dbMedicalHistory?.familyHistoryList && dbMedicalHistory.familyHistoryList.length > 0)
    },
    {
      id: 'lifestyle',
      label: 'Lifestyle',
      isComplete: Boolean(dbMedicalHistory?.lifestyle?.smoking || dbMedicalHistory?.lifestyle?.physicalActivity || dbMedicalHistory?.lifestyle?.diet || dbMedicalHistory?.lifestyle?.sleepHours)
    },
    {
      id: 'vitals',
      label: 'Vitals',
      isComplete: Boolean(dbMedicalHistory?.vitals?.bloodPressure || dbMedicalHistory?.vitals?.heartRate || dbMedicalHistory?.vitals?.weight || dbMedicalHistory?.vitals?.bmi)
    }
  ], [patientName, patientAge, patientDob, patientGender, dbMedicalHistory]);

  const completedCount = profileCompletionItems.filter(item => item.isComplete).length;
  const completionPercentage = Math.round((completedCount / profileCompletionItems.length) * 100);

  // Primary Source: Persistent MongoDB Medical History
  const allergiesValue = dbMedicalHistory?.allergies?.length
    ? dbMedicalHistory.allergies.join(', ')
    : (() => {
        const allergiesAnswer = latestCase?.answers?.find(a => 
          a.questionId?.toLowerCase().includes('allerg') || 
          (a.step && a.step.toLowerCase().includes('allerg'))
        );
        return allergiesAnswer?.selectedOptionIds?.length 
          ? allergiesAnswer.selectedOptionIds.join(', ')
          : (allergiesAnswer?.customText ? allergiesAnswer.customText : 'None recorded');
      })();

  const conditionsValue = dbMedicalHistory?.existingConditions?.length
    ? (dbMedicalHistory.existingConditions.length === 1 ? dbMedicalHistory.existingConditions[0] : `${dbMedicalHistory.existingConditions.length} conditions`)
    : (() => {
        const conditionsAnswer = latestCase?.answers?.find(a => 
          a.questionId?.toLowerCase().includes('history') || 
          a.questionId?.toLowerCase().includes('condition') || 
          (a.step && a.step.toLowerCase().includes('history'))
        );
        return conditionsAnswer?.selectedOptionIds?.length 
          ? (conditionsAnswer.selectedOptionIds.length === 1 ? conditionsAnswer.selectedOptionIds[0] : `${conditionsAnswer.selectedOptionIds.length} conditions`)
          : (conditionsAnswer?.customText ? conditionsAnswer.customText : 'None reported');
      })();

  const medsValue = dbMedicalHistory?.currentMedications?.length
    ? (dbMedicalHistory.currentMedications.length === 1 ? dbMedicalHistory.currentMedications[0].name : `${dbMedicalHistory.currentMedications.length} active`)
    : (() => {
        const medsAnswer = latestCase?.answers?.find(a => 
          a.questionId?.toLowerCase().includes('medication') || 
          (a.step && a.step.toLowerCase().includes('medication'))
        );
        return medsAnswer?.selectedOptionIds?.length 
          ? (medsAnswer.selectedOptionIds.length === 1 ? medsAnswer.selectedOptionIds[0] : `${medsAnswer.selectedOptionIds.length} active`)
          : (medsAnswer?.customText ? medsAnswer.customText : 'None recorded');
      })();

  const bloodGroupValue = (patient as any)?.bloodGroup || 'Not recorded';

  // Genuine appointment info
  const hasDoctorReview = Boolean(latestCase?.doctorReview || latestCase?.status === 'REVIEWED_BY_DOCTOR');
  const appointmentDoctor = latestCase?.doctorReview?.doctorName || null;

  // Build authentic recent activity timeline
  const activityList: Array<{ id: string; title: string; time: string; desc: string; color: 'emerald' | 'blue' | 'teal' }> = [];

  if (latestCase) {
    activityList.push({
      id: `case-${latestCase.caseId}`,
      title: latestCase.status === 'REVIEWED_BY_DOCTOR' 
        ? 'Case Verified & Approved by Physician'
        : 'Pre-Visit Assessment Transmitted to Physician Desk',
      time: new Date(latestCase.completedAt || latestCase.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      desc: `Chief complaint: ${latestCase.chiefComplaint || 'Clinical intake completed'}. Mode: ${latestCase.mode}. Token #${latestCase.tokenNumber || 'CP-101'}.`,
      color: 'emerald'
    });
  }

  patientDocs.forEach(doc => {
    activityList.push({
      id: `doc-${doc.documentId}`,
      title: `Medical Record OCR & Extraction (${doc.classification || doc.fileName || 'Report'})`,
      time: new Date(doc.uploadedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      desc: `Extracted ${doc.labResults?.length || 0} lab parameters and clinical entities with OCR confidence scoring.`,
      color: 'blue'
    });
  });

  if (patientAbha) {
    activityList.push({
      id: 'abha-sync',
      title: 'ABHA Health ID Linked & Verified',
      time: 'Verified',
      desc: `ABHA ID ${patientAbha} registered for clinical case synchronization.`,
      color: 'teal'
    });
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAnalyzeSelectedFile = async (fileToAnalyze?: File) => {
    const file = fileToAnalyze || pendingUploadFile;
    if (!file) return;

    setIsAnalyzingDoc(true);
    setDocUploadError(null);
    setAnalysisStage(0);

    try {
      // Step 1: Uploading document...
      await new Promise(r => setTimeout(r, 600));
      setAnalysisStage(1);

      // Read file data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const mimeType = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      // Step 2: Reading document...
      const ocrResult = await extractTextFromFile(file, () => {});

      // Step 3: Extracting medical information...
      setAnalysisStage(2);

      const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
      const processed = await processDocumentWithAI(
        ocrResult.text,
        file.name,
        fileType,
        undefined,
        ocrResult.extractionMethod,
        base64Data,
        mimeType,
        dataUrl
      );

      processed.patientId = patientId;
      processed.fileSize = file.size;

      // Step 4: Organizing report...
      setAnalysisStage(3);
      await new Promise(r => setTimeout(r, 500));

      // Step 5: Preparing summary...
      setAnalysisStage(4);
      await new Promise(r => setTimeout(r, 500));

      // Save document to local cache
      localStore.saveDocument(processed);

      // Save report directly to MongoDB permanent storage
      await carePrepApi.saveReport({
        reportId: processed.documentId,
        fileName: processed.fileName,
        fileType: processed.fileType,
        fileSize: processed.fileSize,
        uploadedAt: processed.uploadedAt,
        labResults: processed.labResults?.map(lr => ({
          testName: lr.testName,
          value: lr.resultValue,
          numericValue: lr.numericValue,
          unit: lr.unit,
          referenceRange: lr.sourceReferenceRange?.raw,
          status: lr.flag.toLowerCase(),
          isAbnormal: lr.isAbnormal
        })),
        medications: processed.medications?.map(m => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration
        })),
        diagnoses: processed.diagnoses?.map(d => d.conditionName),
        hospitalDetails: {
          facilityName: processed.facilityName,
          doctorName: processed.doctorName,
          reportDate: processed.detectedDate
        },
        aiSummary: processed.geminiAnalysis?.summary ? {
          mainPurpose: processed.geminiAnalysis.summary.main_purpose,
          keyFindings: processed.geminiAnalysis.summary.key_findings,
          importantObservations: processed.geminiAnalysis.summary.important_observations,
          patientFriendlySummary: processed.geminiAnalysis.patient_friendly_summary,
          doctorReviewSummary: processed.geminiAnalysis.doctor_review_summary
        } : undefined
      });

      setIsAnalyzingDoc(false);
      setPendingUploadFile(null);
      setSelectedReportDoc(processed);
      setRefreshDocsTrigger(prev => prev + 1);
    } catch (err: any) {
      setIsAnalyzingDoc(false);
      setDocUploadError(
        'Your document was uploaded successfully, but AI analysis is temporarily unavailable.'
      );
    }
  };

  const handleDeleteDocument = async (doc: ExtractedDocumentData) => {
    try {
      const res = await medicalDocumentApi.deleteDocument(doc.documentId);
      if (res.success) {
        triggerFeedback('Medical document deleted successfully.');
        setRefreshDocsTrigger(prev => prev + 1);
      } else {
        triggerFeedback(res.error || 'Failed to delete document', true);
      }
    } catch (err: any) {
      triggerFeedback('Unable to delete document.', true);
    }
  };

  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setPendingUploadFile(e.dataTransfer.files[0]);
      setDocUploadError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPendingUploadFile(e.target.files[0]);
      setDocUploadError(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row relative bg-slate-50">
      {/* 1. Mobile Sidebar Toggle Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
            {patientName.charAt(0)}
          </div>
          <div>
            <span className="font-bold text-sm text-slate-900 block">{patientName}</span>
            <span className="text-[10px] text-emerald-700 font-semibold uppercase">Patient Portal</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        >
          {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* 2. Professional Clean Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 lg:top-16 z-40 h-full lg:h-[calc(100vh-64px)] w-64 
        bg-white border-r border-slate-200 p-4 sm:p-5 flex flex-col justify-between 
        transition-transform duration-200 ease-in-out shadow-xs
        ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="space-y-6">
          {/* User Profile Summary Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
              {patientName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-slate-900 truncate">{patientName}</div>
              <div className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">Patient Portal</div>
              <div className="text-[10px] font-mono text-slate-400 truncate">
                {patientAbha ? `ABHA: ${patientAbha}` : 'ABHA: Not linked'}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'profile', label: 'My Health Profile', icon: <User className="w-4 h-4" /> },
              { id: 'clinical-summary', label: 'Consultation Preparation', icon: <Sparkles className="w-4 h-4 text-emerald-600" /> },
              { id: 'nearby', label: 'Find Healthcare Near You', icon: <Building2 className="w-4 h-4 text-emerald-600" /> },
              { id: 'appointments', label: 'Appointments', icon: <Calendar className="w-4 h-4" />, count: hasDoctorReview ? 1 : 0 },
              { id: 'reports', label: 'Reports', icon: <FileCheck2 className="w-4 h-4" />, count: patientCases.length },
              { id: 'messages', label: 'Messages', icon: <MessageSquare className="w-4 h-4" /> },
              { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> }
            ].map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as PatientSidebarTab);
                    setIsMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.count !== undefined && item.count > 0 && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Quick action for Pre-Visit Assessment */}
            <div className="pt-3">
              <button
                onClick={() => {
                  setIsMobileNavOpen(false);
                  onStartIntake();
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Pre-Visit Assessment</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />
              </button>
            </div>
          </nav>
        </div>

        {/* Logout Button */}
        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 3. Main Workspace Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto w-full">
        
        {/* =========================================================================
            TAB 1: DASHBOARD VIEW (Clean, Spacious, Informative)
            ========================================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Greeting Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Patient Health Overview</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Welcome back, {patientName.split(' ')[0]}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Review your intake status, vitals, and prepared physician handoff summary.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
                <button
                  onClick={() => setIsPhase3UploadOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm shadow-xs transition-colors"
                >
                  <FileText className="w-4 h-4 text-emerald-600" />
                  <span>Scan &amp; OCR Document</span>
                </button>
                <button
                  onClick={() => setActiveTab('clinical-summary')}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs sm:text-sm shadow-xs transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Prepare for Consultation</span>
                </button>
                <button
                  onClick={onStartIntake}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start Pre-Visit Assessment</span>
                </button>
              </div>
            </div>

            {/* Top Stat Cards: Profile Completion, Upcoming Appointment, Assessment Status, OCR Scanner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Dynamic Profile Completion */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Health Profile
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    completionPercentage >= 80 
                      ? 'text-emerald-700 bg-emerald-50' 
                      : completionPercentage >= 50 
                      ? 'text-amber-700 bg-amber-50' 
                      : 'text-slate-600 bg-slate-100'
                  }`}>
                    {completionPercentage}% Complete
                  </span>
                </div>

                <div className="py-4 space-y-3">
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${patientName && patientName !== 'Patient' ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>Demographics</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${patientAbha ? 'text-emerald-600' : 'text-slate-300'}`} />
                      <span>{patientAbha ? 'ABHA Linked' : 'ABHA Pending'}</span>
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('profile')}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 text-left pt-2 border-t border-slate-100 flex items-center justify-between"
                >
                  <span>View Health Profile</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 2: Upcoming Appointment */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Upcoming Appointment
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    hasDoctorReview 
                      ? 'text-blue-700 bg-blue-50' 
                      : 'text-slate-500 bg-slate-100'
                  }`}>
                    {hasDoctorReview ? 'Confirmed' : 'None Scheduled'}
                  </span>
                </div>

                <div className="py-4">
                  {hasDoctorReview ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{appointmentDoctor || 'Dr. A. K. Varma, MD'}</h4>
                          <p className="text-[11px] text-slate-500">Consultation Active • Room 204</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2 space-y-1">
                      <div className="text-xs font-semibold text-slate-700">No appointment scheduled</div>
                      <p className="text-[11px] text-slate-400">Complete assessment to request consultation</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setActiveTab('appointments')}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 text-left pt-2 border-t border-slate-100 flex items-center justify-between"
                >
                  <span>Manage Appointments</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 3: Assessment Status */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Assessment Status
                  </span>
                  <StatusBadge status={assessmentState} size="sm" />
                </div>

                <div className="py-4 space-y-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {latestCase ? (latestCase.chiefComplaint || 'Clinical Assessment') : 'No active assessment'}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {latestCase 
                      ? `Token #${latestCase.tokenNumber || 'CP-101'} • Submitted to Physician Queue`
                      : 'Prepare clinical symptoms in native tongue before doctor visit.'}
                  </p>
                </div>

                <button
                  onClick={onStartIntake}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 text-left pt-2 border-t border-slate-100 flex items-center justify-between"
                >
                  <span>{assessmentState === 'Submitted to Doctor' ? 'Update Assessment' : 'Start Assessment'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Card 4: Medical Document OCR Scanner */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Document OCR
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-emerald-700 bg-emerald-50">
                    Client-Side OCR
                  </span>
                </div>

                <div className="py-4 space-y-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    Prescription &amp; Lab OCR
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    Instant text extraction from PDF, JPG, PNG &amp; WebP with local privacy protection.
                  </p>
                </div>

                <button
                  onClick={() => setIsPhase3UploadOpen(true)}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 text-left pt-2 border-t border-slate-100 flex items-center justify-between"
                >
                  <span>Open OCR Studio</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Potential Abnormal Findings Review Layer (SWASTHYA AI Specification) */}
            {patientDocs.some(d => d.labResults?.some(l => l.isAbnormal)) && (
              <AbnormalFindingsCard
                findings={patientDocs.flatMap(d => (d.labResults || []).filter(l => l.isAbnormal).map(l => ({
                  id: l.id,
                  sourceType: 'LAB' as const,
                  title: l.testName,
                  observedValue: `${l.resultValue} ${l.unit}`,
                  expectedOrReference: l.sourceReferenceRange?.raw || 'Normal range',
                  level: (l.flag === 'HIGH' || l.flag === 'LOW' ? 'REVIEW' : 'LOW ATTENTION') as any,
                  clinicalContext: `Extracted from ${d.fileName}. Value noted outside source reference interval. Highlighted for clinical consultation review.`,
                  suggestedAction: 'Discuss with attending physician during scheduled OPD.'
                })))}
                patientName={patientName}
              />
            )}

            {/* Health Vitals Summary Grid */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Clinical Health Metrics</span>
                </h3>
                <span className="text-[11px] text-slate-400">Synced from records</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                <HealthMetric
                  label="Age"
                  value={patientAge !== null ? patientAge : '--'}
                  unit={patientAge !== null ? "yrs" : ""}
                  variant="slate"
                />
                <HealthMetric
                  label="Gender"
                  value={patientGender ? (patientGender.charAt(0).toUpperCase() + patientGender.slice(1)) : 'Not set'}
                  variant="slate"
                />
                <HealthMetric
                  label="Blood Group"
                  value={bloodGroupValue}
                  icon={<Droplet className="w-4 h-4 text-rose-500" />}
                  variant="cyan"
                />
                <HealthMetric
                  label="Allergies"
                  value={allergiesValue}
                  icon={<ShieldCheck className="w-4 h-4 text-emerald-500" />}
                  variant="emerald"
                />
                <HealthMetric
                  label="Conditions"
                  value={conditionsValue}
                  icon={<Heart className="w-4 h-4 text-amber-500" />}
                  variant="violet"
                />
                <HealthMetric
                  label="Medications"
                  value={medsValue}
                  icon={<Pill className="w-4 h-4 text-blue-500" />}
                  variant="slate"
                />
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
                  <p className="text-xs text-slate-500">Record of your recent intake transmissions and document extractions</p>
                </div>
              </div>

              {activityList.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-slate-200 space-y-4 pt-1">
                  {activityList.map((item) => (
                    <div key={item.id} className="relative">
                      <div className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full ${
                        item.color === 'emerald' ? 'bg-emerald-600' : item.color === 'blue' ? 'bg-blue-600' : 'bg-teal-600'
                      }`} />
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-900">{item.title}</span>
                        <span className="text-[10px] text-slate-400">{item.time}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{item.desc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-slate-700">No recent clinical activity</div>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    Your assessment timeline will be updated automatically as you complete intakes.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: MY HEALTH PROFILE
            ========================================================================= */}
        {/* =========================================================================
            TAB 2: MY HEALTH PROFILE
            ========================================================================= */}
        {activeTab === 'profile' && (
          <PatientHealthProfileView
            patientName={patientName}
            patientDob={patientDob}
            patientAge={patientAge}
            patientGender={patientGender}
            patientAbha={patientAbha}
            patientPhone={patientPhone}
            patientEmail={patientEmail}
            patientCity={patientCity}
            dbPatientProfile={dbPatientProfile}
            setDbPatientProfile={setDbPatientProfile}
            dbMedicalHistory={dbMedicalHistory}
            setDbMedicalHistory={setDbMedicalHistory}
            patientDocs={patientDocs}
            dbConsultations={dbConsultations}
            dbStatus={dbStatus}
            lastSyncTimestamp={lastSyncTimestamp}
            profileCompletionItems={profileCompletionItems}
            completionPercentage={completionPercentage}
            onUploadReportClick={() => {
              setIsPhase3UploadOpen(true);
            }}
            onViewReport={(doc) => {
              if (doc.originalFileUrl) {
                setPhase3OriginalDoc({
                  isOpen: true,
                  fileDataUrl: doc.originalFileUrl,
                  fileName: doc.fileName
                });
              } else {
                setModalOriginalDoc(doc);
              }
            }}
            onViewExtractedDoc={(doc) => {
              setSelectedReportDoc(doc);
              setActiveTab('reports');
            }}
            onDeleteDocument={handleDeleteDocument}
            onRetryDocument={() => {
              setIsPhase3UploadOpen(true);
            }}
          />
        )}

        {/* =========================================================================
            TAB: CONSULTATION PREPARATION & SMART CLINICAL SUMMARY
            ========================================================================= */}
        {activeTab === 'clinical-summary' && (
          <div className="animate-in fade-in duration-200">
            <PatientConsultationPreparationView
              patientId={patientId}
              onStartIntake={onStartIntake}
            />
          </div>
        )}

        {/* =========================================================================
            TAB: FIND HEALTHCARE NEAR YOU (SWASTHYA DISCOVERY)
            ========================================================================= */}
        {activeTab === 'nearby' && (
          <div className="animate-in fade-in duration-200">
            <HealthcareDiscoveryView />
          </div>
        )}

        {/* =========================================================================
            TAB 3: APPOINTMENTS VIEW
            ========================================================================= */}
        {activeTab === 'appointments' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Appointments</h2>
                  <p className="text-xs text-slate-500">Scheduled clinical consultations and follow-ups</p>
                </div>
                <button
                  onClick={onStartIntake}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Request Appointment</span>
                </button>
              </div>

              {hasDoctorReview ? (
                <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Physician Consultation Active</h4>
                      <p className="text-xs text-slate-600 mt-0.5">Consultant: {appointmentDoctor || 'Dr. A. K. Varma, MD'}</p>
                      <p className="text-[11px] text-blue-700 font-semibold mt-1">Room 204 • OP Department</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-100 text-blue-800">
                    Confirmed
                  </span>
                </div>
              ) : (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">No appointment scheduled</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    You currently do not have any scheduled doctor appointments. Submit your pre-visit assessment to receive an OPD slot.
                  </p>
                  <button
                    onClick={onStartIntake}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                  >
                    <span>Start Pre-Visit Assessment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: REPORTS VIEW (Gemini Medical Document Understanding)
            ========================================================================= */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {selectedReportDoc ? (
              /* Sub-view: Active Document AI Summary */
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setSelectedReportDoc(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to All Reports</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReportDoc(null);
                      setPendingUploadFile(null);
                      setDocUploadError(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors self-start sm:self-auto"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Another Report</span>
                  </button>
                </div>

                <GeminiReportSummaryView
                  document={selectedReportDoc}
                  isDoctorView={false}
                  onViewOriginal={() => setModalOriginalDoc(selectedReportDoc)}
                />
              </div>
            ) : (
              /* Main Reports View: Uploader + Past Uploaded Docs + Case Summaries */
              <div className="space-y-6">
                {/* 1. Upload Medical Report Box */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-900">Medical Reports &amp; Lab Documents</h2>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          Gemini 3.6 Flash
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Upload your CBC, metabolic panels, lipid profiles, prescriptions, or discharge summaries for automated clinical structuring.
                      </p>
                    </div>
                  </div>

                  {/* Hidden native input */}
                  <input
                    type="file"
                    ref={fileDropInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/*"
                    className="hidden"
                  />

                  {/* Uploader Drop Zone or File Details Card */}
                  {!pendingUploadFile && !isAnalyzingDoc && (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDropFile}
                      onClick={() => fileDropInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/20 rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                        <Upload className="w-7 h-7" />
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                        Drop your medical report here, or <span className="text-emerald-700 underline">browse files</span>
                      </h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        PDF, JPG, PNG supported • Blood tests, prescriptions &amp; discharge summaries up to 20 MB
                      </p>
                    </div>
                  )}

                  {/* Selected File Card Awaiting Analysis */}
                  {pendingUploadFile && !isAnalyzingDoc && (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                            <Check className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{pendingUploadFile.name}</span>
                              <span className="text-[11px] text-slate-500 font-mono">({formatFileSize(pendingUploadFile.size)})</span>
                            </div>
                            <p className="text-[11px] text-emerald-700 font-medium">Ready for Gemini Medical Document Understanding</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setPendingUploadFile(null);
                            setDocUploadError(null);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {docUploadError && (
                        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span>{docUploadError}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAnalyzeSelectedFile()}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors flex-shrink-0"
                          >
                            Try Again
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setPendingUploadFile(null)}
                          className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAnalyzeSelectedFile()}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
                        >
                          <Sparkles className="w-4 h-4" />
                          <span>Analyze Document</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 5-Step Staged Progress Indicator */}
                  {isAnalyzingDoc && (
                    <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-4 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                          <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                          <span>{ANALYSIS_STAGES[analysisStage]}</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-700">
                          Step {analysisStage + 1} of 5
                        </span>
                      </div>

                      {/* Animated Progress Bar */}
                      <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500 ease-out"
                          style={{ width: `${((analysisStage + 1) / 5) * 100}%` }}
                        />
                      </div>

                      {/* Staged Checkpoints Visual */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                        {ANALYSIS_STAGES.map((label, idx) => {
                          const isDone = idx < analysisStage;
                          const isCurrent = idx === analysisStage;
                          return (
                            <div 
                              key={idx} 
                              className={`p-2 rounded-xl text-[11px] font-medium border text-center transition-all ${
                                isDone 
                                  ? 'bg-emerald-100/80 border-emerald-300 text-emerald-800' 
                                  : isCurrent 
                                  ? 'bg-white border-emerald-500 text-emerald-950 font-bold shadow-2xs' 
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}
                            >
                              <div className="text-[9px] uppercase tracking-wider mb-0.5 opacity-70">
                                {isDone ? '✓ Done' : `Step ${idx + 1}`}
                              </div>
                              <div className="truncate">{label.replace('...', '')}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Uploaded Documents Section */}
                {patientDocs.length > 0 ? (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Analyzed Medical Records</h3>
                        <p className="text-xs text-slate-500">Structured laboratory summaries &amp; clinical extractions</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        {patientDocs.length} {patientDocs.length === 1 ? 'Record' : 'Records'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {patientDocs.map((doc) => (
                        <div
                          key={doc.documentId}
                          className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 bg-slate-50/50 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900">{doc.fileName}</h4>
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
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Uploaded {new Date(doc.uploadedAt).toLocaleDateString()} • {doc.labResults?.length || 0} lab tests • {doc.medications?.length || 0} medications
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => setModalOriginalDoc(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>View Original</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenStructuredReport(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow-2xs"
                            >
                              <Database className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Structured Report</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedReportDoc(doc)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>View AI Summary</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xs text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-slate-800">No reports uploaded yet.</div>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Upload your blood tests, prescriptions, or discharge summaries above to generate AI-assisted clinical extractions.
                    </p>
                  </div>
                )}

                {/* 3. Clinical Consultations & Case Summaries */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Pre-Consultation Intakes</h3>
                      <p className="text-xs text-slate-500">Official physician consultation case files</p>
                    </div>
                  </div>

                  {patientCases.length > 0 ? (
                    <div className="space-y-3">
                      {patientCases.map((c) => (
                        <div 
                          key={c.caseId}
                          className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all flex items-center justify-between bg-slate-50/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                              CP
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">{c.chiefComplaint || 'Pre-Consultation Intake'}</h4>
                              <p className="text-[11px] text-slate-500">Token #{c.tokenNumber} • Mode: {c.mode} • {new Date(c.completedAt || c.startedAt).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              c.status === 'REVIEWED_BY_DOCTOR' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {c.status === 'REVIEWED_BY_DOCTOR' ? 'Doctor Verified' : 'Queued'}
                            </span>
                            {onViewCaseReport && (
                              <button
                                onClick={() => onViewCaseReport(c.caseId)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <span>View</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                        <FileCheck2 className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-700">No Pre-Consultation Intakes Yet</div>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        Once you submit an intake assessment, your official consultation file will appear here.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 5: MESSAGES VIEW
            ========================================================================= */}
        {activeTab === 'messages' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">Clinical Messages</h2>
                <p className="text-xs text-slate-500">Notifications from your healthcare team</p>
              </div>

              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">No Unread Messages</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Messages and prescription updates from your consulting physician will appear here.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 6: SETTINGS VIEW
            ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">Patient Settings</h2>
                <p className="text-xs text-slate-500">Preferences, privacy controls, and language settings</p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900">Preferred Language</h4>
                    <p className="text-slate-500 mt-0.5">Language used for clinical questions and voice intake</p>
                  </div>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 uppercase">
                    {(patient?.preferredLanguage || 'en').toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900">ABHA Health ID Sync</h4>
                    <p className="text-slate-500 mt-0.5">Allow automatic syncing of pre-consultation drafts with Ayushman Bharat</p>
                  </div>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                    {patientAbha ? 'Enabled' : 'Not configured'}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <h4 className="font-bold text-slate-900">Account Role</h4>
                    <p className="text-slate-500 mt-0.5">Active session security profile</p>
                  </div>
                  <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                    Patient User
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {modalOriginalDoc && (
        <OriginalDocumentModal
          document={modalOriginalDoc}
          onClose={() => setModalOriginalDoc(null)}
        />
      )}

      {/* Phase 3: Medical Document Upload Modal */}
      <MedicalDocumentUploadModal
        isOpen={isPhase3UploadOpen}
        onClose={() => setIsPhase3UploadOpen(false)}
        onExtractionSuccess={(result) => {
          setIsPhase3UploadOpen(false);
          setPhase3ReviewData(result);
        }}
        onViewOriginalFile={(url, name) => {
          setPhase3OriginalDoc({
            isOpen: true,
            fileDataUrl: url,
            fileName: name
          });
        }}
      />

      {/* Phase 3: Medical Document Review Modal */}
      {phase3ReviewData && (
        <MedicalDocumentReviewModal
          isOpen={Boolean(phase3ReviewData)}
          onClose={() => setPhase3ReviewData(null)}
          fileName={phase3ReviewData.file.name}
          fileSize={phase3ReviewData.file.size}
          mimeType={phase3ReviewData.file.type || (phase3ReviewData.file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg')}
          fileDataUrl={phase3ReviewData.fileDataUrl}
          initialExtraction={phase3ReviewData.extraction}
          onSavedSuccess={() => {
            triggerFeedback('Document saved to Medical Records successfully.');
            setRefreshDocsTrigger(prev => prev + 1);
          }}
          onViewOriginal={() => {
            if (phase3ReviewData) {
              setPhase3OriginalDoc({
                isOpen: true,
                fileDataUrl: phase3ReviewData.fileDataUrl,
                fileName: phase3ReviewData.file.name
              });
            }
          }}
        />
      )}

      {/* Phase 3: View Original Document Modal */}
      <ViewOriginalDocumentModal
        isOpen={phase3OriginalDoc.isOpen}
        onClose={() => setPhase3OriginalDoc({ isOpen: false, fileDataUrl: null, fileName: '' })}
        fileDataUrl={phase3OriginalDoc.fileDataUrl}
        fileName={phase3OriginalDoc.fileName}
      />

      {/* Structured Medical Report Modal (Retrieved from MongoDB Atlas Database) */}
      <StructuredMedicalReportModal
        isOpen={Boolean(selectedMongoReportDoc)}
        document={selectedMongoReportDoc}
        onClose={() => setSelectedMongoReportDoc(null)}
        onViewOriginal={() => {
          if (selectedMongoReportDoc?.fileData) {
            setPhase3OriginalDoc({
              isOpen: true,
              fileDataUrl: selectedMongoReportDoc.fileData,
              fileName: selectedMongoReportDoc.fileName
            });
          }
        }}
      />
    </div>
  );
};
