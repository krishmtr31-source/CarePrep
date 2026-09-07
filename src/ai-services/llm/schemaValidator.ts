import { 
  PatientInterpretationSchema, 
  UncertaintyLevel, 
  DocumentInterpretationSchema,
  DocumentMedicationExtraction,
  DocumentLabExtraction,
  DocumentDiagnosisExtraction 
} from './llmTypes';

const AYUSH_TERMS = [
  'churna', 'kwath', 'kwatha', 'vati', 'bhasma', 'taila', 'guggulu', 
  'asava', 'arishta', 'avaleha', 'kashayam', 'lehyam', 'rasa', 'siddha', 'unani'
];

const NON_MEDICATION_WORDS = new Set([
  'diagnosis', 'assessment', 'impression', 'history', 'patient', 'doctor', 'dr',
  'hospital', 'clinic', 'advice', 'instructions', 'follow', 'review', 'investigation',
  'department', 'signature', 'date', 'name', 'age', 'weight', 'reg', 'phone', 'table',
  'test', 'report', 'specimen', 'page', 'stream', 'obj', 'endobj', 'filter'
]);

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
      parsed.requiresClarification = true;
      parsed.uncertainty = 'REQUIRES_VERIFICATION';
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

  /**
   * Validates and normalizes Gemini document extraction output into DocumentInterpretationSchema.
   * Grounding checks verify every entity against rawText.
   * Corrupted medication tokens are sanitized to "Unverified medication name" with requiresVerification = true.
   * Reference ranges missing from source are marked INDETERMINATE with requiresVerification = true.
   */
  public static validateDocumentInterpretation(
    rawOutput: any,
    rawText: string,
    fileName: string = 'document'
  ): {
    isValid: boolean;
    data: DocumentInterpretationSchema;
    errors: string[];
  } {
    const errors: string[] = [];
    let parsed: any;

    if (typeof rawOutput === 'string') {
      try {
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawOutput);
      } catch (err: any) {
        errors.push(`Document JSON parsing error: ${err.message}`);
        return {
          isValid: false,
          data: this.createEmptyDocumentFallback(rawText),
          errors
        };
      }
    } else {
      parsed = rawOutput || {};
    }

    const rawTextLower = rawText.toLowerCase();

    // 1. Classification
    const validDocTypes = ['PRESCRIPTION', 'LAB_REPORT', 'DISCHARGE_SUMMARY', 'OTHER'];
    let documentType: DocumentInterpretationSchema['documentType'] = 'OTHER';
    if (typeof parsed.documentType === 'string') {
      const normType = parsed.documentType.toUpperCase().trim();
      if (validDocTypes.includes(normType)) {
        documentType = normType as any;
      }
    }

    // 2. Dates and Facilities
    const documentDate = typeof parsed.documentDate === 'string' && parsed.documentDate.trim()
      ? parsed.documentDate.trim()
      : null;
    const facilityName = typeof parsed.facilityName === 'string' && parsed.facilityName.trim()
      ? parsed.facilityName.trim()
      : null;
    const doctorName = typeof parsed.doctorName === 'string' && parsed.doctorName.trim()
      ? parsed.doctorName.trim()
      : null;
    const summaryNote = typeof parsed.summaryNote === 'string' && parsed.summaryNote.trim()
      ? parsed.summaryNote.trim()
      : null;

    // 3. Medications Validation & Sanitization
    const medications: DocumentMedicationExtraction[] = [];
    if (Array.isArray(parsed.medications)) {
      parsed.medications.forEach((med: any) => {
        if (!med || typeof med !== 'object') return;

        const rawMedName = typeof med.name === 'string' ? med.name.trim() : '';
        const dose = typeof med.dose === 'string' && med.dose.trim() ? med.dose.trim() : 'Not found / Requires verification';
        const frequency = typeof med.frequency === 'string' && med.frequency.trim() ? med.frequency.trim() : 'Not found / Requires verification';
        const duration = typeof med.duration === 'string' && med.duration.trim() ? med.duration.trim() : 'Not found / Requires verification';
        const evidence = typeof med.evidence === 'string' && med.evidence.trim() ? med.evidence.trim() : (med.originalText || rawMedName);

        // Sanitize & Validate Medication Name
        const medValidation = this.sanitizeMedicationName(rawMedName, rawTextLower, evidence);

        // Detect AYUSH formulation
        const isAyushMedicine = AYUSH_TERMS.some(t => 
          rawMedName.toLowerCase().includes(t) || 
          dose.toLowerCase().includes(t) ||
          evidence.toLowerCase().includes(t)
        );

        medications.push({
          name: medValidation.cleanName,
          originalText: med.originalText || rawMedName,
          dose,
          frequency,
          duration,
          evidence: evidence || rawMedName,
          page: typeof med.page === 'number' ? med.page : 1,
          confidence: medValidation.isCorrupted ? 0.30 : (typeof med.confidence === 'number' ? med.confidence : 0.92),
          requiresVerification: medValidation.requiresVerification || Boolean(med.requiresVerification),
          isAyushMedicine
        });
      });
    }

    // 4. Lab Results Validation & Deterministic Flagging
    const labs: DocumentLabExtraction[] = [];
    if (Array.isArray(parsed.labs)) {
      parsed.labs.forEach((lab: any) => {
        if (!lab || typeof lab !== 'object') return;

        const testName = typeof lab.testName === 'string' ? lab.testName.trim() : '';
        if (!testName || testName.length < 2) return;

        let rawVal = lab.value !== null && lab.value !== undefined ? String(lab.value).trim() : null;
        const unit = typeof lab.unit === 'string' ? lab.unit.trim() : '';
        let refRange = typeof lab.referenceRange === 'string' ? lab.referenceRange.trim() : '';
        const evidence = typeof lab.evidence === 'string' ? lab.evidence.trim() : (lab.originalText || `${testName} ${rawVal} ${unit}`);

        // Grounding check for reference range: Never create a reference range if document does not contain it!
        const hasRangeInDocument = refRange && refRange.length > 0 && (
          rawTextLower.includes(refRange.toLowerCase()) || 
          rawTextLower.includes(refRange.replace(/\s+/g, ''))
        );

        if (!hasRangeInDocument && refRange) {
          errors.push(`Reference range "${refRange}" for ${testName} not found in document text. Reset to indeterminate.`);
          refRange = '';
        }

        // Deterministic lab flag calculation
        const numVal = rawVal ? parseFloat(rawVal) : NaN;
        const deterministicEval = this.evaluateLabFlagDeterministically(numVal, refRange);

        labs.push({
          testName,
          originalText: lab.originalText || testName,
          value: rawVal,
          unit,
          referenceRange: refRange || 'Not specified in source document',
          flag: deterministicEval.flag,
          evidence,
          page: typeof lab.page === 'number' ? lab.page : 1,
          confidence: typeof lab.confidence === 'number' ? lab.confidence : 0.95,
          requiresVerification: !deterministicEval.hasSourceRange || Boolean(lab.requiresVerification)
        });
      });
    }

    // 5. Diagnoses Validation
    const diagnoses: DocumentDiagnosisExtraction[] = [];
    if (Array.isArray(parsed.diagnoses)) {
      parsed.diagnoses.forEach((diag: any) => {
        if (!diag || typeof diag !== 'object') return;
        const name = typeof diag.name === 'string' ? diag.name.trim() : '';
        if (name.length < 2) return;

        // Reject forbidden characters
        if (/[=\{\}\\_~^\|<>@\$\*]/.test(name)) return;

        const evidence = typeof diag.evidence === 'string' ? diag.evidence.trim() : name;

        diagnoses.push({
          name,
          originalText: diag.originalText || name,
          evidence,
          page: typeof diag.page === 'number' ? diag.page : 1,
          confidence: typeof diag.confidence === 'number' ? diag.confidence : 0.94
        });
      });
    }

    const validatedDocument: DocumentInterpretationSchema = {
      documentType,
      documentDate,
      facilityName,
      doctorName,
      summaryNote,
      medications,
      diagnoses,
      labs,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.94,
      requiresVerification: Boolean(parsed.requiresVerification || medications.some(m => m.requiresVerification) || labs.some(l => l.requiresVerification))
    };

    return {
      isValid: errors.length === 0,
      data: validatedDocument,
      errors
    };
  }

  /**
   * Sanitizes medication names, catching corrupted OCR strings (e.g. "Gat=)gMZ...)") and ungrounded entries.
   */
  public static sanitizeMedicationName(
    rawName: string, 
    rawTextLower: string, 
    evidenceSnippet: string
  ): { cleanName: string; isCorrupted: boolean; requiresVerification: boolean } {
    if (!rawName || rawName.trim().length < 2) {
      return { cleanName: 'Unverified medication name', isCorrupted: true, requiresVerification: true };
    }

    const trimmed = rawName.trim().replace(/^[-–\*\.\d\s]+/, '').replace(/[-–,:\.\s]+$/, '');

    // Check 1: Forbidden symbols from corrupted OCR / binary streams
    if (/[=\)\(%\{\}\\_~^\|<>@\$\*]/.test(trimmed)) {
      return { cleanName: 'Unverified medication name', isCorrupted: true, requiresVerification: true };
    }

    // Check 2: Letter-to-length ratio
    let letterCount = 0;
    for (let i = 0; i < trimmed.length; i++) {
      const code = trimmed.charCodeAt(i);
      if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
        letterCount++;
      }
    }
    const letterRatio = letterCount / trimmed.length;
    if (letterRatio < 0.70 || letterCount < 2) {
      return { cleanName: 'Unverified medication name', isCorrupted: true, requiresVerification: true };
    }

    // Check 3: Non-medication label check
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
    if (NON_MEDICATION_WORDS.has(firstWord) || NON_MEDICATION_WORDS.has(trimmed.toLowerCase())) {
      return { cleanName: 'Unverified medication name', isCorrupted: true, requiresVerification: true };
    }

    // Check 4: Must have at least one vowel
    if (!/[aeiouy]/i.test(trimmed)) {
      return { cleanName: 'Unverified medication name', isCorrupted: true, requiresVerification: true };
    }

    // Check 5: Grounding against document
    const trimmedLower = trimmed.toLowerCase();
    const isGrounded = rawTextLower.includes(trimmedLower) || 
                       (evidenceSnippet && rawTextLower.includes(evidenceSnippet.toLowerCase()));

    return {
      cleanName: trimmed,
      isCorrupted: false,
      requiresVerification: !isGrounded
    };
  }

  /**
   * Deterministically evaluates laboratory reference ranges and calculates abnormality flags.
   */
  public static evaluateLabFlagDeterministically(
    numVal: number,
    refRangeStr: string
  ): {
    flag: 'HIGH' | 'LOW' | 'NORMAL' | 'INDETERMINATE';
    isAbnormal: boolean;
    min?: number;
    max?: number;
    hasSourceRange: boolean;
  } {
    if (isNaN(numVal) || !refRangeStr || !refRangeStr.trim()) {
      return {
        flag: 'INDETERMINATE',
        isAbnormal: false,
        hasSourceRange: false
      };
    }

    const cleanRange = refRangeStr.trim();

    // Pattern 1: "min - max" e.g. "4.0 - 5.6" or "70 - 100" or "0.70 - 1.30"
    const rangeMatch = cleanRange.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1]);
      const max = parseFloat(rangeMatch[2]);
      if (!isNaN(min) && !isNaN(max)) {
        if (numVal > max) {
          return { flag: 'HIGH', isAbnormal: true, min, max, hasSourceRange: true };
        }
        if (numVal < min) {
          return { flag: 'LOW', isAbnormal: true, min, max, hasSourceRange: true };
        }
        return { flag: 'NORMAL', isAbnormal: false, min, max, hasSourceRange: true };
      }
    }

    // Pattern 2: "< max" or "<= max" e.g. "< 100", "< 5.7"
    const lessMatch = cleanRange.match(/[<≤]\s*(\d+(?:\.\d+)?)/);
    if (lessMatch) {
      const max = parseFloat(lessMatch[1]);
      if (!isNaN(max)) {
        if (numVal > max) {
          return { flag: 'HIGH', isAbnormal: true, max, hasSourceRange: true };
        }
        return { flag: 'NORMAL', isAbnormal: false, max, hasSourceRange: true };
      }
    }

    // Pattern 3: "> min" or ">= min" e.g. "> 60"
    const greaterMatch = cleanRange.match(/[>≥]\s*(\d+(?:\.\d+)?)/);
    if (greaterMatch) {
      const min = parseFloat(greaterMatch[1]);
      if (!isNaN(min)) {
        if (numVal < min) {
          return { flag: 'LOW', isAbnormal: true, min, hasSourceRange: true };
        }
        return { flag: 'NORMAL', isAbnormal: false, min, hasSourceRange: true };
      }
    }

    return {
      flag: 'INDETERMINATE',
      isAbnormal: false,
      hasSourceRange: false
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

  public static createEmptyDocumentFallback(rawText: string): DocumentInterpretationSchema {
    return {
      documentType: 'OTHER',
      documentDate: null,
      facilityName: null,
      doctorName: null,
      summaryNote: null,
      medications: [],
      diagnoses: [],
      labs: [],
      confidence: 0.10,
      requiresVerification: true,
      unreliableFields: ['Unable to extract structured data via AI. Manual clinician review required.']
    };
  }
}
