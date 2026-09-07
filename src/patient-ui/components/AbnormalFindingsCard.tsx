import React from 'react';
import { AlertTriangle, AlertCircle, Info, Stethoscope, ChevronRight } from 'lucide-react';

export type FindingAttentionLevel = 'LOW ATTENTION' | 'REVIEW' | 'HIGH PRIORITY';

export interface AbnormalFindingItem {
  id: string;
  sourceType: 'LAB' | 'MEDICATION' | 'SYMPTOM' | 'VITALS';
  title: string;
  observedValue?: string;
  expectedOrReference?: string;
  level: FindingAttentionLevel;
  clinicalContext: string;
  suggestedAction: string;
}

interface AbnormalFindingsCardProps {
  findings?: AbnormalFindingItem[];
  patientName?: string;
  className?: string;
}

export const AbnormalFindingsCard: React.FC<AbnormalFindingsCardProps> = ({
  findings = [],
  patientName,
  className = ''
}) => {
  if (!findings || findings.length === 0) {
    return null;
  }

  const getLevelBadge = (level: FindingAttentionLevel) => {
    switch (level) {
      case 'HIGH PRIORITY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            High Priority Clinician Review
          </span>
        );
      case 'REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Review Recommended
          </span>
        );
      case 'LOW ATTENTION':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
            <Info className="w-3 h-3 text-blue-600" />
            Low Attention
          </span>
        );
    }
  };

  const getCardBorder = (level: FindingAttentionLevel) => {
    switch (level) {
      case 'HIGH PRIORITY':
        return 'border-rose-300 bg-rose-50/40';
      case 'REVIEW':
        return 'border-amber-300 bg-amber-50/30';
      case 'LOW ATTENTION':
      default:
        return 'border-blue-200 bg-blue-50/20';
    }
  };

  return (
    <div className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              Potential Clinical Review Flags ({findings.length})
            </h3>
            <p className="text-xs text-slate-500">
              Highlighted for physician review • Non-diagnostic assistive safety layer
            </p>
          </div>
        </div>

        <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full self-start sm:self-auto">
          For Doctor Discussion
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {findings.map((item) => (
          <div
            key={item.id}
            className={`p-4 rounded-2xl border transition-all ${getCardBorder(item.level)}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">{item.title}</span>
                {item.observedValue && (
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-900 shadow-2xs">
                    {item.observedValue}
                  </span>
                )}
              </div>
              {getLevelBadge(item.level)}
            </div>

            {item.expectedOrReference && (
              <div className="text-[11px] text-slate-500 mb-1.5">
                Reference Range: <span className="font-semibold text-slate-700">{item.expectedOrReference}</span>
              </div>
            )}

            <p className="text-xs text-slate-700 leading-relaxed">
              {item.clinicalContext}
            </p>

            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600">
                Action: {item.suggestedAction}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                {item.sourceType}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer Banner */}
      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
        <strong>Important Safety Note:</strong> CarePrep / SWASTHYA findings are preliminary observational flags derived from patient-submitted documents and symptoms. They do not constitute a medical diagnosis or treatment plan. Always consult your licensed physician for clinical interpretation.
      </div>
    </div>
  );
};
