import React from 'react';
import { ExtractedDocumentData } from '../models/document';
import { FileText, X, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface OriginalDocumentModalProps {
  document: ExtractedDocumentData | null;
  onClose: () => void;
}

export const OriginalDocumentModal: React.FC<OriginalDocumentModalProps> = ({
  document,
  onClose
}) => {
  if (!document) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {document.fileName}
              </h3>
              <p className="text-xs text-slate-500">
                Classification: <strong className="uppercase">{document.classification}</strong> • Uploaded: {new Date(document.uploadedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Document Preview & Raw OCR Text Layer */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Source Text Layer & OCR Transcription for Clinician Auditing
            </span>
            <span className="font-mono text-[11px] font-bold text-slate-500">
              Confidence: {Math.round(document.classificationConfidence * 100)}%
            </span>
          </div>

          {/* Raw Text Container formatted as source paper */}
          <div className="p-5 sm:p-6 bg-slate-900 text-emerald-300 font-mono text-xs rounded-2xl shadow-inner whitespace-pre-wrap leading-relaxed overflow-x-auto border border-slate-800">
            {document.rawText}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Clinicians can verify raw source text directly against extracted entities.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
