import React, { useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  HelpCircle, 
  ExternalLink, 
  AlertCircle,
  IndianRupee,
  Building2,
  FileCheck
} from 'lucide-react';

interface HealthcareCostComparisonModalProps {
  facilityName?: string;
  opdFee?: number | null;
  specialistFee?: number | null;
  bedFee?: number | null;
  schemeEligibility?: {
    pmjayAyushmanBharat?: boolean | null;
    cghs?: boolean | null;
    echs?: boolean | null;
    esic?: boolean | null;
  } | null;
  onClose: () => void;
}

export const HealthcareCostComparisonModal: React.FC<HealthcareCostComparisonModalProps> = ({
  facilityName = 'Selected Healthcare Facility',
  opdFee = null,
  specialistFee = null,
  bedFee = null,
  schemeEligibility = null,
  onClose
}) => {
  const [selectedScheme, setSelectedScheme] = useState<'PM-JAY' | 'CGHS' | 'ECHS' | 'ESIC'>('PM-JAY');

  const schemes = [
    {
      id: 'PM-JAY',
      name: 'Ayushman Bharat PM-JAY',
      coverage: 'Up to ₹5,00,000 per family/year',
      beneficiary: 'Eligible SECC/ration card holders & ABHA linked',
      isAccepted: schemeEligibility ? schemeEligibility.pmjayAyushmanBharat : null,
      coPayNotice: 'Cashless treatment for secondary and tertiary hospitalizations at empaneled network hospitals.'
    },
    {
      id: 'CGHS',
      name: 'Central Government Health Scheme (CGHS)',
      coverage: 'Comprehensive cashless / fixed package rates',
      beneficiary: 'Central Government employees, pensioners & dependents',
      isAccepted: schemeEligibility ? schemeEligibility.cghs : null,
      coPayNotice: 'Reimbursement or direct cashless depending on hospital empanelment tier.'
    },
    {
      id: 'ECHS',
      name: 'Ex-Servicemen Contributory Health Scheme',
      coverage: 'Complete outpatient & inpatient care',
      beneficiary: 'Armed forces veterans & dependents',
      isAccepted: schemeEligibility ? schemeEligibility.echs : null,
      coPayNotice: 'Cashless treatment at empaneled private and service hospitals.'
    },
    {
      id: 'ESIC',
      name: 'Employees’ State Insurance Corporation (ESIC)',
      coverage: 'Full medical care from day one of insurable employment',
      beneficiary: 'Insured workers earning under statutory wage ceiling',
      isAccepted: schemeEligibility ? schemeEligibility.esic : null,
      coPayNotice: 'Free medical care in ESIC dispensaries/hospitals and tied-up tertiary facilities.'
    }
  ];

  const activeScheme = schemes.find(s => s.id === selectedScheme) || schemes[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-7 space-y-6 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Government Health Schemes & Cost Comparison
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {facilityName}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Transparent cost breakdown and benefits eligibility check
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing Matrix */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">General OPD Fee</span>
            <div className="text-base font-black text-slate-900 mt-1 flex items-center">
              {opdFee === 0 ? (
                <span className="text-emerald-700 font-extrabold">Free / ₹0</span>
              ) : typeof opdFee === 'number' ? (
                <>₹{opdFee}</>
              ) : (
                <span className="text-xs font-semibold text-slate-400">Information unavailable</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">Per registration</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Specialist Consultation</span>
            <div className="text-base font-black text-slate-900 mt-1 flex items-center">
              {specialistFee === 0 ? (
                <span className="text-emerald-700 font-extrabold">Free / ₹0</span>
              ) : typeof specialistFee === 'number' ? (
                <>₹{specialistFee}</>
              ) : (
                <span className="text-xs font-semibold text-slate-400">Information unavailable</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">Subject to doctor seniority</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">General Bed / Day</span>
            <div className="text-base font-black text-slate-900 mt-1 flex items-center">
              {bedFee === 0 ? (
                <span className="text-emerald-700 font-extrabold">Free / ₹0</span>
              ) : typeof bedFee === 'number' ? (
                <>₹{bedFee}</>
              ) : (
                <span className="text-xs font-semibold text-slate-400">Information unavailable</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">Ward admission rate</span>
          </div>
        </div>

        {/* Scheme Selector Tabs */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Check National Healthcare Scheme Coverage:
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {schemes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedScheme(s.id as any)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedScheme === s.id
                    ? 'border-emerald-500 bg-emerald-50/80 shadow-xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">{s.id}</div>
                <div className="flex items-center gap-1 mt-1 text-[10px]">
                  {s.isAccepted === true ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Empaneled
                    </span>
                  ) : s.isAccepted === false ? (
                    <span className="text-slate-400 font-medium">Not Empaneled</span>
                  ) : (
                    <span className="text-slate-400 font-medium italic">Check at desk</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Active Scheme Details Card */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-emerald-950">{activeScheme.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activeScheme.isAccepted === true 
                  ? 'bg-emerald-200 text-emerald-900' 
                  : activeScheme.isAccepted === false
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {activeScheme.isAccepted === true 
                  ? '✓ Empanelment Verified' 
                  : activeScheme.isAccepted === false 
                  ? 'Not Empaneled' 
                  : 'Empanelment to be verified at desk'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Benefit Coverage</span>
                <p className="font-bold text-slate-900">{activeScheme.coverage}</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Target Beneficiary</span>
                <p className="font-bold text-slate-900">{activeScheme.beneficiary}</p>
              </div>
            </div>

            <p className="text-[11px] text-emerald-900/90 pt-1 border-t border-emerald-200/60 leading-relaxed">
              <strong>Patient Note:</strong> {activeScheme.coPayNotice}
            </p>
          </div>
        </div>

        {/* Honest Disclaimer */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <span>Honest Healthcare Fee &amp; Scheme Disclaimer</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            Fees and scheme empanelment status are subject to real-time hospital administrative updates, bed categories, medication costs, and central/state health department notifications. Please verify at the hospital billing desk prior to admission.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            Close Cost Breakdown
          </button>
        </div>
      </div>
    </div>
  );
};
