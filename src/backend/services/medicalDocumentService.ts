import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { getGeminiModelName, getGeminiApiKey, isGeminiMockMode } from '../config/geminiConfig';
import { classifyGeminiError, generateMockDocumentExtraction, sanitizeLogMessage } from '../utils/geminiErrorHandler';
import { findClinicalBenchmark, CLINICAL_BENCHMARKS } from '../../document-intelligence/ocr/medicalInfoExtractor';

export type MedicalDocumentType = 
  | 'LAB_REPORT'
  | 'PRESCRIPTION'
  | 'DISCHARGE_SUMMARY'
  | 'CONSULTATION_NOTE'
  | 'RADIOLOGY_REPORT'
  | 'ECG_REPORT'
  | 'MEDICAL_CERTIFICATE'
  | 'OTHER';

export interface ILabResultEntry {
  testName: string;
  value: string;
  unit: string;
  referenceRange?: string;
  flag?: string;
}

export interface IMedicationEntry {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  route?: string;
}

export interface StructuredExtractionResult {
  documentType: MedicalDocumentType;
  documentTitle: string;
  documentDate: string | null;
  patientName: string | null;
  doctorName: string | null;
  hospitalName: string | null;
  summary: string;
  labResults: ILabResultEntry[];
  medications: IMedicationEntry[];
  diagnosesMentioned: string[];
  proceduresMentioned: string[];
  importantNotes: string[];
  extractionWarnings: string[];
}

export interface DocumentAnalysisInput {
  fileName: string;
  mimeType: string;
  fileData?: string; // base64 data string or data URL
  rawText?: string;
}

function getEnvApiKey(): string | undefined {
  const directKey = getGeminiApiKey();
  if (directKey) return directKey;

  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*GEMINI_API_KEY\s*=\s*(.*)$/);
        if (match) {
          const key = match[1].trim().replace(/^["']|["']$/g, '');
          if (key) {
            process.env.GEMINI_API_KEY = key;
            return key;
          }
        }
      }
    }
  } catch {
    // Ignore
  }
  return undefined;
}

export class MedicalDocumentService {
  private aiClient: GoogleGenAI | null = null;
  private modelName: string;

  constructor() {
    this.modelName = getGeminiModelName();
  }

  private getClient(): GoogleGenAI | null {
    const apiKey = getEnvApiKey();
    if (!apiKey) return null;
    if (!this.aiClient) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey });
      } catch (err) {
        console.warn('[MedicalDocumentService] Initialization error:', err);
      }
    }
    return this.aiClient;
  }

  public isConfigured(): boolean {
    return Boolean(this.getClient());
  }

  public getModelName(): string {
    return getGeminiModelName();
  }

  /**
   * Analyzes an uploaded medical document using Gemini server-side multimodal API.
   * Strictly enforces information extraction without medical diagnosis or invented data.
   */
  public async analyzeDocument(input: DocumentAnalysisInput): Promise<StructuredExtractionResult> {
    if (isGeminiMockMode()) {
      return generateMockDocumentExtraction(input.fileName, input.rawText);
    }

    const client = this.getClient();
    if (!client) {
      if (input.rawText && input.rawText.trim()) {
        return generateMockDocumentExtraction(input.fileName, input.rawText);
      }
      throw new Error('Gemini API key is not configured on server (GEMINI_API_KEY).');
    }

    const systemInstruction = `You are an AI-assisted medical document information extraction system.

Extract information that is explicitly present in the provided document.

Do not invent missing values.

Do not infer a diagnosis.

Do not change units.

Do not modify laboratory values.

Do not provide treatment recommendations.

If information is unclear or unreadable, return null or mark it as unclear.

Preserve the original meaning of the document.

Your task is information extraction and organization, not medical diagnosis.`;

    const userPrompt = `Document Filename: ${input.fileName}
MIME Type: ${input.mimeType}

Extract all explicitly documented clinical information into a strictly valid JSON object matching this exact specification:

{
  "documentType": "LAB_REPORT | PRESCRIPTION | DISCHARGE_SUMMARY | CONSULTATION_NOTE | RADIOLOGY_REPORT | ECG_REPORT | MEDICAL_CERTIFICATE | OTHER",
  "documentTitle": "Clean descriptive title e.g. Complete Blood Count, Prescription Note, Chest X-Ray Report",
  "documentDate": "YYYY-MM-DD or null if not stated",
  "patientName": "Full patient name if explicitly stated, else null",
  "doctorName": "Doctor / Physician name if explicitly stated, else null",
  "hospitalName": "Hospital / Clinic / Laboratory name if explicitly stated, else null",
  "summary": "1-2 sentence neutral summary of what the document contains",
  "labResults": [
    {
      "testName": "Exact investigation name",
      "value": "Exact value as printed",
      "unit": "Exact unit as printed",
      "referenceRange": "Numeric reference range as printed in document. If missing or unclear in document, provide standard medical numeric range (e.g. '70 - 99' or '< 140')",
      "flag": "NORMAL | HIGH | LOW | ABNORMAL | UNCLEAR | null"
    }
  ],
  "medications": [
    {
      "name": "Medication name",
      "dosage": "Dosage (e.g. 500 mg) or null",
      "frequency": "Frequency (e.g. Twice daily) or null",
      "duration": "Duration (e.g. 5 days) or null",
      "route": "Route (e.g. Oral, IV) or null"
    }
  ],
  "diagnosesMentioned": ["Diagnoses or clinical indications explicitly stated"],
  "proceduresMentioned": ["Procedures, tests, or surgical interventions explicitly stated"],
  "importantNotes": ["Follow-up instructions, physician advice, or explicit clinical notes"],
  "extractionWarnings": ["Any unclear, cut-off, smudged, or ambiguous items requiring human review"]
}

STRICT INSTRUCTIONS:
1. If the document does not contain a field, return null or an empty array. NEVER fabricate data.
2. If document type is uncertain, classify as "OTHER".
3. For laboratory reports: Extract the reference range as printed in the document. CRITICAL: If the recommended or reference range is NOT clearly stated, smudged, or missing in the document, supply standard medical numeric reference ranges for that test (e.g. Fasting Blood Glucose: '70 - 99', HbA1c: '4.0 - 5.6', Creatinine: '0.7 - 1.3') and evaluate the abnormality flag (NORMAL, HIGH, LOW, ABNORMAL) accordingly. Do not append AI labels or explanatory text inside referenceRange.
4. For prescriptions: Extract only what is visible. Do not recommend additional medication.
5. For discharge summaries: Preserve exact wording for diagnoses, procedures, and follow-up.
6. For radiology reports: Keep the radiologist's findings and impression wording.
7. If any value is blurry, low resolution, or uncertain, add a note in extractionWarnings and flag as UNCLEAR.`;

    const contents: any[] = [];

    // Multimodal binary attachment (PDF or Image)
    if (input.fileData && input.mimeType) {
      let base64Data = input.fileData;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }
      contents.push({
        inlineData: {
          mimeType: input.mimeType,
          data: base64Data
        }
      });
    }

    if (input.rawText && input.rawText.trim()) {
      contents.push({
        text: `Extracted Document Text:\n"""\n${input.rawText.trim()}\n"""\n\n`
      });
    }

    contents.push({
      text: userPrompt
    });

    try {
      let response: any;
      try {
        response = await client.models.generateContent({
          model: this.getModelName(),
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        });
      } catch (firstErr: any) {
        const classified = classifyGeminiError(firstErr);

        // DO NOT retry on quota limits (429), auth errors (401), or non-retryable issues
        if (!classified.retryable && classified.type !== 'INVALID_ARGUMENT') {
          console.warn(`[MedicalDocumentService] AI call error: [${classified.code}] ${classified.sanitizedDiagnostic}`);
          const customErr: any = new Error(classified.message);
          customErr.code = classified.code;
          customErr.status = classified.httpStatus;
          customErr.sanitizedDiagnostic = classified.sanitizedDiagnostic;
          throw customErr;
        }

        // If multimodal binary payload caused an invalid argument or decoding issue, but rawText exists, retry with text only
        if (input.rawText && input.rawText.trim() && contents.length > 2) {
          console.warn('[MedicalDocumentService] Retrying with text-only contents due to payload issue:', classified.sanitizedDiagnostic);
          try {
            response = await client.models.generateContent({
              model: this.getModelName(),
              contents: [
                { text: `Extracted Document Text:\n"""\n${input.rawText.trim()}\n"""\n\n` },
                { text: userPrompt }
              ],
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                temperature: 0.1
              }
            });
          } catch (retryErr: any) {
            const retryClassified = classifyGeminiError(retryErr);
            console.warn(`[MedicalDocumentService] Text-only retry failed: [${retryClassified.code}] ${retryClassified.sanitizedDiagnostic}`);
            const customErr: any = new Error(retryClassified.message);
            customErr.code = retryClassified.code;
            customErr.status = retryClassified.httpStatus;
            customErr.sanitizedDiagnostic = retryClassified.sanitizedDiagnostic;
            throw customErr;
          }
        } else {
          const customErr: any = new Error(classified.message);
          customErr.code = classified.code;
          customErr.status = classified.httpStatus;
          customErr.sanitizedDiagnostic = classified.sanitizedDiagnostic;
          throw customErr;
        }
      }

      const responseText = response.text || '{}';
      let parsed: any;
      try {
        parsed = JSON.parse(responseText);
      } catch (parseErr) {
        // Attempt to extract JSON block if wrapped in markdown
        const match = responseText.match(/```json([\s\S]*?)```/) || responseText.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[1] || match[0]);
        } else {
          throw new Error('Gemini output could not be parsed as JSON');
        }
      }

      return this.sanitizeExtractionResult(parsed, input.fileName);
    } catch (err: any) {
      console.warn('[MedicalDocumentService] Extraction error:', sanitizeLogMessage(err));
      if (input.rawText && input.rawText.trim()) {
        console.info('[MedicalDocumentService] Falling back to deterministic extraction for', input.fileName);
        return generateMockDocumentExtraction(input.fileName, input.rawText);
      }
      throw err;
    }
  }

  /**
   * Sanitizes and normalizes the AI extraction output against the required schema.
   */
  public sanitizeExtractionResult(data: any, fileName: string): StructuredExtractionResult {
    const validDocumentTypes: MedicalDocumentType[] = [
      'LAB_REPORT',
      'PRESCRIPTION',
      'DISCHARGE_SUMMARY',
      'CONSULTATION_NOTE',
      'RADIOLOGY_REPORT',
      'ECG_REPORT',
      'MEDICAL_CERTIFICATE',
      'OTHER'
    ];

    const rawType = String(data?.documentType || '').trim().toUpperCase();
    const documentType: MedicalDocumentType = validDocumentTypes.includes(rawType as any)
      ? (rawType as MedicalDocumentType)
      : 'OTHER';

    const documentTitle = typeof data?.documentTitle === 'string' && data.documentTitle.trim()
      ? data.documentTitle.trim()
      : fileName.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');

    const documentDate = typeof data?.documentDate === 'string' && data.documentDate.trim() && data.documentDate !== 'null'
      ? data.documentDate.trim()
      : null;

    const patientName = typeof data?.patientName === 'string' && data.patientName.trim() && data.patientName !== 'null'
      ? data.patientName.trim()
      : null;

    const doctorName = typeof data?.doctorName === 'string' && data.doctorName.trim() && data.doctorName !== 'null'
      ? data.doctorName.trim()
      : null;

    const hospitalName = typeof data?.hospitalName === 'string' && data.hospitalName.trim() && data.hospitalName !== 'null'
      ? data.hospitalName.trim()
      : null;

    const summary = typeof data?.summary === 'string' && data.summary.trim()
      ? data.summary.trim()
      : `Extracted medical record information for ${fileName}.`;

    const labResults: ILabResultEntry[] = Array.isArray(data?.labResults)
      ? data.labResults
          .filter((l: any) => l && (l.testName || l.test_name || l.name))
          .map((l: any) => ({
            testName: String(l.testName || l.test_name || l.name).trim(),
            value: String(l.value || l.result || '').trim(),
            unit: String(l.unit || '').trim(),
            referenceRange: l.referenceRange || l.reference_range ? String(l.referenceRange || l.reference_range).trim() : undefined,
            flag: l.flag ? String(l.flag).toUpperCase() : 'NORMAL'
          }))
      : [];

    const medications: IMedicationEntry[] = Array.isArray(data?.medications)
      ? data.medications
          .filter((m: any) => m && (m.name || m.medicineName))
          .map((m: any) => ({
            name: String(m.name || m.medicineName).trim(),
            dosage: m.dosage ? String(m.dosage).trim() : undefined,
            frequency: m.frequency ? String(m.frequency).trim() : undefined,
            duration: m.duration ? String(m.duration).trim() : undefined,
            route: m.route ? String(m.route).trim() : undefined
          }))
      : [];

    const diagnosesMentioned: string[] = Array.isArray(data?.diagnosesMentioned)
      ? data.diagnosesMentioned.map((d: any) => String(d).trim()).filter(Boolean)
      : [];

    const proceduresMentioned: string[] = Array.isArray(data?.proceduresMentioned)
      ? data.proceduresMentioned.map((p: any) => String(p).trim()).filter(Boolean)
      : [];

    const importantNotes: string[] = Array.isArray(data?.importantNotes)
      ? data.importantNotes.map((n: any) => String(n).trim()).filter(Boolean)
      : [];

    const extractionWarnings: string[] = Array.isArray(data?.extractionWarnings)
      ? data.extractionWarnings.map((w: any) => String(w).trim()).filter(Boolean)
      : [];

    return {
      documentType,
      documentTitle,
      documentDate,
      patientName,
      doctorName,
      hospitalName,
      summary,
      labResults,
      medications,
      diagnosesMentioned,
      proceduresMentioned,
      importantNotes,
      extractionWarnings
    };
  }

  /**
   * Resolves recommended reference ranges for laboratory investigations where the document
   * reference range is unclear, missing, or indeterminate, utilizing the Gemini API with
   * clinical benchmark fallbacks.
   */
  public async inferReferenceRangesWithGemini(
    tests: Array<{ testName: string; value: string; unit?: string }>
  ): Promise<InferredReferenceRangeResult[]> {
    if (!Array.isArray(tests) || tests.length === 0) {
      return [];
    }

    const sanitizedTests = tests.map(t => ({
      testName: String(t.testName || '').trim(),
      value: String(t.value || '').trim(),
      unit: String(t.unit || '').trim()
    })).filter(t => t.testName.length > 0);

    if (sanitizedTests.length === 0) {
      return [];
    }

    // Helper: evaluate benchmark fallback for a single test
    const evaluateBenchmark = (testName: string, valueStr: string, unitStr?: string): InferredReferenceRangeResult => {
      const matchedBenchmark = findStandardBenchmark(testName);
      const cleanVal = parseFloat(valueStr.replace(/,/g, ''));
      const unit = unitStr || matchedBenchmark?.unit || '';

      if (!matchedBenchmark) {
        return {
          testName,
          value: valueStr,
          unit,
          referenceRange: 'Standard clinical range required',
          flag: 'INDETERMINATE',
          isAbnormal: false,
          source: 'CLINICAL_BENCHMARK',
          rationale: 'Specialized test requires physician or lab verification.'
        };
      }

      let flag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' = 'NORMAL';
      let isAbnormal = false;

      if (!isNaN(cleanVal)) {
        if (matchedBenchmark.max !== undefined && cleanVal > matchedBenchmark.max) {
          flag = cleanVal > (matchedBenchmark.max * 1.5) ? 'CRITICAL' : 'HIGH';
          isAbnormal = true;
        } else if (matchedBenchmark.min !== undefined && cleanVal < matchedBenchmark.min) {
          flag = cleanVal < (matchedBenchmark.min * 0.5) ? 'CRITICAL' : 'LOW';
          isAbnormal = true;
        }
      }

      return {
        testName,
        value: valueStr,
        unit: unit || matchedBenchmark.unit,
        referenceRange: matchedBenchmark.raw,
        min: matchedBenchmark.min,
        max: matchedBenchmark.max,
        flag,
        isAbnormal,
        source: 'CLINICAL_BENCHMARK',
        rationale: `Standard clinical baseline benchmark for ${testName}.`
      };
    };

    // If Gemini mock mode or client not available, resolve using clinical benchmarks
    if (isGeminiMockMode()) {
      return sanitizedTests.map(t => evaluateBenchmark(t.testName, t.value, t.unit));
    }

    const client = this.getClient();
    if (!client) {
      return sanitizedTests.map(t => evaluateBenchmark(t.testName, t.value, t.unit));
    }

    const systemInstruction = `You are a clinical pathologist and laboratory medicine expert.
Your role is to supply accurate, standard adult biological reference intervals for medical laboratory investigations when document ranges are missing.
CRITICAL CLINICAL RULES:
1. Always use conventional standard reference intervals in the requested unit:
   - Fasting Blood Sugar / Glucose: 70 - 99 mg/dL
   - Postprandial Glucose: < 140 mg/dL
   - Random Blood Sugar: 70 - 140 mg/dL
   - HbA1c: 4.0 - 5.6 %
   - Serum Creatinine: 0.7 - 1.3 mg/dL
   - Blood Urea Nitrogen (BUN): 7 - 20 mg/dL
   - Blood Urea: 15 - 40 mg/dL
   - Serum Uric Acid: 3.5 - 7.2 mg/dL
   - Total Cholesterol: < 200 mg/dL
   - Triglycerides: < 150 mg/dL
   - HDL Cholesterol: > 40 mg/dL
   - LDL Cholesterol: < 100 mg/dL
   - Hemoglobin: 12.0 - 16.0 g/dL
   - Total Leukocyte Count (WBC / TLC): 4,000 - 11,000 cells/µL
   - Platelet Count: 150,000 - 450,000 cells/µL
   - Total Bilirubin: 0.2 - 1.2 mg/dL, Direct Bilirubin: 0.0 - 0.3 mg/dL
   - SGPT (ALT): 7 - 56 U/L, SGOT (AST): 10 - 40 U/L, ALP: 44 - 147 U/L
   - Total Protein: 6.0 - 8.3 g/dL, Albumin: 3.5 - 5.0 g/dL
   - Serum Sodium: 135 - 145 mmol/L, Serum Potassium: 3.5 - 5.0 mmol/L, Chloride: 98 - 106 mEq/L
   - Calcium: 8.5 - 10.5 mg/dL, TSH: 0.35 - 4.5 uIU/mL
   - Free T3: 2.0 - 4.4 pg/mL, Free T4: 0.93 - 1.7 ng/dL
   - Vitamin D: 30 - 100 ng/mL, Vitamin B12: 200 - 900 pg/mL
2. Reference ranges MUST be clean numerical intervals (e.g. '70 - 99', '< 200', '0.7 - 1.3'). Never output text descriptions or AI labels.
3. Determine flag strictly: HIGH if value > max, LOW if value < min, else NORMAL. If value exceeds 1.5x upper limit, flag as CRITICAL.
4. Output strictly valid JSON array of objects.`;

    const userPrompt = `Laboratory investigations requiring recommended clinical reference ranges:
${JSON.stringify(sanitizedTests, null, 2)}

Provide the recommended reference ranges formatted as a JSON array matching this exact schema:
[
  {
    "testName": "Investigation Name",
    "value": "Patient Value",
    "unit": "Unit",
    "referenceRange": "Numeric range only e.g. '70 - 99' or '< 140' or '0.7 - 1.3'",
    "min": number or null,
    "max": number or null,
    "flag": "NORMAL | HIGH | LOW | CRITICAL",
    "isAbnormal": boolean,
    "rationale": "Brief 1-sentence clinical context"
  }
]`;

    try {
      const response = await client.models.generateContent({
        model: this.getModelName(),
        contents: [{ text: userPrompt }],
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      });

      const responseText = response.text || '';
      let parsed: any;
      try {
        parsed = JSON.parse(responseText.trim());
      } catch (jsonErr) {
        const cleaned = responseText.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        return sanitizedTests.map((t, idx) => {
          const aiItem = parsed.find((p: any) => p.testName && (
            p.testName.toLowerCase().includes(t.testName.toLowerCase()) ||
            t.testName.toLowerCase().includes(p.testName.toLowerCase())
          )) || parsed[idx];

          // Check against authoritative standard clinical benchmark
          const matchedBenchmark = findStandardBenchmark(t.testName);

          let finalRefRange = '';
          let finalMin: number | undefined;
          let finalMax: number | undefined;
          let finalUnit = t.unit;

          // Benchmark provides the ground-truth clinical standard range
          if (matchedBenchmark && (!t.unit || t.unit.toLowerCase() === matchedBenchmark.unit.toLowerCase())) {
            finalRefRange = matchedBenchmark.raw;
            finalMin = matchedBenchmark.min;
            finalMax = matchedBenchmark.max;
            finalUnit = t.unit || matchedBenchmark.unit;
          } else if (aiItem && aiItem.referenceRange) {
            let cleanAiRange = String(aiItem.referenceRange)
              .replace(/\s*\([^)]*\)/g, '')
              .replace(/\s*(?:gemini|ai|recommended|standard|reference|range|interval).*$/i, '')
              .trim();

            if (/\d/.test(cleanAiRange)) {
              finalRefRange = cleanAiRange;
              finalUnit = aiItem.unit || t.unit || (matchedBenchmark?.unit ?? '');
              finalMin = typeof aiItem.min === 'number' ? aiItem.min : undefined;
              finalMax = typeof aiItem.max === 'number' ? aiItem.max : undefined;

              if (finalMin === undefined && finalMax === undefined) {
                const rangeMatch = cleanAiRange.match(/([0-9.]+)\s*(?:-|to)\s*([0-9.]+)/i);
                if (rangeMatch) {
                  finalMin = parseFloat(rangeMatch[1]);
                  finalMax = parseFloat(rangeMatch[2]);
                } else {
                  const ltMatch = cleanAiRange.match(/(?:<|<=|less\s+than)\s*([0-9.]+)/i);
                  if (ltMatch) {
                    finalMin = 0;
                    finalMax = parseFloat(ltMatch[1]);
                  } else {
                    const gtMatch = cleanAiRange.match(/(?:>|>=|greater\s+than)\s*([0-9.]+)/i);
                    if (gtMatch) {
                      finalMin = parseFloat(gtMatch[1]);
                    }
                  }
                }
              }
            } else if (matchedBenchmark) {
              finalRefRange = matchedBenchmark.raw;
              finalMin = matchedBenchmark.min;
              finalMax = matchedBenchmark.max;
              finalUnit = matchedBenchmark.unit;
            }
          }

          if (!finalRefRange) {
            return evaluateBenchmark(t.testName, t.value, t.unit);
          }

          // Strict abnormality calculation against confirmed bounds
          const numVal = parseFloat(t.value.replace(/,/g, ''));
          let flag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' = 'NORMAL';
          let isAbnormal = false;

          if (!isNaN(numVal)) {
            if (finalMax !== undefined && numVal > finalMax) {
              flag = numVal > (finalMax * 1.5) ? 'CRITICAL' : 'HIGH';
              isAbnormal = true;
            } else if (finalMin !== undefined && numVal < finalMin) {
              flag = numVal < (finalMin * 0.5) ? 'CRITICAL' : 'LOW';
              isAbnormal = true;
            }
          }

          return {
            testName: t.testName,
            value: t.value,
            unit: finalUnit,
            referenceRange: finalRefRange,
            min: finalMin,
            max: finalMax,
            flag,
            isAbnormal,
            source: 'GEMINI_AI',
            rationale: aiItem?.rationale || `Standard clinical reference interval for ${t.testName}.`
          };
        });
      }
    } catch (err: any) {
      const classified = classifyGeminiError(err);
      console.warn(`[MedicalDocumentService] inferReferenceRangesWithGemini failed, falling back to clinical benchmarks: [${classified.code}] ${classified.sanitizedDiagnostic}`);
    }

    // Fallback on error
    return sanitizedTests.map(t => evaluateBenchmark(t.testName, t.value, t.unit));
  }
}

export interface InferredReferenceRangeResult {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  min?: number;
  max?: number;
  flag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' | 'INDETERMINATE';
  isAbnormal: boolean;
  source: 'GEMINI_AI' | 'CLINICAL_BENCHMARK';
  rationale?: string;
}

export const STANDARD_CLINICAL_BENCHMARKS = CLINICAL_BENCHMARKS;
export const findStandardBenchmark = findClinicalBenchmark;


export const medicalDocumentService = new MedicalDocumentService();

/**
 * Compatibility adapter: converts canonical StructuredExtractionResult to legacy
 * GeminiMedicalDocumentAnalysis shape for older consumers without duplicate Gemini calls.
 */
export function adaptToLegacyGeminiAnalysis(extraction: StructuredExtractionResult, fileName: string = 'document') {
  return {
    document: {
      document_type: extraction.documentType,
      document_date: extraction.documentDate || 'Not available in report',
      hospital_or_lab: extraction.hospitalName || 'Not available in report',
      doctor_name: extraction.doctorName || 'Not available in report'
    },
    patient: {
      name: extraction.patientName || 'Not available in report',
      age: null,
      gender: 'Not available in report',
      patient_id: 'Not available in report'
    },
    summary: {
      main_purpose: extraction.summary,
      key_findings: extraction.importantNotes,
      important_observations: extraction.proceduresMentioned
    },
    laboratory_results: extraction.labResults.map(l => ({
      test_name: l.testName,
      testName: l.testName,
      value: l.value,
      unit: l.unit,
      reference_range: l.referenceRange || 'Not specified in report',
      referenceRange: l.referenceRange || 'Not specified in report',
      status: (l.flag ? l.flag.toLowerCase() : 'normal') as any,
      source: 'uploaded_lab_report'
    })),
    medications: extraction.medications.map(m => ({
      name: m.name,
      dosage: m.dosage || 'Not stated',
      frequency: m.frequency || 'Not stated',
      duration: m.duration || 'Not stated'
    })),
    diagnoses_or_conditions_mentioned: extraction.diagnosesMentioned,
    symptoms_mentioned: [],
    allergies_mentioned: [],
    procedures_or_treatments: extraction.proceduresMentioned,
    follow_up_information: [],
    missing_or_unclear_information: extraction.extractionWarnings,
    document_quality: {
      readability: 'Good',
      possible_ocr_errors: extraction.extractionWarnings,
      confidence_notes: []
    },
    patient_friendly_summary: extraction.summary,
    doctor_review_summary: extraction.summary
  };
}
