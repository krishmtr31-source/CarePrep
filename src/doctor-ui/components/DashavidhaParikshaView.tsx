import React from 'react';
import { DoctorSummaryDraft } from '../../data-models/doctorSummary';
import { Leaf, Sparkles, Flame, Activity, Compass, HeartPulse, UserCheck, Stethoscope } from 'lucide-react';

interface DashavidhaParikshaViewProps {
  summary: DoctorSummaryDraft;
}

export const DashavidhaParikshaView: React.FC<DashavidhaParikshaViewProps> = ({ summary }) => {
  const ayush = summary.ayushAssessment || (summary as any).ayushDashavidha;
  if (!ayush) return null;

  const items = [
    { label: 'Prakriti (Basic Constitution)', value: ayush.prakriti, icon: <Sparkles className="w-4 h-4 text-emerald-600" /> },
    { label: 'Vikriti (Current Imbalance)', value: ayush.vikriti, icon: <Activity className="w-4 h-4 text-rose-500" /> },
    { label: 'Jatharagni (Digestive Capacity)', value: ayush.agni || ayush.aharaShakti, icon: <Flame className="w-4 h-4 text-amber-500" /> },
    { label: 'Koshtha (Bowel / Elimination)', value: ayush.koshtha || ayush.satmya, icon: <Compass className="w-4 h-4 text-teal-600" /> },
    { label: 'Ahara Shakti (Food Intake Power)', value: ayush.aharaShakti, icon: <Leaf className="w-4 h-4 text-green-600" /> },
    { label: 'Vyayama Shakti (Physical Stamina)', value: ayush.vyayamaShakti, icon: <HeartPulse className="w-4 h-4 text-indigo-600" /> }
  ].filter(i => Boolean(i.value && i.value !== 'Not provided.'));

  return (
    <div className="bg-emerald-50/40 rounded-2xl p-4 sm:p-5 border border-emerald-200/80 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-700" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
            Dashavidha Pariksha (दशविध परीक्षा Clinical Profile)
          </h4>
        </div>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
          Patient-reported AYUSH information
        </span>
      </div>

      {/* Grid of items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, idx) => (
          <div key={idx} className="bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
              {item.icon}
              <span>{item.label}</span>
            </div>
            <p className="text-xs text-slate-800 font-medium pl-5">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Clinical Assessment Distinction Box */}
      <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 flex items-start gap-2.5 text-xs">
        <Stethoscope className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-emerald-950 font-bold block">Clinician Assessment Notice:</strong>
          <p className="text-slate-600 mt-0.5">
            The parameters above represent patient-reported holistic indicators collected during intake. Clinician pulse diagnosis (Nadi Pariksha), tongue inspection (Jihva Pariksha), and constitutional evaluation are required prior to formulating an AYUSH Chikitsa plan.
          </p>
        </div>
      </div>
    </div>
  );
};
