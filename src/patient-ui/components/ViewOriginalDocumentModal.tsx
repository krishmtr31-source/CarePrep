import React from 'react';
import { X, FileText, Download } from 'lucide-react';

interface ViewOriginalDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileDataUrl: string | null;
  fileName: string;
}

export const ViewOriginalDocumentModal: React.FC<ViewOriginalDocumentModalProps> = ({
  isOpen,
  onClose,
  fileDataUrl,
  fileName
}) => {
  if (!isOpen || !fileDataUrl) return null;

  const isPdf = fileName.toLowerCase().endsWith('.pdf') || fileDataUrl.startsWith('data:application/pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-[88vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate max-w-md">
                {fileName}
              </h3>
              <p className="text-xs text-slate-500">
                Original Uploaded Medical Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={fileDataUrl}
              download={fileName}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors"
              title="Download original file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Viewer Body */}
        <div className="flex-1 bg-slate-100/70 p-4 overflow-auto flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={fileDataUrl}
              title={fileName}
              className="w-full h-full rounded-xl border border-slate-300 bg-white shadow-xs"
            />
          ) : (
            <div className="max-w-full max-h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={fileDataUrl}
                alt={fileName}
                className="max-w-full max-h-full object-contain rounded-xl shadow-md border border-slate-200 bg-white"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
