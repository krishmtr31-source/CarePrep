import React, { useState, useRef } from 'react';
import { ExtractedDocumentData } from '../models/document';
import { SAMPLE_DOCUMENTS, SampleDocMeta } from '../samples/sampleDocuments';
import { extractTextFromFile } from '../ocr/textExtractor';
import { processDocumentText } from '../parsers/documentPipeline';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  FileImage, 
  Layers,
  ArrowRight,
  RefreshCw,
  Eye
} from 'lucide-react';

interface DocumentUploaderProps {
  onDocumentProcessed: (doc: ExtractedDocumentData) => void;
  patientId?: string;
  caseId?: string;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  onDocumentProcessed,
  patientId,
  caseId
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lastUploadedDoc, setLastUploadedDoc] = useState<ExtractedDocumentData | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage('');
    setProgressPercent(10);
    setProgressStatus('Reading file and initializing OCR...');

    try {
      const ocrResult = await extractTextFromFile(file, (pct, status) => {
        setProgressPercent(pct);
        setProgressStatus(status);
      });

      const processed = processDocumentText(
        ocrResult.text,
        file.name,
        file.name.endsWith('.pdf') ? 'pdf' : 'image',
        undefined,
        ocrResult.extractionMethod
      );
      processed.patientId = patientId;
      processed.caseId = caseId;

      setLastUploadedDoc(processed);
      onDocumentProcessed(processed);
      setIsProcessing(false);
      setProgressPercent(100);
      setProgressStatus('Extraction complete!');
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Error processing document with OCR.');
    }
  };

  const handleSelectSample = (sample: SampleDocMeta) => {
    setIsProcessing(true);
    setErrorMessage('');
    setProgressPercent(40);
    setProgressStatus(`Loading and parsing ${sample.label}...`);

    setTimeout(() => {
      setProgressPercent(85);
      setProgressStatus('Extracting clinical entities, medications and lab ranges...');

      setTimeout(() => {
        const processed = processDocumentText(
          sample.rawText,
          sample.name,
          'sample',
          sample.type
        );
        processed.patientId = patientId;
        processed.caseId = caseId;

        setLastUploadedDoc(processed);
        onDocumentProcessed(processed);
        setIsProcessing(false);
        setProgressPercent(100);
        setProgressStatus('Ready!');
      }, 400);
    }, 400);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
          isProcessing
            ? 'border-emerald-500 bg-emerald-50/40'
            : 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-slate-50/70 shadow-sm'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
          accept=".pdf,.png,.jpg,.jpeg,.webp,image/*,application/pdf"
          className="hidden"
        />

        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3">
          <Upload className="w-7 h-7" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
          Upload Prescriptions, Lab Reports & Discharge Summaries
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-4">
          Drop PDF or Image files here, or click to browse. We run client-side OCR to extract medications, lab reference ranges, and clinical history.
        </p>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
          <FileImage className="w-3.5 h-3.5" />
          <span>Supports: PDF, PNG, JPG, WebP</span>
        </div>
      </div>

      {/* Live OCR Progress Bar */}
      {isProcessing && (
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-md space-y-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-900 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              {progressStatus}
            </span>
            <span className="text-emerald-700">{progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Error display */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* One-Click Demo Sample Documents Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Quick Demo: Load Sample Test Documents
          </label>
          <span className="text-[11px] text-slate-400">Click to instantly test OCR & extraction</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SAMPLE_DOCUMENTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              disabled={isProcessing}
              onClick={() => handleSelectSample(sample)}
              className="p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-400 bg-white hover:bg-emerald-50/40 text-left transition-all shadow-sm group flex items-start justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                    sample.type === 'LAB_REPORT' ? 'bg-amber-100 text-amber-800' :
                    sample.type === 'PRESCRIPTION' ? 'bg-emerald-100 text-emerald-800' :
                    sample.type === 'DISCHARGE_SUMMARY' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {sample.type.replace('_', ' ')}
                  </span>
                  {sample.isPoorQuality && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700">
                      Poor Quality
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-slate-900 group-hover:text-emerald-900">
                  {sample.label}
                </h4>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                  {sample.description}
                </p>
              </div>

              <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center flex-shrink-0 transition-colors text-slate-400">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
