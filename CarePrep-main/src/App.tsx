import React, { useState } from 'react';
import { LanguageProvider } from './shared/contexts/LanguageContext';
import { IntakeProvider } from './shared/contexts/IntakeContext';
import { WelcomePage } from './patient-ui/pages/WelcomePage';
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
import { DEMO_SCENARIOS } from './shared/data/demoScenarios';

export type ActiveScreen = 
  | 'welcome'
  | 'language'
  | 'identity'
  | 'consent'
  | 'documents'
  | 'mode'
  | 'intake'
  | 'success'
  | 'doctor';

export const AppContent: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ActiveScreen>('welcome');
  const [completedCaseId, setCompletedCaseId] = useState<string | null>(null);
  const [selectedDoctorCaseId, setSelectedDoctorCaseId] = useState<string | null>(null);

  const navigateTo = (screen: ActiveScreen) => {
    setCurrentScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoadScenario = (scenarioId: 'DEMO_A' | 'DEMO_B' | 'DEMO_C' | 'DEMO_D', targetScreen: 'patient' | 'doctor' | 'emergency') => {
    const scenario = DEMO_SCENARIOS[scenarioId];
    if (scenario) {
      setSelectedDoctorCaseId(scenario.caseRecord.caseId);
      navigateTo('doctor');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* SIH Judge Demo Toolbar */}
      <SihDemoToolbar 
        onLoadScenario={handleLoadScenario}
        activeScreen={currentScreen}
      />

      {/* Global CarePrep App Header & 4-Step Journey */}
      <CarePrepAppHeader
        currentScreen={currentScreen}
        onNavigateToScreen={(screen) => navigateTo(screen)}
        onSelectLanguage={() => navigateTo('language')}
      />

      {currentScreen === 'welcome' && (
        <WelcomePage
          onStart={() => navigateTo('language')}
          onSelectLanguage={() => navigateTo('language')}
          onOpenDoctor={() => {
            setSelectedDoctorCaseId(null);
            navigateTo('doctor');
          }}
        />
      )}

      {currentScreen === 'language' && (
        <LanguageSelectionPage
          onContinue={() => navigateTo('identity')}
          onBack={() => navigateTo('welcome')}
        />
      )}

      {currentScreen === 'identity' && (
        <PatientIdentityPage
          onContinue={() => navigateTo('consent')}
          onBack={() => navigateTo('language')}
        />
      )}

      {currentScreen === 'consent' && (
        <ConsentPage
          onAgree={() => navigateTo('documents')}
          onDecline={() => {
            navigateTo('doctor');
          }}
          onBack={() => navigateTo('identity')}
        />
      )}

      {currentScreen === 'documents' && (
        <DocumentUploadStepPage
          onContinue={() => navigateTo('mode')}
          onBack={() => navigateTo('consent')}
        />
      )}

      {currentScreen === 'mode' && (
        <ModeSelectionPage
          onSelectMode={() => navigateTo('intake')}
          onBack={() => navigateTo('documents')}
        />
      )}

      {currentScreen === 'intake' && (
        <PatientIntakePage
          onComplete={(caseId) => {
            setCompletedCaseId(caseId);
            navigateTo('success');
          }}
          onBackToMode={() => navigateTo('mode')}
          onOpenDoctor={() => {
            setSelectedDoctorCaseId(null);
            navigateTo('doctor');
          }}
        />
      )}

      {currentScreen === 'success' && (
        <IntakeSuccessPage
          caseId={completedCaseId || 'case-sample'}
          onOpenDoctor={(caseId) => {
            setSelectedDoctorCaseId(caseId);
            navigateTo('doctor');
          }}
          onRestart={() => navigateTo('welcome')}
        />
      )}

      {currentScreen === 'doctor' && (
        <DoctorDashboardPage
          initialCaseId={selectedDoctorCaseId}
          onBackToPatientFlow={() => navigateTo('welcome')}
          onNewPatientIntake={() => navigateTo('welcome')}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <LanguageProvider>
      <IntakeProvider>
        <AppContent />
      </IntakeProvider>
    </LanguageProvider>
  );
}

export default App;
