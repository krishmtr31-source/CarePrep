import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../AuthContext';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '../../shared/contexts/LanguageContext';
import { CarePrepLogo } from '../../shared/components/CarePrepLogo';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck, 
  CheckCircle2, 
  Activity, 
  HelpCircle, 
  Globe2, 
  ChevronDown, 
  Check, 
  Sparkles, 
  Shield, 
  X,
  Mail
} from 'lucide-react';

interface PatientLoginPageProps {
  onSuccess: () => void;
  onGoToSignup: () => void;
  onBackToLanding: () => void;
}

export const PatientLoginPage: React.FC<PatientLoginPageProps> = ({
  onSuccess,
  onGoToSignup,
  onBackToLanding
}) => {
  const { login } = useAuth();
  const { language, setLanguage } = useLanguage();
  
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [demoNoticeMsg, setDemoNoticeMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);
  
  // Modals & Popovers
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [activeInfoModal, setActiveInfoModal] = useState<'privacy' | 'terms' | 'accessibility' | null>(null);
  
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  const handleSelectLang = (code: LanguageCode) => {
    setLanguage(code);
    setIsLangMenuOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrPhone.trim() || !password.trim()) {
      setErrorMsg('Please enter your email or mobile number and password.');
      return;
    }

    setErrorMsg('');
    setDemoNoticeMsg('');
    setIsLoading(true);

    try {
      const result = await login({
        emailOrPhone: emailOrPhone.trim(),
        password,
        role: 'patient'
      });

      if (result.success) {
        onSuccess();
      } else {
        setErrorMsg(result.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoFill = () => {
    setEmailOrPhone('rameshwar.sharma@example.com');
    setPassword('demo1234');
    setErrorMsg('');
    setDemoNoticeMsg('Sample Patient credentials loaded (Rameshwar Sharma • Chronic Care Case). Click "Sign In →" to enter.');
    setTimeout(() => {
      setDemoNoticeMsg('');
    }, 6000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      
      {/* ==================================================
          1. TOP NAVBAR (Clean, spacious, 70–76px)
          ================================================== */}
      <header className="h-[72px] sm:h-[76px] border-b border-slate-200/70 bg-white/95 backdrop-blur-md sticky top-0 z-30 transition-all">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-full flex items-center justify-between">
          
          {/* Left: CarePrep Logo with separate icon & text */}
          <div className="flex items-center">
            <CarePrepLogo onClick={onBackToLanding} />
          </div>

          {/* Right: Language Selector & Help/Support */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            {/* Language Picker Dropdown */}
            <div className="relative" ref={langDropdownRef}>
              <button
                type="button"
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                aria-expanded={isLangMenuOpen}
                aria-label={`Current language: ${currentLangObj.englishName}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer"
              >
                <Globe2 className="w-3.5 h-3.5 text-[#00A685]" />
                <span>{currentLangObj.englishName}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isLangMenuOpen ? 'rotate-180 text-[#00A685]' : ''}`} />
              </button>

              {isLangMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Language / भाषा
                  </div>
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = lang.code === language;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleSelectLang(lang.code)}
                        className={`w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-xs flex items-center justify-between rounded-xl transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-teal-50 text-[#00876B] font-bold' 
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span className="block font-semibold">{lang.nativeName}</span>
                          <span className="block text-[10px] text-slate-500">{lang.englishName}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#00A685]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Help & Support Button */}
            <button
              type="button"
              onClick={() => setIsHelpModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#5A6E85] hover:text-[#061A32] transition-colors py-1.5 px-2.5 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-[#5A6E85]" />
              <span className="hidden xs:inline">Help &amp; Support</span>
              <span className="xs:hidden">Help</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================================================
          2. MAIN CONTENT (Split-Screen: Left 50% / Right 50%)
          ================================================== */}
      <main className="flex-1 flex flex-col lg:flex-row w-full relative">
        
        {/* --------------------------------------------------
            LEFT SIDE: Healthcare Welcome Area (~50%)
            Background: Light Healthcare Blue (#F3F9FC)
            -------------------------------------------------- */}
        <section 
          className="lg:w-1/2 bg-[#F3F9FC] border-r border-slate-200/50 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 py-12 lg:py-16 relative overflow-hidden"
          aria-label="CarePrep Overview and Benefits"
        >
          {/* Subtle medical ambient graphic */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-100/30 via-sky-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-sky-100/40 via-teal-50/20 to-transparent rounded-full blur-3xl pointer-events-none" />

          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[480px] w-full mx-auto lg:mx-0 relative z-10"
          >
            {/* Small Label: Secure Patient Access */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4F1] border border-[#00A685]/20 text-[#00876B] text-xs font-semibold mb-6 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00A685]" />
              <span>Secure Patient Access</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl lg:text-[48px] xl:text-[52px] font-extrabold tracking-tight text-[#061A32] leading-[1.08] mb-5">
              Prepare Better.<br />
              <span className="text-[#00A685]">Care Smarter.</span>
            </h1>

            {/* Description */}
            <p className="text-[#5A6E85] text-base sm:text-[17px] leading-relaxed mb-10 max-w-[480px]">
              Organize your health information before your consultation, so you and your doctor can spend more time focusing on what matters.
            </p>

            {/* Three Benefits Rows */}
            <div className="space-y-5 sm:space-y-6">
              
              {/* Benefit 1 */}
              <div className="flex items-start gap-3.5 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-teal-100 text-[#00A685] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-200 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-[#00A685]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#061A32] leading-snug">
                    Organized Health Information
                  </h3>
                  <p className="text-xs sm:text-[13.5px] text-[#5A6E85] mt-0.5 leading-relaxed">
                    Keep your symptoms, history and records ready.
                  </p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="flex items-start gap-3.5 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-teal-100 text-[#00A685] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-200 mt-0.5">
                  <ShieldCheck className="w-5 h-5 text-[#00A685]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#061A32] leading-snug">
                    Secure &amp; Private
                  </h3>
                  <p className="text-xs sm:text-[13.5px] text-[#5A6E85] mt-0.5 leading-relaxed">
                    Your health information stays protected.
                  </p>
                </div>
              </div>

              {/* Benefit 3 */}
              <div className="flex items-start gap-3.5 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-teal-100 text-[#00A685] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-200 mt-0.5">
                  <Activity className="w-5 h-5 text-[#00A685]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#061A32] leading-snug">
                    Ready for Your Doctor
                  </h3>
                  <p className="text-xs sm:text-[13.5px] text-[#5A6E85] mt-0.5 leading-relaxed">
                    Share structured information before your consultation.
                  </p>
                </div>
              </div>

            </div>
          </motion.div>
        </section>

        {/* --------------------------------------------------
            RIGHT SIDE: Authentication Section (~50%)
            Background: Clean White (#FFFFFF)
            -------------------------------------------------- */}
        <section 
          className="lg:w-1/2 bg-white flex flex-col justify-center items-center px-6 sm:px-12 lg:px-16 xl:px-20 py-12 lg:py-16"
          aria-label="Patient Portal Login"
        >
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[440px]"
          >
            
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-[#061A32] tracking-tight">
                Welcome back
              </h2>
              <p className="text-[#5A6E85] text-sm sm:text-[15px] mt-1.5">
                Sign in to continue your CarePrep journey.
              </p>
            </div>

            {/* Segmented Control: [ Sign In ] [ Create Account ] */}
            <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl mb-6 text-sm font-semibold border border-slate-200/50">
              <button
                type="button"
                className="py-2 px-3 rounded-lg bg-white text-[#061A32] shadow-2xs font-bold text-center transition-all cursor-default"
                aria-current="page"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={onGoToSignup}
                className="py-2 px-3 rounded-lg text-[#5A6E85] hover:text-[#061A32] text-center transition-all cursor-pointer font-medium hover:bg-white/50"
              >
                Create Account
              </button>
            </div>

            {/* Error Message Alert */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 font-medium"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block">Sign In Error</span>
                    <span>{errorMsg}</span>
                  </div>
                  <button 
                    onClick={() => setErrorMsg('')} 
                    className="text-rose-500 hover:text-rose-800 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Demo Notice Alert */}
            <AnimatePresence>
              {demoNoticeMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 p-3.5 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-2.5 text-xs text-teal-800 font-medium"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#00A685] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block text-[#00876B]">Demo Credentials Ready</span>
                    <span>{demoNoticeMsg}</span>
                  </div>
                  <button 
                    onClick={() => setDemoNoticeMsg('')} 
                    className="text-teal-600 hover:text-teal-900 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Field 1: Email or Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-[#061A32] uppercase tracking-wider mb-1.5">
                  Email or mobile number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => {
                      setEmailOrPhone(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Enter your email or mobile number"
                    className="w-full h-[52px] pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00A685] focus:ring-4 focus:ring-[#00A685]/10 outline-none transition-all duration-150"
                    required
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[#061A32] uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotNotice(!showForgotNotice)}
                    className="text-xs font-semibold text-[#00A685] hover:text-[#00876B] hover:underline cursor-pointer transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    placeholder="Enter your password"
                    className="w-full h-[52px] pl-10 pr-11 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00A685] focus:ring-4 focus:ring-[#00A685]/10 outline-none transition-all duration-150"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Helper Notice */}
              <AnimatePresence>
                {showForgotNotice && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Password Recovery Notice</span>
                      <button 
                        onClick={() => setShowForgotNotice(false)} 
                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="leading-relaxed">
                      For SIH demonstration, use password <span className="font-mono font-bold text-[#00A685] bg-teal-50 px-1 py-0.5 rounded border border-teal-200">demo1234</span> or click the "Try Demo Patient" button below.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sign In Primary Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-[52px] sm:h-[54px] rounded-xl bg-[#00A685] hover:bg-[#008f72] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 cursor-pointer select-none"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Signing In...</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Demo Login Secondary Action */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleQuickDemoFill}
                  className="w-full h-[46px] rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs sm:text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#00A685]" />
                  <span>Try Demo Patient</span>
                </button>
              </div>
            </form>

            {/* Security Message at Bottom */}
            <div className="flex items-center justify-center gap-2 text-xs text-[#5A6E85] mt-6 select-none">
              <Shield className="w-3.5 h-3.5 text-[#00A685]" />
              <span>Your health information is handled securely.</span>
            </div>

          </motion.div>
        </section>

      </main>

      {/* ==================================================
          3. BOTTOM FOOTER (Subtle healthcare footer)
          ================================================== */}
      <footer className="border-t border-slate-200/60 bg-white py-4 px-6 sm:px-10 lg:px-12 w-full select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5A6E85]">
          
          {/* Left: Security Information */}
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A685] animate-pulse" />
            <span className="font-medium text-slate-600">Secure healthcare access</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="hidden sm:inline text-[11px] text-slate-400">DISHA &amp; ABDM Compliant Architecture</span>
          </div>

          {/* Right: Privacy, Terms, Accessibility Links */}
          <div className="flex items-center gap-4 sm:gap-6 font-medium">
            <button
              type="button"
              onClick={() => setActiveInfoModal('privacy')}
              className="hover:text-[#061A32] hover:underline transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoModal('terms')}
              className="hover:text-[#061A32] hover:underline transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              type="button"
              onClick={() => setActiveInfoModal('accessibility')}
              className="hover:text-[#061A32] hover:underline transition-colors cursor-pointer"
            >
              Accessibility
            </button>
          </div>
        </div>
      </footer>

      {/* ==================================================
          MODALS & DIALOGS
          ================================================== */}

      {/* Help & Support Modal */}
      <AnimatePresence>
        {isHelpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00A685] flex items-center justify-center font-bold">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#061A32]">Help &amp; Support</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHelpModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">How CarePrep Works</h4>
                  <p className="mt-1">
                    CarePrep enables you to organize your clinical symptoms, medical history, and lab reports before your doctor consultation, giving your physician structured insights in advance.
                  </p>
                </div>

                <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl space-y-1">
                  <span className="font-bold text-[#00876B] block">Demo Credentials</span>
                  <p>Email: <span className="font-mono font-bold">rameshwar.sharma@example.com</span></p>
                  <p>Password: <span className="font-mono font-bold">demo1234</span></p>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900">
                  <span className="font-bold block">Medical Emergency Notice</span>
                  <p className="mt-0.5">
                    CarePrep is a pre-consultation intake tool. For life-threatening emergencies, immediately dial <strong>112</strong> or <strong>108</strong>, or visit your nearest hospital emergency department.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Care Coordinator Support</span>
                  <span className="font-bold text-slate-700">support@careprep.health</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Info Modals: Privacy / Terms / Accessibility */}
      <AnimatePresence>
        {activeInfoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-[#061A32]">
                  {activeInfoModal === 'privacy' && 'Healthcare Privacy Policy'}
                  {activeInfoModal === 'terms' && 'Terms of Healthcare Service'}
                  {activeInfoModal === 'accessibility' && 'Accessibility Statement'}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveInfoModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-slate-600 space-y-2.5 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
                {activeInfoModal === 'privacy' && (
                  <>
                    <p className="font-semibold text-slate-800">Your health data is private and encrypted.</p>
                    <p>
                      CarePrep complies with the Digital Information Security in Healthcare Act (DISHA) and Ayushman Bharat Digital Mission (ABDM) standards. All health information entered into this portal is encrypted at rest and in transit.
                    </p>
                    <p>
                      Your data is shared exclusively with your designated healthcare provider during your scheduled consultation and is never sold or used for commercial advertising.
                    </p>
                  </>
                )}

                {activeInfoModal === 'terms' && (
                  <>
                    <p className="font-semibold text-slate-800">Pre-Consultation Intake Service</p>
                    <p>
                      CarePrep provides intelligent pre-consultation intake services designed to assist healthcare professionals in collecting structured clinical summaries.
                    </p>
                    <p>
                      CarePrep does not provide definitive medical diagnoses. All diagnostic and therapeutic decisions remain under the sole judgment of qualified healthcare practitioners.
                    </p>
                  </>
                )}

                {activeInfoModal === 'accessibility' && (
                  <>
                    <p className="font-semibold text-slate-800">Commitment to Digital Accessibility</p>
                    <p>
                      CarePrep is committed to ensuring digital accessibility for people with disabilities, following WCAG 2.1 Level AA guidelines.
                    </p>
                    <p>
                      Features include semantic heading hierarchy, high color contrast ratios, screen reader compatible form controls, keyboard navigability, and multi-language support (English, हिन्दी, தமிழ்).
                    </p>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActiveInfoModal(null)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
