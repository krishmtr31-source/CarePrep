import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../AuthContext';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '../../shared/contexts/LanguageContext';
import { CarePrepLogo } from '../../shared/components/CarePrepLogo';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck, 
  CheckCircle2, 
  Check, 
  HelpCircle, 
  Globe2, 
  ChevronDown, 
  Shield, 
  X,
  Mail,
  FileText,
  Activity,
  Sparkles,
  ClipboardList
} from 'lucide-react';

interface PatientSignupPageProps {
  onSuccess: () => void;
  onGoToLogin: () => void;
  onBackToLanding: () => void;
}

export const PatientSignupPage: React.FC<PatientSignupPageProps> = ({
  onSuccess,
  onGoToLogin,
  onBackToLanding
}) => {
  const { signupPatient } = useAuth();
  const { language, setLanguage } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [abhaId, setAbhaId] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    if (!fullName.trim() || !emailOrPhone.trim() || !password.trim() || !age.trim()) {
      setErrorMsg('Please fill in all mandatory fields (Name, Email/Mobile, Password, Age).');
      return;
    }

    if (password.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your password.');
      return;
    }

    const numericAge = Number(age.trim());
    if (isNaN(numericAge) || numericAge <= 0 || numericAge > 125) {
      setErrorMsg('Please enter a valid age between 1 and 125.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      const result = await signupPatient({
        fullName: fullName.trim(),
        emailOrPhone: emailOrPhone.trim(),
        password,
        age: numericAge,
        gender,
        abhaId: abhaId.trim() || undefined
      });

      if (result.success) {
        onSuccess();
      } else {
        setErrorMsg(result.error || 'Registration failed. Please try again.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during signup.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      
      {/* ==================================================
          1. TOP NAVBAR (70–76px)
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
            LEFT SIDE: Healthcare Introduction (~50%)
            Background: Light Healthcare Blue (#F3F9FC)
            -------------------------------------------------- */}
        <section 
          className="lg:w-1/2 bg-[#F3F9FC] border-r border-slate-200/50 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 py-10 lg:py-16 relative overflow-hidden"
          aria-label="CarePrep Registration Overview"
        >
          {/* Subtle medical ambient gradient */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-teal-100/30 via-sky-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-sky-100/40 via-teal-50/20 to-transparent rounded-full blur-3xl pointer-events-none" />

          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-[480px] w-full mx-auto lg:mx-0 relative z-10"
          >
            {/* Small Label: Patient Registration */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6F4F1] border border-[#00A685]/20 text-[#00876B] text-xs font-semibold mb-6 shadow-2xs">
              <User className="w-3.5 h-3.5 text-[#00A685]" />
              <span>Patient Registration</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[50px] font-extrabold tracking-tight text-[#061A32] leading-[1.1] mb-5">
              Start your journey<br />
              to <span className="text-[#00A685]">better prepared care.</span>
            </h1>

            {/* Description */}
            <p className="text-[#5A6E85] text-base sm:text-[17px] leading-relaxed mb-8 max-w-[480px]">
              Create your CarePrep account to organize your health information before your next consultation.
            </p>

            {/* Three Simple Benefits */}
            <div className="space-y-4 sm:space-y-5 mb-8">
              
              {/* Benefit 1 */}
              <div className="flex items-start gap-3.5 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-teal-100 text-[#00A685] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-200 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-[#00A685]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#061A32] leading-snug">
                    Organize your health information
                  </h3>
                  <p className="text-xs sm:text-[13.5px] text-[#5A6E85] mt-0.5 leading-relaxed">
                    Keep your symptoms, history and records ready in one structured place.
                  </p>
                </div>
              </div>

              {/* Benefit 2 */}
              <div className="flex items-start gap-3.5 group">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-teal-100 text-[#00A685] flex items-center justify-center flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform duration-200 mt-0.5">
                  <ClipboardList className="w-5 h-5 text-[#00A685]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#061A32] leading-snug">
                    Prepare for your consultation
                  </h3>
                  <p className="text-xs sm:text-[13.5px] text-[#5A6E85] mt-0.5 leading-relaxed">
                    Answer structured clinical questions beforehand to save consultation time.
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
                    Share structured information with your doctor
                  </h3>
                  <p className="text-xs sm:text-[13.5px] text-[#5A6E85] mt-0.5 leading-relaxed">
                    Provide your doctor with a concise pre-consultation summary.
                  </p>
                </div>
              </div>

            </div>

            {/* Subtle Medical Visual: Clean Clinical Intake Summary Preview Card */}
            <div className="hidden sm:block p-4 rounded-2xl bg-white/90 border border-slate-200/80 shadow-2xs max-w-[440px]">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-teal-50 text-[#00A685] flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-bold text-[#061A32]">Pre-Consultation Intake</span>
                </div>
                <span className="text-[11px] font-semibold text-[#00A685] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60">
                  ABDM &amp; DISHA Ready
                </span>
              </div>
              <div className="pt-2.5 flex items-center justify-between text-[11px] text-[#5A6E85]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Encrypted Patient Health Record</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Shield className="w-3 h-3 text-[#00A685]" />
                  <span>Zero Commercial Data Sharing</span>
                </div>
              </div>
            </div>

          </motion.div>
        </section>

        {/* --------------------------------------------------
            RIGHT SIDE: Registration Form (~50%)
            Background: Clean White (#FFFFFF)
            -------------------------------------------------- */}
        <section 
          className="lg:w-1/2 bg-white flex flex-col justify-center items-center px-6 sm:px-10 lg:px-14 xl:px-18 py-10 lg:py-14"
          aria-label="Create Patient Account Form"
        >
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[480px]"
          >
            
            {/* Header */}
            <div className="mb-5">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-[#00A685] flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h2 className="text-2xl sm:text-[28px] font-extrabold text-[#061A32] tracking-tight">
                  Create your CarePrep account
                </h2>
              </div>
              <p className="text-[#5A6E85] text-xs sm:text-sm">
                Set up your profile to begin your pre-consultation preparation.
              </p>
            </div>

            {/* Segmented Control: [ Sign In ] [ Create Account ] */}
            <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl mb-5 text-xs sm:text-sm font-semibold border border-slate-200/50">
              <button
                type="button"
                onClick={onGoToLogin}
                className="py-2 px-3 rounded-lg text-[#5A6E85] hover:text-[#061A32] text-center transition-all cursor-pointer font-medium hover:bg-white/50"
              >
                Sign In
              </button>
              <button
                type="button"
                className="py-2 px-3 rounded-lg bg-white text-[#061A32] shadow-2xs font-bold text-center transition-all cursor-default"
                aria-current="page"
              >
                Create Account
              </button>
            </div>

            {/* Error Alert */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800 font-medium"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block">Registration Error</span>
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

            {/* Registration Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* SECTION 1: Personal Information */}
              <div>
                <div className="text-[11px] font-bold text-[#5A6E85] uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-100">
                  Personal Information
                </div>

                <div className="space-y-3">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#061A32] mb-1">
                      Full name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => {
                          setFullName(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="Enter your full name"
                        className="w-full h-[50px] pl-9 pr-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00A685] focus:ring-4 focus:ring-[#00A685]/10 outline-none transition-all duration-150"
                        required
                      />
                    </div>
                  </div>

                  {/* Email or Mobile Number */}
                  <div>
                    <label className="block text-xs font-semibold text-[#061A32] mb-1">
                      Email or mobile number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                        className="w-full h-[50px] pl-9 pr-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00A685] focus:ring-4 focus:ring-[#00A685]/10 outline-none transition-all duration-150"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Basic Details */}
              <div>
                <div className="text-[11px] font-bold text-[#5A6E85] uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-100">
                  Basic Details
                </div>

                <div className="space-y-3">
                  {/* Two-Column: Age & Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#061A32] mb-1">
                        Age <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => {
                          setAge(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="Enter age (e.g. 45)"
                        min={1}
                        max={125}
                        className="w-full h-[50px] px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00A685] focus:ring-4 focus:ring-[#00A685]/10 outline-none transition-all duration-150"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#061A32] mb-1">
                        Gender <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as any)}
                        className="w-full h-[50px] px-3 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 focus:border-[#00A685] focus:ring-4 focus:ring-[#00A685]/10 outline-none transition-all duration-150 cursor-pointer"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* ABHA ID (Optional) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#061A32]">
                        ABHA ID <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <span className="text-[11px] text-slate-400">Ayushman Bharat Health Account</span>
                    </div>
                    <input
                      type="text"
                      value={abhaId}
                      onChange={(e) => setAbhaId(e.target.value)}
                      placeholder="e.g. 91-4562-7819-2041"
                      className="w-full h-[50px] px-3.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00A685] focus:ring-4 focus:ring-[#00A685]/10 outline-none transition-all duration-150"
                    />
                    <p className="text-[11px] text-[#5A6E85] mt-1">
                      Add this later if you have an ABHA ID.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION 3: Security */}
              <div>
                <div className="text-[11px] font-bold text-[#5A6E85] uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-100">
                  Security
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Password */}
                  <div>
                    <label className="block text-xs font-semibold text-[#061A32] mb-1">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="At least 4 characters"
                        className="w-full h-[50px] pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00A685] focus:ring-4 focus:ring-[#00A685]/10 outline-none transition-all duration-150"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-xs font-semibold text-[#061A32] mb-1">
                      Confirm password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errorMsg) setErrorMsg('');
                        }}
                        placeholder="Re-enter password"
                        className="w-full h-[50px] pl-3.5 pr-10 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#00A685] focus:ring-4 focus:ring-[#00A685]/10 outline-none transition-all duration-150"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-[#5A6E85] mt-1">
                  Use at least 4 characters
                </p>
              </div>

              {/* Progress / Intake Explanation */}
              <div className="p-3 bg-[#F3F9FC] border border-teal-100 rounded-xl flex items-start gap-2.5 text-xs text-[#5A6E85] leading-relaxed">
                <Sparkles className="w-4 h-4 text-[#00A685] flex-shrink-0 mt-0.5" />
                <span>
                  After creating your account, you'll complete a short health profile before your consultation.
                </span>
              </div>

              {/* Primary Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="group w-full h-[52px] sm:h-[54px] rounded-xl bg-[#00A685] hover:bg-[#008f72] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 cursor-pointer select-none"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Creating Account...</span>
                    </div>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>

              {/* Login Link */}
              <div className="text-center text-xs text-[#5A6E85] pt-1">
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="font-bold text-[#00A685] hover:text-[#00876B] hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </div>

              {/* Security Statement */}
              <div className="flex items-center justify-center gap-1.5 text-xs text-[#5A6E85] pt-1 select-none">
                <Shield className="w-3.5 h-3.5 text-[#00A685]" />
                <span>Your information is handled securely.</span>
              </div>

            </form>

          </motion.div>
        </section>

      </main>

      {/* ==================================================
          3. BOTTOM FOOTER (Minimal healthcare footer)
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
              Terms
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
                  <h4 className="font-bold text-slate-900 text-sm">Account Creation Guidance</h4>
                  <p className="mt-1">
                    Your account enables you to submit your symptoms, pre-existing conditions, medications, and health records prior to your appointment.
                  </p>
                </div>

                <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl space-y-1">
                  <span className="font-bold text-[#00876B] block">What is an ABHA ID?</span>
                  <p>
                    Ayushman Bharat Health Account (ABHA) is an Indian digital health identification. It is optional during registration and can be linked later.
                  </p>
                </div>

                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900">
                  <span className="font-bold block">Medical Emergency Notice</span>
                  <p className="mt-0.5">
                    CarePrep is a pre-consultation intake platform. For emergency medical conditions, please call <strong>112</strong> or <strong>108</strong> immediately.
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
