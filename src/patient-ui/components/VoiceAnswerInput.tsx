import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  Square, 
  Globe, 
  Check, 
  AlertCircle, 
  Lock, 
  X, 
  Loader2,
  Trash2
} from 'lucide-react';

// Speech Recognition Language Options
export type VoiceLanguage = 'en' | 'hi' | 'ta';

export interface VoiceLanguageOption {
  code: VoiceLanguage;
  locale: string;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_VOICE_LANGUAGES: VoiceLanguageOption[] = [
  { code: 'en', locale: 'en-IN', label: 'English', nativeLabel: 'English (IN)' },
  { code: 'hi', locale: 'hi-IN', label: 'Hindi', nativeLabel: 'हिन्दी (IN)' },
  { code: 'ta', locale: 'ta-IN', label: 'Tamil', nativeLabel: 'தமிழ் (IN)' }
];

export type VoiceState = 'idle' | 'listening' | 'transcribing' | 'completed' | 'error';

export interface VoiceAnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  label?: string;
  sublabel?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
  name?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  defaultLanguage?: VoiceLanguage;
  compact?: boolean;
  voiceControlPlacement?: 'inside' | 'below';
  speakLabel?: string;
}

// Local typings for Web Speech API
interface SpeechRecognitionResultItem {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
  readonly message?: string;
}

/**
 * Smart speech appending algorithm:
 * Appends new spoken speech to existing text while preserving existing wording.
 * Example:
 *   Existing: "I have chest pain"
 *   Spoken:   "for the last two hours"
 *   Output:   "I have chest pain for the last two hours."
 */
export const appendSpeechText = (
  existing: string,
  newChunk: string,
  lang: VoiceLanguage = 'en'
): string => {
  const cleanNew = newChunk.trim();
  if (!cleanNew) return existing;

  const cleanExisting = existing.trimEnd();
  if (!cleanExisting) {
    if (lang === 'en') {
      const capitalized = cleanNew.charAt(0).toUpperCase() + cleanNew.slice(1);
      return capitalized.endsWith('.') || capitalized.endsWith('?') || capitalized.endsWith('!')
        ? capitalized
        : `${capitalized}.`;
    }
    return cleanNew;
  }

  // If existing already ends with sentence punctuation (. or ? or !)
  if (/[.!?]$/.test(cleanExisting)) {
    if (lang === 'en') {
      const capitalized = cleanNew.charAt(0).toUpperCase() + cleanNew.slice(1);
      const withPeriod = capitalized.endsWith('.') || capitalized.endsWith('?') || capitalized.endsWith('!')
        ? capitalized
        : `${capitalized}.`;
      return `${cleanExisting} ${withPeriod}`;
    }
    return `${cleanExisting} ${cleanNew}`;
  }

  // If existing ends in comma or hyphen or colon
  if (/[,;:\-]$/.test(cleanExisting)) {
    const withPeriod = (lang === 'en' && !cleanNew.endsWith('.') && !cleanNew.endsWith('?') && !cleanNew.endsWith('!'))
      ? `${cleanNew}.`
      : cleanNew;
    return `${cleanExisting} ${withPeriod}`;
  }

  // Existing is an open clause: append with a space and end with a period in English
  const withPeriod = (lang === 'en' && !cleanNew.endsWith('.') && !cleanNew.endsWith('?') && !cleanNew.endsWith('!'))
    ? `${cleanNew}.`
    : cleanNew;
  return `${cleanExisting} ${withPeriod}`;
};

export const VoiceAnswerInput: React.FC<VoiceAnswerInputProps> = ({
  value,
  onChange,
  placeholder = 'Type your answer or speak using the microphone...',
  multiline = false,
  rows = 3,
  label,
  sublabel,
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  id,
  name,
  onKeyDown,
  defaultLanguage = 'en',
  speakLabel
}) => {
  // Voice recognition states
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [selectedLang, setSelectedLang] = useState<VoiceLanguage>(defaultLanguage);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState<boolean>(false);

  // References to maintain state across callbacks
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const completionTimerRef = useRef<any>(null);
  const errorTimerRef = useRef<any>(null);
  const currentValueRef = useRef<string>(value);
  const langDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Synchronize ref with active external prop
  useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  // Dismiss language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    if (isLangMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLangMenuOpen]);

  // Clean up timers and recognition instance on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Format seconds to mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Trigger non-blocking error alert
  const triggerError = (msg: string) => {
    setVoiceState('error');
    setErrorMessage(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => {
      setErrorMessage(null);
      setVoiceState('idle');
    }, 6000);
  };

  // Stop active speech recognition session
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setVoiceState('transcribing');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        setVoiceState('idle');
      }
    } else {
      setVoiceState('idle');
    }
  }, []);

  // Start speech recognition session
  const startRecording = async () => {
    setErrorMessage(null);

    // 1. Check browser support for Web Speech API
    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      triggerError(
        "Voice recognition depends on browser and platform support. Chromium-based browsers generally provide the most consistent experience. Unsupported browsers automatically fall back to typing."
      );
      return;
    }

    // 2. Request microphone permission gracefully
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          triggerError(
            'Microphone access was denied. Please allow microphone access in your browser settings or type your answer.'
          );
          return;
        }
      }
    }

    // 3. Clean up any previous session
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    // 4. Resolve selected BCP-47 locale tag
    const langConfig =
      SUPPORTED_VOICE_LANGUAGES.find(l => l.code === selectedLang) || SUPPORTED_VOICE_LANGUAGES[0];

    try {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.lang = langConfig.locale;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let hasReceivedAnySpeech = false;

      recognition.onstart = () => {
        setVoiceState('listening');
        setRecordingDuration(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        hasReceivedAnySpeech = true;
        let finalTranscripts = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscripts += ' ' + res[0].transcript;
          }
        }

        if (finalTranscripts.trim()) {
          setVoiceState('transcribing');
          const updated = appendSpeechText(currentValueRef.current, finalTranscripts, selectedLang);
          currentValueRef.current = updated;
          onChange(updated);

          setVoiceState('completed');
          if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
          completionTimerRef.current = setTimeout(() => {
            setVoiceState(prev => (prev === 'completed' ? 'idle' : prev));
          }, 3500);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        const errType = event.error;
        console.warn('[CarePrep Voice] SpeechRecognition error:', errType, event.message);

        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        if (errType === 'not-allowed' || errType === 'service-not-allowed') {
          triggerError(
            'Microphone access was denied. Please allow microphone access in your browser settings or type your answer.'
          );
        } else if (errType === 'no-speech') {
          if (!hasReceivedAnySpeech) {
            triggerError('No speech was detected. Please try speaking again or type your answer.');
          } else {
            setVoiceState('idle');
          }
        } else if (errType === 'aborted') {
          setVoiceState('idle');
        } else {
          triggerError('Could not understand the audio. Please try speaking again or type your answer.');
        }
      };

      recognition.onend = () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setVoiceState(prev => (prev === 'listening' || prev === 'transcribing' ? 'idle' : prev));
      };

      recognition.start();
    } catch (err: any) {
      console.error('[CarePrep Voice] Recognition start error:', err);
      if (timerRef.current) clearInterval(timerRef.current);
      triggerError('Could not initialize microphone. Please type your answer.');
    }
  };

  const currentLangObj =
    SUPPORTED_VOICE_LANGUAGES.find(l => l.code === selectedLang) || SUPPORTED_VOICE_LANGUAGES[0];

  return (
    <div className={`w-full space-y-2 ${className}`}>
      {/* Label and Sublabel (if provided) */}
      {label && (
        <div className="flex items-center justify-between">
          <label 
            htmlFor={id} 
            className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
          >
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {sublabel && <span className="text-[11px] text-slate-400">{sublabel}</span>}
        </div>
      )}

      {/* Main Text Input Container (Visually clean with NO internal buttons or overlapping controls) */}
      <div 
        className={`relative rounded-2xl border transition-all duration-200 bg-white ${
          voiceState === 'listening'
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs' 
            : 'border-slate-200 hover:border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/10'
        }`}
      >
        {multiline ? (
          <textarea
            id={id}
            name={name}
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={label || placeholder}
            className={`w-full p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none resize-y rounded-2xl bg-transparent ${inputClassName}`}
          />
        ) : (
          <input
            id={id}
            name={name}
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={label || placeholder}
            className={`w-full h-11 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent rounded-2xl ${inputClassName}`}
          />
        )}
      </div>

      {/* Dedicated Voice-to-Text Control Bar Positioned VISUALLY SEPARATE from the Input Area */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
        {/* Left Side: Voice Action + Language Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Voice Action Button & State Display */}
          {voiceState === 'listening' ? (
            /* Active Listening State: Red Pulse, Counter & Stop Button */
            <div 
              role="status"
              className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-1.5 min-h-[44px] animate-in fade-in"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
              </span>

              <span className="text-xs font-bold text-rose-800">
                Listening...
              </span>

              <span className="font-mono text-xs font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded-md">
                {formatTime(recordingDuration)}
              </span>

              <button
                type="button"
                onClick={stopRecording}
                aria-label="Stop recording"
                className="inline-flex items-center gap-1 ml-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500 focus:outline-none text-white text-xs font-bold transition-all shadow-2xs min-h-[36px]"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          ) : voiceState === 'transcribing' ? (
            /* Transcribing / Processing State */
            <div 
              role="status"
              className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2 min-h-[44px] text-teal-800 text-xs font-bold animate-in fade-in"
            >
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span>Processing...</span>
            </div>
          ) : (
            /* Idle State: Speak Button */
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled}
              aria-label={speakLabel || 'Start voice input'}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all shadow-2xs disabled:opacity-50 min-h-[44px] min-w-[44px] focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none cursor-pointer"
            >
              <Mic className="w-4 h-4 text-emerald-700" />
              <span>{speakLabel || 'Speak your answer'}</span>
            </button>
          )}

          {/* Spoken Language Dropdown Selector (English, Hindi, Tamil) */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              disabled={voiceState === 'listening' || disabled}
              aria-label="Select speech language"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors min-h-[44px] min-w-[44px] shadow-2xs focus-visible:ring-2 focus-visible:ring-emerald-500 focus:outline-none disabled:opacity-50"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentLangObj.nativeLabel}</span>
              <span className="text-[9px] text-slate-400">▼</span>
            </button>

            {isLangMenuOpen && (
              <div className="absolute left-0 bottom-full mb-1.5 w-40 bg-white rounded-xl border border-slate-200 shadow-xl py-1 z-30 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select Language
                </div>
                {SUPPORTED_VOICE_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setSelectedLang(lang.code);
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-emerald-50 hover:text-emerald-800 transition-colors ${
                      selectedLang === lang.code ? 'font-bold text-emerald-700 bg-emerald-50/60' : 'text-slate-700'
                    }`}
                  >
                    <span>{lang.nativeLabel}</span>
                    {selectedLang === lang.code && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Completed State Feedback Badge */}
          {voiceState === 'completed' && (
            <div 
              role="status"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-bold px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg animate-in fade-in"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>✓ Voice answer added</span>
            </div>
          )}
        </div>

        {/* Right Side: Privacy Guarantee + Clear Option */}
        <div className="flex items-center gap-3">
          {/* Quick Clear Button (if text exists) */}
          {value && !disabled && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                currentValueRef.current = '';
                if (inputRef.current) inputRef.current.focus();
              }}
              aria-label="Clear answer"
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1 min-h-[36px] px-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          {/* Privacy Message */}
          <div 
            className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-help"
            title="CarePrep does not intentionally record or permanently store raw audio. Voice input is converted to text through the browser's speech-recognition capability, and the resulting text is used as the patient's intake response."
          >
            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="hidden sm:inline">Voice converted via browser speech-recognition</span>
            <span className="sm:hidden">Voice-to-text</span>
          </div>
        </div>
      </div>

      {/* Non-blocking Graceful Error Alert */}
      {errorMessage && (
        <div 
          role="alert"
          className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start justify-between gap-2 animate-in fade-in"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-amber-600 hover:text-amber-800 p-1 min-h-[32px] min-w-[32px] flex items-center justify-center"
            aria-label="Dismiss error message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
