export type SpeechRecognitionState = 
  | 'IDLE' 
  | 'LISTENING' 
  | 'PROCESSING' 
  | 'TRANSCRIBED' 
  | 'ERROR';

export type SpeechErrorCode = 
  | 'not-allowed' 
  | 'no-speech' 
  | 'network' 
  | 'unsupported-language' 
  | 'unsupported-browser'
  | 'audio-capture' 
  | 'aborted' 
  | 'unknown';

export interface TranscriptionResult {
  rawTranscript: string;
  language: string;
  isFinal: boolean;
}

export interface VoiceDiagnosticsInfo {
  browser: string;
  isSecureContext: boolean;
  speechRecognitionAvailable: boolean;
  webkitSpeechRecognitionAvailable: boolean;
  speechRecognitionConstructor: string;
  microphoneDeviceAvailable: boolean;
  audioInputDeviceCount: number;
  permissionStatus: string;
  selectedLanguage: string;
  mappedBCP47: string;
  continuous: boolean;
  interimResults: boolean;
  currentState: SpeechRecognitionState;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  timestamp: string;
}

export interface SpeechToTextListener {
  onStateChange?: (state: SpeechRecognitionState) => void;
  onTranscript?: (result: TranscriptionResult) => void;
  onError?: (errorCode: SpeechErrorCode, errorMessage: string) => void;
  onAudioLevel?: (level: number) => void;
}

export interface ISpeechToTextService {
  isSupported(): boolean;
  startListening(language: string, listener: SpeechToTextListener): Promise<void>;
  stopListening(): void;
  abort(): void;
  getState(): SpeechRecognitionState;
  getDiagnostics(language?: string): Promise<VoiceDiagnosticsInfo>;
  logDiagnostics?(language?: string): Promise<void>;
}

export interface ITextToSpeechService {
  isSupported(): boolean;
  speak(
    text: string, 
    language: string, 
    options?: { onStart?: () => void; onEnd?: () => void; onError?: (err: any) => void; rate?: number }
  ): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  isSpeaking(): boolean;
}
