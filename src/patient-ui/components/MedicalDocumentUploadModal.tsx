import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  X, 
  Eye, 
  Trash2, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Lock, 
  File,
  RotateCcw
} from 'lucide-react';
import { medicalDocumentApi, StructuredExtractionResult } from '../../shared/api/medicalDocumentApi';

interface MedicalDocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtractionSuccess: (result: {
    file: File;
    fileDataUrl: string;
    extraction: StructuredExtractionResult;
  }) => void;
  onViewOriginalFile?: (fileDataUrl: string, fileName: string) => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png'];

export const MedicalDocumentUploadModal: React.FC<MedicalDocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onExtractionSuccess,
  onViewOriginalFile
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [uploadTimestamp, setUploadTimestamp] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Processing stages:
  // 0 = Idle
  // 1 = Document uploaded
  // 2 = Document readable
  // 3 = Extracting medical information
  // 4 = Structuring results
  const [processingStage, setProcessingStage] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const validateAndStageFile = (file: File) => {
    setErrorMessage(null);

    const lowerName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTS.some(ext => lowerName.endsWith(ext));
    const hasValidMime = file.type ? ALLOWED_TYPES.includes(file.type.toLowerCase()) : hasValidExt;

    if (!hasValidExt || !hasValidMime) {
      setErrorMessage('Unsupported file type. Please upload a PDF, JPG, or PNG document.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setErrorMessage('File size exceeds 10 MB. Please upload a smaller file.');
      return;
    }

    if (file.size === 0) {
      setErrorMessage('Unable to read this document. The selected file appears to be empty.');
      return;
    }

    // Read Data URL for preview and submission
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedFile(file);
      setFileDataUrl(reader.result as string);
      setUploadTimestamp(new Date());
      setProcessingStage(0);
    };
    reader.onerror = () => {
      setErrorMessage('Unable to read this document. Please verify the file is not damaged.');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndStageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndStageFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setFileDataUrl(null);
    setUploadTimestamp(null);
    setErrorMessage(null);
    setProcessingStage(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProcessWithAI = async () => {
    if (!selectedFile || !fileDataUrl) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Stage 1: Document uploaded
      setProcessingStage(1);
      await new Promise(r => setTimeout(r, 400));

      // Stage 2: Document readable
      setProcessingStage(2);
      await new Promise(r => setTimeout(r, 400));

      // Stage 3: Extracting medical information
      setProcessingStage(3);

      const res = await medicalDocumentApi.analyzeDocument(selectedFile, fileDataUrl);

      if (!res.success || !res.extraction) {
        throw new Error(res.error || 'AI extraction is temporarily unavailable.');
      }

      // Stage 4: Structuring results
      setProcessingStage(4);
      await new Promise(r => setTimeout(r, 300));

      setIsProcessing(false);
      onExtractionSuccess({
        file: selectedFile,
        fileDataUrl,
        extraction: res.extraction
      });
    } catch (err: any) {
      setIsProcessing(false);
      setProcessingStage(0);
      setErrorMessage(err.message || 'AI extraction is temporarily unavailable.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <span>Medical Documents</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Keep your important medical reports organized and available for future consultations.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorMessage}</p>
                {selectedFile && !isProcessing && (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleProcessWithAI}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 underline"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                    {onViewOriginalFile && fileDataUrl && (
                      <button
                        type="button"
                        onClick={() => onViewOriginalFile(fileDataUrl, selectedFile.name)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 underline"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View Original Document</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Upload Drop Zone (Visible when no file selected) */}
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-8 sm:p-10 border-2 border-dashed rounded-2xl text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-emerald-500 bg-emerald-50/60 scale-[0.99]' 
                  : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50/80 bg-slate-50/40'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="w-14 h-14 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                <Upload className="w-7 h-7" />
              </div>

              <h3 className="text-base font-bold text-slate-900 mb-1">
                Upload Medical Report
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mb-4">
                Drag &amp; drop your file here, or click to browse
              </p>

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all shadow-xs"
              >
                Choose File
              </button>

              <p className="text-[11px] text-slate-400 mt-4">
                PDF, JPG or PNG • Maximum 10 MB
              </p>
            </div>
          ) : (
            /* Document Preview Card (After file is chosen, before or during processing) */
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <File className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 break-all">
                      {selectedFile.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="uppercase font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">
                        {selectedFile.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMAGE'}
                      </span>
                      <span>{formatFileSize(selectedFile.size)}</span>
                      {uploadTimestamp && (
                        <span>• {uploadTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>
                </div>

                {!isProcessing && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {onViewOriginalFile && fileDataUrl && (
                      <button
                        type="button"
                        onClick={() => onViewOriginalFile(fileDataUrl, selectedFile.name)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors"
                        title="View Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Processing Progress State (Section 6) */}
              {isProcessing && (
                <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-950">
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                    <span>Analyzing your medical document...</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {/* Stage 1: Document uploaded */}
                    <div className="flex items-center gap-2.5 text-xs">
                      {processingStage >= 1 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-slate-300 inline-block shrink-0" />
                      )}
                      <span className={processingStage >= 1 ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                        Document uploaded
                      </span>
                    </div>

                    {/* Stage 2: Document readable */}
                    <div className="flex items-center gap-2.5 text-xs">
                      {processingStage >= 2 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-slate-300 inline-block shrink-0" />
                      )}
                      <span className={processingStage >= 2 ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                        Document readable
                      </span>
                    </div>

                    {/* Stage 3: Extracting medical information */}
                    <div className="flex items-center gap-2.5 text-xs">
                      {processingStage > 3 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : processingStage === 3 ? (
                        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-slate-300 inline-block shrink-0" />
                      )}
                      <span className={processingStage === 3 ? 'text-emerald-800 font-bold' : processingStage > 3 ? 'text-slate-800 font-semibold' : 'text-slate-400'}>
                        Extracting medical information
                      </span>
                    </div>

                    {/* Stage 4: Structuring results */}
                    <div className="flex items-center gap-2.5 text-xs">
                      {processingStage >= 4 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border-2 border-slate-300 inline-block shrink-0" />
                      )}
                      <span className={processingStage >= 4 ? 'text-emerald-800 font-bold' : 'text-slate-400'}>
                        Structuring results
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button: [ Process with AI ] */}
              {!isProcessing && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs">
                    {onViewOriginalFile && fileDataUrl && (
                      <button
                        type="button"
                        onClick={() => onViewOriginalFile(fileDataUrl, selectedFile.name)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-colors"
                      >
                        View Document
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-rose-600 font-bold hover:bg-rose-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleProcessWithAI}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Process with AI</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Privacy Notice Banner */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-slate-600 text-xs">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>🔒 Your medical documents are securely processed and kept confidential.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
