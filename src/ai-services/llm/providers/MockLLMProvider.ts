import { ILLMProvider } from './ILLMProvider';
import { PatientInterpretationSchema, DocumentInterpretationSchema } from '../llmTypes';
import { SchemaValidator } from '../schemaValidator';

export interface MockLLMBehavior {
  simulateTimeout?: boolean;
  simulateHttpError?: boolean;
  simulateMalformedJson?: boolean;
  simulateDiagnosisAttempt?: boolean;
  simulateInventedSeverity?: boolean;
  customResponse?: Partial<PatientInterpretationSchema>;
  customDocResponse?: Partial<DocumentInterpretationSchema>;
}

export class MockLLMProvider implements ILLMProvider {
  private behavior: MockLLMBehavior = {};

  constructor(behavior?: MockLLMBehavior) {
    if (behavior) this.behavior = behavior;
  }

  public setBehavior(behavior: MockLLMBehavior): void {
    this.behavior = behavior;
  }

  public getProviderName(): string {
    return 'MOCK_LLM_PROVIDER';
  }

  public getModelName(): string {
    return 'mock-gpt-4o';
  }

  public async testConnection(): Promise<boolean> {
    return !this.behavior.simulateHttpError;
  }

  public async interpretPatientUtterance(
    text: string,
    language: 'en' | 'hi' | 'ta'
  ): Promise<PatientInterpretationSchema> {
    if (this.behavior.simulateTimeout) {
      throw new Error('LLM request timed out after 5000ms.');
    }
    if (this.behavior.simulateHttpError) {
      throw new Error('HTTP 503: Provider temporarily overloaded.');
    }
    if (this.behavior.simulateMalformedJson) {
      const validation = SchemaValidator.validateInterpretation('{ invalid json :; content }', text);
      return validation.data;
    }

    if (this.behavior.simulateDiagnosisAttempt) {
      const raw = {
        complaint: 'Acute Myocardial Infarction Confirmed',
        duration: '1 day',
        location: 'Chest',
        severity: 'Severe (9/10)',
        uncertainty: 'CLEAR'
      };
      const validation = SchemaValidator.validateInterpretation(raw, text);
      return validation.data;
    }

    if (this.behavior.simulateInventedSeverity) {
      const raw = {
        complaint: 'Headache',
        duration: '2 days',
        location: 'Head',
        severity: 'Extreme Severe (10/10)', // Patient did not say this!
        uncertainty: 'CLEAR'
      };
      const validation = SchemaValidator.validateInterpretation(raw, text);
      return validation.data;
    }

    if (this.behavior.customResponse) {
      const validation = SchemaValidator.validateInterpretation(this.behavior.customResponse, text);
      return validation.data;
    }

    // Default intelligent simulation based on text
    const lower = text.toLowerCase();
    let complaint = 'General Discomfort';
    let duration = 'Not provided.';
    let location = 'Not provided.';
    let severity = 'Not provided.';
    const associatedSymptoms: string[] = [];

    if (lower.includes('headache') || lower.includes('sir dard') || lower.includes('thalai')) {
      complaint = 'Headache';
      location = 'Head / Cranial';
    } else if (lower.includes('stomach') || lower.includes('pet') || lower.includes('abdomen') || lower.includes('vayiru')) {
      complaint = 'Abdominal / Stomach Pain';
      location = lower.includes('lower') || lower.includes('neeche') ? 'Lower abdomen' : 'Abdomen';
    } else if (lower.includes('chest') || lower.includes('seena') || lower.includes('marbu')) {
      complaint = 'Chest Discomfort';
      location = 'Chest / Thoracic';
    }

    if (lower.includes('2 days') || lower.includes('two days') || lower.includes('do din') || lower.includes('2 din')) {
      duration = '2 days';
    } else if (lower.includes('3 days') || lower.includes('three days') || lower.includes('teen din') || lower.includes('3 din')) {
      duration = '3 days';
    } else if (lower.includes('yesterday') || lower.includes('kal se')) {
      duration = 'Since yesterday';
    }

    if (lower.includes('severe') || lower.includes('bahut zyada')) {
      severity = 'Severe';
    }

    if (lower.includes('vomiting') || lower.includes('ulti')) {
      associatedSymptoms.push('Vomiting');
    }
    if (lower.includes('fever') || lower.includes('bukhar')) {
      associatedSymptoms.push('Fever');
    }

    const uncertainty = (lower.includes('weird') || lower.includes('ajeeb')) ? 'AMBIGUOUS' : 'CLEAR';

    return {
      complaint,
      duration,
      location,
      character: 'Not provided.',
      severity,
      associatedSymptoms,
      uncertainty,
      requiresClarification: uncertainty === 'AMBIGUOUS',
      sourceText: text,
      extractedAt: new Date().toISOString()
    };
  }

  public async interpretDocument(
    rawText: string,
    fileName: string = 'document'
  ): Promise<DocumentInterpretationSchema> {
    if (this.behavior.simulateTimeout) {
      throw new Error('LLM request timed out after 5000ms.');
    }
    if (this.behavior.simulateHttpError) {
      throw new Error('HTTP 503: Provider temporarily overloaded.');
    }
    if (this.behavior.simulateMalformedJson) {
      const validation = SchemaValidator.validateDocumentInterpretation('{ invalid json :; document }', rawText, fileName);
      return validation.data;
    }

    if (this.behavior.customDocResponse) {
      const validation = SchemaValidator.validateDocumentInterpretation(this.behavior.customDocResponse, rawText, fileName);
      return validation.data;
    }

    // Default simulation for standard document text
    const lower = rawText.toLowerCase();
    let docType: DocumentInterpretationSchema['documentType'] = 'OTHER';

    if (lower.includes('rx') || lower.includes('prescription') || lower.includes('tablet') || lower.includes('tab.')) {
      docType = 'PRESCRIPTION';
    } else if (lower.includes('lab') || lower.includes('report') || lower.includes('test') || lower.includes('hba1c') || lower.includes('glucose')) {
      docType = 'LAB_REPORT';
    } else if (lower.includes('discharge') || lower.includes('admission') || lower.includes('hospital')) {
      docType = 'DISCHARGE_SUMMARY';
    }

    return {
      documentType: docType,
      documentDate: '18-Jan-2026',
      facilityName: 'City General Hospital',
      doctorName: 'Dr. Sharma',
      medications: [],
      diagnoses: [],
      labs: [],
      confidence: 0.95,
      requiresVerification: false
    };
  }
}
