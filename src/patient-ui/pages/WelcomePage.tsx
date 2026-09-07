import React, { useState } from 'react';
import { 
  ArrowRight, 
  Play, 
  X 
} from 'lucide-react';
import { ActiveScreen } from '../../App';
import { HowItWorksInteractive } from '../components/HowItWorksInteractive';

interface WelcomePageProps {
  onStart: () => void;
  onOpenDoctor: () => void;
  onSelectLanguage?: () => void;
  onNavigateToScreen?: (screen: ActiveScreen) => void;
  onOpenAuth?: (role?: 'patient' | 'doctor', mode?: 'login' | 'signup') => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({
  onStart,
  onNavigateToScreen,
  onOpenAuth
}) => {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  return (
    <div className="relative w-full bg-white flex flex-col overflow-x-hidden select-none">
      {/* 
        HERO SECTION (id="home")
        Occupies ~88–92vh (full viewport first screen below 64px header).
        Desktop: Left 45%, Right 55%
      */}
      <section 
        id="home" 
        className="relative w-full h-[calc(100vh-76px)] min-h-[570px] max-h-[850px] lg:min-h-[590px] flex items-center bg-white overflow-hidden"
      >
        {/* Full-Bleed Hero Artwork: Desktop uses existing /assets/hero-doctor.png anchored to the right */}
        <div 
          className="hidden lg:block absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-right-bottom pointer-events-none select-none z-0"
          style={{
            backgroundImage: `url('/assets/hero-doctor.png')`
          }}
        />

        {/* Soft, natural gradient on left to ensure crisp text readability without washing out the doctor */}
        <div 
          className="hidden lg:block absolute inset-0 bg-gradient-to-r from-white via-white/80 to-transparent w-full lg:w-[48%] xl:w-[44%] pointer-events-none z-10" 
        />

        {/* Hero Content Container */}
        <div className="relative z-20 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 w-full h-full flex items-center">
          <div className="w-full lg:w-[48%] xl:w-[45%] flex flex-col justify-center space-y-5 sm:space-y-6 py-6 sm:py-8 animate-hero-fade-up">
            
            {/* Main Heading: 2 lines with confident healthcare typography */}
            <h1 className="text-4xl sm:text-5xl md:text-[52px] lg:text-[58px] xl:text-[64px] font-extrabold tracking-[-0.03em] leading-[1.02] text-[#0A192F]">
              <span className="block text-[#0A192F]">Smarter Preparation.</span>
              <span className="block text-[#009B72]">Better Care.</span>
            </h1>

            {/* Description: Clean, highly readable typography */}
            <p className="text-base sm:text-lg lg:text-[19px] text-[#475569] font-normal leading-[1.58] max-w-[590px]">
              Prepare your health information before your consultation, so doctors can spend less time collecting information and more time caring for you.
            </p>

            {/* CTA Buttons: Primary Navy + Secondary White Pill */}
            <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onOpenAuth) onOpenAuth('patient', 'login');
                  else onStart();
                }}
                className="group inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full bg-[#0A192F] hover:bg-slate-800 text-white font-bold text-sm sm:text-base shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:translate-y-0 active:scale-98 cursor-pointer select-none"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsHowItWorksOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-800 font-bold text-sm sm:text-base shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-98 cursor-pointer select-none"
              >
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-slate-800 text-slate-800" />
                <span>See How It Works</span>
              </button>
            </div>

            {/* Trust Indicator: 4 Clean Avatars + Truthful Healthcare Professional Note */}
            <div className="flex items-center gap-3 pt-1.5 sm:pt-2">
              <div className="flex -space-x-2.5 overflow-hidden flex-shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces"
                  alt="Patient"
                  className="inline-block h-8 w-8 sm:h-9.5 sm:w-9.5 rounded-full ring-2 ring-white object-cover shadow-2xs"
                />
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces"
                  alt="Patient"
                  className="inline-block h-8 w-8 sm:h-9.5 sm:w-9.5 rounded-full ring-2 ring-white object-cover shadow-2xs"
                />
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=96&h=96&fit=crop&crop=faces"
                  alt="Doctor"
                  className="inline-block h-8 w-8 sm:h-9.5 sm:w-9.5 rounded-full ring-2 ring-white object-cover shadow-2xs"
                />
                <img
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=96&h=96&fit=crop&crop=faces"
                  alt="Doctor"
                  className="inline-block h-8 w-8 sm:h-9.5 sm:w-9.5 rounded-full ring-2 ring-white object-cover shadow-2xs"
                />
              </div>
              <span className="text-xs sm:text-[13px] text-slate-600 font-medium leading-snug">
                Trusted by patients
                <br />
                and healthcare professionals
              </span>
            </div>

            {/* Mobile Layout: Doctor Hero Image rendered naturally below buttons without overlapping text */}
            <div className="lg:hidden w-full pt-4 pb-2">
              <img 
                src="/assets/hero-doctor.png" 
                alt="CarePrep Doctor Consultation"
                className="w-full h-auto max-h-[380px] object-cover object-right rounded-2xl shadow-sm border border-slate-100"
              />
            </div>

          </div>
        </div>
      </section>

      {/* Interactive How It Works Modal (triggered when clicking "See How It Works") */}
      {isHowItWorksOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-y-auto border border-slate-100">
            <button
              type="button"
              onClick={() => setIsHowItWorksOpen(false)}
              className="absolute top-5 right-5 z-20 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              aria-label="Close How It Works modal"
            >
              <X className="w-5 h-5" />
            </button>
            <HowItWorksInteractive
              onGetStarted={() => {
                setIsHowItWorksOpen(false);
                if (onOpenAuth) onOpenAuth('patient', 'signup');
                else onStart();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
