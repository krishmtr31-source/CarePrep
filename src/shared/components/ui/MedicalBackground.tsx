import React from 'react';

interface MedicalBackgroundProps {
  currentScreen?: string;
}

export const MedicalBackground: React.FC<MedicalBackgroundProps> = ({ currentScreen = 'welcome' }) => {
  const isCleanBackground = Boolean(
    currentScreen === 'welcome' ||
    currentScreen === 'patient_dashboard' || 
    currentScreen === 'doctor' || 
    currentScreen === 'patient_form' ||
    currentScreen === 'intake' ||
    currentScreen === 'patient_login' ||
    currentScreen === 'patient_signup'
  );

  // Dashboards and clean hero require a distraction-free background for maximum visual clarity
  if (isCleanBackground) {
    return (
      <div 
        className="fixed inset-0 pointer-events-none z-0 bg-white"
        aria-hidden="true"
      />
    );
  }

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none bg-slate-50"
      aria-hidden="true"
    >
      {/* Subtle, low-opacity healthcare ambient background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.07]"
        style={{
          backgroundImage: `url("/assets/medical-bg.jpg")`,
          backgroundPosition: 'center 30%'
        }}
      />

      {/* Gentle soft white wash overlay for 100% text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/40 via-slate-50/70 to-white/90" />

      {/* Very faint medical grid */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#0284c708_1px,transparent_1px),linear-gradient(to_bottom,#0284c708_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_70%,transparent_100%)] opacity-40"
      />
    </div>
  );
};
