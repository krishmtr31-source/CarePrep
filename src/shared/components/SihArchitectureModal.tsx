import React from 'react';
import { 
  Layers, 
  ShieldCheck, 
  Cpu, 
  Database, 
  Stethoscope, 
  Mic, 
  FileText, 
  ArrowDown, 
  CheckCircle2, 
  X, 
  Activity,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import { llmGateway } from '../../ai-services/llm/LLMGateway';

interface SihArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SihArchitectureModal: React.FC<SihArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const providerStatus = llmGateway.getProviderStatus();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                How CarePrep Works — System Architecture
              </h3>
              <p className="text-xs text-slate-500">Gemini Understanding • Deterministic Safety • Physician Review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Core Formula Summary */}
          <div className="p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${providerStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                <span className="font-bold text-slate-100">Live AI Runtime: {providerStatus.statusLabel} ({providerStatus.modelName})</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Session Requests: {providerStatus.totalRequestsThisSession}/{providerStatus.maxRequestsLimit}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              &ldquo;Gemini assists with language understanding. The safety controller independently screens for prototype red flags. The physician reviews and confirms the final clinical information.&rdquo;
            </p>
          </div>

          {/* Architecture Tree Diagram */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs font-sans">
            {/* Level 1: Input */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Mic className="w-4 h-4 text-emerald-600" />
                <span>1. Patient Interaction Layer</span>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Voice / Text / Touch in EN / HI / TA</span>
            </div>

            <div className="flex justify-center -my-2 text-slate-400">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Level 2: Gemini Understanding */}
            <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between font-bold text-emerald-950">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>2. Gemini 3.6 Flash (Conversation Understanding)</span>
                </span>
                <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded font-mono">
                  Schema Validator + Grounding Guard
                </span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-normal">
                Interprets natural language, extracts symptoms (onset, character, aggravating factors), detects missing SOCRATES fields. If offline, local deterministic NLP seamlessly falls back.
              </p>
            </div>

            <div className="flex justify-center -my-2 text-slate-400">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Level 3: Document, AYUSH & Evidence */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-1">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Document Agent
                </div>
                <p className="text-[10px] text-slate-600">
                  OCR, medication parsing, abnormal lab detection (`HIGH`/`LOW`), timeline integration.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-teal-600" />
                  AYUSH Agent
                </div>
                <p className="text-[10px] text-slate-600">
                  Dashavidha Pariksha constitutional parameters (Patient-reported indicators).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-1">
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  Evidence Layer
                </div>
                <p className="text-[10px] text-slate-600">
                  Links 100% of extracted entities back to verbatim quotes &amp; document snippets.
                </p>
              </div>
            </div>

            <div className="flex justify-center -my-2 text-slate-400">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Level 4: Deterministic Safety Controller */}
            <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between font-bold text-rose-950">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  <span>4. Deterministic Safety Controller</span>
                </span>
                <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-mono font-bold">
                  RED State Cannot Be Downgraded
                </span>
              </div>
              <p className="text-[11px] text-rose-900 leading-normal">
                The safety controller independently screens patient inputs for prototype red flags. A triggered RED state cannot be downgraded by Gemini.
              </p>
            </div>

            <div className="flex justify-center -my-2 text-slate-400">
              <ArrowDown className="w-4 h-4" />
            </div>

            {/* Level 5: Doctor Review Console */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white shadow-sm flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Stethoscope className="w-4 h-4 text-emerald-400" />
                  <span>5. Mandatory Physician Review &amp; Confirmation</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Doctor edits, confirms, or rejects AI-drafted intake. Clinician is the final clinical authority.
                </p>
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                Final Authority
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            CarePrep SIH26047 • Transparent Healthcare AI Architecture
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
