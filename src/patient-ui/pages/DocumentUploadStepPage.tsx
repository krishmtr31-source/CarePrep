import React, { useState } from 'react';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { useIntake } from '../../shared/contexts/IntakeContext';
import { localStore } from '../../backend/storage/localStore';
import { ExtractedDocumentData } from '../../document-intelligence/models/document';
import { DocumentUploader } from '../../document-intelligence/components/DocumentUploader';
import { ExtractedEntitiesView } from '../../document-intelligence/components/ExtractedEntitiesView';
import { AbnormalLabAlertBanner } from '../../document-intelligence/components/AbnormalLabAlertBanner';
import { OriginalDocumentModal } from '../../document-intelligence/components/OriginalDocumentModal';
import { 
  FileText, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles, 
  Plus,
  FolderOpen
} from 'lucide-react';

interface DocumentUploadStepPageProps {
  onContinue: () => void;
  onBack: () => void;
}

export const DocumentUploadStepPage: React.FC<DocumentUploadStepPageProps> = ({
  onContinue,
  onBack
}) => {
  const { t } = useLanguage();
  const { patient } = useIntake();
  const [uploadedDocs, setUploadedDocs] = useState<ExtractedDocumentData[]>([]);
  const [activeDocForModal, setActiveDocForModal] = useState<ExtractedDocumentData | null>(null);

  const handleDocumentProcessed = (doc: ExtractedDocumentData) => {
    setUploadedDocs(prev => [doc, ...prev]);
    localStore.saveDocument(doc);
  };

  // Collect all lab results from uploaded documents for abnormal summary banner
  const allLabResults = uploadedDocs.flatMap(d => d.labResults || []);

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative z-10">
      <div className="max-w-3xl mx-auto w-full my-auto py-6 space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Module 2: Document Intelligence
          </span>
        </div>

        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3">
            <FolderOpen className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Medical Documents & Prior Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
            Upload your previous prescriptions, blood tests, or hospital discharge summaries to assist your doctor. (Optional)
          </p>
        </div>

        {/* Abnormal Lab Results Warning Banner if any detected */}
        {allLabResults.some(l => l.isAbnormal) && (
          <AbnormalLabAlertBanner labResults={allLabResults} />
        )}

        {/* Uploader & Demo Loader Component */}
        <DocumentUploader
          patientId={patient?.id}
          onDocumentProcessed={handleDocumentProcessed}
        />

        {/* Extracted Entity Views of Processed Documents */}
        {uploadedDocs.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Processed Documents ({uploadedDocs.length})
            </h3>
            {uploadedDocs.map((doc) => (
              <ExtractedEntitiesView
                key={doc.documentId}
                document={doc}
                onViewOriginal={setActiveDocForModal}
              />
            ))}
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onContinue}
            className="w-full sm:w-auto text-xs font-semibold text-slate-500 hover:text-slate-800 py-3 px-4"
          >
            {uploadedDocs.length === 0 ? 'Skip for now (No documents)' : 'Skip adding more'}
          </button>

          <button
            type="button"
            onClick={onContinue}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-200 transition-all"
          >
            <span>Continue to Intake Mode</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Original Document Modal */}
      {activeDocForModal && (
        <OriginalDocumentModal
          document={activeDocForModal}
          onClose={() => setActiveDocForModal(null)}
        />
      )}
    </div>
  );
};
