import React, { useState } from 'react';
import { DoctorSummaryDraft } from '../../data-models/doctorSummary';
import { PatientCaseRecord } from '../../data-models/intake';
import { FhirTransformer } from '../../shared/fhir/fhirTransformer';
import { carePrepApi } from '../../shared/api/apiClient';
import { 
  Printer, 
  Download, 
  X, 
  Plus, 
  Trash2, 
  FileCode, 
  Check, 
  Stethoscope, 
  AlertTriangle, 
  Pill, 
  Activity, 
  Calendar, 
  Clock, 
  User, 
  ShieldCheck, 
  Copy 
} from 'lucide-react';

interface PrescriptionItem {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PrescriptionEmrModalProps {
  summary: DoctorSummaryDraft;
  caseRecord?: PatientCaseRecord;
  onClose: () => void;
}

export const PrescriptionEmrModal: React.FC<PrescriptionEmrModalProps> = ({
  summary,
  caseRecord,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'document' | 'fhir'>('document');
  const [doctorName, setDoctorName] = useState<string>(
    summary.doctorEdits?.verifiedByDoctorName || 'Dr. A. K. Varma, MD, DNB (Internal Medicine)'
  );
  const [regNumber, setRegNumber] = useState<string>('MCI-2018-847291');
  const [provisionalDiagnosis, setProvisionalDiagnosis] = useState<string>(
    summary.provisionalTags?.join(', ') || summary.chiefComplaint?.normalizedText || 'Clinical evaluation in progress'
  );
  const [differentialDiagnosis, setDifferentialDiagnosis] = useState<string>(
    summary.previousDiagnoses?.map(d => d.conditionName).join(', ') || 'Under clinical investigation'
  );
  const [clinicalAdvice, setClinicalAdvice] = useState<string>(
    summary.doctorEdits?.physicianNotes || 'Hydration, rest, and review if symptoms persist or red flags appear.'
  );
  const [followUpDays, setFollowUpDays] = useState<string>('5 Days / SOS');
  const [copiedFhir, setCopiedFhir] = useState<boolean>(false);

  // Initialize prescription list with extracted or default medications
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>(() => {
    if (summary.extractedMedications && summary.extractedMedications.length > 0) {
      return summary.extractedMedications.map((m, idx) => ({
        id: `rx-${idx}`,
        name: m.name,
        dose: m.dosage !== 'Not found / Requires verification' ? m.dosage : 'As prescribed',
        frequency: m.frequency !== 'Not found / Requires verification' ? m.frequency : '1-0-1 (Twice Daily)',
        duration: m.duration !== 'Not found / Requires verification' ? m.duration : '5 Days',
        instructions: 'After meals with water'
      }));
    }

    return [
      {
        id: 'rx-1',
        name: 'Paracetamol',
        dose: '650 mg',
        frequency: '1-0-1 (SOS / Twice Daily)',
        duration: '3 Days',
        instructions: 'After food for fever/pain'
      },
      {
        id: 'rx-2',
        name: 'Pantoprazole',
        dose: '40 mg',
        frequency: '1-0-0 (Once Daily)',
        duration: '5 Days',
        instructions: '30 mins before breakfast'
      }
    ];
  });

  const handleAddRx = () => {
    const newItem: PrescriptionItem = {
      id: `rx-${Date.now()}`,
      name: '',
      dose: '',
      frequency: '1-0-1',
      duration: '5 Days',
      instructions: 'After food'
    };
    setPrescriptions([...prescriptions, newItem]);
  };

  const handleUpdateRx = (id: string, field: keyof PrescriptionItem, val: string) => {
    setPrescriptions(prescriptions.map(p => p.id === id ? { ...p, [field]: val } : p));
  };

  const handleRemoveRx = (id: string) => {
    setPrescriptions(prescriptions.filter(p => p.id !== id));
  };

  const handlePrint = () => {
    // Persist prescription in MongoDB permanent store
    carePrepApi.savePrescription({
      patientId: summary.patientId,
      doctorId: summary.doctorEdits?.verifiedByDoctorName || 'doctor-001',
      consultationId: summary.caseId,
      medicines: prescriptions.map(rx => ({
        name: rx.name,
        dosage: rx.dose,
        frequency: rx.frequency,
        duration: rx.duration,
        instructions: rx.instructions
      })),
      instructions: clinicalAdvice
    }).catch(e => console.warn('[MongoDB] Prescription save warning:', e));

    window.print();
  };

  const fhirBundle = FhirTransformer.transformSummaryToFhirBundle(summary, caseRecord);
  const fhirJsonString = JSON.stringify(fhirBundle, null, 2);

  const handleCopyFhir = () => {
    navigator.clipboard.writeText(fhirJsonString);
    setCopiedFhir(true);
    setTimeout(() => setCopiedFhir(false), 2500);
  };

  const currentDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Modal Container */}
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Header & Actions (Hidden on Print) */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Clinical Record & E-Prescription (EMR Export)</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300">
                  Case #{summary.caseId}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Patient: <strong className="text-slate-200">{summary.patientName}</strong> ({summary.age}y / {summary.gender})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switch */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center text-xs font-semibold text-slate-300">
              <button
                type="button"
                onClick={() => setActiveTab('document')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'document' ? 'bg-emerald-600 text-white font-bold shadow' : 'hover:text-white'
                }`}
              >
                EMR Document
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fhir')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'fhir' ? 'bg-indigo-600 text-white font-bold shadow' : 'hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>FHIR R4 JSON</span>
              </button>
            </div>

            {/* Print button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF</span>
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 print:bg-white print:p-0 print:overflow-visible">
          {activeTab === 'fhir' ? (
            /* FHIR JSON Export View */
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-indigo-900">
                <div>
                  <h4 className="font-bold flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-indigo-600" />
                    <span>ABDM / FHIR R4 Standard Document Bundle</span>
                  </h4>
                  <p className="text-indigo-800 text-[11px] mt-0.5">
                    Architectural transformation layer for Indian National Digital Health Interoperability. Conforms to HL7 FHIR R4 standards.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyFhir}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  {copiedFhir ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFhir ? 'Copied!' : 'Copy JSON'}</span>
                </button>
              </div>

              <div className="bg-slate-900 text-emerald-400 p-4 rounded-2xl font-mono text-xs overflow-x-auto border border-slate-800 shadow-inner max-h-[60vh]">
                <pre>{fhirJsonString}</pre>
              </div>
            </div>
          ) : (
            /* PRINTABLE CLINICAL RECORD & E-PRESCRIPTION SHEET */
            <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-sm border border-slate-200 max-w-3xl mx-auto text-slate-900 print:shadow-none print:border-none print:p-0">
              
              {/* 1. CLINIC / HOSPITAL HEADER */}
              <div className="border-b-2 border-emerald-600 pb-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-base">
                      +
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      CAREPREP CLINICAL HEALTHCARE
                    </h1>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ayushman Bharat Digital Health Certified Pre-Consultation EMR Network
                  </p>
                </div>

                <div className="text-left sm:text-right text-xs text-slate-600">
                  <p className="font-bold text-slate-800">Date: {currentDate}</p>
                  <p className="font-mono text-[11px] text-slate-500">Case ID: #{summary.caseId}</p>
                  <div className="mt-1">
                    <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      summary.redFlagTriage?.hasTriggered
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {summary.redFlagTriage?.hasTriggered ? 'Urgent Triage Required' : 'Routine Intake'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. PATIENT DEMOGRAPHICS BAR */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-6">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Patient Name</span>
                  <strong className="text-sm text-slate-900">{summary.patientName}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Age / Gender</span>
                  <strong className="text-slate-800">{summary.age} Years / {summary.gender}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">ABHA ID (Health ID)</span>
                  <strong className="font-mono text-slate-800">{summary.abhaId || 'Not provided'}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Language / Mode</span>
                  <strong className="text-slate-800 uppercase">{summary.selectedLanguage} ({summary.mode})</strong>
                </div>
              </div>

              {/* 3. CHIEF COMPLAINT & SOCRATES FINDINGS */}
              <div className="mb-5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-emerald-100 pb-1 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. Chief Complaint & History of Presenting Illness (HPI)</span>
                </h3>
                <div className="text-xs space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <p>
                    <strong>Chief Complaint:</strong> {summary.chiefComplaint?.normalizedText || summary.chiefComplaint?.rawPatientVerbatim || 'Not provided'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-slate-700 text-[11px] pt-1 border-t border-slate-200/60">
                    <p>• <strong>Onset / Duration:</strong> {summary.hpiStructured?.onset || summary.hpiStructured?.duration || 'Not provided'}</p>
                    <p>• <strong>Location / Site:</strong> {summary.hpiStructured?.location || 'Not provided'}</p>
                    <p>• <strong>Character / Quality:</strong> {summary.hpiStructured?.character || 'Not provided'}</p>
                    <p>• <strong>Severity (1-10):</strong> {summary.hpiStructured?.severity || 'Not provided'}</p>
                    <p>• <strong>Aggravating Factors:</strong> {summary.hpiStructured?.aggravatingFactors || 'None stated'}</p>
                    <p>• <strong>Relieving Factors:</strong> {summary.hpiStructured?.relievingFactors || 'None stated'}</p>
                    <p className="sm:col-span-2">• <strong>Associated Symptoms:</strong> {summary.hpiStructured?.associatedSymptoms || 'None reported'}</p>
                  </div>
                </div>
              </div>

              {/* 4. CLINICAL SAFETY / RED FLAG ALERTS */}
              {summary.redFlagTriage?.hasTriggered && (
                <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Red-Flag Safety Alert (Immediate Physician Review Required):</span>
                  </div>
                  {summary.redFlagTriage.alerts.map((rf, i) => (
                    <p key={i} className="text-[11px] text-rose-800">
                      • <strong>{rf.ruleTitle}:</strong> {rf.matchedTrigger}
                    </p>
                  ))}
                </div>
              )}

              {/* 5. DOCUMENT INTELLIGENCE & PAST MEDICAL RECORD */}
              {((summary.extractedMedications && summary.extractedMedications.length > 0) ||
                (summary.investigationResults && summary.investigationResults.length > 0) ||
                (summary.previousDiagnoses && summary.previousDiagnoses.length > 0)) && (
                <div className="mb-5 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-emerald-100 pb-1 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-emerald-600" />
                    <span>2. Medical History & Document Intelligence Findings</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Extracted Labs */}
                    {summary.investigationResults && summary.investigationResults.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <strong className="text-[11px] text-slate-700 block">Recent Lab Investigations:</strong>
                        {summary.investigationResults.slice(0, 4).map((lab, i) => (
                          <div key={i} className="text-[11px] text-slate-600 flex justify-between">
                            <span>{lab.testName}:</span>
                            <span className="font-mono font-bold text-slate-900">{lab.resultValue} {lab.unit}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Past Meds */}
                    {summary.extractedMedications && summary.extractedMedications.length > 0 && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <strong className="text-[11px] text-slate-700 block">Past / Active Medications:</strong>
                        {summary.extractedMedications.slice(0, 4).map((med, i) => (
                          <div key={i} className="text-[11px] text-slate-600">
                            • <strong>{med.name}</strong> {med.dosage !== 'Not found / Requires verification' ? `(${med.dosage})` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. AYUSH DASHAVIDHA ASSESSMENT (IF APPLICABLE) */}
              {summary.mode === 'AYUSH' && summary.ayushAssessment && (
                <div className="mb-5 space-y-1.5 bg-emerald-50/50 p-3 rounded-xl border border-emerald-200 text-xs">
                  <h4 className="font-bold text-emerald-900">Ayurvedic Dashavidha Pariksha Intake Summary:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-emerald-950">
                    <p>• <strong>Prakriti:</strong> {summary.ayushAssessment.prakriti || 'Vata-Pitta'}</p>
                    <p>• <strong>Agni (Digestive fire):</strong> {summary.ayushAssessment.agni || 'Vishamagni'}</p>
                    <p>• <strong>Koshtha (Bowel):</strong> {summary.ayushAssessment.koshtha || 'Madhyama'}</p>
                  </div>
                </div>
              )}

              {/* 7. DOCTOR'S CLINICAL ASSESSMENT & DIAGNOSIS */}
              <div className="mb-5 space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 border-b border-emerald-100 pb-1 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3. Physician Assessment & Diagnosis</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Provisional Diagnosis
                    </label>
                    <input
                      type="text"
                      value={provisionalDiagnosis}
                      onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 outline-none focus:border-emerald-500 print:bg-transparent print:border-b print:border-slate-300 print:rounded-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      Differential Diagnosis / Comorbidities
                    </label>
                    <input
                      type="text"
                      value={differentialDiagnosis}
                      onChange={(e) => setDifferentialDiagnosis(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none focus:border-emerald-500 print:bg-transparent print:border-b print:border-slate-300 print:rounded-none"
                    />
                  </div>
                </div>
              </div>

              {/* 8. PRESCRIPTION (Rx) TABLE */}
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <span className="text-lg font-serif font-black text-emerald-700">℞</span>
                    <span>4. Prescribed Medications (Rx)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddRx}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 print:hidden"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Medicine Name</th>
                        <th className="p-2.5">Dose</th>
                        <th className="p-2.5">Frequency</th>
                        <th className="p-2.5">Duration</th>
                        <th className="p-2.5">Instructions</th>
                        <th className="p-2.5 w-8 print:hidden"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {prescriptions.map((rx, idx) => (
                        <tr key={rx.id} className="hover:bg-slate-50/50">
                          <td className="p-2 font-mono text-[11px] text-slate-400">{idx + 1}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={rx.name}
                              placeholder="e.g. Paracetamol"
                              onChange={(e) => handleUpdateRx(rx.id, 'name', e.target.value)}
                              className="w-full bg-transparent font-bold text-slate-900 outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={rx.dose}
                              placeholder="e.g. 500 mg"
                              onChange={(e) => handleUpdateRx(rx.id, 'dose', e.target.value)}
                              className="w-20 bg-transparent text-slate-700 outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={rx.frequency}
                              placeholder="e.g. 1-0-1"
                              onChange={(e) => handleUpdateRx(rx.id, 'frequency', e.target.value)}
                              className="w-24 bg-transparent text-slate-700 outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={rx.duration}
                              placeholder="e.g. 5 days"
                              onChange={(e) => handleUpdateRx(rx.id, 'duration', e.target.value)}
                              className="w-20 bg-transparent text-slate-700 outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={rx.instructions}
                              placeholder="e.g. After food"
                              onChange={(e) => handleUpdateRx(rx.id, 'instructions', e.target.value)}
                              className="w-full bg-transparent text-slate-600 text-[11px] outline-none"
                            />
                          </td>
                          <td className="p-2 print:hidden text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRx(rx.id)}
                              className="text-slate-400 hover:text-rose-600"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 9. ADVICE & FOLLOW-UP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-8">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Physician Advice & Diet Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={clinicalAdvice}
                    onChange={(e) => setClinicalAdvice(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 outline-none focus:border-emerald-500 print:bg-transparent print:border-none print:p-0"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    Follow-Up
                  </label>
                  <input
                    type="text"
                    value={followUpDays}
                    onChange={(e) => setFollowUpDays(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 outline-none focus:border-emerald-500 print:bg-transparent print:border-none print:p-0"
                  />
                </div>
              </div>

              {/* 10. DOCTOR SIGNATURE BLOCK */}
              <div className="pt-6 border-t border-slate-200 flex items-end justify-between text-xs">
                <div>
                  <p className="text-[10px] text-slate-400 max-w-xs leading-tight">
                    *CarePrep EMR is an AI-assisted clinical pre-intake record. Final diagnostic decisions and therapeutic prescriptions are authorized by the examining licensed physician.
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-end pb-1">
                    <span className="font-serif italic text-sm text-slate-700">Dr. A. K. Varma</span>
                  </div>
                  <div className="space-y-0.5">
                    <input
                      type="text"
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      className="font-bold text-slate-900 text-right bg-transparent outline-none w-64 block ml-auto"
                    />
                    <input
                      type="text"
                      value={`Reg No: ${regNumber}`}
                      onChange={(e) => setRegNumber(e.target.value.replace('Reg No: ', ''))}
                      className="text-[11px] text-slate-500 text-right bg-transparent outline-none w-48 block ml-auto"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 print:hidden">
          <span className="text-xs text-slate-500">
            CarePrep SIH26047 • Standard Clinical Prescription & EMR Formatter
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-200 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Print Prescription</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
