import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  FileText, 
  Activity, 
  HelpCircle, 
  Layers, 
  CheckCircle2, 
  ChevronRight,
  Play,
  Cpu,
  AlertTriangle
} from 'lucide-react';
import { DEMO_SCENARIOS, DemoScenario } from '../data/demoScenarios';
import { localStore } from '../../backend/storage/localStore';
import { SihWhyThisMattersModal } from './SihWhyThisMattersModal';
import { SihArchitectureModal } from './SihArchitectureModal';
import { WhatGeminiDoesModal } from './WhatGeminiDoesModal';
import { llmGateway } from '../../ai-services/llm/LLMGateway';
import { MockLLMProvider } from '../../ai-services/llm/providers/MockLLMProvider';

interface SihDemoToolbarProps {
  onLoadScenario: (scenarioId: 'DEMO_A' | 'DEMO_B' | 'DEMO_C' | 'DEMO_D', targetScreen: 'patient' | 'doctor' | 'emergency') => void;
  activeScreen?: string;
}

export const SihDemoToolbar: React.FC<SihDemoToolbarProps> = ({ onLoadScenario, activeScreen }) => {
  const [isWhyModalOpen, setIsWhyModalOpen] = useState(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState(false);
  const [isWhatGeminiModalOpen, setIsWhatGeminiModalOpen] = useState(false);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [isSimulatedFallback, setIsSimulatedFallback] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSelect = (scenarioId: 'DEMO_A' | 'DEMO_B' | 'DEMO_C' | 'DEMO_D', targetScreen: 'patient' | 'doctor' | 'emergency') => {
    setActiveScenarioId(scenarioId);
    const scenario = DEMO_SCENARIOS[scenarioId];
    if (scenario) {
      // Save patient and case in localStore
      localStore.savePatient(scenario.patient);
      localStore.saveCase(scenario.caseRecord);
      scenario.documents.forEach(doc => {
        localStore.saveDocument(doc);
      });
      // Generate / save summary
      const savedSummary = localStore.getSummaryByCaseId(scenario.caseRecord.caseId);
      if (!savedSummary) {
        localStore.saveCase(scenario.caseRecord);
      }
    }
    onLoadScenario(scenarioId, targetScreen);
  };

  const handleSimulateFallback = () => {
    if (!isSimulatedFallback) {
      // Switch primary to failing mock provider to demonstrate fallback
      llmGateway.setPrimaryProvider(new MockLLMProvider({ simulateHttpError: true }));
      setIsSimulatedFallback(true);
    } else {
      // Reset
      llmGateway.setPrimaryProvider(llmGateway.getFallbackProvider());
      setIsSimulatedFallback(false);
    }
  };

  return (
    <>
      <div className="bg-slate-950 text-white border-b border-slate-800 px-3 py-1.5 text-xs select-none sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Brand Tag & Mode Identifier */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
              title="Toggle Judge Control Panel"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>SIH Demo Bar</span>
              <span className="text-[9px] text-emerald-400/70 font-normal">({isCollapsed ? 'Show' : 'Hide'})</span>
            </button>
            {!isCollapsed && (
              <span className="text-[11px] text-slate-400 hidden lg:inline font-medium">
                Judge Presets:
              </span>
            )}
          </div>

          {/* Quick Scenario Buttons */}
          {!isCollapsed && (
            <div className="flex flex-wrap items-center gap-1.5 animate-in fade-in">
            {/* Demo A: Normal */}
            <button
              onClick={() => handleSelect('DEMO_A', 'doctor')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                activeScenarioId === 'DEMO_A'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              title="Standard Patient (Abdominal Pain / पेट में दर्द) with SOCRATES questioning and GREEN triage."
            >
              <span>Demo A: Normal (Hindi/EN)</span>
            </button>

            {/* Demo B: Emergency */}
            <button
              onClick={() => handleSelect('DEMO_B', 'doctor')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                activeScenarioId === 'DEMO_B'
                  ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                  : 'bg-rose-950/60 text-rose-300 border-rose-800/80 hover:bg-rose-900/80'
              }`}
              title="Emergency Red-Flag case (Chest pain + dyspnea) with immediate deterministic triage routing."
            >
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>Demo B: Red Flag (Emergency)</span>
            </button>

            {/* Demo C: Document-Heavy */}
            <button
              onClick={() => handleSelect('DEMO_C', 'doctor')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                activeScenarioId === 'DEMO_C'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              title="Multi-Document Patient (Prescription + High HbA1c Lab Report + Discharge Summary)."
            >
              <FileText className="w-3 h-3 text-blue-400" />
              <span>Demo C: Multi-Doc & Labs</span>
            </button>

            {/* Demo D: AYUSH */}
            <button
              onClick={() => handleSelect('DEMO_D', 'doctor')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                activeScenarioId === 'DEMO_D'
                  ? 'bg-teal-600 text-white border-teal-400 shadow-sm'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
              title="AYUSH intake with Dashavidha Pariksha constitutional indicators."
            >
              <Activity className="w-3 h-3 text-teal-400" />
              <span>Demo D: AYUSH Intake</span>
            </button>

            {/* Fallback Simulation Button */}
            <button
              onClick={handleSimulateFallback}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                isSimulatedFallback
                  ? 'bg-amber-600 text-white border-amber-400 animate-pulse'
                  : 'bg-slate-800 text-amber-300/80 border-slate-700 hover:bg-slate-700'
              }`}
              title="Test resilience: Simulates Gemini API unavailability and shows local deterministic NLP fallback"
            >
              <Cpu className="w-3 h-3 text-amber-400" />
              <span>{isSimulatedFallback ? 'Simulating Fallback (Active)' : 'Test Fallback'}</span>
            </button>
            </div>
          )}

          {/* Info Modals Trigger Buttons */}
          {!isCollapsed && (
            <div className="flex items-center gap-1.5 border-l border-slate-700 pl-2 animate-in fade-in">
              <button
                onClick={() => setIsWhatGeminiModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-[11px] font-semibold border border-emerald-700/80 transition-colors"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>What Gemini Does</span>
              </button>

              <button
                onClick={() => setIsWhyModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors"
              >
                <HelpCircle className="w-3 h-3 text-emerald-400" />
                <span>Why This Matters</span>
              </button>

              <button
                onClick={() => setIsArchModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 transition-colors"
              >
                <Layers className="w-3 h-3 text-indigo-400" />
                <span>Architecture &amp; Safety</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info Modals */}
      <SihWhyThisMattersModal
        isOpen={isWhyModalOpen}
        onClose={() => setIsWhyModalOpen(false)}
      />

      <SihArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />

      <WhatGeminiDoesModal
        isOpen={isWhatGeminiModalOpen}
        onClose={() => setIsWhatGeminiModalOpen(false)}
      />
    </>
  );
};
