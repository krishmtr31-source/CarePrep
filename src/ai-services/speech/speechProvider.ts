import { ISpeechToTextService, ITextToSpeechService } from './speechTypes';
import { WebSpeechToTextService } from './SpeechToTextService';
import { WebTextToSpeechService } from './TextToSpeechService';

class SpeechProviderRegistry {
  private sttInstance: ISpeechToTextService | null = null;
  private ttsInstance: ITextToSpeechService | null = null;

  public getSpeechToTextService(): ISpeechToTextService {
    if (!this.sttInstance) {
      this.sttInstance = new WebSpeechToTextService();
    }
    return this.sttInstance;
  }

  public getTextToSpeechService(): ITextToSpeechService {
    if (!this.ttsInstance) {
      this.ttsInstance = new WebTextToSpeechService();
    }
    return this.ttsInstance;
  }

  public setCustomSpeechToTextService(service: ISpeechToTextService): void {
    this.sttInstance = service;
  }

  public setCustomTextToSpeechService(service: ITextToSpeechService): void {
    this.ttsInstance = service;
  }
}

export const speechRegistry = new SpeechProviderRegistry();

export const speechToTextService = speechRegistry.getSpeechToTextService();
export const textToSpeechService = speechRegistry.getTextToSpeechService();
