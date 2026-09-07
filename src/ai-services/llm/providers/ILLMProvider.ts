import { PatientInterpretationSchema, DocumentInterpretationSchema } from '../llmTypes';

export interface ILLMProvider {
  getProviderName(): string;
  getModelName(): string;
  interpretPatientUtterance(
    text: string,
    language: 'en' | 'hi' | 'ta',
    context?: string
  ): Promise<PatientInterpretationSchema>;
  interpretDocument?(
    rawText: string,
    fileName?: string,
    fileData?: string,
    mimeType?: string
  ): Promise<DocumentInterpretationSchema>;
  testConnection(): Promise<boolean>;
}
