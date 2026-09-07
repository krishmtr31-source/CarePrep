import React from 'react';
import { 
  Calendar, 
  FileText, 
  Stethoscope, 
  Pill, 
  Activity, 
  Clock, 
  ChevronRight, 
  Hospital,
  AlertTriangle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export interface TimelineEntry {
  id: string;
  date: string | Date;
  eventType: 'CONSULTATION' | 'REPORT' | 'PRESCRIPTION' | 'HOSPITALIZATION' | 'INTAKE';
  title: string;
  subtitle?: string;
  details?: string;
  badgeText?: string;
  badgeType?: 'emerald' | 'blue' | 'amber' | 'teal' | 'slate';
  doctorOrFacility?: string;
  rawPayload?: any;
}

interface HealthTimelineViewProps {
  entries: TimelineEntry[];
  onSelectEntry?: (entry: TimelineEntry) => void;
  title?: string;
  description?: string;
  className?: string;
}

export const HealthTimelineView: React.FC<HealthTimelineViewProps> = ({
  entries,
  onSelectEntry,
  title = 'Longitudinal Health Timeline',
  description = 'Chronological patient medical milestones, diagnostic records, and clinical encounters',
  className = ''
}) => {
  // Sort entries descending by date
  const sortedEntries = [...entries].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return timeB - timeA;
  });

  const getEventIcon = (type: TimelineEntry['eventType']) => {
    switch (type) {
      case 'CONSULTATION':
        return <Stethoscope className="w-4 h-4 text-blue-600" />;
      case 'REPORT':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'PRESCRIPTION':
        return <Pill className="w-4 h-4 text-purple-600" />;
      case 'HOSPITALIZATION':
        return <Hospital className="w-4 h-4 text-rose-600" />;
      case 'INTAKE':
      default:
        return <Activity className="w-4 h-4 text-teal-600" />;
    }
  };

  const getBadgeStyle = (badgeType?: string) => {
    switch (badgeType) {
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'amber':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'teal':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'slate':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 sm:p-7 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{title}</h3>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>
        <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 self-start sm:self-auto">
          {sortedEntries.length} Recorded Milestone{sortedEntries.length === 1 ? '' : 's'}
        </div>
      </div>

      {sortedEntries.length === 0 ? (
        <div className="p-8 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 text-center space-y-2">
          <Clock className="w-6 h-6 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-600">No medical milestones recorded yet.</p>
          <p className="text-[11px] text-slate-400">
            Intake submissions, uploaded lab reports, and physician consults will populate your timeline in real time.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {sortedEntries.map((item, index) => {
            const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            });

            return (
              <div key={item.id || index} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center group-hover:border-emerald-500 transition-colors shadow-2xs">
                  {getEventIcon(item.eventType)}
                </div>

                {/* Timeline Card */}
                <div 
                  onClick={() => onSelectEntry?.(item)}
                  className={`p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 transition-all ${
                    onSelectEntry ? 'hover:bg-white hover:border-emerald-300 hover:shadow-xs cursor-pointer' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{item.title}</span>
                      {item.badgeText && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getBadgeStyle(item.badgeType)}`}>
                          {item.badgeText}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono font-medium text-slate-500">
                      {formattedDate}
                    </span>
                  </div>

                  {item.subtitle && (
                    <div className="text-xs text-slate-700 font-medium">
                      {item.subtitle}
                    </div>
                  )}

                  {item.doctorOrFacility && (
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Facility / Clinician: <span className="font-semibold text-slate-700">{item.doctorOrFacility}</span>
                    </div>
                  )}

                  {item.details && (
                    <p className="text-[11px] text-slate-600 mt-2 bg-white/70 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
                      {item.details}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
