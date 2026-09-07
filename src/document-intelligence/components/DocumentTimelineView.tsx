import React from 'react';
import { TimelineEvent } from '../models/document';
import { 
  Calendar, 
  Pill, 
  Activity, 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  User 
} from 'lucide-react';

interface DocumentTimelineViewProps {
  events: TimelineEvent[];
}

export const DocumentTimelineView: React.FC<DocumentTimelineViewProps> = ({ events }) => {
  if (!events || events.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
        No dated medical events or document timeline items recorded.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-emerald-600" />
          Chronological Medical Timeline ({events.length} Events)
        </h4>
        <span className="text-[11px] text-slate-400">Latest to Earliest</span>
      </div>

      <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {events.map((evt) => {
          const isHighFlag = evt.flag === 'HIGH' || evt.flag === 'CRITICAL';

          return (
            <div key={evt.id} className="relative group">
              {/* Timeline node icon */}
              <div
                className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ring-2 ${
                  isHighFlag
                    ? 'bg-rose-600 ring-rose-300 animate-pulse'
                    : evt.category === 'MEDICATION'
                    ? 'bg-emerald-600 ring-emerald-200'
                    : evt.category === 'LAB_RESULT'
                    ? 'bg-amber-500 ring-amber-200'
                    : 'bg-indigo-600 ring-indigo-200'
                }`}
              />

              <div className={`p-3.5 rounded-2xl border transition-all text-xs ${
                isHighFlag
                  ? 'bg-rose-50/60 border-rose-200 shadow-sm'
                  : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
              }`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-500">
                      {evt.date}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                      evt.provenance === 'AI_EXTRACTED_DOC' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      evt.provenance === 'PATIENT_REPORTED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {evt.provenance === 'AI_EXTRACTED_DOC' ? 'Doc Extracted' : 'Patient Reported'}
                    </span>
                  </div>

                  {evt.documentName && (
                    <span className="text-[11px] text-slate-400 truncate max-w-[140px]" title={evt.documentName}>
                      {evt.documentName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 mt-1">
                  {evt.category === 'MEDICATION' && <Pill className="w-3.5 h-3.5 text-emerald-600" />}
                  {evt.category === 'LAB_RESULT' && <Activity className="w-3.5 h-3.5 text-amber-600" />}
                  {evt.category === 'DIAGNOSIS' && <FileText className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>{evt.title}</span>
                </div>

                {evt.description && (
                  <p className="text-slate-600 mt-1 text-xs">
                    {evt.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
