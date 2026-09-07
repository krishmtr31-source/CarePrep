import React from 'react';
import { AgentActivityLog } from '../../ai-services/orchestration/orchestrationTypes';
import { llmGateway } from '../../ai-services/llm/LLMGateway';
import { CheckCircle2, AlertTriangle, ShieldCheck, Layers, Cpu, Server, Sparkles } from 'lucide-react';

interface AgentActivityPanelProps {
  logs: AgentActivityLog[];
  state?: string;
  isEmergency?: boolean;
}

export const AgentActivityPanel: React.FC<AgentActivityPanelProps> = ({
  logs,
  state,
  isEmergency
}) => {
  const providerStatus = llmGateway.getProviderStatus();

  if (!logs || logs.length === 0) return null;

  return (
    <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800 shadow-md space-y-3 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Agentic AI Orchestration Live Status
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {/* Provider Badge */}
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 border ${
            providerStatus.isGeminiLive 
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' 
              : 'bg-amber-950/80 text-amber-300 border-amber-800'
          }`}>
            {providerStatus.isGeminiLive ? (
              <Sparkles className="w-3 h-3 text-emerald-400" />
            ) : (
              <Cpu className="w-3 h-3 text-amber-400" />
            )}
            {providerStatus.isGeminiLive ? `Gemini ${providerStatus.modelName || '3.6 Flash'} • Connected` : 'Deterministic Fallback Active'}
          </span>

          {state && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              STATE: {state}
            </span>
          )}
        </div>
      </div>

      {/* Live Activity Stream */}
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {logs.slice(-5).map((log, index) => {
          const isErr = log.status === 'ERROR';
          const isWarn = log.status === 'WARNING';
          const isProg = log.status === 'IN_PROGRESS';

          return (
            <div key={index} className="flex items-start justify-between gap-2 p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  isErr ? 'bg-rose-500' : isWarn ? 'bg-amber-400' : isProg ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'
                }`} />
                <div>
                  <span className="font-bold text-slate-200 block text-[11px]">
                    {log.agentName}
                  </span>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {log.action}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer Safety Status */}
      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1 text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Deterministic Safety Controller Active (Screens Red Flags)
        </span>
        <span className="text-slate-500">
          Requests: {providerStatus.totalRequestsThisSession}/{providerStatus.maxRequestsLimit}
        </span>
      </div>
    </div>
  );
};
