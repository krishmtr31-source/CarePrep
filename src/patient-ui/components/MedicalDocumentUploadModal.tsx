import React, { useState, useRef, useEffect } from 'react';
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
  File as FileIcon,
  RotateCcw,
  Copy,
  Download,
  Check,
  Plus,
  Edit3,
  ShieldAlert,
  AlertTriangle,
  SlidersHorizontal,
  Table as TableIcon,
  AlignLeft,
  Calendar,
  User,
  Building2,
  Stethoscope,
  Pill,
  Activity
} from 'lucide-react';
import { 
  extractTextFromFile, 
  terminateOcrWorker, 
  OcrResult 
} from '../../document-intelligence/ocr/textExtractor';
import { 
  extractStructuredMedicalData, 
  StructuredOcrMedicalData,
  enrichLabResultsWithGeminiRanges
} from '../../document-intelligence/ocr/medicalInfoExtractor';
import { 
  copyOcrSummaryToClipboard, 
  downloadOcrAsJson, 
  downloadOcrAsText 
} from '../../document-intelligence/ocr/ocrExportUtils';
import { 
  StructuredExtractionResult, 
  ILabResultEntry, 
  IMedicationEntry 
} from '../../shared/api/medicalDocumentApi';

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

type ModalState = 
  | 'IDLE' 
  | 'UPLOADING' 
  | 'OCR_IN_PROGRESS' 
  | 'PROCESSING_COMPLETE' 
  | 'OCR_FAILED' 
  | 'UNSUPPORTED_FILE' 
  | 'POOR_QUALITY_LOW_CONFIDENCE';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

export const MedicalDocumentUploadModal: React.FC<MedicalDocumentUploadModalProps> = ({
  isOpen,
  onClose,
  onExtractionSuccess,
  onViewOriginalFile
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [uploadTimestamp, setUploadTimestamp] = useState<Date | null>(null);
  const [modalState, setModalState] = useState<ModalState>('IDLE');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('Preparing document...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Active view tab: 'structured' | 'raw_ocr'
  const [activeTab, setActiveTab] = useState<'structured' | 'raw_ocr'>('structured');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Extracted data state (fully editable)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [extractedData, setExtractedData] = useState<StructuredOcrMedicalData | null>(null);
  const [editableRawText, setEditableRawText] = useState<string>('');
  const [isInferringRanges, setIsInferringRanges] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up OCR worker on modal unmount
  useEffect(() => {
    return () => {
      terminateOcrWorker();
    };
  }, []);

  if (!isOpen) return null;

  const validateAndStageFile = async (file: File) => {
    setErrorMessage(null);
    setModalState('UPLOADING');

    const lowerName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTS.some(ext => lowerName.endsWith(ext));

    if (!hasValidExt) {
      setModalState('UNSUPPORTED_FILE');
      setErrorMessage('Unsupported file type. Please upload a PDF, JPG, JPEG, PNG, or WEBP medical document.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setModalState('OCR_FAILED');
      setErrorMessage('File size exceeds 15 MB limit. Please select a smaller or compressed document.');
      return;
    }

    if (file.size === 0) {
      setModalState('OCR_FAILED');
      setErrorMessage('The uploaded file appears to be empty (0 bytes).');
      return;
    }

    // Read Data URL for preview and submission
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setSelectedFile(file);
      setFileDataUrl(dataUrl);
      setUploadTimestamp(new Date());

      // Trigger OCR Pipeline immediately
      await runOcrOnDocument(file);
    };
    reader.onerror = () => {
      setModalState('OCR_FAILED');
      setErrorMessage('Unable to read this document. Please verify the file is not damaged.');
    };
    reader.readAsDataURL(file);
  };

  const runOcrOnDocument = async (file: File) => {
    setModalState('OCR_IN_PROGRESS');
    setProgressPercent(10);
    setProgressMessage('Preparing document...');
    setErrorMessage(null);

    try {
      const result = await extractTextFromFile(file, (percent, status) => {
        setProgressPercent(percent);
        setProgressMessage(status);
      });

      if (result.isPasswordProtected) {
        setModalState('OCR_FAILED');
        setErrorMessage(result.error || 'This PDF document is password-protected. Please remove the password before uploading.');
        return;
      }

      if (!result.text || result.text.trim().length === 0) {
        setModalState('OCR_FAILED');
        setErrorMessage('Unable to detect readable text in this document. The image may be too blurry, dark, or corrupted.');
        return;
      }

      // Deterministically parse structured medical information
      const parsed = extractStructuredMedicalData(result.text, file.name);
      setOcrResult(result);
      setExtractedData(parsed);
      setEditableRawText(result.text);

      // If any lab results have unclear, missing, or inferred reference ranges, query Gemini API in background to enrich ranges
      const hasUnclearRanges = parsed.labResults.some(l => 
        !l.sourceReferenceRange.hasSourceRange || 
        l.sourceReferenceRange.isAiInferred || 
        l.sourceReferenceRange.raw === 'Not specified in report' || 
        l.flag === 'INDETERMINATE'
      );
      if (hasUnclearRanges) {
        setIsInferringRanges(true);
        enrichLabResultsWithGeminiRanges(parsed.labResults).then(enrichedLabs => {
          setExtractedData(prev => prev ? { ...prev, labResults: enrichedLabs } : null);
        }).catch(err => {
          console.warn('[MedicalDocumentUploadModal] Error enriching ranges with Gemini:', err);
        }).finally(() => {
          setIsInferringRanges(false);
        });
      }

      if (result.confidence < 0.50 || parsed.quality.readability === 'LOW_CONFIDENCE') {
        setModalState('POOR_QUALITY_LOW_CONFIDENCE');
      } else {
        setModalState('PROCESSING_COMPLETE');
      }
    } catch (err: any) {
      setModalState('OCR_FAILED');
      setErrorMessage(err?.message || 'Optical Character Recognition failed on this file.');
    }
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
    setModalState('IDLE');
    setOcrResult(null);
    setExtractedData(null);
    setEditableRawText('');
    setProgressPercent(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReParseRawText = () => {
    if (!editableRawText || !selectedFile) return;
    const parsed = extractStructuredMedicalData(editableRawText, selectedFile.name);
    setExtractedData(parsed);

    const hasUnclearRanges = parsed.labResults.some(l => 
      !l.sourceReferenceRange.hasSourceRange || 
      l.sourceReferenceRange.isAiInferred || 
      l.sourceReferenceRange.raw === 'Not specified in report' || 
      l.flag === 'INDETERMINATE'
    );
    if (hasUnclearRanges) {
      setIsInferringRanges(true);
      enrichLabResultsWithGeminiRanges(parsed.labResults).then(enrichedLabs => {
        setExtractedData(prev => prev ? { ...prev, labResults: enrichedLabs } : null);
      }).catch(err => {
        console.warn('[MedicalDocumentUploadModal] Error enriching ranges with Gemini:', err);
      }).finally(() => {
        setIsInferringRanges(false);
      });
    }
  };

  const handleInferRangesWithGemini = async () => {
    if (!extractedData || extractedData.labResults.length === 0) return;
    setIsInferringRanges(true);
    try {
      const enrichedLabs = await enrichLabResultsWithGeminiRanges(extractedData.labResults);
      setExtractedData({ ...extractedData, labResults: enrichedLabs });
    } catch (err) {
      console.warn('[MedicalDocumentUploadModal] Manual Gemini range inference failed:', err);
    } finally {
      setIsInferringRanges(false);
    }
  };

  const handleCopySummary = async () => {
    if (!extractedData) return;
    const success = await copyOcrSummaryToClipboard(extractedData);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2500);
    }
  };

  // Medication table row editing
  const handleMedFieldChange = (index: number, field: string, val: string) => {
    if (!extractedData) return;
    const updated = [...extractedData.medications];
    updated[index] = { ...updated[index], [field]: val };
    setExtractedData({ ...extractedData, medications: updated });
  };

  const handleAddMedRow = () => {
    if (!extractedData) return;
    const newMed = {
      id: `med-custom-${Date.now()}`,
      name: 'New Medicine',
      strength: '500 mg',
      dosage: '1 tablet',
      frequency: 'Once daily (OD)',
      duration: '5 days',
      instructions: 'After food (PC)',
      evidence: {
        documentId: 'custom',
        documentName: selectedFile?.name || 'document',
        pageNumber: 1,
        snippet: 'Manual entry',
        confidenceScore: 1.0,
        extractionMethod: 'OCR' as const
      }
    };
    setExtractedData({
      ...extractedData,
      medications: [...extractedData.medications, newMed]
    });
  };

  const handleDeleteMedRow = (index: number) => {
    if (!extractedData) return;
    const updated = extractedData.medications.filter((_, i) => i !== index);
    setExtractedData({ ...extractedData, medications: updated });
  };

  // Lab test row editing
  const handleLabFieldChange = (index: number, field: string, val: string) => {
    if (!extractedData) return;
    const updated = [...extractedData.labResults];
    updated[index] = { ...updated[index], [field]: val };
    setExtractedData({ ...extractedData, labResults: updated });
  };

  const handleAddLabRow = () => {
    if (!extractedData) return;
    const newLab = {
      id: `lab-custom-${Date.now()}`,
      testName: 'New Investigation',
      resultValue: '0',
      unit: 'mg/dL',
      sourceReferenceRange: { raw: 'Normal', hasSourceRange: true },
      flag: 'NORMAL' as const,
      isAbnormal: false,
      evidence: {
        documentId: 'custom',
        documentName: selectedFile?.name || 'document',
        pageNumber: 1,
        snippet: 'Manual entry',
        confidenceScore: 1.0,
        extractionMethod: 'OCR' as const
      }
    };
    setExtractedData({
      ...extractedData,
      labResults: [...extractedData.labResults, newLab]
    });
  };

  const handleDeleteLabRow = (index: number) => {
    if (!extractedData) return;
    const updated = extractedData.labResults.filter((_, i) => i !== index);
    setExtractedData({ ...extractedData, labResults: updated });
  };

  // Convert to CarePrep canonical StructuredExtractionResult and save
  const handleSaveAndConfirm = () => {
    if (!selectedFile || !fileDataUrl || !extractedData) return;

    const mappedLabResults: ILabResultEntry[] = extractedData.labResults.map(l => ({
      testName: l.testName,
      value: l.resultValue,
      unit: l.unit,
      referenceRange: l.sourceReferenceRange.raw || '',
      flag: l.flag
    }));

    const mappedMeds: IMedicationEntry[] = extractedData.medications.map(m => ({
      name: m.name,
      dosage: m.strength || m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      route: m.route || 'Oral'
    }));

    const extraction: StructuredExtractionResult = {
      documentType: extractedData.documentType,
      documentTitle: extractedData.documentTitle,
      documentDate: extractedData.patientOverview.documentDate !== 'Not detected' ? extractedData.patientOverview.documentDate : null,
      patientName: extractedData.patientOverview.name !== 'Not detected' ? extractedData.patientOverview.name : null,
      doctorName: extractedData.patientOverview.doctorName !== 'Not detected' ? extractedData.patientOverview.doctorName : null,
      hospitalName: extractedData.patientOverview.hospitalName !== 'Not detected' ? extractedData.patientOverview.hospitalName : null,
      summary: extractedData.summary,
      labResults: mappedLabResults,
      medications: mappedMeds,
      diagnosesMentioned: extractedData.diagnoses,
      proceduresMentioned: [],
      importantNotes: extractedData.doctorInstructions,
      extractionWarnings: extractedData.quality.uncertainItems
    };

    onExtractionSuccess({
      file: selectedFile,
      fileDataUrl,
      extraction
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = selectedFile?.name ? /\.(jpg|jpeg|png|webp)$/i.test(selectedFile.name) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div 
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-2xs">
              <ScanIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>CarePrep Medical OCR Studio</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Client-Side OCR
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Extract prescriptions, lab reports, and medical records securely without leaving your device.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={modalState === 'OCR_IN_PROGRESS'}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs sm:text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-900">OCR Extraction Notice</p>
                <p className="text-rose-700 mt-0.5">{errorMessage}</p>
                {selectedFile && modalState !== 'OCR_IN_PROGRESS' && (
                  <button
                    type="button"
                    onClick={() => runOcrOnDocument(selectedFile)}
                    className="inline-flex items-center gap-1.5 mt-2.5 px-3 py-1 bg-white border border-rose-300 text-rose-800 font-bold rounded-lg hover:bg-rose-100 text-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry OCR Scan</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Low Confidence Warning Banner */}
          {modalState === 'POOR_QUALITY_LOW_CONFIDENCE' && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">Low OCR Confidence Detected</p>
                <p className="text-amber-700 mt-0.5">
                  Some characters may be unclear due to image resolution or handwritten elements. Please review and edit the extracted fields below.
                </p>
              </div>
            </div>
          )}

          {/* STATE 1: Drop Zone (No file selected) */}
          {!selectedFile ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-8 sm:p-12 border-2 border-dashed rounded-3xl text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-emerald-500 bg-emerald-50/70 scale-[0.99]' 
                  : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80 bg-slate-50/40 shadow-xs'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-xs">
                <Upload className="w-8 h-8" />
              </div>

              <h3 className="text-lg font-extrabold text-slate-900 mb-1">
                Upload Medical Document for OCR
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-4">
                Drag &amp; drop prescription photos, diagnostic reports, or lab PDFs to extract structured medical data locally.
              </p>

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all"
              >
                Choose Medical Document
              </button>

              <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400 mt-5 font-semibold">
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-600">PDF</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-600">JPG</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-600">JPEG</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-600">PNG</span>
                <span className="px-2 py-0.5 rounded-md bg-slate-200/60 text-slate-600">WEBP</span>
                <span>• Up to 15 MB</span>
              </div>
            </div>
          ) : (
            /* STATE 2: File Selected & Preview Card */
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {isImageFile && fileDataUrl ? (
                    <img 
                      src={fileDataUrl} 
                      alt="Thumbnail" 
                      className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0" 
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileIcon className="w-6 h-6" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {selectedFile.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[9px]">
                        {selectedFile.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMAGE'}
                      </span>
                      <span>{formatFileSize(selectedFile.size)}</span>
                      {ocrResult && (
                        <span>• Method: <strong>{ocrResult.extractionMethod}</strong></span>
                      )}
                      {ocrResult && (
                        <span className="text-emerald-700 font-bold">
                          • Confidence: {Math.round(ocrResult.confidence * 100)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onViewOriginalFile && fileDataUrl && (
                    <button
                      type="button"
                      onClick={() => onViewOriginalFile(fileDataUrl, selectedFile.name)}
                      className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-colors text-xs font-semibold flex items-center gap-1"
                      title="View Document"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Preview</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={modalState === 'OCR_IN_PROGRESS'}
                    className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-40"
                    title="Remove Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Live OCR Progress Bar */}
              {modalState === 'OCR_IN_PROGRESS' && (
                <div className="p-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-emerald-950">
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                      <span>{progressMessage}</span>
                    </span>
                    <span>{progressPercent}%</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-emerald-200/60 overflow-hidden">
                    <div 
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="text-[11px] text-emerald-800 flex items-center justify-between pt-1">
                    <span>Non-blocking client-side OCR engine active</span>
                    <span>Preserving exact measurements &amp; dosages</span>
                  </div>
                </div>
              )}

              {/* POST-OCR RESULT INTERFACE */}
              {extractedData && modalState !== 'OCR_IN_PROGRESS' && (
                <div className="space-y-4">
                  {/* Tab Selector & Export Controls */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setActiveTab('structured')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeTab === 'structured'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <TableIcon className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Structured Medical Information</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('raw_ocr')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          activeTab === 'raw_ocr'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <AlignLeft className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Extracted OCR Text</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleCopySummary}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                      >
                        {copyFeedback ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                        <span>{copyFeedback ? 'Copied!' : 'Copy Summary'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadOcrAsJson(extractedData, selectedFile.name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>JSON</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadOcrAsText(extractedData, selectedFile.name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Text</span>
                      </button>
                    </div>
                  </div>

                  {/* TAB 1: STRUCTURED MEDICAL INFORMATION */}
                  {activeTab === 'structured' && (
                    <div className="space-y-4">
                      {/* Patient & Header Demographics */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                            Patient &amp; Document Header Details
                          </h4>
                          <span className="text-[10px] text-slate-400 font-semibold">Editable Fields</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Patient Name</label>
                            <input
                              type="text"
                              value={extractedData.patientOverview.name}
                              onChange={e => setExtractedData({
                                ...extractedData,
                                patientOverview: { ...extractedData.patientOverview, name: e.target.value }
                              })}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Age / Gender</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={extractedData.patientOverview.age}
                                onChange={e => setExtractedData({
                                  ...extractedData,
                                  patientOverview: { ...extractedData.patientOverview, age: e.target.value }
                                })}
                                className="w-1/2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                              />
                              <input
                                type="text"
                                value={extractedData.patientOverview.gender}
                                onChange={e => setExtractedData({
                                  ...extractedData,
                                  patientOverview: { ...extractedData.patientOverview, gender: e.target.value }
                                })}
                                className="w-1/2 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Document Date</label>
                            <input
                              type="text"
                              value={extractedData.patientOverview.documentDate}
                              onChange={e => setExtractedData({
                                ...extractedData,
                                patientOverview: { ...extractedData.patientOverview, documentDate: e.target.value }
                              })}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Doctor Name</label>
                            <input
                              type="text"
                              value={extractedData.patientOverview.doctorName}
                              onChange={e => setExtractedData({
                                ...extractedData,
                                patientOverview: { ...extractedData.patientOverview, doctorName: e.target.value }
                              })}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hospital / Clinic / Lab</label>
                            <input
                              type="text"
                              value={extractedData.patientOverview.hospitalName}
                              onChange={e => setExtractedData({
                                ...extractedData,
                                patientOverview: { ...extractedData.patientOverview, hospitalName: e.target.value }
                              })}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-semibold focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SECTION 6: Prescription Medicines Table */}
                      {extractedData.medications.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                              <Pill className="w-3.5 h-3.5 text-emerald-600" />
                              Extracted Prescription Medications ({extractedData.medications.length})
                            </h4>
                            <button
                              type="button"
                              onClick={handleAddMedRow}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Medication</span>
                            </button>
                          </div>

                          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px]">
                                <tr>
                                  <th className="p-2.5">Medicine</th>
                                  <th className="p-2.5">Strength</th>
                                  <th className="p-2.5">Dosage</th>
                                  <th className="p-2.5">Frequency</th>
                                  <th className="p-2.5">Duration</th>
                                  <th className="p-2.5">Instructions</th>
                                  <th className="p-2.5 text-right">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {extractedData.medications.map((med, idx) => (
                                  <tr key={med.id} className="hover:bg-slate-50/70 transition-colors">
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        value={med.name}
                                        onChange={e => handleMedFieldChange(idx, 'name', e.target.value)}
                                        className="w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded font-bold text-slate-900"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        value={med.strength || ''}
                                        placeholder="500 mg"
                                        onChange={e => handleMedFieldChange(idx, 'strength', e.target.value)}
                                        className="w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded text-slate-800"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        value={med.dosage}
                                        onChange={e => handleMedFieldChange(idx, 'dosage', e.target.value)}
                                        className="w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded text-slate-800"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        value={med.frequency}
                                        onChange={e => handleMedFieldChange(idx, 'frequency', e.target.value)}
                                        className="w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded text-slate-800"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        value={med.duration}
                                        onChange={e => handleMedFieldChange(idx, 'duration', e.target.value)}
                                        className="w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded text-slate-800"
                                      />
                                    </td>
                                    <td className="p-2">
                                      <input
                                        type="text"
                                        value={med.instructions || ''}
                                        placeholder="After food"
                                        onChange={e => handleMedFieldChange(idx, 'instructions', e.target.value)}
                                        className="w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded text-slate-800"
                                      />
                                    </td>
                                    <td className="p-2 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMedRow(idx)}
                                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
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
                      )}

                      {/* SECTION 7: Laboratory Results Table with High Alert System */}
                      {extractedData.labResults.length > 0 && (() => {
                        const highAlertLabs = extractedData.labResults.filter(
                          l => l.flag === 'HIGH' || l.flag === 'CRITICAL' || l.isAbnormal
                        );

                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-amber-600" />
                                <span>Extracted Laboratory Investigations ({extractedData.labResults.length})</span>
                              </h4>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleInferRangesWithGemini}
                                  disabled={isInferringRanges}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors disabled:opacity-60 shadow-2xs"
                                  title="Auto-fill standard recommended reference ranges for missing or unclear test values"
                                >
                                  <SlidersHorizontal className={`w-3 h-3 ${isInferringRanges ? 'animate-spin' : 'text-slate-600'}`} />
                                  <span>{isInferringRanges ? 'Detecting ranges...' : 'Auto-Detect Ranges'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleAddLabRow}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Add Test</span>
                                </button>
                              </div>
                            </div>

                            {/* HIGH ALERT BANNER IF ANY VALUE EXCEEDS RECOMMENDED RANGE */}
                            {highAlertLabs.length > 0 && (
                              <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-xs space-y-2 animate-in fade-in">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-rose-950 font-extrabold text-xs sm:text-sm">
                                    <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse shrink-0" />
                                    <span>🚨 HIGH ALERT: {highAlertLabs.length} Parameter(s) Exceed Recommended Clinical Range</span>
                                  </div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-2xs">
                                    Attention
                                  </span>
                                </div>
                                <p className="text-[11px] text-rose-800">
                                  The following investigation values are elevated above the standard reference thresholds extracted from the report:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                  {highAlertLabs.map(lab => (
                                    <div key={lab.id} className="p-2.5 rounded-xl bg-white border border-rose-200 flex items-center justify-between text-xs shadow-2xs">
                                      <div>
                                        <span className="font-bold text-slate-900">{lab.testName}</span>
                                        <div className="text-[10px] text-slate-500 flex items-center gap-1 flex-wrap">
                                          <span>Recommended:</span>
                                          <strong className="text-slate-700">{lab.sourceReferenceRange.raw || 'Standard range'}</strong>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-mono font-extrabold text-rose-600 text-sm">
                                          {lab.resultValue} {lab.unit}
                                        </span>
                                        <div className="text-[9px] font-black text-rose-700 uppercase tracking-wider">
                                          ↑ EXCEEDS LIMIT
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 font-bold uppercase text-[10px]">
                                  <tr>
                                    <th className="p-2.5">Test Name</th>
                                    <th className="p-2.5">Result</th>
                                    <th className="p-2.5">Unit</th>
                                    <th className="p-2.5">Reference Range</th>
                                    <th className="p-2.5">Alert &amp; Status Flag</th>
                                    <th className="p-2.5 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {extractedData.labResults.map((lab, idx) => {
                                    const isExceeded = lab.flag === 'HIGH' || lab.flag === 'CRITICAL';
                                    const isLow = lab.flag === 'LOW';

                                    return (
                                      <tr 
                                        key={lab.id} 
                                        className={`transition-colors ${
                                          isExceeded ? 'bg-rose-50/70 hover:bg-rose-100/70 border-l-4 border-l-rose-600' : 
                                          isLow ? 'bg-amber-50/40 hover:bg-amber-50 border-l-4 border-l-amber-500' : 
                                          'hover:bg-slate-50/70'
                                        }`}
                                      >
                                        <td className="p-2 font-bold text-slate-900">
                                          <div className="flex items-center gap-1.5">
                                            {isExceeded && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                                            <input
                                              type="text"
                                              value={lab.testName}
                                              onChange={e => handleLabFieldChange(idx, 'testName', e.target.value)}
                                              className="w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded font-bold text-slate-900"
                                            />
                                          </div>
                                        </td>
                                        <td className="p-2">
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="text"
                                              value={lab.resultValue}
                                              onChange={e => handleLabFieldChange(idx, 'resultValue', e.target.value)}
                                              className={`w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded font-mono font-bold ${
                                                isExceeded ? 'text-rose-700 font-black' : 'text-slate-800'
                                              }`}
                                            />
                                            {isExceeded && (
                                              <span className="text-[10px] font-black text-rose-600" title="Exceeds Recommended Maximum">
                                                ▲
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-2">
                                          <input
                                            type="text"
                                            value={lab.unit}
                                            onChange={e => handleLabFieldChange(idx, 'unit', e.target.value)}
                                            className="w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded text-slate-600"
                                          />
                                        </td>
                                        <td className="p-2">
                                          <input
                                            type="text"
                                            value={lab.sourceReferenceRange.raw}
                                            placeholder="Reference range"
                                            onChange={e => {
                                              const updated = [...extractedData.labResults];
                                              updated[idx].sourceReferenceRange.raw = e.target.value;
                                              setExtractedData({ ...extractedData, labResults: updated });
                                            }}
                                            className="w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:bg-white rounded text-slate-600 font-mono text-[11px]"
                                          />
                                        </td>
                                        <td className="p-2">
                                          <div className="flex items-center gap-1.5">
                                            {isExceeded && (
                                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-600 text-white uppercase tracking-wider shrink-0 shadow-2xs">
                                                🚨 HIGH ALERT
                                              </span>
                                            )}
                                            <select
                                              value={lab.flag}
                                              onChange={e => handleLabFieldChange(idx, 'flag', e.target.value)}
                                              className={`px-2 py-1 rounded-md text-[11px] font-bold border ${
                                                isExceeded ? 'bg-rose-100 text-rose-800 border-rose-300' :
                                                isLow ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                                lab.flag === 'NORMAL' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                                'bg-slate-100 text-slate-700 border-slate-200'
                                              }`}
                                            >
                                              <option value="NORMAL">NORMAL</option>
                                              <option value="HIGH">HIGH (Exceeded)</option>
                                              <option value="LOW">LOW</option>
                                              <option value="CRITICAL">CRITICAL</option>
                                              <option value="INDETERMINATE">UNCLEAR</option>
                                            </select>
                                          </div>
                                        </td>
                                        <td className="p-2 text-right">
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteLabRow(idx)}
                                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                            title="Delete row"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Diagnoses & Observations */}
                      {extractedData.diagnoses.length > 0 && (
                        <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs">
                          <h4 className="font-bold text-indigo-900 uppercase text-[10px] tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            Extracted Diagnoses &amp; Clinical Notes
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {extractedData.diagnoses.map((diag, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 font-semibold text-indigo-900">
                                {diag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: RAW EXTRACTED OCR TEXT */}
                  {activeTab === 'raw_ocr' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>
                          Characters: <strong>{editableRawText.length}</strong> • Lines: <strong>{editableRawText.split('\n').length}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={handleReParseRawText}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 font-bold transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Re-parse Structured Fields</span>
                        </button>
                      </div>

                      <textarea
                        rows={12}
                        value={editableRawText}
                        onChange={e => setEditableRawText(e.target.value)}
                        className="w-full p-3.5 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white leading-relaxed"
                        placeholder="Raw text extracted by OCR..."
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Mandatory Clinical Safety Disclaimer (Section 8) */}
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-2.5 text-amber-900 text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Medical Transcription Notice:</span>{' '}
                  This information was automatically extracted via Optical Character Recognition (OCR). OCR results must be physically verified against the original medical document before relying on it for clinical care. The software does not provide independent medical diagnosis or alter physician orders.
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={modalState === 'OCR_IN_PROGRESS'}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-colors disabled:opacity-40"
                  >
                    Clear Document
                  </button>
                </div>

                {extractedData && modalState !== 'OCR_IN_PROGRESS' && (
                  <button
                    type="button"
                    onClick={handleSaveAndConfirm}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save to Health Records</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function ScanIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}
