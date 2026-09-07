import React, { useState } from 'react';
import {
  X,
  Database,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Stethoscope,
  Building2,
  Copy,
  Check,
  Download,
  Eye,
  Sparkles,
  ShieldCheck,
  Pill,
  Activity,
  Code2
} from 'lucide-react';
import { MedicalDocumentRecord } from '../../shared/api/medicalDocumentApi';

interface StructuredMedicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: MedicalDocumentRecord | null;
  onViewOriginal?: () => void;
}

export const StructuredMedicalReportModal: React.FC<StructuredMedicalReportModalProps> = ({
  isOpen,
  onClose,
  document,
  onViewOriginal
}) => {
  const [activeTab, setActiveTab] = useState<'structured' | 'database_json'>('structured');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !document) return null;

  // Extract structured JSON or construct from fields
  const structuredJson = document.rawJson || {
    documentId: document.documentId,
    patientId: document.patientId,
    documentType: document.documentType,
    documentTitle: document.documentTitle,
    documentDate: document.documentDate,
    patientOverview: {
      name: document.patientName || 'Not detected',
      doctorName: document.doctorName || 'Not detected',
      hospitalName: document.hospitalName || 'Not detected',
      documentDate: document.documentDate || 'Not detected'
    },
    summary: document.summary,
    labResults: document.labResults,
    medications: document.medications,
    diagnoses: document.diagnosesMentioned,
    importantNotes: document.importantNotes,
    extractionWarnings: document.extractionWarnings,
    createdAt: document.createdAt
  };

  const jsonString = JSON.stringify(structuredJson, null, 2);

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document.documentTitle || 'medical-report'}-${document.documentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Check for high-alert/abnormal lab values
  const labResults = document.labResults || [];
  const highAlertLabs = labResults.filter(
    l => l.flag === 'HIGH' || l.flag === 'CRITICAL' || l.flag === 'ABNORMAL'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">
                  {document.documentTitle || document.fileName}
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Retrieved from MongoDB Atlas Database
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Doc ID: <strong className="font-mono text-slate-300">{document.documentId}</strong></span>
                {document.createdAt && (
                  <>
                    <span>•</span>
                    <span>Saved: {new Date(document.createdAt).toLocaleString()}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs & Quick Actions */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('structured')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'structured'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Structured Medical Report</span>
            </button>

            <button
              onClick={() => setActiveTab('database_json')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'database_json'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>MongoDB JSON Record</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'database_json' && (
              <>
                <button
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors shadow-2xs"
                  title="Copy JSON payload"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied JSON!' : 'Copy JSON'}</span>
                </button>
                <button
                  onClick={handleDownloadJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors shadow-2xs"
                  title="Download JSON file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .json</span>
                </button>
              </>
            )}

            {document.fileData && onViewOriginal && (
              <button
                onClick={onViewOriginal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Original File</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'structured' ? (
            <div className="space-y-6">
              {/* Patient & Clinic Metadata Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Patient Name</span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{document.patientName || 'Not detected'}</span>
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Doctor / Prescriber</span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="truncate">{document.doctorName || 'Not detected'}</span>
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Hospital / Facility</span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">{document.hospitalName || 'Not detected'}</span>
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Report Date</span>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{document.documentDate || 'Not detected'}</span>
                  </p>
                </div>
              </div>

              {/* High Alert Banner */}
              {highAlertLabs.length > 0 && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 shadow-xs">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-rose-900 uppercase tracking-wide">
                      Clinical Alert: {highAlertLabs.length} Investigation(s) Exceed Recommended Reference Intervals
                    </h4>
                    <p className="text-xs text-rose-700 mt-0.5">
                      The following parameters in this MongoDB record are elevated or abnormal: {' '}
                      <strong>{highAlertLabs.map(l => `${l.testName} (${l.value} ${l.unit})`).join(', ')}</strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Clinical Summary */}
              {document.summary && (
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Summary &amp; Key Findings</h4>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{document.summary}</p>
                </div>
              )}

              {/* Laboratory Investigations Table */}
              {labResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-sm font-bold text-slate-900">
                        Structured Laboratory Investigations ({labResults.length})
                      </h4>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[10px] font-black border-b border-slate-200">
                        <tr>
                          <th className="p-3">Investigation Name</th>
                          <th className="p-3">Result</th>
                          <th className="p-3">Unit</th>
                          <th className="p-3">Biological Reference Interval</th>
                          <th className="p-3 text-right">Clinical Status Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {labResults.map((lab, idx) => {
                          const isHigh = lab.flag === 'HIGH' || lab.flag === 'CRITICAL';
                          const isLow = lab.flag === 'LOW';

                          return (
                            <tr
                              key={idx}
                              className={`transition-colors ${
                                isHigh
                                  ? 'bg-rose-50/60 hover:bg-rose-100/60 border-l-4 border-l-rose-600'
                                  : isLow
                                  ? 'bg-amber-50/40 hover:bg-amber-50 border-l-4 border-l-amber-500'
                                  : 'hover:bg-slate-50/70'
                              }`}
                            >
                              <td className="p-3 font-bold text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  {isHigh && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                  <span>{lab.testName}</span>
                                </div>
                              </td>
                              <td className={`p-3 font-mono font-bold ${isHigh ? 'text-rose-700 font-black' : 'text-slate-900'}`}>
                                <div className="flex items-center gap-1">
                                  <span>{lab.value}</span>
                                  {isHigh && <span className="text-[10px] text-rose-600 font-black">▲</span>}
                                  {isLow && <span className="text-[10px] text-amber-600 font-black">▼</span>}
                                </div>
                              </td>
                              <td className="p-3 text-slate-600 font-medium">{lab.unit || '—'}</td>
                              <td className="p-3 font-mono text-[11px] text-slate-600">
                                {lab.referenceRange || 'Not specified in report'}
                              </td>
                              <td className="p-3 text-right">
                                {isHigh ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white uppercase tracking-wider">
                                    🚨 HIGH ALERT
                                  </span>
                                ) : isLow ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 uppercase">
                                    LOW
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    NORMAL
                                  </span>
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

              {/* Medications Table */}
              {document.medications && document.medications.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Prescribed Medications ({document.medications.length})
                    </h4>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[10px] font-black border-b border-slate-200">
                        <tr>
                          <th className="p-3">Medicine Name</th>
                          <th className="p-3">Dosage / Strength</th>
                          <th className="p-3">Frequency</th>
                          <th className="p-3">Duration</th>
                          <th className="p-3">Route</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {document.medications.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-900">{m.name}</td>
                            <td className="p-3 text-slate-700">{m.dosage || '—'}</td>
                            <td className="p-3 text-slate-700">{m.frequency || '—'}</td>
                            <td className="p-3 text-slate-700">{m.duration || '—'}</td>
                            <td className="p-3 text-slate-700">{m.route || 'Oral'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Diagnoses & Notes */}
              {(document.diagnosesMentioned?.length || document.importantNotes?.length) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {document.diagnosesMentioned && document.diagnosesMentioned.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Diagnoses &amp; Impressions</h4>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                        {document.diagnosesMentioned.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {document.importantNotes && document.importantNotes.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Doctor's Instructions &amp; Advice</h4>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                        {document.importantNotes.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            /* Database JSON Record View */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 text-slate-300 text-xs font-mono">
                <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>MongoDB Document: <strong>careprep.medicaldocuments</strong></span>
                </span>
                <span className="text-[11px] text-slate-400">JSON Schema v2.0 • Canonical Model</span>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-900 text-emerald-400 text-xs font-mono overflow-x-auto max-h-[500px] border border-slate-800 leading-relaxed select-all">
                  <code>{jsonString}</code>
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted &amp; HIPAA-Aligned Record Storage</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
