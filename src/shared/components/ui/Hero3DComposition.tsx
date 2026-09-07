import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Heart, 
  Stethoscope, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  User, 
  Pill,
  TrendingUp,
  Brain
} from 'lucide-react';
import { GlassCard } from './DesignSystem';

export const Hero3DComposition: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Normalized between -1 and 1
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      setMousePos({ 
        x: Math.max(-1, Math.min(1, x)), 
        y: Math.max(-1, Math.min(1, y)) 
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Compute 3D rotations based on mousePos
  const rotX = mousePos.y * -8;
  const rotY = mousePos.x * 12;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[460px] sm:h-[520px] flex items-center justify-center select-none perspective-1000"
    >
      {/* 3D Root Stage with Mouse-following Tilt */}
      <motion.div 
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)`
        }}
        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        className="relative w-full max-w-[480px] h-full flex items-center justify-center"
      >
        {/* Ambient Glow behind composition */}
        <div 
          className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-emerald-400/20 via-teal-300/25 to-cyan-400/30 blur-3xl -z-10 pointer-events-none transform-gpu"
          style={{ transform: 'translateZ(-40px)' }}
        />

        {/* 1. Main Floating Medical Dashboard Card (Center-Depth) */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
          style={{ transform: 'translateZ(30px)' }}
          className="w-[320px] sm:w-[350px] bg-white/90 backdrop-blur-xl rounded-3xl p-5 border border-white/90 shadow-2xl shadow-slate-900/10"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 tracking-tight">CarePrep Clinical Intake</h4>
                <p className="text-[10px] text-slate-500">Autonomous Triage Engine</p>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Live
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">SOCRATES Case Completeness</span>
              <span className="font-extrabold text-emerald-700">92%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <motion.div 
                initial={{ width: '20%' }}
                animate={{ width: '92%' }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-400">Chief Complaint</div>
              <div className="text-xs font-bold text-slate-800 truncate mt-0.5">Sandhivata (Joint Pain)</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-400">AYUSH Prakriti</div>
              <div className="text-xs font-bold text-emerald-700 truncate mt-0.5">Vata-Pitta Predominant</div>
            </div>
          </div>
        </motion.div>

        {/* 2. Heartbeat Card with Live ECG (Top Right Floating) */}
        <motion.div
          animate={{ y: [0, -14, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 0.5 }}
          style={{ transform: 'translateZ(70px)' }}
          className="absolute -top-3 -right-2 sm:-right-6 w-48 bg-white/95 backdrop-blur-xl rounded-2xl p-3.5 border border-white/90 shadow-xl shadow-slate-900/10"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span className="text-[11px] font-bold text-slate-800">Heart Vitals</span>
            </div>
            <span className="text-xs font-extrabold text-rose-600">72 BPM</span>
          </div>

          {/* Animated Mini ECG Line */}
          <div className="h-8 w-full overflow-hidden flex items-center">
            <svg viewBox="0 0 160 30" className="w-full h-full text-rose-500">
              <motion.path
                d="M0,15 L35,15 L42,8 L48,22 L55,2 L62,28 L68,15 L105,15 L112,8 L118,22 L125,2 L132,28 L138,15 L160,15"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </svg>
          </div>
        </motion.div>

        {/* 3. Patient Profile Card with ABHA ID (Bottom Left Floating) */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut', delay: 1 }}
          style={{ transform: 'translateZ(60px)' }}
          className="absolute -bottom-4 -left-2 sm:-left-6 w-52 bg-white/95 backdrop-blur-xl rounded-2xl p-3.5 border border-white/90 shadow-xl shadow-slate-900/10"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 leading-tight">Rameshwar S.</div>
              <div className="text-[10px] font-mono text-slate-500">ABHA: 91-4562-7819</div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Age: 52 • Male</span>
            <span className="text-emerald-700 font-bold flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Verified
            </span>
          </div>
        </motion.div>

        {/* 4. AI Health Assistant Element (Top Left Floating) */}
        <motion.div
          animate={{ y: [0, -10, 0], rotate: [0, 3, 0] }}
          transition={{ repeat: Infinity, duration: 4.8, ease: 'easeInOut', delay: 0.2 }}
          style={{ transform: 'translateZ(90px)' }}
          className="absolute -top-6 -left-3 sm:-left-8 bg-gradient-to-tr from-slate-900 to-slate-800 text-white p-3 rounded-2xl shadow-xl shadow-slate-950/20 border border-slate-700 flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-emerald-300">Gemini 3.6 Flash</div>
            <div className="text-[9px] text-slate-300">Clinical Draft Engine</div>
          </div>
        </motion.div>

        {/* 5. Doctor Clinical Verification Badge (Bottom Right Floating) */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 6.2, ease: 'easeInOut', delay: 1.2 }}
          style={{ transform: 'translateZ(80px)' }}
          className="absolute -bottom-2 -right-3 sm:-right-4 bg-white/95 backdrop-blur-xl rounded-2xl p-3 border border-emerald-200/80 shadow-xl shadow-slate-900/10 flex items-center gap-2"
        >
          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-extrabold text-slate-900 leading-tight">Doctor Review</div>
            <div className="text-[9px] text-emerald-700 font-semibold">Mandatory Signoff</div>
          </div>
        </motion.div>

        {/* 6. Medical Cross Floating 3D Accent */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          style={{ transform: 'translateZ(100px)' }}
          className="absolute top-1/2 -right-8 w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-teal-500/30"
        >
          <Activity className="w-5 h-5" />
        </motion.div>
      </motion.div>
    </div>
  );
};
