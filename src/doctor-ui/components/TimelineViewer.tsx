import React from 'react';
import { IntakeAnswer } from '../../data-models/intake';
import { Clock, MessageSquare, Bot, AlertCircle } from 'lucide-react';

interface TimelineViewerProps {
  answers: IntakeAnswer[];
}

export const TimelineViewer: React.FC<TimelineViewerProps> = ({ answers }) => {
  if (!answers || answers.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200">
        No chronological history steps recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-600" />
          Intake Conversation Log & Timeline
        </h4>
        <span className="text-xs text-slate-400">{answers.length} verified steps</span>
      </div>

      <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {answers.map((ans, idx) => (
          <div key={idx} className="relative group">
            {/* Timeline node */}
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-sm ring-2 ring-emerald-200 group-hover:scale-110 transition-transform" />

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-400 font-medium">
                <span className="font-mono text-[11px] uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  {ans.step}
                </span>
                <span>{new Date(ans.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              {ans.selectedOptionIds && ans.selectedOptionIds.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {ans.selectedOptionIds.map((opt, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {opt}
                    </span>
                  ))}
                </div>
              )}

              {ans.customText && (
                <p className="text-slate-800 font-medium pt-1 italic bg-slate-50 p-2 rounded-xl border border-slate-100">
                  "{ans.customText}"
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
