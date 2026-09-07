import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LanguageProvider } from './shared/contexts/LanguageContext';
import { IntakeProvider } from './shared/contexts/IntakeContext';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { AuthLandingPage } from './auth/pages/AuthLandingPage';
import { PatientLoginPage } from './auth/pages/PatientLoginPage';
import { PatientSignupPage } from './auth/pages/PatientSignupPage';
import { DoctorLoginPage } from './auth/pages/DoctorLoginPage';
import { DoctorSignupPage } from './auth/pages/DoctorSignupPage';
import { AccessDeniedPage } from './auth/components/AccessDeniedPage';
import { WelcomePage } from './patient-ui/pages/WelcomePage';
import { PatientDashboardView } from './patient-ui/pages/PatientDashboardView';
import { PatientMultiStepForm } from './patient-ui/pages/PatientMultiStepForm';
import { LanguageSelectionPage } from './patient-ui/pages/LanguageSelectionPage';
import { PatientIdentityPage } from './patient-ui/pages/PatientIdentityPage';
import { ConsentPage } from './patient-ui/pages/ConsentPage';
import { DocumentUploadStepPage } from './patient-ui/pages/DocumentUploadStepPage';
import { ModeSelectionPage } from './patient-ui/pages/ModeSelectionPage';
import { PatientIntakePage } from './patient-ui/pages/PatientIntakePage';
import { IntakeSuccessPage } from './patient-ui/pages/IntakeSuccessPage';
import { DoctorDashboardPage } from './doctor-ui/pages/DoctorDashboardPage';
import { SihDemoToolbar } from './shared/components/SihDemoToolbar';
import { CarePrepAppHeader } from './shared/components/CarePrepAppHeader';
import { MedicalBackground } from './shared/components/ui/MedicalBackground';
import { PageTransition } from './shared/components/ui/DesignSystem';
import { DEMO_SCENARIOS } from './shared/data/demoScenarios';
import { UserRole } from './auth/authTypes';
import { ShieldAlert, X } from 'lucide-react';

export type ActiveScreen = 
  | 'auth_landing'
  | 'patient_login'
  | 'patient_signup'
  | 'doctor_login'
  | 'doctor_signup'
  | 'access_denied'
  | 'welcome'
  | 'patient_dashboard'
  | 'patient_form'
  | 'language'
  | 'identity'
  | 'consent'
  | 'documents'
  | 'mode'
  | 'intake'
  | 'success'
  | 'doctor';

const PATIENT_SCREENS: ActiveScreen[] = [
  'welcome',
  'patient_dashboard',
  'patient_form',
  'language',
  'identity',
  'consent',
  'documents',
  'mode',
  'intake',
  'success'
];

const DOCTOR_SCREENS: ActiveScreen[] = [
  'doctor'
];

// Helper to determine if SIH Demo Tools should be shown
const checkDemoModeActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  if ((import.meta as any).env?.VITE_ENABLE_SIH_DEMO_TOOLS === 'true') {
    return true;
  }
  
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === 'true' || params.get('sih') === 'true') {
    return true;
  }
  
  if (localStorage.getItem('careprep_demo_mode') === 'true') {
    return true;
  }

  return false;
};

export const AppContent: React.FC = () => {
  const { user, isAuthenticated, isPatient, isDoctor, logout } = useAuth();

  // Determine initial screen based on auth state and URL hash with strict route guards
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('doctor')) {
        if (!isAuthenticated) return 'doctor_login';
        if (isPatient) return 'patient_dashboard';
        return 'doctor';
      }
      if (hash.includes('patient') || hash.includes('intake')) {
        if (!isAuthenticated) return 'patient_login';
        if (isDoctor) return 'doctor';
        return 'patient_dashboard';
      }
    }
    if (isDoctor) return 'doctor';
    if (isPatient) return 'patient_dashboard';
    return 'welcome';
  });

  const [securityNotice, setSecurityNotice] = useState<string | null>(null);
  const [deniedAttemptRole, setDeniedAttemptRole] = useState<UserRole>('doctor');
  const [completedCaseId, setCompletedCaseId] = useState<string | null>(null);
  const [selectedDoctorCaseId, setSelectedDoctorCaseId] = useState<string | null>(null);
  const [showDemoToolbar, setShowDemoToolbar] = useState<boolean>(() => checkDemoModeActive());

  // Expose developer toggle on window for convenience during evaluation
  useEffect(() => {
    (window as any).toggleDemoTools = (enable?: boolean) => {
      const nextState = enable !== undefined ? enable : !showDemoToolbar;
      localStorage.setItem('careprep_demo_mode', nextState ? 'true' : 'false');
      setShowDemoToolbar(nextState);
      console.log(`[CarePrep] SIH Demo Tools ${nextState ? 'ENABLED' : 'DISABLED'}`);
    };
  }, [showDemoToolbar]);

  // Auto-dismiss security notice toast after 6s
  useEffect(() => {
    if (securityNotice) {
      const timer = setTimeout(() => setSecurityNotice(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [securityNotice]);

  /**
   * Core Navigation Guard with Route-Level Role Protection & Automatic Redirection
   */
  const navigateTo = useCallback((screen: ActiveScreen) => {
    // 1. Guard check for unauthenticated users accessing protected screens
    if (!isAuthenticated) {
      if (PATIENT_SCREENS.includes(screen)) {
        if (screen === 'welcome') {
          setCurrentScreen('welcome');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        setCurrentScreen('patient_login');
        return;
      }
      if (DOCTOR_SCREENS.includes(screen)) {
        setCurrentScreen('doctor_login');
        return;
      }
      setCurrentScreen(screen);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. Security Rule: Patient attempting to access Doctor route
    if (isPatient && DOCTOR_SCREENS.includes(screen)) {
      setSecurityNotice('Security Alert: Patient accounts cannot access the Doctor Portal. You have been redirected to your Patient Dashboard.');
      setDeniedAttemptRole('doctor');
      setCurrentScreen('patient_dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 3. Security Rule: Doctor attempting to access Patient-only route
    if (isDoctor && PATIENT_SCREENS.includes(screen)) {
      setSecurityNotice('Security Alert: Doctor accounts cannot enter Patient-only intake routes. You have been redirected to your Physician Workstation.');
      setDeniedAttemptRole('patient');
      setCurrentScreen('doctor');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 4. Authorized navigation
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [isAuthenticated, isPatient, isDoctor]);

  // Handle URL hash changes (e.g. user manually types #doctor or #patient in address bar)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('doctor')) {
        navigateTo('doctor');
      } else if (hash.includes('patient') || hash.includes('intake')) {
        navigateTo(isPatient ? 'patient_dashboard' : 'welcome');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [navigateTo, isPatient]);

  // Adjust screen on auth change (e.g. on login or logout)
  useEffect(() => {
    if (!isAuthenticated) {
      if (['patient_dashboard', 'patient_form', 'doctor'].includes(currentScreen)) {
        setCurrentScreen('welcome');
      }
    } else if (isDoctor && currentScreen !== 'doctor') {
      setCurrentScreen('doctor');
    } else if (isPatient && (currentScreen === 'auth_landing' || currentScreen === 'patient_login')) {
      setCurrentScreen('patient_dashboard');
    }
  }, [isAuthenticated, isDoctor, isPatient]);

  const handleLoadScenario = (scenarioId: 'DEMO_A' | 'DEMO_B' | 'DEMO_C' | 'DEMO_D', targetScreen: 'patient' | 'doctor' | 'emergency') => {
    const scenario = DEMO_SCENARIOS[scenarioId];
    if (scenario) {
      if (isDoctor) {
        setSelectedDoctorCaseId(scenario.caseRecord.caseId);
        navigateTo('doctor');
      } else if (isPatient) {
        navigateTo('patient_dashboard');
      } else {
        navigateTo('auth_landing');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative overflow-x-hidden">
      {/* 1. Global Animated Medical Background with Image & Parallax */}
      <MedicalBackground currentScreen={currentScreen} />

      {/* 2. SIH Demo Toolbar (Rendered ONLY in Demo/Dev Mode — Hidden by default in Normal UI) */}
      {showDemoToolbar && (
        <SihDemoToolbar 
          onLoadScenario={handleLoadScenario}
          activeScreen={currentScreen}
        />
      )}

      {/* 3. Global CarePrep App Header (Hidden on Patient Login & Signup which have their own dedicated split-screen healthcare layouts) */}
      {currentScreen !== 'patient_login' && currentScreen !== 'patient_signup' && (
        <CarePrepAppHeader
          currentScreen={currentScreen}
          onNavigateToScreen={(screen) => navigateTo(screen)}
          onSelectLanguage={() => navigateTo('language')}
          onOpenAuth={(role, mode) => {
            if (role === 'doctor') {
              navigateTo(mode === 'signup' ? 'doctor_signup' : 'doctor_login');
            } else if (role === 'patient') {
              navigateTo(mode === 'signup' ? 'patient_signup' : 'patient_login');
            } else {
              navigateTo('auth_landing');
            }
          }}
        />
      )}

      {/* 4. Floating Security Notification Toast (for unauthorized access redirects) */}
      <AnimatePresence>
        {securityNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-4 sm:right-6 z-50 max-w-md bg-rose-900/90 text-white backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-rose-500/50 flex items-start gap-3"
          >
            <ShieldAlert className="w-5 h-5 text-rose-300 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <span className="font-extrabold block text-rose-200">Security Rule Enforced</span>
              <p className="mt-0.5 text-white/90 leading-relaxed">{securityNotice}</p>
            </div>
            <button
              onClick={() => setSecurityNotice(null)}
              className="text-rose-300 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Main Screen Views with Smooth 60 FPS Page Transitions */}
      <div className="relative z-10 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {/* AUTHENTICATION & ROLE SELECTION ROUTES */}
          {currentScreen === 'auth_landing' && (
            <PageTransition key="auth_landing">
              <AuthLandingPage
                onSelectRole={(role, mode) => {
                  if (role === 'patient') {
                    navigateTo(mode === 'signup' ? 'patient_signup' : 'patient_login');
                  } else {
                    navigateTo(mode === 'signup' ? 'doctor_signup' : 'doctor_login');
                  }
                }}
              />
            </PageTransition>
          )}

          {currentScreen === 'patient_login' && (
            <PageTransition key="patient_login">
              <PatientLoginPage
                onSuccess={() => navigateTo('patient_dashboard')}
                onGoToSignup={() => navigateTo('patient_signup')}
                onBackToLanding={() => navigateTo('auth_landing')}
              />
            </PageTransition>
          )}

          {currentScreen === 'patient_signup' && (
            <PageTransition key="patient_signup">
              <PatientSignupPage
                onSuccess={() => navigateTo('patient_dashboard')}
                onGoToLogin={() => navigateTo('patient_login')}
                onBackToLanding={() => navigateTo('auth_landing')}
              />
            </PageTransition>
          )}

          {currentScreen === 'doctor_login' && (
            <PageTransition key="doctor_login">
              <DoctorLoginPage
                onSuccess={() => navigateTo('doctor')}
                onGoToSignup={() => navigateTo('doctor_signup')}
                onBackToLanding={() => navigateTo('auth_landing')}
              />
            </PageTransition>
          )}

          {currentScreen === 'doctor_signup' && (
            <PageTransition key="doctor_signup">
              <DoctorSignupPage
                onSuccess={() => navigateTo('doctor')}
                onGoToLogin={() => navigateTo('doctor_login')}
                onBackToLanding={() => navigateTo('auth_landing')}
              />
            </PageTransition>
          )}

          {/* ACCESS RESTRICTED / DENIED PAGE */}
          {currentScreen === 'access_denied' && (
            <PageTransition key="access_denied">
              <AccessDeniedPage
                requiredRole={deniedAttemptRole}
                onNavigateToPortal={(role) => {
                  if (role === 'doctor') navigateTo('doctor');
                  else navigateTo('patient_dashboard');
                }}
                onSwitchAccount={() => {
                  logout();
                  navigateTo('auth_landing');
                }}
              />
            </PageTransition>
          )}

          {/* LANDING PAGE / WELCOME WITH 3D HERO */}
          {currentScreen === 'welcome' && (
            <PageTransition key="welcome">
              <WelcomePage
                onStart={() => {
                  if (isAuthenticated && isPatient) {
                    navigateTo('patient_dashboard');
                  } else {
                    navigateTo('patient_login');
                  }
                }}
                onSelectLanguage={() => navigateTo('language')}
                onOpenDoctor={() => {
                  if (isAuthenticated && isDoctor) {
                    navigateTo('doctor');
                  } else {
                    navigateTo('doctor_login');
                  }
                }}
                onOpenAuth={(role, mode) => {
                  if (role === 'doctor') {
                    navigateTo(mode === 'signup' ? 'doctor_signup' : 'doctor_login');
                  } else if (role === 'patient') {
                    navigateTo(mode === 'signup' ? 'patient_signup' : 'patient_login');
                  } else {
                    navigateTo('auth_landing');
                  }
                }}
                onNavigateToScreen={(screen) => navigateTo(screen)}
              />
            </PageTransition>
          )}

          {/* MODERN 3D PATIENT DASHBOARD */}
          {currentScreen === 'patient_dashboard' && (
            <PageTransition key="patient_dashboard">
              <PatientDashboardView
                onStartIntake={() => navigateTo('patient_form')}
                onViewCaseReport={(caseId) => {
                  setCompletedCaseId(caseId);
                  navigateTo('success');
                }}
              />
            </PageTransition>
          )}

          {/* 8-STEP PATIENT INTAKE FORM */}
          {currentScreen === 'patient_form' && (
            <PageTransition key="patient_form">
              <PatientMultiStepForm
                onComplete={(caseId) => {
                  setCompletedCaseId(caseId);
                  if (isAuthenticated && isPatient) {
                    navigateTo('patient_dashboard');
                  } else {
                    navigateTo('success');
                  }
                }}
                onCancel={() => navigateTo(isAuthenticated && isPatient ? 'patient_dashboard' : 'welcome')}
              />
            </PageTransition>
          )}

          {/* EXISTING DETAILED STEPWISE SCREENS (PRESERVED) */}
          {currentScreen === 'language' && (
            <PageTransition key="language">
              <LanguageSelectionPage
                onContinue={() => navigateTo('identity')}
                onBack={() => navigateTo(isAuthenticated && isPatient ? 'patient_dashboard' : 'welcome')}
              />
            </PageTransition>
          )}

          {currentScreen === 'identity' && (
            <PageTransition key="identity">
              <PatientIdentityPage
                onContinue={() => navigateTo('consent')}
                onBack={() => navigateTo('language')}
              />
            </PageTransition>
          )}

          {currentScreen === 'consent' && (
            <PageTransition key="consent">
              <ConsentPage
                onAgree={() => navigateTo('documents')}
                onDecline={() => navigateTo(isAuthenticated && isPatient ? 'patient_dashboard' : 'welcome')}
                onBack={() => navigateTo('identity')}
              />
            </PageTransition>
          )}

          {currentScreen === 'documents' && (
            <PageTransition key="documents">
              <DocumentUploadStepPage
                onContinue={() => navigateTo('mode')}
                onBack={() => navigateTo('consent')}
              />
            </PageTransition>
          )}

          {currentScreen === 'mode' && (
            <PageTransition key="mode">
              <ModeSelectionPage
                onSelectMode={() => navigateTo('intake')}
                onBack={() => navigateTo('documents')}
              />
            </PageTransition>
          )}

          {currentScreen === 'intake' && (
            <PageTransition key="intake">
              <PatientIntakePage
                onComplete={(caseId) => {
                  setCompletedCaseId(caseId);
                  navigateTo('success');
                }}
                onBackToMode={() => navigateTo('mode')}
                onOpenDoctor={() => navigateTo('doctor')}
              />
            </PageTransition>
          )}

          {currentScreen === 'success' && (
            <PageTransition key="success">
              <IntakeSuccessPage
                caseId={completedCaseId || 'case-sample'}
                onRestart={() => navigateTo(isAuthenticated && isPatient ? 'patient_dashboard' : 'welcome')}
              />
            </PageTransition>
          )}

          {/* PROTECTED DOCTOR WORKSTATION */}
          {currentScreen === 'doctor' && (
            <PageTransition key="doctor">
              <DoctorDashboardPage
                initialCaseId={selectedDoctorCaseId}
                onBackToPatientFlow={() => navigateTo('patient_dashboard')}
                onNewPatientIntake={() => navigateTo('patient_form')}
              />
            </PageTransition>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <IntakeProvider>
          <AppContent />
        </IntakeProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
