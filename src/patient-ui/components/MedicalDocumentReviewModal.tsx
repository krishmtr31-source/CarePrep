import React, { useState } from 'react';
import { 
  FileText, 
  X, 
  Eye, 
  Edit3, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Save, 
  Calendar, 
  User, 
  Building2, 
  Stethoscope, 
  Pill, 
  Activity,
  CheckCircle2,
  SlidersHorizontal,
  Lock
} from 'lucide-react';
import { 
  StructuredExtractionResult, 
  ILabResultEntry, 
  IMedicationEntry,
  medicalDocumentApi 
} from '../../shared/api/medicalDocumentApi';

interface MedicalDocumentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileDataUrl: string;
  initialExtraction: StructuredExtractionResult;
  onSavedSuccess: (savedDoc: any) => void;
  onViewOriginal: () => void;
}

export const MedicalDocumentReviewModal: React.FC<MedicalDocumentReviewModalProps> = ({
  isOpen,
  onClose,
  fileName,
  fileSize,
  mimeType,
  fileDataUrl,
  initialExtraction,
  onSavedSuccess,
  onViewOriginal
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Editable Extraction State
  const [documentTitle, setDocumentTitle] = useState(initialExtraction.documentTitle || fileName);
  const [documentType, setDocumentType] = useState(initialExtraction.documentType || 'OTHER');
  const [documentDate, setDocumentDate] = useState(initialExtraction.documentDate || '');
  const [patientName, setPatientName] = useState(initialExtraction.patientName || '');
  const [doctorName, setDoctorName] = useState(initialExtraction.doctorName || '');
  const [hospitalName, setHospitalName] = useState(initialExtraction.hospitalName || '');
  const [summary, setSummary] = useState(initialExtraction.summary || '');
  
  const [labResults, setLabResults] = useState<ILabResultEntry[]>(
    initialExtraction.labResults ? [...initialExtraction.labResults] : []
  );
  const [medications, setMedications] = useState<IMedicationEntry[]>(
    initialExtraction.medications ? [...initialExtraction.medications] : []
  );
  const [diagnosesMentioned, setDiagnosesMentioned] = useState<string[]>(
    initialExtraction.diagnosesMentioned ? [...initialExtraction.diagnosesMentioned] : []
  );
  const [proceduresMentioned, setProceduresMentioned] = useState<string[]>(
    initialExtraction.proceduresMentioned ? [...initialExtraction.proceduresMentioned] : []
  );
  const [importantNotes, setImportantNotes] = useState<string[]>(
    initialExtraction.importantNotes ? [...initialExtraction.importantNotes] : []
  );
  const [extractionWarnings] = useState<string[]>(
    initialExtraction.extractionWarnings ? [...initialExtraction.extractionWarnings] : []
  );
  const [isInferringRanges, setIsInferringRanges] = useState<boolean>(false);

  if (!isOpen) return null;

  // Lab Results handlers
  const handleLabChange = (index: number, field: keyof ILabResultEntry, value: string) => {
    const updated = [...labResults];
    updated[index] = { ...updated[index], [field]: value };
    setLabResults(updated);
  };

  const handleAddLab = () => {
    setLabResults([
      ...labResults,
      { testName: '', value: '', unit: '', referenceRange: '', flag: 'NORMAL' }
    ]);
  };

  const handleRemoveLab = (index: number) => {
    setLabResults(labResults.filter((_, i) => i !== index));
  };

  const handleInferMissingRanges = async () => {
    const missingTests = labResults.filter(l => !l.referenceRange || l.referenceRange === '—' || l.referenceRange === 'Not specified in report');
    if (missingTests.length === 0) return;
    setIsInferringRanges(true);
    try {
      const res = await fetch('/api/ai/reference-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tests: missingTests.map(l => ({ testName: l.testName, value: l.value, unit: l.unit }))
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.ranges)) {
          const map = new Map<string, any>();
          data.ranges.forEach((r: any) => map.set(r.testName.toLowerCase().trim(), r));
          setLabResults(prev => prev.map(l => {
            // Strictly preserve existing ranges if already present
            if (l.referenceRange && l.referenceRange !== '—' && l.referenceRange !== 'Not specified in report') {
              return l;
            }
            const matched = map.get(l.testName.toLowerCase().trim());
            if (matched) {
              return {
                ...l,
                referenceRange: matched.referenceRange,
                flag: matched.flag || l.flag,
                unit: matched.unit || l.unit
              };
            }
            return l;
          }));
        }
      }
    } catch (err) {
      console.warn('[MedicalDocumentReviewModal] Infer ranges error:', err);
    } finally {
      setIsInferringRanges(false);
    }
  };

  // Medication handlers
  const handleMedChange = (index: number, field: keyof IMedicationEntry, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleAddMed = () => {
    setMedications([
      ...medications,
      { name: '', dosage: '', frequency: '', duration: '', route: 'Oral' }
    ]);
  };

  const handleRemoveMed = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  // Save to Health Records (Explicit confirmation step)
  const handleSaveToHealthRecords = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const payload = {
        fileName,
        fileSize,
        mimeType,
        fileData: fileDataUrl,
        documentType,
        documentTitle,
        documentDate: documentDate || null,
        patientName: patientName || null,
        doctorName: doctorName || null,
        hospitalName: hospitalName || null,
        summary,
        labResults,
        medications,
        diagnosesMentioned,
        proceduresMentioned,
        importantNotes,
        extractionWarnings,
        extractionStatus: 'PROCESSED' as const
      };

      const res = await medicalDocumentApi.saveDocument(payload);
      if (!res.success || !res.document) {
        throw new Error(res.error || 'Unable to save medical document to database.');
      }

      setIsSaving(false);
      onSavedSuccess(res.document);
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      setSaveError(err.message || 'Failed to save document. Please try again.');
    }
  };

  const getFlagBadge = (flag?: string) => {
    const upper = (flag || 'NORMAL').toUpperCase();
    if (upper === 'HIGH' || upper === 'ABNORMAL') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
          {upper}
        </span>
      );
    }
    if (upper === 'LOW') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900">
          LOW
        </span>
      );
    }
    if (upper === 'UNCLEAR') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 flex items-center gap-1">
          <AlertTriangle className="w-2.5 h-2.5" />
          <span>Needs Review</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
        NORMAL
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Review Extracted Information
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-10">
              AI-assisted extraction. Please verify information against the original document before saving to your records.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onViewOriginal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
              title="Compare with original document"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View Original</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                isEditing
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Done Editing' : 'Edit Information'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Error Banner */}
          {saveError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Uncertainty / Warnings Banner */}
          {extractionWarnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>⚠ Items Needing Review</span>
              </div>
              <ul className="list-disc pl-5 text-[11px] text-amber-800 space-y-0.5">
                {extractionWarnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata Card: Title, Date, Patient, Doctor, Hospital */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Document Title
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={e => setDocumentTitle(e.target.value)}
                    className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-emerald-500"
                  />
                ) : (
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    📄 {documentTitle}
                  </span>
                )}
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Document Type
                </label>
                {isEditing ? (
                  <select
                    value={documentType}
                    onChange={e => setDocumentType(e.target.value as any)}
                    className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white focus:outline-emerald-500"
                  >
                    <option value="LAB_REPORT">LAB_REPORT</option>
                    <option value="PRESCRIPTION">PRESCRIPTION</option>
                    <option value="DISCHARGE_SUMMARY">DISCHARGE_SUMMARY</option>
                    <option value="CONSULTATION_NOTE">CONSULTATION_NOTE</option>
                    <option value="RADIOLOGY_REPORT">RADIOLOGY_REPORT</option>
                    <option value="ECG_REPORT">ECG_REPORT</option>
                    <option value="MEDICAL_CERTIFICATE">MEDICAL_CERTIFICATE</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                ) : (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {documentType.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-500">Date:</span>
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={documentDate}
                    onChange={e => setDocumentDate(e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-slate-300 bg-white flex-1"
                  />
                ) : (
                  <span className="font-bold text-slate-800">{documentDate || 'Not specified'}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-500">Patient:</span>
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="Patient Name"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-slate-300 bg-white flex-1"
                  />
                ) : (
                  <span className="font-bold text-slate-800">{patientName || 'Not specified'}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Stethoscope className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-500">Doctor:</span>
                {isEditing ? (
                  <input
                    type="text"
                    placeholder="Doctor Name"
                    value={doctorName}
                    onChange={e => setDoctorName(e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-slate-300 bg-white flex-1"
                  />
                ) : (
                  <span className="font-bold text-slate-800">{doctorName || 'Not specified'}</span>
                )}
              </div>
            </div>

            {hospitalName && (
              <div className="flex items-center gap-2 text-xs text-slate-600 pt-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-500">Facility:</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={hospitalName}
                    onChange={e => setHospitalName(e.target.value)}
                    className="text-xs px-2 py-1 rounded border border-slate-300 bg-white flex-1"
                  />
                ) : (
                  <span className="font-bold text-slate-800">{hospitalName}</span>
                )}
              </div>
            )}
          </div>

          {/* Neutral Summary */}
          {summary && (
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Document Summary
              </h4>
              {isEditing ? (
                <textarea
                  rows={2}
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-emerald-500"
                />
              ) : (
                <p className="text-xs text-slate-600 bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  {summary}
                </p>
              )}
            </div>
          )}

          {/* Section: Laboratory Results */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Laboratory Results ({labResults.length})
                </h4>
              </div>
              {isEditing && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleInferMissingRanges}
                    disabled={isInferringRanges}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors disabled:opacity-60 shadow-2xs"
                    title="Auto-fill standard recommended reference ranges for missing or unclear test values"
                  >
                    <SlidersHorizontal className={`w-3 h-3 ${isInferringRanges ? 'animate-spin' : 'text-slate-600'}`} />
                    <span>{isInferringRanges ? 'Detecting ranges...' : 'Auto-Detect Ranges'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddLab}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Result</span>
                  </button>
                </div>
              )}
            </div>

            {labResults.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2.5">Investigation / Test</th>
                      <th className="px-3.5 py-2.5">Result</th>
                      <th className="px-3.5 py-2.5">Unit</th>
                      <th className="px-3.5 py-2.5">Reference Range</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      {isEditing && <th className="px-3.5 py-2.5 w-10"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {labResults.map((lr, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3.5 py-2.5 font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={lr.testName}
                              onChange={e => handleLabChange(idx, 'testName', e.target.value)}
                              className="w-full text-xs px-2 py-1 rounded border border-slate-300"
                              placeholder="Test name"
                            />
                          ) : (
                            lr.testName
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold text-slate-800">
                          {isEditing ? (
                            <input
                              type="text"
                              value={lr.value}
                              onChange={e => handleLabChange(idx, 'value', e.target.value)}
                              className="w-20 text-xs px-2 py-1 rounded border border-slate-300"
                              placeholder="Value"
                            />
                          ) : (
                            lr.value
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-600">
                          {isEditing ? (
                            <input
                              type="text"
                              value={lr.unit}
                              onChange={e => handleLabChange(idx, 'unit', e.target.value)}
                              className="w-16 text-xs px-2 py-1 rounded border border-slate-300"
                              placeholder="Unit"
                            />
                          ) : (
                            lr.unit || '—'
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500">
                          {isEditing ? (
                            <input
                              type="text"
                              value={lr.referenceRange || ''}
                              onChange={e => handleLabChange(idx, 'referenceRange', e.target.value)}
                              className="w-24 text-xs px-2 py-1 rounded border border-slate-300"
                              placeholder="Ref Range"
                            />
                          ) : (
                            lr.referenceRange || '—'
                          )}
                        </td>
                        <td className="px-3.5 py-2.5">
                          {isEditing ? (
                            <select
                              value={lr.flag || 'NORMAL'}
                              onChange={e => handleLabChange(idx, 'flag', e.target.value)}
                              className="text-xs px-2 py-1 rounded border border-slate-300"
                            >
                              <option value="NORMAL">NORMAL</option>
                              <option value="HIGH">HIGH</option>
                              <option value="LOW">LOW</option>
                              <option value="ABNORMAL">ABNORMAL</option>
                              <option value="UNCLEAR">UNCLEAR</option>
                            </select>
                          ) : (
                            getFlagBadge(lr.flag)
                          )}
                        </td>
                        {isEditing && (
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveLab(idx)}
                              className="text-rose-500 hover:text-rose-700"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-50/50">
                No explicit laboratory results documented.
              </p>
            )}
          </div>

          {/* Section: Medications */}
          {medications.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Prescribed Medications ({medications.length})
                  </h4>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAddMed}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Medication</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {medications.map((med, idx) => (
                  <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1.5 relative">
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMed(idx)}
                        className="absolute top-2 right-2 text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <div className="font-bold text-slate-900 text-xs">
                      {isEditing ? (
                        <input
                          type="text"
                          value={med.name}
                          onChange={e => handleMedChange(idx, 'name', e.target.value)}
                          placeholder="Medicine name"
                          className="w-full text-xs px-2 py-1 rounded border border-slate-300"
                        />
                      ) : (
                        med.name
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-1">
                      <div>
                        <span className="font-semibold text-slate-500">Dosage: </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.dosage || ''}
                            onChange={e => handleMedChange(idx, 'dosage', e.target.value)}
                            placeholder="500 mg"
                            className="text-xs px-1.5 py-0.5 rounded border border-slate-300 ml-1"
                          />
                        ) : (
                          <span>{med.dosage || 'Not stated'}</span>
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500">Frequency: </span>
                        {isEditing ? (
                          <input
                            type="text"
                            value={med.frequency || ''}
                            onChange={e => handleMedChange(idx, 'frequency', e.target.value)}
                            placeholder="Twice daily"
                            className="text-xs px-1.5 py-0.5 rounded border border-slate-300 ml-1"
                          />
                        ) : (
                          <span>{med.frequency || 'Not stated'}</span>
                        )}
                      </div>
                      {med.duration && (
                        <div>
                          <span className="font-semibold text-slate-500">Duration: </span>
                          <span>{med.duration}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diagnoses Mentioned */}
          {diagnosesMentioned.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Diagnoses or Indications Documented
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {diagnosesMentioned.map((d, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Procedures Mentioned */}
          {proceduresMentioned.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Procedures Documented
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {proceduresMentioned.map((p, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Important Notes */}
          {importantNotes.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Physician Advice &amp; Notes
              </h4>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                {importantNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Privacy & Extraction Disclaimers (Section 23) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Your medical document is processed to extract information for your CarePrep health record.</span>
            </div>
            <p>
              AI-assisted extraction may contain errors. Please verify extracted information against the original document before saving.
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onViewOriginal}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors shadow-2xs"
            >
              View Original
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors shadow-2xs"
            >
              {isEditing ? 'Done Editing' : 'Edit Information'}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveToHealthRecords}
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save to Health Records</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
