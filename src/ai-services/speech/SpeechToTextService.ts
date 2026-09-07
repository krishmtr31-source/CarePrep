import { 
  ISpeechToTextService, 
  SpeechRecognitionState, 
  SpeechErrorCode, 
  SpeechToTextListener, 
  TranscriptionResult,
  VoiceDiagnosticsInfo 
} from './speechTypes';

// Extend window definition for Web Speech API and diagnostics
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    CAREPREP_VOICE_DIAGNOSTICS?: any;
    testBrowserSpeechDirectly?: (lang?: string) => void;
    testMicrophonePermissionDirectly?: () => Promise<boolean>;
  }
}

/**
 * Browser-native Web Speech API Speech-to-Text implementation.
 * 
 * Supports Chrome / Chromium desktop and mobile browsers.
 * Integrates non-blocking session lifecycle, BCP-47 multilingual mapping
 * (en-IN, hi-IN, ta-IN), and real-time development diagnostics.
 */
export class WebSpeechToTextService implements ISpeechToTextService {
  private recognition: any = null;
  private state: SpeechRecognitionState = 'IDLE';
  private listener: SpeechToTextListener | null = null;
  private currentLanguage: string = 'en';
  private lastErrorCode: SpeechErrorCode | null = null;
  private lastErrorMessage: string | null = null;
  private lastRawErrorEvent: any = null;
  private isListeningSessionActive: boolean = false;
  private isStarting: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      // Expose standalone test helpers and diagnostics on window
      window.CAREPREP_VOICE_DIAGNOSTICS = {
        getDiagnostics: (lang?: string) => this.getDiagnostics(lang),
        logDiagnostics: (lang?: string) => this.logDiagnostics(lang),
        getService: () => this,
        testSpeechDirectly: (lang?: string) => this.runDirectSpeechTest(lang),
        testMicDirectly: () => this.runDirectMicTest()
      };

      window.testBrowserSpeechDirectly = (lang?: string) => this.runDirectSpeechTest(lang);
      window.testMicrophonePermissionDirectly = () => this.runDirectMicTest();
    }
  }

  /**
   * Check if speech recognition is available in the browser window.
   */
  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /**
   * Map internal language code to official BCP-47 locale tags.
   */
  public mapLanguageToBCP47(langCode: string): string {
    switch (langCode.toLowerCase()) {
      case 'hi':
      case 'hindi':
        return 'hi-IN';
      case 'ta':
      case 'tamil':
        return 'ta-IN';
      case 'hinglish':
        // Hinglish uses Hindi (India) acoustic model with English loanword vocabulary support
        return 'hi-IN';
      case 'en':
      case 'english':
      default:
        return 'en-IN';
    }
  }

  /**
   * Isolated test for browser SpeechRecognition API directly.
   */
  public runDirectSpeechTest(lang: string = 'en-IN'): void {
    console.log('%c========================================\n  ISOLATED SPEECH RECOGNITION TEST\n========================================', 'color: #3b82f6; font-weight: bold;');
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.error('SpeechRecognition API is not available in window (window.SpeechRecognition and window.webkitSpeechRecognition are undefined).');
      return;
    }

    try {
      const directRec = new SpeechRecognitionAPI();
      directRec.lang = lang;
      directRec.interimResults = true;
      directRec.continuous = false;
      directRec.maxAlternatives = 1;

      directRec.onstart = () => {
        console.log('%cVOICE TEST: onstart fired — Microphone listening active!', 'color: #10b981; font-weight: bold;');
      };

      directRec.onaudiostart = () => {
        console.log('VOICE TEST: onaudiostart — Audio capture hardware receiving signal');
      };

      directRec.onspeechstart = () => {
        console.log('VOICE TEST: onspeechstart — Voice detected in stream');
      };

      directRec.onspeechend = () => {
        console.log('VOICE TEST: onspeechend — Speech input completed');
      };

      directRec.onresult = (event: any) => {
        console.log('VOICE TEST onresult event:', event);
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          console.log(`VOICE TEST TRANSCRIPT: "${item[0].transcript}" (confidence: ${item[0].confidence}, isFinal: ${item.isFinal})`);
        }
      };

      directRec.onerror = (event: any) => {
        console.error('%cVOICE TEST onerror event:', 'color: #ef4444; font-weight: bold;', event.error, event);
        console.log(`VOICE TEST ERROR SUMMARY: error="${event.error}", message="${event.message || 'N/A'}"`);
      };

      directRec.onend = () => {
        console.log('VOICE TEST: onend — Session ended');
      };

      console.log(`Calling directRec.start() with lang="${lang}"...`);
      directRec.start();
    } catch (err) {
      console.error('VOICE TEST EXCEPTION in start():', err);
    }
  }

  /**
   * Isolated test for physical microphone via getUserMedia.
   */
  public async runDirectMicTest(): Promise<boolean> {
    console.log('%c========================================\n  ISOLATED MICROPHONE HARDWARE TEST\n========================================', 'color: #10b981; font-weight: bold;');
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('navigator.mediaDevices.getUserMedia is unavailable in this environment.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tracks = stream.getAudioTracks();
      console.log(`%cMICROPHONE TEST: SUCCESS! Acquired ${tracks.length} audio track(s):`, 'color: #10b981; font-weight: bold;', tracks.map(t => ({
        label: t.label,
        enabled: t.enabled,
        readyState: t.readyState,
        muted: t.muted
      })));
      tracks.forEach(t => t.stop());
      console.log('MICROPHONE TEST: Released audio tracks successfully.');
      return true;
    } catch (err: any) {
      console.error('%cMICROPHONE TEST FAILED:', 'color: #ef4444; font-weight: bold;', err.name, err.message, err);
      return false;
    }
  }

  /**
   * Instantiate a fresh SpeechRecognition instance for a listening session.
   */
  private createRecognitionInstance(bcp47Lang: string): any {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = bcp47Lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      this.isListeningSessionActive = true;
      this.isStarting = false;
      this.setState('LISTENING');
      console.info(`[CarePrep STT] Speech recognition started (language: ${bcp47Lang})`);
    };

    recognition.onaudiostart = () => {
      this.listener?.onAudioLevel?.(0.6);
    };

    recognition.onspeechstart = () => {
      this.setState('LISTENING');
    };

    recognition.onspeechend = () => {
      this.setState('PROCESSING');
    };

    recognition.onresult = (event: any) => {
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

    recognition.onerror = (event: any) => {
      const errorStr = event.error || 'unknown';
      const errorMsg = event.message || '';
      this.lastRawErrorEvent = event;
      this.isStarting = false;

      console.error('[CarePrep STT] SpeechRecognition onerror:', {
        error: errorStr,
        message: errorMsg,
        language: this.currentLanguage,
        bcp47: bcp47Lang,
        rawEvent: event
      });

      let code: SpeechErrorCode = 'unknown';
      let userMsg = 'Voice input is temporarily unavailable. Please try again or type your answer.';

      switch (errorStr) {
        case 'not-allowed':
          code = 'not-allowed';
          userMsg = 'Microphone permission is blocked. Please allow microphone access in your browser settings.';
          break;
        case 'no-speech':
          code = 'no-speech';
          userMsg = 'No speech was detected. Please try speaking again or type your answer.';
          break;
        case 'network':
          code = 'network';
          userMsg = 'Browser speech recognition service is unavailable. Please try again or type your answer.';
          break;
        case 'language-not-supported':
          code = 'unsupported-language';
          userMsg = 'Voice recognition for this language is not supported in this browser. You can type your answer.';
          break;
        case 'audio-capture':
          code = 'audio-capture';
          userMsg = 'No microphone was detected. Please connect a microphone or type your answer.';
          break;
        case 'service-not-allowed':
          code = 'not-allowed';
          userMsg = 'Speech recognition service is not allowed by the browser. Please check browser settings or type your answer.';
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

      this.lastErrorCode = code;
      this.lastErrorMessage = userMsg;
      this.setState('ERROR');
      this.listener?.onError?.(code, userMsg);
    };

    recognition.onend = () => {
      this.isListeningSessionActive = false;
      this.isStarting = false;
      if (this.state === 'LISTENING' || this.state === 'PROCESSING') {
        this.setState('IDLE');
      }
    };

    return recognition;
  }

  private setState(newState: SpeechRecognitionState): void {
    this.state = newState;
    this.listener?.onStateChange?.(newState);
  }

  /**
   * Start listening for speech input in the given language.
   */
  public async startListening(language: string, listener: SpeechToTextListener): Promise<void> {
    this.listener = listener;
    this.currentLanguage = language;
    this.lastErrorCode = null;
    this.lastErrorMessage = null;
    this.lastRawErrorEvent = null;

    // Log live diagnostic on start
    await this.logDiagnostics(language);

    // 1. Browser Support Check
    if (!this.isSupported()) {
      this.lastErrorCode = 'unsupported-browser';
      this.lastErrorMessage = 'Speech recognition is not supported in this browser. Please use text input.';
      this.setState('ERROR');
      this.listener.onError?.(
        'unsupported-browser',
        'Speech recognition is not supported in this browser. Please type your answer.'
      );
      return;
    }

    // 2. Prevent overlapping start invocations
    if (this.isStarting || this.isListeningSessionActive) {
      this.abort();
    }

    // 3. Initialize and start fresh SpeechRecognition session
    try {
      this.isStarting = true;
      const bcp47Lang = this.mapLanguageToBCP47(language);
      this.recognition = this.createRecognitionInstance(bcp47Lang);

      if (!this.recognition) {
        throw new Error('Failed to create SpeechRecognition instance');
      }

      this.setState('LISTENING');
      this.recognition.start();
    } catch (err: any) {
      this.isStarting = false;
      console.error('[CarePrep STT] Error starting speech recognition:', err);
      
      if (err.name === 'InvalidStateError') {
        // Recognition was already started; abort and retry once
        try {
          this.recognition?.abort();
          this.recognition = this.createRecognitionInstance(this.mapLanguageToBCP47(language));
          this.recognition.start();
          return;
        } catch (retryErr) {
          console.error('[CarePrep STT] Retry start error:', retryErr);
        }
      }

      this.lastErrorCode = 'unknown';
      this.lastErrorMessage = err.message || 'Could not start voice recognition.';
      this.setState('ERROR');
      this.listener.onError?.(
        'unknown',
        'Could not start voice recognition. Please try again or type your answer.'
      );
    }
  }

  /**
   * Stop active listening session and await final transcript.
   */
  public stopListening(): void {
    if (this.recognition && (this.isListeningSessionActive || this.isStarting)) {
      try {
        this.recognition.stop();
      } catch (err) {
        // ignore already stopped
      }
    }
    this.isStarting = false;
    if (this.state !== 'TRANSCRIBED' && this.state !== 'ERROR') {
      this.setState('IDLE');
    }
  }

  /**
   * Abort and cancel recognition immediately.
   */
  public abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (err) {
        // ignore
      }
      this.recognition = null;
    }
    this.isListeningSessionActive = false;
    this.isStarting = false;
    if (this.state !== 'TRANSCRIBED') {
      this.setState('IDLE');
    }
  }

  public getState(): SpeechRecognitionState {
    return this.state;
  }

  /**
   * Generate comprehensive development diagnostics.
   */
  public async getDiagnostics(language?: string): Promise<VoiceDiagnosticsInfo> {
    const targetLang = language || this.currentLanguage || 'en';
    const bcp47 = this.mapLanguageToBCP47(targetLang);
    const hasSpeechRecognition = typeof window !== 'undefined' && 'SpeechRecognition' in window;
    const hasWebkitSpeechRecognition = typeof window !== 'undefined' && 'webkitSpeechRecognition' in window;
    const isSecure = typeof window !== 'undefined' ? Boolean(window.isSecureContext) : false;

    let permissionStatus = 'unknown';
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        permissionStatus = perm.state;
      } catch (e) {
        permissionStatus = 'unsupported-query';
      }
    }

    let micAvailable = false;
    let audioDeviceCount = 0;
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        audioDeviceCount = audioInputs.length;
        micAvailable = audioInputs.length > 0;
      } catch (e) {
        micAvailable = false;
      }
    }

    const browserInfo = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    let detectedBrowser = 'Unknown';
    if (browserInfo.includes('Chrome')) detectedBrowser = 'Chrome / Chromium';
    else if (browserInfo.includes('Firefox')) detectedBrowser = 'Firefox';
    else if (browserInfo.includes('Safari')) detectedBrowser = 'Safari';
    else if (browserInfo.includes('Edge')) detectedBrowser = 'Edge';

    return {
      browser: detectedBrowser,
      isSecureContext: isSecure,
      speechRecognitionAvailable: hasSpeechRecognition,
      webkitSpeechRecognitionAvailable: hasWebkitSpeechRecognition,
      speechRecognitionConstructor: hasSpeechRecognition 
        ? 'SpeechRecognition' 
        : (hasWebkitSpeechRecognition ? 'webkitSpeechRecognition' : 'None'),
      microphoneDeviceAvailable: micAvailable,
      audioInputDeviceCount: audioDeviceCount,
      permissionStatus,
      selectedLanguage: targetLang,
      mappedBCP47: bcp47,
      continuous: false,
      interimResults: true,
      currentState: this.state,
      lastErrorCode: this.lastErrorCode,
      lastErrorMessage: this.lastErrorMessage,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log human-readable diagnostics panel to console in the exact format requested.
   */
  public async logDiagnostics(language?: string): Promise<void> {
    const diag = await this.getDiagnostics(language);
    const hasMediaDevices = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices);
    const hasGetUserMedia = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

    console.log(
      `%cVOICE DIAGNOSTICS\n\n` +
      `Browser:\n${diag.browser}\n\n` +
      `User agent:\n${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}\n\n` +
      `SpeechRecognition:\n${diag.speechRecognitionAvailable}\n\n` +
      `webkitSpeechRecognition:\n${diag.webkitSpeechRecognitionAvailable}\n\n` +
      `Recognition constructor:\n${diag.speechRecognitionConstructor !== 'None' ? 'available' : 'unavailable'}\n\n` +
      `navigator.mediaDevices:\n${hasMediaDevices ? 'available' : 'unavailable'}\n\n` +
      `getUserMedia:\n${hasGetUserMedia ? 'available' : 'unavailable'}\n\n` +
      `Microphone permission:\n${diag.permissionStatus}\n\n` +
      `Selected language:\n${diag.selectedLanguage}\n\n` +
      `recognition.lang:\n${diag.mappedBCP47}\n\n` +
      `recognition.started:\n${this.isListeningSessionActive}\n\n` +
      `onstart:\n${this.isListeningSessionActive ? 'Active' : 'IDLE'}\n\n` +
      `onresult:\n${this.state === 'TRANSCRIBED' ? 'Transcript received' : 'None'}\n\n` +
      `onerror:\n${this.lastErrorCode ? `${this.lastErrorCode} (${this.lastErrorMessage})` : 'None'}\n\n` +
      `onend:\n${this.state === 'IDLE' ? 'Ended' : 'Listening/Processing'}\n`,
      'color: #059669; font-weight: bold; font-family: monospace;'
    );
  }
}
