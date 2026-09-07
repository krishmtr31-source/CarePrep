import React from 'react';
import { User, Stethoscope, ArrowRight, ShieldCheck, Activity, Sparkles, Lock, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../authTypes';
import { GlassCard, AnimatedCard, AnimatedButton } from '../../shared/components/ui/DesignSystem';

interface AuthLandingPageProps {
  onSelectRole: (role: UserRole, mode: 'login' | 'signup') => void;
}

export const AuthLandingPage: React.FC<AuthLandingPageProps> = ({ onSelectRole }) => {
  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 relative select-none">
      <div className="max-w-4xl w-full space-y-10 text-center relative z-10">
        
        {/* Brand Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 text-emerald-900 border border-emerald-300 text-xs font-bold shadow-2xs">
            <Activity className="w-4 h-4 text-emerald-600" />
            <span>AI-Powered Pre-Consultation Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Welcome to <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 bg-clip-text text-transparent">CarePrep</span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
            Select your portal to access intelligent clinical symptom capture, automated document interpretation, or physician triage handoff.
          </p>
        </div>

        {/* 3D Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
          
          {/* Card 1: Patient Portal (Calm & Welcoming) */}
          <AnimatedCard depth={4}>
            <GlassCard className="p-6 sm:p-8 h-full flex flex-col justify-between border border-emerald-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold shadow-inner group-hover:scale-105 transition-transform">
                  <User className="w-7 h-7 text-emerald-600" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900">Patient Portal</h2>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Patient
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                    Describe symptoms in your native tongue, upload previous records &amp; prepare a verified case summary before meeting your physician.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Multilingual Voice &amp; Text Intake</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Smart Document &amp; Lab Report OCR</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Clinical SOCRATES &amp; AYUSH Modes</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 space-y-2.5">
                <AnimatedButton
                  type="button"
                  onClick={() => onSelectRole('patient', 'login')}
                  variant="primary"
                  size="md"
                  iconRight={<ArrowRight className="w-4 h-4" />}
                  className="w-full"
                >
                  Sign In as Patient
                </AnimatedButton>
                <button
                  type="button"
                  onClick={() => onSelectRole('patient', 'signup')}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white/70 hover:bg-white text-slate-800 text-xs font-bold transition-colors text-center"
                >
                  Create New Patient Account
                </button>
              </div>
            </GlassCard>
          </AnimatedCard>

          {/* Card 2: Doctor Portal (Analytical & Professional) */}
          <AnimatedCard depth={4}>
            <GlassCard className="p-6 sm:p-8 h-full flex flex-col justify-between border border-slate-200 hover:border-slate-400 shadow-xs hover:shadow-md transition-all group bg-white">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-inner group-hover:scale-105 transition-transform">
                  <Stethoscope className="w-7 h-7 text-emerald-400" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900">Doctor Portal</h2>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                      Physician
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                    Access live waiting triage queues, SOCRATES summaries, longitudinal document timelines, and versioned clinical EMR export.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Real-Time Triage &amp; Priority Queue</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Verifiable Clinical AI Drafts (v1/v2)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span>Fast Rx &amp; FHIR-Ready Handoff</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 space-y-2.5">
                <AnimatedButton
                  type="button"
                  onClick={() => onSelectRole('doctor', 'login')}
                  variant="dark"
                  size="md"
                  iconRight={<ArrowRight className="w-4 h-4" />}
                  className="w-full"
                >
                  Sign In as Doctor
                </AnimatedButton>
                <button
                  type="button"
                  onClick={() => onSelectRole('doctor', 'signup')}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white/70 hover:bg-white text-slate-800 text-xs font-bold transition-colors text-center"
                >
                  Register Doctor Account
                </button>
              </div>
            </GlassCard>
          </AnimatedCard>
        </div>

        {/* Security & Local Architecture Notice */}
        <div className="max-w-md mx-auto flex items-center justify-center gap-2 text-xs text-slate-400">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Role-Protected Healthcare Architecture • Local SIH Demonstration</span>
        </div>
      </div>
    </div>
  );
};
