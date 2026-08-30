import React from 'react';
import { ExtractedLabResult } from '../models/document';
import { AlertTriangle, TrendingUp, TrendingDown, ShieldAlert, ArrowUpRight } from 'lucide-react';

interface AbnormalLabAlertBannerProps {
  labResults: ExtractedLabResult[];
  onInspectTest?: (result: ExtractedLabResult) => void;
}

export const AbnormalLabAlertBanner: React.FC<AbnormalLabAlertBannerProps> = ({
  labResults,
  onInspectTest
}) => {
  const abnormalItems = labResults.filter(l => l.isAbnormal);

  if (abnormalItems.length === 0) return null;

  return (
    <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-950">
              Abnormal Laboratory Findings Detected ({abnormalItems.length})
            </h4>
            <p className="text-xs text-rose-700">
              Evaluated strictly against reference ranges provided in source lab report.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-200 text-rose-900 border border-rose-300">
          Source Flagged
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {abnormalItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onInspectTest?.(item)}
            className="p-3 bg-white rounded-2xl border border-rose-200 shadow-sm flex items-center justify-between gap-3 hover:border-rose-400 cursor-pointer transition-colors"
          >
            <div>
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                {item.flag === 'HIGH' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>{item.testName}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Source Reference: <strong className="text-slate-700">{item.sourceReferenceRange.raw} {item.unit}</strong>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-2 py-0.5 rounded-lg font-mono font-bold text-xs bg-rose-100 text-rose-800 border border-rose-200">
                {item.resultValue} {item.unit} [{item.flag}]
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
