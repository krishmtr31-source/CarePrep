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
  | 'audio-capture' 
  | 'aborted' 
  | 'unknown';

export interface TranscriptionResult {
  rawTranscript: string;
  language: string;
  isFinal: boolean;
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
