import { 
  ISpeechToTextService, 
  SpeechRecognitionState, 
  SpeechErrorCode, 
  SpeechToTextListener, 
  TranscriptionResult 
} from './speechTypes';

// Extend window definition for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

/**
 * Browser-native Web Speech API Speech-to-Text implementation.
 * 
 * Note: Voice interaction is primarily tested on Chromium-based browsers. 
 * Speech recognition behavior may vary depending on browser, operating system, 
 * microphone permissions, network conditions, device, background noise, and language.
 */
export class WebSpeechToTextService implements ISpeechToTextService {
  private recognition: any = null;
  private state: SpeechRecognitionState = 'IDLE';
  private listener: SpeechToTextListener | null = null;
  private currentLanguage: string = 'en';

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): boolean {
    if (typeof window === 'undefined') return false;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      try {
        this.recognition = new SpeechRecognitionAPI();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.bindEvents();
        return true;
      } catch (err) {
        return false;
      }
    }
    return false;
  }

  private mapLanguageToBCP47(langCode: string): string {
    switch (langCode.toLowerCase()) {
      case 'hi':
      case 'hindi':
        return 'hi-IN';
      case 'ta':
      case 'tamil':
        return 'ta-IN';
      case 'en':
      case 'english':
      default:
        return 'en-IN';
    }
  }

  private bindEvents(): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.setState('LISTENING');
    };

    this.recognition.onaudiostart = () => {
      this.listener?.onAudioLevel?.(0.5);
    };

    this.recognition.onspeechstart = () => {
      this.setState('LISTENING');
    };

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      const text = (finalTranscript || interimTranscript).trim();
      const isFinal = Boolean(finalTranscript && finalTranscript.trim().length > 0);

      if (isFinal) {
        this.setState('TRANSCRIBED');
      } else if (text) {
        this.setState('PROCESSING');
      }

      if (text && this.listener?.onTranscript) {
        this.listener.onTranscript({
          rawTranscript: text,
          language: this.currentLanguage,
          isFinal
        });
      }
    };

    this.recognition.onerror = (event: any) => {
      const errorStr = event.error || 'unknown';
      let code: SpeechErrorCode = 'unknown';
      let userMsg = 'Voice input is not available right now. You can type your answer instead.';

      switch (errorStr) {
        case 'not-allowed':
          code = 'not-allowed';
          userMsg = 'Microphone permission was denied. Please allow microphone access or type your answer.';
          break;
        case 'no-speech':
          code = 'no-speech';
          userMsg = 'No speech was detected. Please tap the microphone and speak again, or type your answer.';
          break;
        case 'network':
          code = 'network';
          userMsg = 'Network connection issue with speech service. You can type your answer instead.';
          break;
        case 'language-not-supported':
          code = 'unsupported-language';
          userMsg = 'Voice recognition for this language is not supported in this browser. You can type your answer.';
          break;
        case 'audio-capture':
          code = 'audio-capture';
          userMsg = 'No microphone device was detected. Please type your answer.';
          break;
        case 'aborted':
          code = 'aborted';
          userMsg = 'Voice recording was cancelled.';
          break;
        default:
          code = 'unknown';
          userMsg = 'We could not understand the audio. Please try again or type your answer.';
          break;
      }

      this.setState('ERROR');
      this.listener?.onError?.(code, userMsg);
    };

    this.recognition.onend = () => {
      if (this.state === 'LISTENING' || this.state === 'PROCESSING') {
        this.setState('IDLE');
      }
    };
  }

  private setState(newState: SpeechRecognitionState): void {
    this.state = newState;
    this.listener?.onStateChange?.(newState);
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  public async startListening(language: string, listener: SpeechToTextListener): Promise<void> {
    this.listener = listener;
    this.currentLanguage = language;

    if (!this.isSupported()) {
      this.setState('ERROR');
      this.listener.onError?.(
        'unsupported-language',
        'Voice input is not supported in this browser. Please type or tap your answer.'
      );
      return;
    }

    try {
      if (!this.recognition) {
        this.initRecognition();
      }

      this.recognition.lang = this.mapLanguageToBCP47(language);
      this.setState('LISTENING');
      this.recognition.start();
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        try {
          this.recognition.abort();
          this.recognition.start();
        } catch (retryErr) {
          this.setState('ERROR');
          this.listener.onError?.('unknown', 'Voice service is initializing. Please try again.');
        }
      } else {
        this.setState('ERROR');
        this.listener.onError?.('unknown', 'Could not start voice recognition. Please type your answer.');
      }
    }
  }

  public stopListening(): void {
    if (this.recognition && (this.state === 'LISTENING' || this.state === 'PROCESSING')) {
      try {
        this.recognition.stop();
      } catch (err) {
        // ignore already stopped
      }
    }
    if (this.state !== 'TRANSCRIBED') {
      this.setState('IDLE');
    }
  }

  public abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (err) {
        // ignore
      }
    }
    this.setState('IDLE');
  }

  public getState(): SpeechRecognitionState {
    return this.state;
  }
}
