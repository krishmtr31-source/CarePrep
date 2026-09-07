import React from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Stethoscope, 
  X,
  FileCheck,
  Cpu,
  Layers,
  ArrowRight
} from 'lucide-react';

interface WhatGeminiDoesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatGeminiDoesModal: React.FC<WhatGeminiDoesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white leading-tight">
                What Gemini Does &amp; Does NOT Do
              </h3>
              <p className="text-xs text-slate-300">
                AI Language Understanding with Strict Healthcare Safety Guardrails
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Core Philosophy Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-emerald-950">
                The CarePrep Clinical Principle:
              </p>
              <p className="text-emerald-800 leading-relaxed font-medium">
                &ldquo;Gemini assists with understanding and structuring patient responses. Deterministic safety rules independently screen for prototype red flags. The physician makes the final clinical decision.&rdquo;
              </p>
            </div>
          </div>

          {/* Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Column 1: Gemini Helps */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-emerald-200 font-bold text-emerald-900 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Gemini Helps:</span>
              </div>
              <ul className="space-y-2.5 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                  <span><strong>Understand natural-language</strong> responses across English, Hindi, Tamil, and Hinglish.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                  <span><strong>Extract relevant symptom details</strong> (onset, character, aggravating factors) grounded in speech.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                  <span><strong>Identify missing history fields</strong> (e.g. unstated duration or severity) to prompt follow-ups.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                  <span><strong>Select relevant follow-up questions</strong> within the standardized clinical SOCRATES framework.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                  <span><strong>Convert conversational replies</strong> into clean structured intake summaries for doctor review.</span>
                </li>
              </ul>
            </div>

            {/* Column 2: Gemini Does NOT */}
            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-rose-200 font-bold text-rose-900 text-sm">
                <XCircle className="w-4 h-4 text-rose-600" />
                <span>Gemini Does NOT:</span>
              </div>
              <ul className="space-y-2.5 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold mt-0.5">✗</span>
                  <span><strong>Diagnose the patient</strong> or claim autonomous disease discovery.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold mt-0.5">✗</span>
                  <span><strong>Prescribe medicines</strong> or recommend medical dosages.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold mt-0.5">✗</span>
                  <span><strong>Recommend clinical treatment plans</strong> without physician oversight.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold mt-0.5">✗</span>
                  <span><strong>Override emergency safety rules</strong> (Deterministic Red Flags ALWAYS win).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold mt-0.5">✗</span>
                  <span><strong>Replace the consulting physician</strong> who remains the sole clinical authority.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Fallback Resilience Note */}
          <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <div>
                <span className="font-bold block text-slate-100">Deterministic Fallback Architecture</span>
                <span className="text-[11px] text-slate-400">If Gemini is offline or rate-limited, local rule-based NLP automatically continues intake without interruption.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium">
            CarePrep SIH26047 • AI-Assisted Patient Intake Assistant
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
