import React, { useState, useRef } from 'react';
import { ExtractedDocumentData } from '../models/document';
import { SAMPLE_DOCUMENTS, SampleDocMeta } from '../samples/sampleDocuments';
import { extractTextFromFile } from '../ocr/textExtractor';
import { processDocumentWithAI } from '../parsers/documentPipeline';
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
  Eye,
  ShieldCheck
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
    setProgressStatus('Reading file and extracting text...');

    try {
      const ocrResult = await extractTextFromFile(file, (pct, status) => {
        setProgressPercent(Math.round(pct * 0.6));
        setProgressStatus(status);
      });

      setProgressPercent(70);
      setProgressStatus('Analyzing document structure with Gemini 3.6 Flash...');

      const processed = await processDocumentWithAI(
        ocrResult.text,
        file.name,
        file.name.endsWith('.pdf') ? 'pdf' : 'image',
        undefined,
        ocrResult.extractionMethod
      );
      processed.patientId = patientId;
      processed.caseId = caseId;

      setProgressPercent(90);
      setProgressStatus('Validating clinical evidence & reference ranges...');

      setTimeout(() => {
        setLastUploadedDoc(processed);
        onDocumentProcessed(processed);
        setIsProcessing(false);
        setProgressPercent(100);
        setProgressStatus('Document understanding complete!');
      }, 300);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Error processing document.');
    }
  };

  const handleSelectSample = async (sample: SampleDocMeta) => {
    setIsProcessing(true);
    setErrorMessage('');
    setProgressPercent(30);
    setProgressStatus(`Loading sample document: ${sample.label}...`);

    try {
      setProgressPercent(65);
      setProgressStatus('Analyzing with Gemini 3.6 Flash & deterministic rules...');

      const processed = await processDocumentWithAI(
        sample.rawText,
        sample.name,
        'sample',
        sample.type
      );
      processed.patientId = patientId;
      processed.caseId = caseId;

      setProgressPercent(90);
      setProgressStatus('Validating evidence snippets & reference ranges...');

      setTimeout(() => {
        setLastUploadedDoc(processed);
        onDocumentProcessed(processed);
        setIsProcessing(false);
        setProgressPercent(100);
        setProgressStatus('Ready!');
      }, 350);
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Error processing sample document.');
    }
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
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
          Upload clear PDF documents or photos (PNG, JPG). Gemini 3.6 Flash extracts clinical entities with deterministic evidence validation.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors">
          <FileImage className="w-4 h-4 text-emerald-600" />
          <span>Browse Device Files</span>
        </div>

        {/* Processing Indicator with Stage Checkpoints */}
        {isProcessing && (
          <div className="mt-6 pt-4 border-t border-slate-200/80 max-w-md mx-auto space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {progressStatus}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium pt-1">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Text Extracted
              </span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" /> Gemini Analyzed
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Evidence Validated
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Synthetic Demo Document Quick Selectors */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Try Synthetic Demo Clinical Documents
          </h4>
          <span className="text-[11px] text-slate-400">One-click evaluation</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SAMPLE_DOCUMENTS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectSample(sample);
              }}
              className="p-3.5 text-left bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl transition-all shadow-sm flex flex-col justify-between group disabled:opacity-50"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    sample.type === 'PRESCRIPTION' ? 'bg-emerald-100 text-emerald-800' :
                    sample.type === 'LAB_REPORT' ? 'bg-amber-100 text-amber-800' :
                    'bg-indigo-100 text-indigo-800'
                  }`}>
                    {sample.type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400">{sample.mockDate}</span>
                </div>
                <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-700 transition-colors">
                  {sample.label}
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                  {sample.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-emerald-600">
                <span>Analyze with AI</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
