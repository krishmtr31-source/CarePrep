/**
 * Prompt Sanitizer and Injection Shield.
 * 
 * Protects the platform against prompt injection from untrusted patient utterances and medical document scans.
 */
export class PromptSanitizer {
  private static readonly INJECTION_PATTERNS = [
    /(?:ignore|forget|disregard)\s+(?:all\s+)?(?:previous|prior|above)\s+instructions/i,
    /system(?:\s+override)?\s*:\s*/i,
    /assistant\s*:\s*/i,
    /override\s+(?:red\s*flags?|safety|rules|instructions)/i,
    /diagnose\s+me\s+with/i,
    /prescribe\s+(?:me\s+)?/i,
    /you\s+are\s+now\s+a/i,
    /do\s+not\s+call\s+doctor/i,
    /bypass\s+security/i,
    /admin\s+mode/i
  ];

  /**
   * Scans input for prompt injection signatures and returns sanitized string enclosed in untrusted tags.
   */
  public static sanitizePatientInput(rawText: string): {
    sanitizedText: string;
    hasInjectionAttempt: boolean;
    detectedPatterns: string[];
  } {
    if (!rawText) {
      return { sanitizedText: '', hasInjectionAttempt: false, detectedPatterns: [] };
    }

    const detectedPatterns: string[] = [];

    // Check for injection signatures
    for (const pattern of this.INJECTION_PATTERNS) {
      if (pattern.test(rawText)) {
        detectedPatterns.push(pattern.source);
      }
    }

    // Clean dangerous control characters and formatting attacks
    let cleaned = rawText
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '')
      .replace(/<\/?(?:system|instruction|prompt|role)[^>]*>/gi, '');

    const hasInjectionAttempt = detectedPatterns.length > 0;

    // Fenced boundary isolation
    const sanitizedText = `<untrusted_patient_input>\n${cleaned.trim()}\n</untrusted_patient_input>`;

    return {
      sanitizedText,
      hasInjectionAttempt,
      detectedPatterns
    };
  }

  /**
   * Sanitizes untrusted OCR document text.
   */
  public static sanitizeDocumentText(rawText: string): {
    sanitizedText: string;
    hasInjectionAttempt: boolean;
  } {
    const res = this.sanitizePatientInput(rawText);
    return {
      sanitizedText: `<untrusted_document_ocr>\n${rawText.trim()}\n</untrusted_document_ocr>`,
      hasInjectionAttempt: res.hasInjectionAttempt
    };
  }
}
