import React, { useState } from 'react';
import { ExtractedDocumentData } from '../models/document';
import { FileText, X, Download, ShieldCheck, CheckCircle2, Eye, Code } from 'lucide-react';

interface OriginalDocumentModalProps {
  document: ExtractedDocumentData | null;
  onClose: () => void;
}

export const OriginalDocumentModal: React.FC<OriginalDocumentModalProps> = ({
  document,
  onClose
}) => {
  if (!document) return null;

  const [activeTab, setActiveTab] = useState<'visual' | 'ocr'>(
    document.originalFileUrl || document.previewUrl ? 'visual' : 'ocr'
  );

  const fileUrl = document.originalFileUrl || document.previewUrl;
  const isPdf = document.fileName.toLowerCase().endsWith('.pdf') || (fileUrl && fileUrl.startsWith('data:application/pdf'));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in zoom-in-95 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {document.fileName}
              </h3>
              <p className="text-xs text-slate-500">
                Classification: <strong className="uppercase">{document.classification.replace('_', ' ')}</strong> • Uploaded: {new Date(document.uploadedAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {fileUrl && (
              <a
                href={fileUrl}
                download={document.fileName}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                title="Download original file"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher if visual file is available */}
        {fileUrl && (
          <div className="px-6 pt-3 border-b border-slate-200 flex items-center gap-3 bg-slate-50/70">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`pb-2.5 px-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'visual'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Original Document</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ocr')}
              className={`pb-2.5 px-2 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                activeTab === 'ocr'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>OCR Source Text Layer</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'visual' && fileUrl ? (
            <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 flex items-center justify-center p-2 min-h-[400px]">
              {isPdf ? (
                <iframe
                  src={fileUrl}
                  title="PDF Preview"
                  className="w-full h-[60vh] rounded-xl border-0"
                />
              ) : (
                <img
                  src={fileUrl}
                  alt={document.fileName}
                  className="max-h-[60vh] max-w-full rounded-xl object-contain shadow-sm"
                />
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Source Text Layer &amp; OCR Transcription for Clinician Auditing
                </span>
                <span className="font-mono text-[11px] font-bold text-slate-500">
                  Confidence: {Math.round(document.classificationConfidence * 100)}%
                </span>
              </div>

              {/* Raw Text Container */}
              <div className="p-5 sm:p-6 bg-slate-900 text-emerald-300 font-mono text-xs rounded-2xl shadow-inner whitespace-pre-wrap leading-relaxed overflow-x-auto border border-slate-800 max-h-[50vh]">
                {document.rawText || 'No raw OCR text captured.'}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Source document is preserved unchanged for medico-legal verification.
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

