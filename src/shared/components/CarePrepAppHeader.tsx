import React, { useState, useEffect, useRef } from 'react';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '../contexts/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { 
  Stethoscope, 
  Globe2, 
  CheckCircle2, 
  Sparkles,
  HelpCircle,
  Menu,
  X,
  ChevronDown,
  User,
  Shield,
  Activity,
  LogOut,
  Lock,
  LogIn
} from 'lucide-react';
import { ActiveScreen } from '../../App';
import { llmGateway } from '../../ai-services/llm/LLMGateway';
import { WhatGeminiDoesModal } from './WhatGeminiDoesModal';
import { SihWhyThisMattersModal } from './SihWhyThisMattersModal';
import { CarePrepLogo } from './CarePrepLogo';

interface CarePrepAppHeaderProps {
  currentScreen: ActiveScreen;
  onNavigateToScreen?: (screen: ActiveScreen) => void;
  onSelectLanguage?: () => void;
  onOpenAuth?: (role?: 'patient' | 'doctor', mode?: 'login' | 'signup') => void;
}

export const CarePrepAppHeader: React.FC<CarePrepAppHeaderProps> = ({
  currentScreen,
  onNavigateToScreen,
  onSelectLanguage,
  onOpenAuth
}) => {
  const { language, setLanguage } = useLanguage();
  const { user, isAuthenticated, isPatient, isDoctor, logout } = useAuth();
  
  type NavItemKey = 'home' | 'how-it-works' | 'for-patients' | 'for-doctors' | 'about';

  const NAV_ITEMS: { key: NavItemKey; label: string }[] = [
    { key: 'home', label: 'Home' },
    { key: 'how-it-works', label: 'How it Works' },
    { key: 'for-patients', label: 'For Patients' },
    { key: 'for-doctors', label: 'For Doctors' },
    { key: 'about', label: 'About' },
  ];

  const [activeNav, setActiveNav] = useState<NavItemKey>('home');
  const [isScrolled, setIsScrolled] = useState(false);
  const [providerStatus, setProviderStatus] = useState(llmGateway.getProviderStatus());
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [isWhatGeminiModalOpen, setIsWhatGeminiModalOpen] = useState(false);
  const [isWhyMattersModalOpen, setIsWhyMattersModalOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check live LLM connection on mount
    setIsCheckingConnection(true);
    llmGateway.checkLiveConnection()
      .then(() => {
        setProviderStatus(llmGateway.getProviderStatus());
      })
      .catch(() => {
        setProviderStatus(llmGateway.getProviderStatus());
      })
      .finally(() => {
        setIsCheckingConnection(false);
      });
  }, []);

  // Scroll listener: handles navbar compacting and active nav scrollspy
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 20);

      if (currentScreen === 'welcome') {
        const sectionIds: NavItemKey[] = ['about', 'for-doctors', 'for-patients', 'how-it-works'];
        let matched = false;
        for (const id of sectionIds) {
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 220 && rect.bottom >= 100) {
              setActiveNav(id);
              matched = true;
              break;
            }
          }
        }
        if (!matched || scrollY < 150) {
          setActiveNav('home');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentScreen]);

  // Close language dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determine active patient step index
  let activeStep = 0;
  if (['welcome', 'language', 'identity', 'consent', 'mode', 'intake'].includes(currentScreen)) {
    activeStep = 0; // Intake & Symptoms
  } else if (currentScreen === 'documents') {
    activeStep = 1; // Health Records
  } else if (currentScreen === 'success') {
    activeStep = 2; // Clinical Summary
  } else if (currentScreen === 'doctor') {
    activeStep = 3; // Doctor Review
  }

  const steps = [
    { number: 1, label: 'Case Intake', screenTarget: 'welcome' as ActiveScreen },
    { number: 2, label: 'Health Records', screenTarget: 'documents' as ActiveScreen },
    { number: 3, label: 'Clinical Summary', screenTarget: 'success' as ActiveScreen },
    { number: 4, label: 'Doctor Review', screenTarget: 'success' as ActiveScreen }
  ];

  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  const handleSelectLang = (code: LanguageCode) => {
    setLanguage(code);
    setIsLanguageMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const handleBrandClick = () => {
    setActiveNav('home');
    if (!isAuthenticated) {
      if (currentScreen !== 'welcome') {
        onNavigateToScreen && onNavigateToScreen('welcome');
      }
    } else if (isDoctor) {
      onNavigateToScreen && onNavigateToScreen('doctor');
    } else {
      onNavigateToScreen && onNavigateToScreen('patient_dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavClick = (key: NavItemKey) => {
    setActiveNav(key);
    setIsMobileMenuOpen(false);

    if (key === 'home') {
      if (currentScreen !== 'welcome') {
        onNavigateToScreen && onNavigateToScreen('welcome');
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    if (currentScreen !== 'welcome') {
      onNavigateToScreen && onNavigateToScreen('welcome');
      setTimeout(() => {
        const target = document.getElementById(key);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        } else if (key === 'about') {
          setIsWhatGeminiModalOpen(true);
        }
      }, 120);
      return;
    }

    const target = document.getElementById(key);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    } else {
      if (key === 'for-patients') {
        if (isAuthenticated && isPatient) {
          onNavigateToScreen && onNavigateToScreen('patient_dashboard');
        } else if (onOpenAuth) {
          onOpenAuth('patient', 'login');
        } else {
          onNavigateToScreen && onNavigateToScreen('patient_login');
        }
      } else if (key === 'for-doctors') {
        if (isAuthenticated && isDoctor) {
          onNavigateToScreen && onNavigateToScreen('doctor');
        } else if (onOpenAuth) {
          onOpenAuth('doctor', 'login');
        } else {
          onNavigateToScreen && onNavigateToScreen('doctor_login');
        }
      } else if (key === 'about') {
        setIsWhatGeminiModalOpen(true);
      }
    }
  };

  return (
    <>
      <header 
        className={`sticky top-0 z-40 transition-all duration-300 ease-in-out select-none bg-white/95 backdrop-blur-md ${
          isScrolled 
            ? 'border-b border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)]' 
            : 'border-b border-slate-200/60 shadow-[0_1px_4px_0_rgba(0,0,0,0.02)]'
        }`}
      >
        {/* Main Enterprise Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 overflow-visible">
          <div className={`flex items-center justify-between gap-4 transition-all duration-300 ease-in-out overflow-visible ${
            isScrolled 
              ? 'h-[64px] sm:h-[66px] md:h-[68px]' 
              : 'h-[72px] sm:h-[74px] md:h-[76px]'
          }`}>
            
            {/* 1. Left: CarePrep Brand Logo (Icon-only) */}
            <div className="flex items-center flex-shrink-0 w-fit h-auto min-w-0 overflow-visible">
              <CarePrepLogo isScrolled={isScrolled} onClick={handleBrandClick} />
            </div>

            {/* 2. Center: Navigation Links on Landing / Portal Indicator on Dashboard */}
            {currentScreen === 'welcome' ? (
              <nav className="nav-links hidden md:flex items-center justify-center gap-5 lg:gap-7 text-[14px] lg:text-[15px] font-semibold text-slate-600 flex-1 min-w-0">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeNav === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleNavClick(item.key)}
                      className={`relative py-2 px-1 transition-colors duration-200 cursor-pointer group select-none whitespace-nowrap ${
                        isActive 
                          ? 'text-emerald-700 font-bold' 
                          : 'text-slate-600 hover:text-emerald-700'
                      }`}
                    >
                      <span>{item.label}</span>
                      {/* Animated underline expanding smoothly from center */}
                      <span 
                        className={`absolute bottom-[-2px] left-0 w-full h-[2.5px] rounded-full bg-emerald-600 transition-all duration-250 ease-out origin-center ${
                          isActive 
                            ? 'scale-x-100 opacity-100' 
                            : 'scale-x-0 opacity-0 group-hover:scale-x-100 group-hover:opacity-100'
                        }`} 
                      />
                    </button>
                  );
                })}
              </nav>
            ) : isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl border bg-slate-50/90 text-xs font-semibold">
                {isPatient && (
                  <button
                    type="button"
                    onClick={() => onNavigateToScreen && onNavigateToScreen('patient_dashboard')}
                    className="flex items-center gap-1.5 text-emerald-800 font-bold hover:text-emerald-950 transition-colors"
                  >
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Patient Portal</span>
                  </button>
                )}
                {isDoctor && (
                  <button
                    type="button"
                    onClick={() => onNavigateToScreen && onNavigateToScreen('doctor')}
                    className="flex items-center gap-1.5 text-slate-900 font-bold hover:text-slate-700 transition-colors"
                  >
                    <Stethoscope className="w-4 h-4 text-emerald-600" />
                    <span>Doctor Clinical Workstation</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 text-xs font-medium text-slate-500">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Role-Protected Healthcare Access</span>
              </div>
            )}

            {/* 3. Right: System Status (Dashboard only), Language Selector, User Info & Auth Controls */}
            <div className="login flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
              
              {/* Live System Status Indicator (Only on internal/dashboard screens) */}
              {currentScreen !== 'welcome' && (
                <div className="hidden lg:flex items-center">
                  {isCheckingConnection ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      Checking System...
                    </span>
                  ) : providerStatus.isGeminiLive ? (
                    <button
                      type="button"
                      onClick={() => setIsWhatGeminiModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300 transition-colors"
                      title="Click to view Gemini 3.6 Flash capabilities and clinical safety boundaries"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>{providerStatus.modelName ? `Gemini ${providerStatus.modelName.replace(/^gemini-/, '')} • Live` : 'Gemini 3.6 Flash • Live'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsWhatGeminiModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full border border-slate-300 transition-colors"
                      title="Click to view Deterministic NLP & Clinical Engine status"
                    >
                      <span className="w-2 h-2 rounded-full bg-teal-500" />
                      <span>Deterministic NLP • Ready</span>
                    </button>
                  )}
                </div>
              )}

              {/* Language Selector Dropdown - Animated & Click-outside Handled (shown on internal/dashboard screens) */}
              {currentScreen !== 'welcome' && (
                <div className="relative" ref={langDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                    aria-expanded={isLanguageMenuOpen}
                    aria-haspopup="true"
                    aria-label={`Select language, current: ${currentLangObj.englishName}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200/90 bg-white/90 hover:bg-white text-slate-700 hover:text-emerald-700 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all duration-200 active:scale-95 cursor-pointer group"
                  >
                    <Globe2 className="w-3.5 h-3.5 text-emerald-600 transition-transform duration-200 group-hover:rotate-12" />
                    <span>{currentLangObj.nativeName}</span>
                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-250 ease-out ${isLanguageMenuOpen ? 'rotate-180 text-emerald-600' : 'rotate-0'}`} />
                  </button>

                  {isLanguageMenuOpen && (
                    <div 
                      role="menu"
                      className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 transform origin-top-right transition-all duration-200 ease-out animate-in fade-in zoom-in-95"
                    >
                      <div className="px-3.5 py-1.5 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Language / भाषा
                      </div>
                      {SUPPORTED_LANGUAGES.map((lang) => {
                        const isSelected = lang.code === language;
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            role="menuitem"
                            onClick={() => handleSelectLang(lang.code)}
                            className={`w-[calc(100%-8px)] mx-1 text-left px-3 py-2 text-xs flex items-center justify-between rounded-xl transition-all duration-150 cursor-pointer ${
                              isSelected 
                                ? 'bg-emerald-50 text-emerald-900 font-bold' 
                                : 'text-slate-700 font-medium hover:bg-emerald-50/60 hover:text-emerald-800'
                            }`}
                          >
                            <div>
                              <span className="block text-slate-900 font-semibold">{lang.nativeName}</span>
                              <span className="block text-[10px] text-slate-500">{lang.englishName} ({lang.scriptLabel})</span>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* User Identity & Logout or Sign In Button */}
              {isAuthenticated && user ? (
                <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-2.5">
                  <div className="text-right leading-tight">
                    <span className="block text-xs font-extrabold text-slate-900 truncate max-w-[140px]">
                      {user.name}
                    </span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      {user.role}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      onNavigateToScreen && onNavigateToScreen('auth_landing' as any);
                    }}
                    aria-label="Sign out"
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 text-slate-600 transition-colors shadow-2xs cursor-pointer"
                    title="Sign Out of CarePrep"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : currentScreen === 'welcome' ? (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAuth) onOpenAuth('patient', 'login');
                    else if (onNavigateToScreen) onNavigateToScreen('patient_login');
                  }}
                  className="inline-flex items-center justify-center gap-2 h-[44px] px-5 sm:px-6 rounded-full border border-slate-300/90 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-800 hover:text-slate-900 text-sm sm:text-[14.5px] font-bold shadow-xs hover:shadow-sm transition-all duration-200 active:scale-95 cursor-pointer select-none"
                >
                  <User className="w-4 h-4 text-slate-700" />
                  <span>Login</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenAuth) onOpenAuth('patient', 'login');
                    else if (onNavigateToScreen) onNavigateToScreen('patient_login');
                  }}
                  className="group relative inline-flex items-center justify-center gap-2 h-[44px] px-5 sm:px-6 rounded-full bg-[#0F172A] hover:bg-slate-800 text-white text-sm sm:text-[14.5px] font-bold shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 cursor-pointer select-none"
                >
                  <User className="w-4 h-4 text-white/90 group-hover:text-white transition-colors" />
                  <span>Login</span>
                  <span className="text-white/80 group-hover:text-white group-hover:translate-x-1 transition-transform duration-200 ease-out">
                    →
                  </span>
                </button>
              )}

              {/* Mobile Hamburger Menu Toggle */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-expanded={isMobileMenuOpen}
                aria-label="Toggle Navigation Menu"
                className="md:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5 text-slate-900" /> : <Menu className="w-5 h-5 text-slate-800" />}
              </button>
            </div>
          </div>
        </div>

        {/* 4-Step Patient Journey / Breadcrumbs Sub-Bar (Patient View Only) */}
        {isAuthenticated && isPatient && currentScreen !== 'doctor' && (
          <div className="border-t border-slate-100 bg-slate-50/60 py-2 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto flex items-center justify-between sm:justify-center gap-2 sm:gap-6 overflow-x-auto">
              {steps.map((step, idx) => {
                const isCompleted = idx < activeStep;
                const isCurrent = idx === activeStep;

                return (
                  <React.Fragment key={step.number}>
                    <button
                      type="button"
                      onClick={() => {
                        if (idx <= activeStep) {
                          onNavigateToScreen && onNavigateToScreen(step.screenTarget);
                        }
                      }}
                      className={`flex items-center gap-1.5 text-xs font-semibold transition-colors focus:outline-none rounded px-1.5 py-0.5 ${
                        isCurrent
                          ? 'text-emerald-700 font-bold'
                          : isCompleted
                          ? 'text-slate-700 hover:text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                          isCurrent
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200/80 text-slate-500'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> : step.number}
                      </div>
                      <span className="whitespace-nowrap">{step.label}</span>
                    </button>

                    {idx < steps.length - 1 && (
                      <span className="text-slate-300 text-xs select-none">→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Doctor Mode Context Bar (Doctor View Only) */}
        {isAuthenticated && isDoctor && currentScreen === 'doctor' && (
          <div className="border-t border-slate-800 bg-slate-900 text-white py-1.5 px-4 sm:px-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-bold text-slate-200">Doctor Clinical Workstation</span>
                <span className="text-slate-400 hidden sm:inline">• Live Patient Queue &amp; EMR Triage Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-medium">Logged in: {user?.name}</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Navigation Drawer Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
            {currentScreen === 'welcome' && (
              <nav className="flex flex-col space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeNav === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleNavClick(item.key)}
                      className={`flex items-center justify-between w-full py-2 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && <div className="w-2 h-2 rounded-full bg-emerald-600" />}
                    </button>
                  );
                })}
              </nav>
            )}

            {isAuthenticated && user ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-900">{user.name}</span>
                  <span className="block text-[10px] text-emerald-700 uppercase font-bold">{user.role} Portal</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                    onNavigateToScreen && onNavigateToScreen('auth_landing' as any);
                  }}
                  className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (onOpenAuth) onOpenAuth('patient', 'login');
                  else if (onNavigateToScreen) onNavigateToScreen('patient_login');
                }}
                className="w-full py-2.5 px-4 rounded-full bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <User className="w-3.5 h-3.5 text-white" />
                <span>Login to CarePrep</span>
                <span className="text-white/80">→</span>
              </button>
            )}

            {/* Language Selection Row in Mobile Menu */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Language:</span>
              <div className="flex gap-1.5">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLang(lang.code)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      language === lang.code
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {lang.nativeName}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsWhatGeminiModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-1.5 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold text-center hover:bg-slate-100 transition-colors"
              >
                AI Safety &amp; Transparency
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Info Modals */}
      <WhatGeminiDoesModal
        isOpen={isWhatGeminiModalOpen}
        onClose={() => setIsWhatGeminiModalOpen(false)}
      />

      <SihWhyThisMattersModal
        isOpen={isWhyMattersModalOpen}
        onClose={() => setIsWhyMattersModalOpen(false)}
      />
    </>
  );
};
