import React, { useState } from 'react';
import { ExtractedDocumentData, SourceEvidence } from '../models/document';
import { 
  Pill, 
  Activity, 
  FileText, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  Eye, 
  HelpCircle, 
  Leaf,
  Info,
  AlertTriangle
} from 'lucide-react';

interface ExtractedEntitiesViewProps {
  document: ExtractedDocumentData;
  onViewOriginal?: (doc: ExtractedDocumentData) => void;
}

export const ExtractedEntitiesView: React.FC<ExtractedEntitiesViewProps> = ({
  document,
  onViewOriginal
}) => {
  const [activeSnippetEvidence, setActiveSnippetEvidence] = useState<SourceEvidence | null>(null);

  const {
    fileName,
    classification,
    classificationConfidence,
    detectedDate,
    medications,
    labResults,
    diagnoses,
    unreliableFields
  } = document;

  const hasAnyEntities = (diagnoses && diagnoses.length > 0) || 
                         (medications && medications.length > 0) || 
                         (labResults && labResults.length > 0);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
      {/* Document Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
              classification === 'PRESCRIPTION' ? 'bg-emerald-100 text-emerald-800' :
              classification === 'LAB_REPORT' ? 'bg-amber-100 text-amber-800' :
              classification === 'DISCHARGE_SUMMARY' ? 'bg-indigo-100 text-indigo-800' :
              'bg-slate-100 text-slate-700'
            }`}>
              {classification.replace('_', ' ')}
            </span>
            <span className="text-[11px] font-semibold text-slate-500">
              Confidence: {Math.round(classificationConfidence * 100)}%
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            {fileName}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Detected Date: <strong>{detectedDate || 'Not detected'}</strong> • Pages: {document.pagesCount}
          </p>
        </div>

        {onViewOriginal && (
          <button
            type="button"
            onClick={() => onViewOriginal(document)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>View Source Document</span>
          </button>
        )}
      </div>

      {/* Unreliable or Missing Data Notice if any */}
      {unreliableFields && unreliableFields.length > 0 && (
        <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>⚠ Requires Physical Clinical Verification:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-800 pl-2">
            {unreliableFields.map((f, idx) => (
              <li key={idx}><strong>{f}</strong></li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty / Degraded scan notice */}
      {!hasAnyEntities && (
        <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
          <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">
            Unable to reliably extract structured medical fields
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            The document quality may be degraded or contain handwritten/unstandardized text. The raw document remains preserved for clinician review.
          </p>
        </div>
      )}

      {/* 1. Extracted Diagnoses */}
      {diagnoses && diagnoses.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Extracted Clinical Diagnoses ({diagnoses.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {diagnoses.map((diag) => (
              <div
                key={diag.id}
                onClick={() => setActiveSnippetEvidence(diag.evidence)}
                className="p-3 bg-indigo-50/40 hover:bg-indigo-50 border border-indigo-100 rounded-2xl cursor-pointer transition-colors"
                title="Click to view original text snippet"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{diag.conditionName}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                    {diag.evidence.extractionMethod || 'Extracted'} ({Math.round(diag.evidence.confidenceScore * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Extracted Medications */}
      {medications && medications.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Pill className="w-3.5 h-3.5 text-emerald-600" />
            Extracted Medications & Formulations ({medications.length})
          </h4>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Medication Name</th>
                  <th className="p-3">Dosage</th>
                  <th className="p-3">Frequency</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3 text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medications.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                      {med.isAyushMedicine && (
                        <span title="AYUSH Formulation">
                          <Leaf className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        </span>
                      )}
                      <span>{med.name}</span>
                      {med.evidence.requiresVerification && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded border border-amber-200">
                          Verify
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md ${
                        med.dosage.includes('Not found') 
                          ? 'bg-amber-100 text-amber-800 font-medium' 
                          : 'bg-slate-100 text-slate-800 font-semibold'
                      }`}>
                        {med.dosage}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md ${
                        med.frequency.includes('Not found') 
                          ? 'bg-amber-100 text-amber-800 font-medium' 
                          : 'bg-slate-100 text-slate-800 font-semibold'
                      }`}>
                        {med.frequency}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md ${
                        med.duration.includes('Not found') 
                          ? 'bg-amber-100 text-amber-800 font-medium' 
                          : 'bg-slate-100 text-slate-800 font-semibold'
                      }`}>
                        {med.duration}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveSnippetEvidence(med.evidence)}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline"
                      >
                        Snippet ({Math.round(med.evidence.confidenceScore * 100)}%)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Extracted Laboratory Results */}
      {labResults && labResults.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            Extracted Laboratory Investigations ({labResults.length})
          </h4>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Investigation</th>
                  <th className="p-3">Result Value</th>
                  <th className="p-3">Source Ref Range</th>
                  <th className="p-3">Status Flag</th>
                  <th className="p-3 text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {labResults.map((lab) => (
                  <tr
                    key={lab.id}
                    className={`transition-colors ${
                      lab.isAbnormal ? 'bg-rose-50/40 hover:bg-rose-50' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="p-3 font-bold text-slate-900">{lab.testName}</td>
                    <td className="p-3 font-mono font-bold text-slate-800">
                      {lab.resultValue} {lab.unit}
                    </td>
                    <td className="p-3 text-slate-600">
                      {lab.sourceReferenceRange.raw} {lab.unit}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                        lab.flag === 'HIGH' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                        lab.flag === 'LOW' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        lab.flag === 'NORMAL' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {lab.flag}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setActiveSnippetEvidence(lab.evidence)}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline"
                      >
                        Snippet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Snippet Evidence Modal Popup */}
      {activeSnippetEvidence && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-600" />
                Source Evidence & OCR Traceability
              </h5>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                {activeSnippetEvidence.extractionMethod || 'PDF_TEXT'} • Page {activeSnippetEvidence.pageNumber}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 mb-4 whitespace-pre-wrap">
              "{activeSnippetEvidence.snippet}"
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
              <span>Source: <strong>{activeSnippetEvidence.documentName}</strong></span>
              <span>Confidence: <strong>{Math.round(activeSnippetEvidence.confidenceScore * 100)}%</strong></span>
            </div>

            <button
              type="button"
              onClick={() => setActiveSnippetEvidence(null)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Close Evidence View
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
