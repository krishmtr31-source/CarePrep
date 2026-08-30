import { PatientInterpretationSchema } from '../llmTypes';

export interface ILLMProvider {
  getProviderName(): string;
  getModelName(): string;
  interpretPatientUtterance(
    text: string,
    language: 'en' | 'hi' | 'ta',
    context?: string
  ): Promise<PatientInterpretationSchema>;
  testConnection(): Promise<boolean>;
}
