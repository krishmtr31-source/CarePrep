import React from 'react';
import { 
  FileText, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  X, 
  Layers, 
  Stethoscope, 
  Search,
  ShieldCheck
} from 'lucide-react';

interface SihWhyThisMattersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SihWhyThisMattersModal: React.FC<SihWhyThisMattersModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                Why This Matters & Workflow Comparison
              </h3>
              <p className="text-xs text-slate-500">SIH26047 Solution Architecture Overview</p>
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
          {/* Main Problem & Solution Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/80 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4 text-rose-600" />
                The Clinical Problem
              </div>
              <p className="text-xs text-rose-900 leading-relaxed">
                Doctors routinely spend critical consultation minutes repeatedly asking basic demographic/symptom history, deciphering crumpled paper prescriptions, searching unorganized lab reports, and manually assembling timelines.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Our Pre-Consultation Solution
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                The platform empowers patients to provide multilingual history via voice, text, or touch and upload prior records before entering the clinic. It presents an evidence-traceable, timeline-structured case draft for the doctor's review.
              </p>
            </div>
          </div>

          {/* Before vs After Visualization */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Workflow Transformation (Before vs. After)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Traditional */}
              <div className="p-4 rounded-2xl bg-slate-100/90 border border-slate-200 space-y-3">
                <div className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Traditional Workflow</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-600">Manual & Slow</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Ask repetitive verbal questions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Search through loose paper reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Read multi-page discharge letters</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Manually compare prior vs current meds</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span>Write complete case notes by hand</span>
                  </li>
                </ul>
              </div>

              {/* Our System */}
              <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-300 space-y-3">
                <div className="font-bold text-xs text-emerald-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Our System Workflow</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">Pre-Assembled Draft</span>
                </div>
                <ul className="space-y-2 text-xs text-emerald-900 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Multi-modal multilingual patient interview</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>OCR extracts prescriptions, labs & dates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Chronological medical timeline generated</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Deterministic emergency red-flag screening</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Physician reviews, modifies & confirms</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Key Principle Footer Banner */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                <strong>Core Philosophy:</strong> The AI prepares and organizes evidence. The physician makes all clinical decisions.
              </span>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex-shrink-0"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
