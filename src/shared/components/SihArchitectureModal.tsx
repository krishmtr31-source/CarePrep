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
  AlertTriangle
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
                Agentic Orchestration & Safety Architecture
              </h3>
              <p className="text-xs text-slate-500">Technical System Hierarchy & Runtime Boundaries</p>
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
          {/* Provider Status Live Badge */}
          <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-slate-200">Live AI Provider Runtime State:</div>
                <div className="text-[11px] text-slate-400">
                  {providerStatus.statusLabel} ({providerStatus.providerName})
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-800 text-emerald-300 border border-slate-700">
              Session Limit: {providerStatus.totalRequestsThisSession}/{providerStatus.maxRequestsLimit}
            </span>
          </div>

          {/* Architecture Tree Diagram */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs font-sans">
            {/* Level 1: Input */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Mic className="w-4 h-4 text-emerald-600" />
                Patient Input Layer (Voice, Typed Text, Touch Chips in EN / HI / TA)
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">Web Speech / Natural Text</span>
            </div>

            <div className="flex justify-center -my-2 text-slate-400">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>

            {/* Level 2: Conversation & NLP Gateway */}
            <div className="p-3.5 rounded-xl bg-indigo-50/80 border border-indigo-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between font-bold text-indigo-900">
                <span className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  Conversation Agent & LLM Gateway
                </span>
                <span className="text-[10px] bg-indigo-200/80 text-indigo-800 px-2 py-0.5 rounded font-mono">
                  Schema Validator + Grounding Guard
                </span>
              </div>
              <p className="text-[11px] text-indigo-800 leading-normal">
                Prompt injection defense fence; extracts symptoms, duration, location. Defaults unstated parameters to "Not provided." Pluggable remote LLM interface with deterministic NLP fallback.
              </p>
            </div>

            <div className="flex justify-center -my-2 text-slate-400">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>

            {/* Level 3: Deterministic Safety Authority */}
            <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 shadow-sm space-y-1.5">
              <div className="flex items-center justify-between font-bold text-rose-900">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  Deterministic Safety Controller (Authoritative Red-Flag Authority)
                </span>
                <span className="text-[10px] bg-rose-200 text-rose-800 px-2 py-0.5 rounded font-mono font-bold">
                  RED Overrides LLM
                </span>
              </div>
              <p className="text-[11px] text-rose-800 leading-normal">
                Screens against hardcoded emergency rules. If potential life-threat criteria trigger, immediately asserts RED Emergency Triage. LLM output cannot downgrade or override this state.
              </p>
            </div>

            <div className="flex justify-center -my-2 text-slate-400">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>

            {/* Level 4: Specialized Orchestrated Agents Grid */}
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
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  AYUSH Agent
                </div>
                <p className="text-[10px] text-slate-600">
                  Dashavidha Pariksha questionnaire for patient-reported constitutional indicators.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-1">
                  <Database className="w-3.5 h-3.5 text-purple-600" />
                  Evidence Layer
                </div>
                <p className="text-[10px] text-slate-600">
                  Multi-modal provenance linking each claim to audio, text snippet, or document page.
                </p>
              </div>
            </div>

            <div className="flex justify-center -my-2 text-slate-400">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>

            {/* Level 5: Summary & Review Console */}
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                Summary Agent → Physician Review Console (Version 1 Preserved, Version 2 Clinician Authored)
              </div>
              <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                Doctor Decides
              </span>
            </div>
          </div>

          {/* Safety Critical Note Alert */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="block mb-0.5">Deterministic Safety Guarantee:</strong>
              Safety-critical screening remains completely deterministic and independent of generative model outputs. Prototype emergency rules are software-tested; not clinically validated.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
