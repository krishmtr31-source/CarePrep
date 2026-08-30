import { PatientInterpretationSchema, UncertaintyLevel } from './llmTypes';

export class SchemaValidator {
  /**
   * Validates and normalizes raw LLM output into a safe, grounded PatientInterpretationSchema.
   */
  public static validateInterpretation(
    rawOutput: any,
    sourceText: string,
    language: string = 'en'
  ): {
    isValid: boolean;
    data: PatientInterpretationSchema;
    errors: string[];
  } {
    const errors: string[] = [];

    let parsed: any;
    if (typeof rawOutput === 'string') {
      try {
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawOutput);
      } catch (err: any) {
        errors.push(`JSON parsing error: ${err.message}`);
        return {
          isValid: false,
          data: this.createEmptyFallback(sourceText, 'REQUIRES_VERIFICATION', language),
          errors
        };
      }
    } else {
      parsed = rawOutput || {};
    }

    // 1. Complaint Validation (Must be symptom-based, not an autonomous medical diagnosis)
    let complaint = typeof parsed.complaint === 'string' && parsed.complaint.trim()
      ? parsed.complaint.trim()
      : (typeof parsed.chiefComplaint === 'string' && parsed.chiefComplaint.trim() ? parsed.chiefComplaint.trim() : '');
    
    if (!complaint) {
      complaint = 'Not provided.';
    }

    // Guard against autonomous diagnostic statements disguised as complaints
    const forbiddenDiagnosisKeywords = [
      'myocardial infarction confirmed',
      'gastritis diagnosed',
      'appendicitis confirmed',
      'type 2 diabetes diagnosed',
      'stroke confirmed',
      'cancer confirmed'
    ];
    if (forbiddenDiagnosisKeywords.some(diag => complaint.toLowerCase().includes(diag))) {
      errors.push('LLM attempted to produce an autonomous clinical diagnosis. Normalizing to symptom.');
      complaint = complaint.replace(/confirmed|diagnosed/gi, 'suspected symptom');
    }

    // 2. Duration Validation
    const duration = typeof parsed.duration === 'string' && parsed.duration.trim()
      ? parsed.duration.trim()
      : 'Not provided.';

    // 3. Location Validation
    const location = typeof parsed.location === 'string' && parsed.location.trim()
      ? parsed.location.trim()
      : 'Not provided.';

    // 4. Severity Grounding Guard (Only accept severity if explicitly mentioned in sourceText)
    let severity = typeof parsed.severity === 'string' ? parsed.severity.trim() : 'Not provided.';
    const sourceLower = sourceText.toLowerCase();
    const hasExplicitSeverity = sourceLower.includes('severe') || 
                                sourceLower.includes('mild') || 
                                sourceLower.includes('moderate') || 
                                sourceLower.includes('bahut') || 
                                sourceLower.includes('zyada') || 
                                sourceLower.includes('theeviram') ||
                                sourceLower.includes('adhikam') ||
                                /\b(?:[1-9]|10)\s*\/\s*10\b/.test(sourceLower);

    if (severity !== 'Not provided.' && !hasExplicitSeverity) {
      errors.push('Severity not explicitly stated in patient statement. Grounded to "Not provided."');
      severity = 'Not provided.';
    }

    // 5. Uncertainty & Clarification Mapping
    let uncertainty: UncertaintyLevel = 'CLEAR';
    if (parsed.uncertainty === 'AMBIGUOUS' || parsed.uncertainty === 'REQUIRES_VERIFICATION') {
      uncertainty = parsed.uncertainty;
    } else if (sourceText.length < 5 || sourceLower.includes('weird') || sourceLower.includes('ajeeb') || sourceLower.includes('something wrong')) {
      uncertainty = 'AMBIGUOUS';
    }

    const requiresClarification = Boolean(parsed.requiresClarification || uncertainty !== 'CLEAR');

    // 6. Medication Entity Extraction
    const detectedMedications: PatientInterpretationSchema['detectedMedications'] = [];
    if (Array.isArray(parsed.detectedMedications)) {
      parsed.detectedMedications.forEach((med: any) => {
        if (typeof med === 'string') {
          detectedMedications.push({ name: med, isUncertain: true });
        } else if (med && typeof med.name === 'string') {
          detectedMedications.push({
            name: med.name,
            dosage: typeof med.dosage === 'string' ? med.dosage : undefined,
            frequency: typeof med.frequency === 'string' ? med.frequency : undefined,
            isUncertain: Boolean(med.isUncertain)
          });
        }
      });
    }

    // 7. Missing Information & Next Question
    const missingInformation: string[] = [];
    if (Array.isArray(parsed.missingInformation)) {
      parsed.missingInformation.forEach((m: any) => {
        if (typeof m === 'string' && m.trim()) missingInformation.push(m.trim());
      });
    } else {
      if (location === 'Not provided.') missingInformation.push('location');
      if (duration === 'Not provided.') missingInformation.push('duration');
      if (severity === 'Not provided.') missingInformation.push('severity');
    }

    const nextQuestion = typeof parsed.nextQuestion === 'string' && parsed.nextQuestion.trim()
      ? parsed.nextQuestion.trim()
      : undefined;

    const confidence = typeof parsed.confidence === 'number' && parsed.confidence >= 0 && parsed.confidence <= 1
      ? parsed.confidence
      : (uncertainty === 'CLEAR' ? 0.94 : 0.65);

    const validatedData: PatientInterpretationSchema = {
      complaint,
      duration,
      location,
      character: typeof parsed.character === 'string' ? parsed.character : 'Not provided.',
      severity,
      associatedSymptoms: Array.isArray(parsed.associatedSymptoms) ? parsed.associatedSymptoms : [],
      aggravatingFactors: typeof parsed.aggravatingFactors === 'string' 
        ? parsed.aggravatingFactors 
        : (Array.isArray(parsed.aggravatingFactors) ? parsed.aggravatingFactors.join(', ') : undefined),
      relievingFactors: typeof parsed.relievingFactors === 'string' 
        ? parsed.relievingFactors 
        : (Array.isArray(parsed.relievingFactors) ? parsed.relievingFactors.join(', ') : undefined),
      detectedMedications,
      uncertainty,
      requiresClarification,
      sourceText,
      extractedAt: new Date().toISOString(),
      originalText: sourceText,
      language,
      missingInformation,
      nextQuestion,
      confidence
    };

    return {
      isValid: errors.length === 0,
      data: validatedData,
      errors
    };
  }

  public static createEmptyFallback(
    sourceText: string,
    uncertainty: UncertaintyLevel = 'AMBIGUOUS',
    language: string = 'en'
  ): PatientInterpretationSchema {
    return {
      complaint: 'Not provided.',
      duration: 'Not provided.',
      location: 'Not provided.',
      character: 'Not provided.',
      severity: 'Not provided.',
      associatedSymptoms: [],
      uncertainty,
      requiresClarification: true,
      sourceText,
      extractedAt: new Date().toISOString(),
      originalText: sourceText,
      language,
      missingInformation: ['location', 'duration', 'severity'],
      confidence: 0.50
    };
  }
}
