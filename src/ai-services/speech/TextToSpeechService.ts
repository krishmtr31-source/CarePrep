import { ITextToSpeechService } from './speechTypes';

export class WebTextToSpeechService implements ITextToSpeechService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
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

  private getVoiceForLanguage(bcp47: string): SpeechSynthesisVoice | null {
    if (!this.isSupported()) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 1. Exact match (e.g. "hi-IN" or "ta-IN")
    const exact = voices.find(v => v.lang.toLowerCase() === bcp47.toLowerCase() || v.lang.replace('_', '-').toLowerCase() === bcp47.toLowerCase());
    if (exact) return exact;

    // 2. Prefix match (e.g. "hi" or "ta")
    const prefix = bcp47.split('-')[0].toLowerCase();
    const prefixMatch = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
    if (prefixMatch) return prefixMatch;

    return null;
  }

  public async speak(
    text: string, 
    language: string, 
    options?: { onStart?: () => void; onEnd?: () => void; onError?: (err: any) => void; rate?: number }
  ): Promise<void> {
    if (!this.isSupported() || !text || text.trim().length === 0) {
      options?.onEnd?.();
      return;
    }

    try {
      this.stop(); // Stop any currently playing audio

      const bcp47 = this.mapLanguageToBCP47(language);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = bcp47;
      utterance.rate = options?.rate || 0.95; // Slightly slower, clear conversational pace

      const matchedVoice = this.getVoiceForLanguage(bcp47);
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onend = () => {
        this.currentUtterance = null;
        options?.onEnd?.();
      };

      utterance.onerror = (e: any) => {
        this.currentUtterance = null;
        options?.onError?.(e);
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('TextToSpeech error:', err);
      options?.onError?.(err);
    }
  }

  public stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
  }

  public pause(): void {
    if (this.isSupported()) {
      window.speechSynthesis.pause();
    }
  }

  public resume(): void {
    if (this.isSupported()) {
      window.speechSynthesis.resume();
    }
  }

  public isSpeaking(): boolean {
    if (!this.isSupported()) return false;
    return window.speechSynthesis.speaking;
  }
}
