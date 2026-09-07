import { PatientIdentity, ConsentRecord } from '../../data-models/patient';
import { PatientCaseRecord } from '../../data-models/intake';
import { DoctorSummaryDraft, SummaryVersion, SummaryAuditEntry } from '../../data-models/doctorSummary';
import { ExtractedDocumentData } from '../../document-intelligence/models/document';
import { SAMPLE_DOCUMENTS } from '../../document-intelligence/samples/sampleDocuments';
import { processDocumentText } from '../../document-intelligence/parsers/documentPipeline';
import { generateDoctorSummaryDraft } from '../../ai-services/summaryGenerator';

const STORAGE_KEYS = {
  PATIENTS: 'sih_patients_store',
  CONSENTS: 'sih_consents_store',
  CASES: 'sih_cases_store',
  SUMMARIES: 'sih_summaries_store',
  DOCUMENTS: 'sih_documents_store',
  CURRENT_PATIENT_ID: 'sih_current_patient_id',
  CURRENT_CASE_ID: 'sih_current_case_id'
};

const SEED_PATIENTS: PatientIdentity[] = [
  {
    id: 'pat-seed-001',
    abhaId: '91-4562-7819-2041',
    fullName: 'Rameshwar Sharma',
    age: 52,
    gender: 'male',
    phoneNumber: '+91 98451 22319',
    city: 'Jaipur',
    preferredLanguage: 'hi',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'pat-seed-002',
    abhaId: '82-1920-3341-9011',
    fullName: 'Priya Meenakshi',
    age: 38,
    gender: 'female',
    phoneNumber: '+91 94440 18823',
    city: 'Chennai',
    preferredLanguage: 'ta',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

const SEED_CASES: PatientCaseRecord[] = [
  {
    caseId: 'case-seed-001',
    patientId: 'pat-seed-001',
    mode: 'AYUSH',
    status: 'COMPLETED',
    chiefComplaint: 'Bilateral knee stiffness, swelling and lower back ache for 4 months (Sandhivata)',
    language: 'hi',
    startedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    redFlagsDetected: [],
    answers: [
      {
        questionId: 'ayush_chief_complaint',
        step: 'CHIEF_COMPLAINT',
        selectedOptionIds: ['Joint Pain, Stiffness & Sciatica (Sandhivata / Kati Shula)'],
        customText: 'Difficulty in climbing stairs and morning stiffness in knee joints.',
        rawPatientResponse: 'Difficulty in climbing stairs and morning stiffness in knee joints.',
        audioProvenance: 'VOICE',
        timestamp: new Date().toISOString()
      },
      {
        questionId: 'ayush_prakriti_q',
        step: 'AYUSH_PRAKRITI',
        selectedOptionIds: ['Vata Predominant (Lean, Light, Quick, Sensitive to cold, Dry skin)'],
        customText: 'Body is prone to cracking joints and skin dryness.',
        rawPatientResponse: 'Body is prone to cracking joints and skin dryness.',
        audioProvenance: 'TOUCH_CHIP',
        timestamp: new Date().toISOString()
      },
      {
        questionId: 'ayush_agni_q',
        step: 'AYUSH_AGNI',
        selectedOptionIds: ['Vishamagni (Irregular: sometimes intense hunger, sometimes no appetite)'],
        customText: 'Bloating observed after evening meal.',
        rawPatientResponse: 'Bloating observed after evening meal.',
        audioProvenance: 'TYPED',
        timestamp: new Date().toISOString()
      },
      {
        questionId: 'ayush_koshtha_q',
        step: 'AYUSH_KOSHTHA',
        selectedOptionIds: ['Krura Koshtha (Hard stools, prone to chronic constipation)'],
        customText: 'Needs warm water every morning.',
        rawPatientResponse: 'Needs warm water every morning.',
        audioProvenance: 'TOUCH_CHIP',
        timestamp: new Date().toISOString()
      },
      {
        questionId: 'ayush_vyayama_q',
        step: 'AYUSH_VYAYAMA_SHAKTI',
        selectedOptionIds: ['Moderate Endurance (Standard daily activities, mild fatigue with heavy work)'],
        customText: 'Can walk 20 minutes before joints start aching.',
        rawPatientResponse: 'Can walk 20 minutes before joints start aching.',
        audioProvenance: 'TOUCH_CHIP',
        timestamp: new Date().toISOString()
      }
    ]
  },
  {
    caseId: 'case-seed-002',
    patientId: 'pat-seed-002',
    mode: 'GENERAL_CLINICAL',
    status: 'COMPLETED',
    chiefComplaint: 'Burning epigastric pain, acid reflux and occasional nausea after spicy meals',
    language: 'en',
    startedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    redFlagsDetected: [],
    answers: [
      {
        questionId: 'socrates_chief_complaint',
        step: 'CHIEF_COMPLAINT',
        selectedOptionIds: ['Acidity, Gas & Stomach Discomfort'],
        customText: 'Severe retrosternal burning sensation since 10 days.',
        rawPatientResponse: 'Severe retrosternal burning sensation since 10 days.',
        audioProvenance: 'VOICE',
        timestamp: new Date().toISOString()
      },
      {
        questionId: 'socrates_site_general',
        step: 'SOCRATES_SITE',
        selectedOptionIds: ['Stomach / Abdomen'],
        customText: 'Mid epigastrium radiating upward.',
        rawPatientResponse: 'Mid epigastrium radiating upward.',
        audioProvenance: 'TOUCH_CHIP',
        timestamp: new Date().toISOString()
      },
      {
        questionId: 'socrates_character_general',
        step: 'SOCRATES_CHARACTER',
        selectedOptionIds: ['Burning sensation / Acidity'],
        customText: 'Feels like acid coming up into throat.',
        rawPatientResponse: 'Feels like acid coming up into throat.',
        audioProvenance: 'TOUCH_CHIP',
        timestamp: new Date().toISOString()
      },
      {
        questionId: 'socrates_severity_general',
        step: 'SOCRATES_SEVERITY',
        selectedOptionIds: ['4 - 6 (Moderate, limits some activities)'],
        customText: 'Disturbs sleep when lying flat.',
        rawPatientResponse: 'Disturbs sleep when lying flat.',
        audioProvenance: 'TYPED',
        timestamp: new Date().toISOString()
      }
    ]
  }
];

class LocalDatabaseStore {
  private isBrowser = typeof window !== 'undefined';
  private memoryPatients: PatientIdentity[] = [...SEED_PATIENTS];
  private memoryCases: PatientCaseRecord[] = [...SEED_CASES];
  private memorySummaries: DoctorSummaryDraft[] = [];
  private memoryDocuments: ExtractedDocumentData[] = [];
  private memoryConsents: ConsentRecord[] = [];
  private currentPatientId: string = 'pat-seed-001';
  private currentCaseId: string = 'case-seed-001';

  constructor() {
    this.initSeeds();
  }

  private initSeeds() {
    // Seed initial pre-parsed documents
    this.memoryDocuments = SAMPLE_DOCUMENTS.map(s => {
      const parsed = processDocumentText(s.rawText, s.name, 'sample', s.type);
      parsed.patientId = 'pat-seed-001';
      parsed.caseId = 'case-seed-001';
      return parsed;
    });

    // Seed summaries
    this.memorySummaries = this.memoryCases.map(c => {
      const pat = this.memoryPatients.find(p => p.id === c.patientId) || this.memoryPatients[0];
      const docs = this.getDocuments(pat.id, c.caseId);
      return generateDoctorSummaryDraft(pat, c, docs);
    });

    if (!this.isBrowser) return;

    if (!localStorage.getItem(STORAGE_KEYS.PATIENTS)) {
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(this.memoryPatients));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CASES)) {
      localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(this.memoryCases));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DOCUMENTS)) {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this.memoryDocuments));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUMMARIES)) {
      localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify(this.memorySummaries));
    }
  }

  public getPatients(): PatientIdentity[] {
    if (!this.isBrowser) return this.memoryPatients;
    const raw = localStorage.getItem(STORAGE_KEYS.PATIENTS);
    return raw ? JSON.parse(raw) : this.memoryPatients;
  }

  public savePatient(patient: PatientIdentity): void {
    this.memoryPatients = this.memoryPatients.filter(p => p.id !== patient.id);
    this.memoryPatients.unshift(patient);
    this.currentPatientId = patient.id;
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(this.memoryPatients));
      localStorage.setItem(STORAGE_KEYS.CURRENT_PATIENT_ID, patient.id);
    }
  }

  public getCurrentPatient(): PatientIdentity | null {
    if (!this.isBrowser) return this.memoryPatients.find(p => p.id === this.currentPatientId) || this.memoryPatients[0] || null;
    const id = localStorage.getItem(STORAGE_KEYS.CURRENT_PATIENT_ID);
    if (!id) return this.getPatients()[0] || null;
    return this.getPatients().find(p => p.id === id) || null;
  }

  public saveConsent(consent: ConsentRecord): void {
    this.memoryConsents = this.memoryConsents.filter(c => c.patientId !== consent.patientId);
    this.memoryConsents.unshift(consent);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEYS.CONSENTS, JSON.stringify(this.memoryConsents));
    }
  }

  public getConsent(patientId: string): ConsentRecord | null {
    if (!this.isBrowser) return this.memoryConsents.find(c => c.patientId === patientId) || null;
    const raw = localStorage.getItem(STORAGE_KEYS.CONSENTS);
    if (!raw) return null;
    const list: ConsentRecord[] = JSON.parse(raw);
    return list.find(c => c.patientId === patientId) || null;
  }

  public getCases(): PatientCaseRecord[] {
    if (!this.isBrowser) return this.memoryCases;
    const raw = localStorage.getItem(STORAGE_KEYS.CASES);
    return raw ? JSON.parse(raw) : this.memoryCases;
  }

  public getCaseById(caseId: string): PatientCaseRecord | null {
    return this.getCases().find(c => c.caseId === caseId) || null;
  }

  public saveCase(caseRecord: PatientCaseRecord): void {
    this.memoryCases = this.memoryCases.filter(c => c.caseId !== caseRecord.caseId);
    this.memoryCases.unshift(caseRecord);
    this.currentCaseId = caseRecord.caseId;

    // Auto synthesize summary draft bound to case documents only if summary does not exist
    const existingSummary = this.getSummaryByCaseId(caseRecord.caseId);
    if (!existingSummary) {
      const pat = this.getPatients().find(p => p.id === caseRecord.patientId) || this.getCurrentPatient();
      if (pat) {
        const docs = this.getDocuments(pat.id, caseRecord.caseId);
        const summary = generateDoctorSummaryDraft(pat, caseRecord, docs);
        this.saveSummary(summary);
      }
    }

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(this.memoryCases));
      localStorage.setItem(STORAGE_KEYS.CURRENT_CASE_ID, caseRecord.caseId);
    }
  }

  public getSummaries(): DoctorSummaryDraft[] {
    if (!this.isBrowser) return this.memorySummaries;
    const raw = localStorage.getItem(STORAGE_KEYS.SUMMARIES);
    return raw ? JSON.parse(raw) : this.memorySummaries;
  }

  public getSummaryByCaseId(caseId: string): DoctorSummaryDraft | null {
    return this.getSummaries().find(s => s.caseId === caseId) || null;
  }

  public saveSummary(summary: DoctorSummaryDraft): void {
    this.memorySummaries = this.memorySummaries.filter(s => s.caseId !== summary.caseId);
    this.memorySummaries.unshift(summary);
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify(this.memorySummaries));
    }
  }

  public getDocuments(patientId?: string, caseId?: string): ExtractedDocumentData[] {
    const list = this.isBrowser && localStorage.getItem(STORAGE_KEYS.DOCUMENTS)
      ? JSON.parse(localStorage.getItem(STORAGE_KEYS.DOCUMENTS)!)
      : this.memoryDocuments;

    if (caseId) {
      const filtered = list.filter((d: ExtractedDocumentData) => d.caseId === caseId);
      if (filtered.length > 0) return filtered;
    }
    if (patientId) {
      const filtered = list.filter((d: ExtractedDocumentData) => d.patientId === patientId);
      if (filtered.length > 0) return filtered;
    }
    return list;
  }

  public saveDocument(doc: ExtractedDocumentData): void {
    this.memoryDocuments = this.memoryDocuments.filter(d => d.documentId !== doc.documentId);
    this.memoryDocuments.unshift(doc);

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this.memoryDocuments));
    }

    // Re-synthesize summary if attached to a case
    if (doc.caseId) {
      const c = this.getCaseById(doc.caseId);
      const pat = doc.patientId ? this.getPatients().find(p => p.id === doc.patientId) : this.getCurrentPatient();
      if (c && pat) {
        const docs = this.getDocuments(pat.id, c.caseId);
        const updatedSummary = generateDoctorSummaryDraft(pat, c, docs);
        this.saveSummary(updatedSummary);
      }
    }
  }

  /**
   * Versioned Physician Review & Audit Trail Logger
   */
  public updateDoctorReview(
    caseId: string, 
    doctorName: string, 
    status: 'ACCEPTED' | 'MODIFIED' | 'REJECTED', 
    notes: string,
    actionDetail?: string
  ): void {
    const summary = this.getSummaryByCaseId(caseId);
    const now = new Date().toISOString();

    if (summary) {
      const nextVersionNum = (summary.currentVersionNumber || 1) + 1;
      
      const newVersion: SummaryVersion = {
        versionNumber: nextVersionNum,
        createdAt: now,
        authoredBy: 'PHYSICIAN',
        status: status,
        physicianNotes: notes,
        doctorName: doctorName
      };

      const auditEntry: SummaryAuditEntry = {
        timestamp: now,
        action: status === 'ACCEPTED' ? 'ACCEPTED' : status === 'MODIFIED' ? 'EDITED' : 'REJECTED',
        doctorName: doctorName,
        details: actionDetail || `Physician ${doctorName} marked case as ${status}. Version ${nextVersionNum} created.`
      };

      summary.currentVersionNumber = nextVersionNum;
      summary.versions = [...(summary.versions || []), newVersion];
      summary.auditTrail = [...(summary.auditTrail || []), auditEntry];
      summary.doctorEdits = {
        physicianNotes: notes,
        status: status,
        verifiedByDoctorName: doctorName
      };

      this.saveSummary(summary);
    }

    const c = this.getCaseById(caseId);
    if (c) {
      c.status = 'REVIEWED_BY_DOCTOR';
      c.doctorReview = {
        reviewedAt: now,
        doctorName,
        status,
        doctorNotes: notes
      };
      this.saveCase(c);
    }
  }

  public logAuditAction(caseId: string, action: 'OPENED' | 'EDITED' | 'ACCEPTED' | 'REJECTED', doctorName?: string, details?: string): void {
    const summary = this.getSummaryByCaseId(caseId);
    if (summary) {
      const auditEntry: SummaryAuditEntry = {
        timestamp: new Date().toISOString(),
        action,
        doctorName,
        details
      };
      summary.auditTrail = [...(summary.auditTrail || []), auditEntry];
      this.saveSummary(summary);
    }
  }
}

export const localStore = new LocalDatabaseStore();
