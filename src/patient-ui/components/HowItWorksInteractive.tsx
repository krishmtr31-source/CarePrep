import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Mic, 
  Layers, 
  Stethoscope, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Activity, 
  ShieldCheck, 
  FileText, 
  Clock, 
  Sparkles,
  Volume2,
  Globe2,
  Heart,
  ChevronRight,
  ClipboardList,
  AlertCircle
} from 'lucide-react';

interface HowItWorksInteractiveProps {
  onGetStarted: () => void;
}

interface WorkflowStep {
  id: number;
  number: string;
  navTitle: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  points: string[];
}

const STEPS: WorkflowStep[] = [
  {
    id: 1,
    number: '01',
    navTitle: 'Create Profile',
    title: 'Create Your Profile',
    subtitle: 'Begin with your basic health identity',
    description: 'Start with your basic information and create your CarePrep health profile in under a minute.',
    icon: User,
    points: [
      'Basic demographics & primary contact details',
      'Optional ABHA (Ayushman Bharat Health Account) linking',
      'Select your preferred native language (English, Hindi, Tamil)'
    ]
  },
  {
    id: 2,
    number: '02',
    navTitle: 'Share Your Story',
    title: 'Share Your Health Story',
    subtitle: 'Guided symptom sharing without medical jargon',
    description: 'Describe your symptoms in your preferred language and complete the guided pre-consultation assessment at your own pace.',
    icon: Mic,
    points: [
      'Natural voice input or easy typing in your mother tongue',
      'Structured clinical questions based on the SOCRATES model',
      'Immediate emergency red-flag safety screening'
    ]
  },
  {
    id: 3,
    number: '03',
    navTitle: 'Organize Information',
    title: 'CarePrep Organizes Your Information',
    subtitle: 'From scattered inputs into clear clinical structure',
    description: 'Your responses and uploaded medical documents are organized into a structured pre-consultation view before you arrive.',
    icon: Layers,
    points: [
      'Instant OCR digitization of previous prescriptions & lab tests',
      'Categorized overview of allergies, history, and active medications',
      'Deterministic rule engine ensures zero medical hallucinations'
    ]
  },
  {
    id: 4,
    number: '04',
    navTitle: 'Doctor Review',
    title: 'Doctor Reviews Your Case',
    subtitle: 'Giving physicians a high-clarity head start',
    description: 'Your structured information is presented to the doctor for review before or during the consultation, restoring focus to direct care.',
    icon: Stethoscope,
    points: [
      'EMR-ready clinical SOAP summary ready before you walk in',
      'Saves 8–10 minutes of repetitive paperwork per encounter',
      '100% human doctor judgment — physician always confirms & treats'
    ]
  }
];

export const HowItWorksInteractive: React.FC<HowItWorksInteractiveProps> = ({ onGetStarted }) => {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Auto-progress scroll observation: gently activates steps as the section scrolls into view
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!sectionRef.current) return;
          const rect = sectionRef.current.getBoundingClientRect();
          const windowHeight = window.innerHeight;

          // If the section is prominently visible in the viewport
          if (rect.top <= windowHeight * 0.35 && rect.bottom >= windowHeight * 0.4) {
            const progress = Math.min(Math.max((windowHeight * 0.35 - rect.top) / (rect.height * 0.6), 0), 1);
            if (progress < 0.25) setActiveStep(1);
            else if (progress < 0.5) setActiveStep(2);
            else if (progress < 0.75) setActiveStep(3);
            else setActiveStep(4);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentStep = STEPS.find(s => s.id === activeStep) || STEPS[0];

  return (
    <div ref={sectionRef} className="w-full bg-slate-50/60 py-20 lg:py-28 border-t border-slate-200/80 select-none">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        
        {/* ======================================================== */}
        {/* 1. SECTION HERO & INTRO                                 */}
        {/* ======================================================== */}
        <div className="max-w-3xl mb-16 lg:mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold tracking-wider uppercase">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            <span>How CarePrep Works</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              From Your Health Story
              <br />
              <span className="text-emerald-700">to a Consultation-Ready Summary.</span>
            </h2>

            {/* Subtle healthcare ECG pulse line illustration */}
            <div className="hidden lg:flex items-center text-emerald-500/80 flex-shrink-0" aria-hidden="true">
              <svg width="180" height="48" viewBox="0 0 180 48" fill="none" className="stroke-current">
                <path 
                  d="M0 24H45L52 10L62 38L72 18L80 28L88 24H180" 
                  strokeWidth="2.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="transition-all duration-300"
                />
              </svg>
            </div>
          </div>

          <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-2xl">
            CarePrep helps you organize important health information before your consultation, so your doctor can understand your case more clearly from the start.
          </p>
        </div>

        {/* ======================================================== */}
        {/* 2. 4-STEP HORIZONTAL WORKFLOW (DESKTOP) / TIMELINE (MOBILE) */}
        {/* ======================================================== */}
        <div className="mb-10 lg:mb-14">
          
          {/* Desktop Connected Steps */}
          <div className="hidden md:block relative">
            {/* Background Connector Bar */}
            <div className="absolute top-7 left-12 right-12 h-1 bg-slate-200 rounded-full z-0" />
            
            {/* Animated Progress Connector Bar */}
            <div 
              className="absolute top-7 left-12 h-1 bg-emerald-600 rounded-full transition-all duration-400 ease-out z-0"
              style={{
                width: `${((activeStep - 1) / (STEPS.length - 1)) * 100}%`,
                maxWidth: 'calc(100% - 6rem)'
              }}
            />

            {/* Step Nodes */}
            <div className="relative z-10 grid grid-cols-4 gap-4" role="tablist" aria-label="CarePrep Workflow Steps">
              {STEPS.map((step) => {
                const isActive = activeStep === step.id;
                const isPassed = activeStep > step.id;
                const isHovered = hoveredStep === step.id;
                const StepIcon = step.icon;

                return (
                  <button
                    key={step.id}
                    type="button"
                    role="tab"
                    id={`step-tab-${step.id}`}
                    aria-selected={isActive}
                    aria-controls={`step-panel-${step.id}`}
                    onClick={() => setActiveStep(step.id)}
                    onMouseEnter={() => setHoveredStep(step.id)}
                    onMouseLeave={() => setHoveredStep(null)}
                    className="flex flex-col items-start text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-2xl p-2 -m-2 cursor-pointer group transition-all"
                  >
                    {/* Circle Node */}
                    <div className="flex items-center gap-3 mb-3.5">
                      <div 
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-sm transition-all duration-250 ${
                          isActive
                            ? 'bg-slate-900 text-white shadow-lg ring-4 ring-emerald-100 scale-105'
                            : isPassed
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : isHovered
                            ? 'bg-white border-2 border-emerald-500 text-emerald-700 shadow-sm'
                            : 'bg-white border-2 border-slate-200 text-slate-500 group-hover:border-slate-300'
                        }`}
                      >
                        <StepIcon className={`w-5 h-5 transition-transform duration-200 ${isHovered || isActive ? 'scale-110' : ''}`} />
                      </div>
                      <span className={`text-xs font-extrabold tracking-wider ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {step.number}
                      </span>
                    </div>

                    {/* Step Nav Label */}
                    <span className={`text-sm font-bold tracking-tight transition-colors duration-200 ${
                      isActive ? 'text-slate-900 font-extrabold' : 'text-slate-600 group-hover:text-slate-900'
                    }`}>
                      {step.navTitle}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium mt-0.5 line-clamp-1">
                      {step.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Vertical Timeline Accordion Selector */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 no-scrollbar" role="tablist">
            {STEPS.map((step) => {
              const isActive = activeStep === step.id;
              const StepIcon = step.icon;

              return (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveStep(step.id)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <StepIcon className="w-3.5 h-3.5" />
                  <span>{step.number} {step.navTitle}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. DYNAMIC INTERACTIVE CONTENT PANEL                     */}
        {/* ======================================================== */}
        <div 
          id={`step-panel-${currentStep.id}`}
          role="tabpanel"
          aria-labelledby={`step-tab-${currentStep.id}`}
          className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 p-8 sm:p-10 lg:p-14 items-center">
            
            {/* Left Side: Step Details & Explanation */}
            <div className="lg:col-span-6 space-y-6">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full uppercase tracking-wider">
                  Step {currentStep.number} of 04
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  {currentStep.navTitle}
                </span>
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                  {currentStep.title}
                </h3>
                <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed mt-3">
                  {currentStep.description}
                </p>
              </div>

              {/* Verified Clinical / Patient Benefit Points */}
              <div className="space-y-3 pt-2">
                {currentStep.points.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-slate-700 leading-snug">
                      {point}
                    </span>
                  </div>
                ))}
              </div>

              {/* Step Navigation Controls */}
              <div className="pt-4 flex items-center gap-3 border-t border-slate-100">
                {activeStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveStep(activeStep - 1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>
                )}

                {activeStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setActiveStep(activeStep + 1)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <span>Next: {STEPS[activeStep].navTitle}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onGetStarted}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <span>Ready to Start? Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Right Side: Interactive Visual Demonstration */}
            <div className="lg:col-span-6 flex items-center justify-center">
              <div className="w-full max-w-md bg-slate-50/80 rounded-2xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
                
                {/* Visual for Step 01: Profile */}
                {activeStep === 1 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Health Profile</span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                        Secure &amp; Private
                      </span>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3 group hover:border-emerald-300 transition-colors">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-base">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Patient Demographics</p>
                          <p className="text-xs text-slate-500">Age, Gender, Preferred Contact</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold block">Primary Language</span>
                          <span className="font-semibold text-slate-800">English / हिन्दी / தமிழ்</span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold block">ABHA Health ID</span>
                          <span className="font-semibold text-emerald-700">91-XXXX-XXXX-1122</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 text-center">
                      Hover to inspect abstract health profile fields
                    </p>
                  </div>
                )}

                {/* Visual for Step 02: Story & Guided Symptoms */}
                {activeStep === 2 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Voice &amp; Guided Intake</span>
                      <span className="text-[11px] font-bold text-teal-800 bg-teal-100/70 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-teal-700" />
                        <span>Natural Speech</span>
                      </span>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <Mic className="w-4 h-4 text-emerald-600 animate-pulse" />
                        <span>"पिछले 3 दिनों से सीने में भारीपन महसूस हो रहा है..."</span>
                      </div>

                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          SOCRATES Clinical Breakdown
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                            Site: Chest (Central)
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                            Onset: 3 Days ago
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                            Character: Pressure
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                            Exacerbation: Exertion
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                      <span>✓ 0 Medical jargon required</span>
                      <span>✓ Screened for acute flags</span>
                    </div>
                  </div>
                )}

                {/* Visual for Step 03: CarePrep Organizes (Transformation) */}
                {activeStep === 3 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Organization Engine</span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                        Structuring Active
                      </span>
                    </div>

                    {/* Transformation Flow: 5 Cards -> One Document */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-700">
                        <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Symptoms</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center gap-1.5">
                          <ClipboardList className="w-3.5 h-3.5 text-teal-600" />
                          <span>Medical History</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-rose-500" />
                          <span>Medications</span>
                        </div>
                        <div className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>Lab Reports OCR</span>
                        </div>
                      </div>

                      {/* Directional Indicator */}
                      <div className="flex items-center justify-center py-1 text-slate-400">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                          ↓ Transformed into Single Structured Case
                        </span>
                      </div>

                      {/* Structured Document Result */}
                      <div className="bg-white rounded-xl p-3.5 border-2 border-emerald-500/30 shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                          <span>Verified Pre-Consultation Summary</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Ready</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Chief complaint parsed • Chronological timeline organized • Drug interactions checked • Red flags screened.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Visual for Step 04: Doctor Workspace */}
                {activeStep === 4 && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/70">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Physician EMR Workstation</span>
                      <span className="text-[11px] font-bold text-slate-900 bg-slate-200/80 px-2.5 py-0.5 rounded-full">
                        Doctor Triage
                      </span>
                    </div>

                    <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-slate-900">Dr. Consultation View</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          10 Mins Saved
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="p-2 rounded bg-slate-50 border border-slate-100 flex justify-between">
                          <span className="text-slate-500 font-medium">1. Chief Complaint</span>
                          <span className="font-bold text-slate-800">Organized &amp; Formatted</span>
                        </div>
                        <div className="p-2 rounded bg-slate-50 border border-slate-100 flex justify-between">
                          <span className="text-slate-500 font-medium">2. Medical History &amp; Meds</span>
                          <span className="font-bold text-slate-800">Reconciled</span>
                        </div>
                        <div className="p-2 rounded bg-slate-50 border border-slate-100 flex justify-between">
                          <span className="text-slate-500 font-medium">3. Digitized Reports</span>
                          <span className="font-bold text-slate-800">Attached</span>
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Physician always confirms</span>
                        </span>
                        <span>Full doctor sign-off</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. "WHY CAREPREP?" 3-BENEFIT VALUE SECTION              */}
        {/* ======================================================== */}
        <div className="mt-24 lg:mt-32">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Why CarePrep?
            </h3>
            <p className="text-base text-slate-600">
              Three clear benefits that transform how consultations begin for both patients and healthcare providers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Benefit 1 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 w-fit px-3 py-1 rounded-full mb-5">
                  01 • PREPARATION
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2.5">
                  Be Prepared
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Have important information ready before your consultation. Take your time at home to remember symptoms, timelines, and previous prescriptions.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Clock className="w-4 h-4 text-emerald-600" />
                <span>No rushed clinic waiting room forms</span>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="text-xs font-black text-teal-800 bg-teal-50 border border-teal-200 w-fit px-3 py-1 rounded-full mb-5">
                  02 • CLARITY
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2.5">
                  Be Clear
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Turn scattered health information into a structured view. Our clinical structuring model organizes your symptoms into standard clinical format without medical jargon.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <FileText className="w-4 h-4 text-teal-600" />
                <span>Clear chronological clinical timeline</span>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-200 flex flex-col justify-between">
              <div>
                <div className="text-xs font-black text-slate-800 bg-slate-100 border border-slate-200 w-fit px-3 py-1 rounded-full mb-5">
                  03 • CONNECTION
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2.5">
                  Be Connected
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Give your doctor a clearer starting point for the consultation. Doctors spend less time manually collecting routine paperwork and more time examining and caring for you.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Stethoscope className="w-4 h-4 text-emerald-600" />
                <span>Restores empathetic doctor-patient dialogue</span>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. FINAL CALL TO ACTION (CTA)                           */}
        {/* ======================================================== */}
        <div className="mt-20 lg:mt-28 bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/90 shadow-sm text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ready in Under 2 Minutes</span>
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Ready for a more prepared consultation?
            </h3>
            <p className="text-base text-slate-600 max-w-xl mx-auto">
              Create your CarePrep profile and get started. No appointments needed to prepare your pre-consultation information.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-sm hover:shadow-md transition-all duration-200 active:scale-98 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all duration-200 cursor-pointer"
            >
              <span>Return to Top ↑</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
