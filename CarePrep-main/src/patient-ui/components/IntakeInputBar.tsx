import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../shared/contexts/LanguageContext';
import { speechToTextService } from '../../ai-services/speech/speechProvider';
import { SpeechRecognitionState, SpeechErrorCode, TranscriptionResult } from '../../ai-services/speech/speechTypes';
import { 
  Mic, 
  MicOff, 
  ArrowRight, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Keyboard, 
  Info 
} from 'lucide-react';

interface IntakeInputBarProps {
  value: string;
  placeholderText?: string;
  onChange: (val: string) => void;
  onSubmit: (audioProvenance?: 'VOICE' | 'TYPED' | 'TOUCH_CHIP') => void;
  isLastQuestion: boolean;
  canProceed: boolean;
}

export const IntakeInputBar: React.FC<IntakeInputBarProps> = ({
  value,
  placeholderText,
  onChange,
  onSubmit,
  isLastQuestion,
  canProceed
}) => {
  const { t, language } = useLanguage();
  const [speechState, setSpeechState] = useState<SpeechRecognitionState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [pendingVoiceTranscript, setPendingVoiceTranscript] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Clean up listening state when component unmounts
  useEffect(() => {
    return () => {
      speechToTextService.abort();
    };
  }, []);

  const startVoiceInput = async () => {
    setErrorMessage('');
    setPendingVoiceTranscript('');

    await speechToTextService.startListening(language, {
      onStateChange: (state) => {
        setSpeechState(state);
      },
      onTranscript: (result: TranscriptionResult) => {
        if (result.isFinal) {
          setPendingVoiceTranscript(result.rawTranscript);
          setSpeechState('TRANSCRIBED');
        } else {
          setPendingVoiceTranscript(result.rawTranscript);
        }
      },
      onError: (code: SpeechErrorCode, userMsg: string) => {
        setSpeechState('ERROR');
        setErrorMessage(userMsg);
      }
    });
  };

  const stopVoiceInput = () => {
    speechToTextService.stopListening();
  };

  const handleAcceptVoiceTranscript = () => {
    const textToCommit = pendingVoiceTranscript.trim();
    if (textToCommit) {
      onChange(value ? `${value} ${textToCommit}` : textToCommit);
      setPendingVoiceTranscript('');
      setSpeechState('IDLE');
      onSubmit('VOICE');
    }
  };

  const handleEditVoiceTranscript = () => {
    onChange(value ? `${value} ${pendingVoiceTranscript}` : pendingVoiceTranscript);
    setPendingVoiceTranscript('');
    setSpeechState('IDLE');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleRetryVoice = () => {
    setPendingVoiceTranscript('');
    setErrorMessage('');
    startVoiceInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canProceed) {
        onSubmit('TYPED');
      }
    }
  };

  const isListening = speechState === 'LISTENING';
  const isProcessing = speechState === 'PROCESSING';

  return (
    <div className="space-y-3">
      {/* 1. LISTENING & PROCESSING STATE BANNER */}
      {(isListening || isProcessing) && (
        <div 
          role="status" 
          aria-live="polite"
          className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white rounded-2xl shadow-lg border border-emerald-400/30 flex items-center justify-between gap-3 animate-in fade-in"
        >
          <div className="flex items-center gap-3">
            {/* Animated Sound Indicator */}
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/20 animate-ping absolute" />
              <div className="w-10 h-10 rounded-full bg-white text-emerald-700 flex items-center justify-center font-bold shadow-md z-10">
                <Mic className="w-5 h-5 animate-bounce" />
              </div>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                {isProcessing ? 'Understanding...' : 'Listening...'}
              </p>
              <p className="text-sm font-semibold text-white mt-0.5">
                {pendingVoiceTranscript || (
                  language === 'hi' ? 'कृपया अपनी तकलीफ या लक्षण बोलें...' :
                  language === 'ta' ? 'உங்கள் அறிகுறிகளை கூறவும்...' :
                  'Speak naturally in your preferred language...'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={stopVoiceInput}
              aria-label="Done speaking"
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all border border-white/30"
            >
              Done Speaking
            </button>
            <button
              type="button"
              onClick={() => {
                speechToTextService.abort();
                setSpeechState('IDLE');
              }}
              aria-label="Cancel speech recording"
              className="p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/20 transition-all"
              title="Cancel"
            >
              <MicOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. TRANSCRIBED CONFIRMATION BANNER (Honest Patient Verification without Fake Confidence) */}
      {speechState === 'TRANSCRIBED' && pendingVoiceTranscript && (
        <div 
          role="region" 
          aria-label="Speech transcription review"
          className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl shadow-sm text-slate-800 space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              You said:
            </span>
            <span className="text-[11px] text-slate-500">Please confirm or edit before sending</span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-emerald-200 text-sm font-medium text-slate-900 shadow-inner">
            "{pendingVoiceTranscript}"
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleRetryVoice}
              aria-label="Try speaking again"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Try Again</span>
            </button>

            <button
              type="button"
              onClick={handleEditVoiceTranscript}
              aria-label="Edit recognized text"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
            >
              <Keyboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit as Text</span>
            </button>

            <button
              type="button"
              onClick={handleAcceptVoiceTranscript}
              aria-label="Use this answer"
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Use This Answer</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. PATIENT-FRIENDLY ERROR & RECOVERY BANNER */}
      {speechState === 'ERROR' && (
        <div 
          role="alert"
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <p className="text-xs text-rose-800 font-medium">
              {errorMessage || "Voice input isn't available right now. You can type your answer instead."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleRetryVoice}
              aria-label="Retry voice input"
              className="text-xs font-bold text-rose-700 hover:underline px-2 py-1"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => {
                setSpeechState('IDLE');
                textareaRef.current?.focus();
              }}
              aria-label="Switch to typing"
              className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 hover:bg-rose-200 transition-colors"
            >
              Type Instead
            </button>
          </div>
        </div>
      )}

      {/* 4. MAIN MULTI-MODAL INPUT CONTAINER */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3.5 border-2 border-slate-200 focus-within:border-emerald-500 shadow-sm focus-within:shadow-md transition-all">
        <textarea
          ref={textareaRef}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText || t('intake.type_placeholder')}
          aria-label="Patient symptom description text area"
          className="w-full bg-transparent resize-none outline-none text-slate-800 text-sm sm:text-base placeholder:text-slate-400 p-1"
        />

        <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-100 mt-1">
          {/* Voice Input Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={isListening ? stopVoiceInput : startVoiceInput}
              aria-label={isListening ? 'Stop listening' : 'Start speaking'}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-sm ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title="Voice Input (Speech-to-Text)"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListening ? 'Listening...' : 'Speak (Microphone)'}</span>
            </button>

            <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Info className="w-3 h-3 text-slate-400" />
              English, Hindi, Tamil & Hinglish supported
            </span>
          </div>

          {/* Submit Action Button */}
          <button
            type="button"
            disabled={!canProceed}
            onClick={() => onSubmit('TYPED')}
            aria-label={isLastQuestion ? 'Complete case intake' : 'Proceed to next question'}
            className={`inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              canProceed
                ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>{isLastQuestion ? t('intake.complete_btn') : t('intake.next_btn')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Honest Limitation Notice */}
      <p className="text-[10px] text-slate-400 text-center leading-tight">
        Voice interaction is primarily tested on Chromium-based browsers. Speech recognition quality may vary depending on browser, operating system, microphone permissions, background noise, and language.
      </p>
    </div>
  );
};
