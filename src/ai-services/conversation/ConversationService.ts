import { checkRedFlags } from '../../clinical-rules/redFlags';
import { RedFlagRule } from '../../data-models/redFlag';
import { getAdaptiveSocratesQuestions } from '../socratesEngine';
import { IntakeQuestion } from '../../data-models/intake';

export interface StructuredConversationalInterpretation {
  rawPatientResponse: string;
  language: string;
  detectedChiefComplaint: string;
  detectedDuration?: string;
  detectedSeverity?: string;
  detectedBodySite?: string;
  detectedMedications?: string[];
  detectedAssociatedSymptoms?: string[];
  redFlagsDetected: RedFlagRule[];
  isEmergencyTriage: boolean;
  clinicalDisclaimer: string;
  requiresVerificationNotes?: string[];
}

/**
 * Deterministic Rule-Based NLP Service.
 * 
 * Note: This module currently uses deterministic pattern matching, regular expressions, 
 * and symptom dictionary mappings. It does NOT use a generative Large Language Model (LLM).
 * It extracts only explicitly stated patient information without clinical extrapolation.
 */
export class ConversationService {
  /**
   * Parses natural language patient utterances (English, Hindi, Tamil, Hinglish)
   * into a standardized, language-neutral clinical interpretation using deterministic rule-based NLP.
   */
  public parsePatientUtterance(
    utterance: string,
    language: string = 'en'
  ): StructuredConversationalInterpretation {
    const text = utterance.trim();
    const lower = text.toLowerCase();
    const requiresVerificationNotes: string[] = [];

    // 1. Deterministic Red Flag Safety Check (First-Line Safety Mechanism)
    const redFlags = checkRedFlags(text);
    const isEmergencyTriage = redFlags.length > 0;

    // 2. Extract Duration (Strictly from explicit words/digits)
    const detectedDuration = this.extractDuration(lower);

    // 3. Extract Severity (ONLY when explicitly stated by patient)
    let detectedSeverity: string | undefined;
    if (/(?:severe|bahut\s+tez|tez|intense|unbearable|bahut\s+jyada|கடுமையான|அதிக|extreme|excruciating)/i.test(lower)) {
      detectedSeverity = 'Severe';
    } else if (/(?:moderate|beech\s+ka|theek\s+theek|medium|மிதமான)/i.test(lower)) {
      detectedSeverity = 'Moderate';
    } else if (/(?:mild|halka|thoda|slight|லேசான)/i.test(lower)) {
      detectedSeverity = 'Mild';
    } else {
      // Check for numeric rating e.g. "8 out of 10", "pain is 8/10", "10/10"
      const numRateMatch = lower.match(/(\d{1,2})\s*(?:\/|\s*out\s+of\s*)\s*10/);
      if (numRateMatch) {
        const rating = parseInt(numRateMatch[1], 10);
        if (rating >= 7) detectedSeverity = `Severe (${rating}/10)`;
        else if (rating >= 4) detectedSeverity = `Moderate (${rating}/10)`;
        else detectedSeverity = `Mild (${rating}/10)`;
      }
    }

    // 4. Extract Body Site & Chief Complaint (Without diagnosing)
    let detectedBodySite: string | undefined;
    let detectedChiefComplaint = text;

    // Location lateralization e.g. "left side", "right side"
    let lateralization = '';
    if (/(?:left\s+side|left\s+arm|baayein|bai|இடது)/i.test(lower)) lateralization = ' (Left side)';
    else if (/(?:right\s+side|daayein|dai|வலது)/i.test(lower)) lateralization = ' (Right side)';

    // Headache / Neurological
    if (/(?:headache|head|sir\s*dard|sar\s*dard|sir\s+me|sar\s+me|सिरदर्द|सिर|தலைவலி|தலை|migraine)/i.test(lower)) {
      detectedBodySite = `Head / Neurological${lateralization}`;
      detectedChiefComplaint = `Headache${lateralization}`;
    }
    // Chest / Cardiovascular / Respiratory
    else if (/(?:chest\s+pain|chest|seene\s+me|chaati|saans|breath|heart|सीने|छाती|सांस|நெஞ்சு|மூச்சு)/i.test(lower)) {
      detectedBodySite = `Chest / Cardiovascular & Respiratory${lateralization}`;
      detectedChiefComplaint = `Chest Pain / Discomfort${lateralization}`;
    }
    // Abdomen / Gastrointestinal / Stomach
    else if (/(?:stomach|abdom|pet\s+me|pet\s+mein|pet\s*dard|acidity|gas|vomit|loose\s+motion|पेट|வயிறு)/i.test(lower)) {
      detectedBodySite = `Abdomen / Gastrointestinal${lateralization}`;
      detectedChiefComplaint = `Abdominal / Stomach Pain${lateralization}`;
    }
    // Joints / Musculoskeletal
    else if (/(?:knee|joint|back|ghutne|kamar|dard|जोड़|कमर|घुटने|மூட்டு|முதுகு|spine)/i.test(lower)) {
      detectedBodySite = `Musculoskeletal / Joints${lateralization}`;
      detectedChiefComplaint = `Joint / Musculoskeletal Pain${lateralization}`;
    }
    // Fever / Infection
    else if (/(?:fever|bukhar|cold|cough|sardi|khansi|बुखार|காய்ச்சல்|chills)/i.test(lower)) {
      detectedBodySite = 'Constitutional / Systemic';
      detectedChiefComplaint = 'Fever & Respiratory Symptoms';
    } else {
      requiresVerificationNotes.push('Specific symptom category not clearly mapped — requires clinical verification.');
    }

    // 5. Explicit Medication Names & Dosages (e.g. "Metformin 500 milligrams twice daily")
    const detectedMedications: string[] = [];
    const medMatch = text.match(/([A-Za-z]+)\s*(\d+(?:\.\d+)?\s*(?:mg|milligrams|g|mcg|ml)?)\s*(?:once|twice|three\s+times|daily|bd|od)?/i);
    if (medMatch && /(?:metformin|paracetamol|atorvastatin|aspirin|pantoprazole|amoxicillin|ashwagandha)/i.test(medMatch[1])) {
      detectedMedications.push(medMatch[0].trim());
    }

    // 6. Associated Symptoms (Explicit mentions only)
    const detectedAssociatedSymptoms: string[] = [];
    if (/(?:difficulty\s+breathing|shortness\s+of\s+breath|saans\s+lene\s+me\s+dikkat|மூச்சுத்திணறல்)/i.test(lower)) {
      detectedAssociatedSymptoms.push('Shortness of Breath (Dyspnea)');
    }
    if (/(?:dizziness|chakkar|மயக்கம்|lightheaded)/i.test(lower)) {
      detectedAssociatedSymptoms.push('Dizziness / Lightheadedness');
    }
    if (/(?:nausea|vomit|ulti|जी\s*मिचलाना|குமட்டல்)/i.test(lower)) {
      detectedAssociatedSymptoms.push('Nausea / Vomiting');
    }
    if (/(?:sweating|paseena|cold\s+sweat|வியர்வை)/i.test(lower)) {
      detectedAssociatedSymptoms.push('Cold Sweating / Diaphoresis');
    }

    return {
      rawPatientResponse: text,
      language,
      detectedChiefComplaint,
      detectedDuration,
      detectedSeverity,
      detectedBodySite,
      detectedMedications: detectedMedications.length > 0 ? detectedMedications : undefined,
      detectedAssociatedSymptoms: detectedAssociatedSymptoms.length > 0 ? detectedAssociatedSymptoms : undefined,
      redFlagsDetected: redFlags,
      isEmergencyTriage,
      clinicalDisclaimer: 'Deterministic rule-based NLP extraction. This structured interpretation assists the clinician and does NOT constitute an autonomous diagnosis.',
      requiresVerificationNotes: requiresVerificationNotes.length > 0 ? requiresVerificationNotes : undefined
    };
  }

  private extractDuration(text: string): string | undefined {
    // English e.g. "for 2 days", "3 weeks", "two hours", "three days"
    const enMatch = text.match(/(\d+|one|two|three|four|five|six|seven|ten)\s*(days?|hours?|weeks?|months?|years?)/i);
    if (enMatch) {
      const numMap: Record<string, string> = {
        one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', ten: '10'
      };
      const num = numMap[enMatch[1].toLowerCase()] || enMatch[1];
      return `${num} ${enMatch[2]}`;
    }

    // Hindi / Hinglish e.g. "3 din se", "teen din", "do ghante", "2 hafte"
    const hiMatch = text.match(/(\d+|ek|do|teen|char|paanch|chhe|saat|das)\s*(din|ghante|hafte|mahine)/i);
    if (hiMatch) {
      const hiNumMap: Record<string, string> = {
        ek: '1', do: '2', teen: '3', char: '4', paanch: '5', chhe: '6', saat: '7', das: '10'
      };
      const unitMap: Record<string, string> = {
        din: 'days', ghante: 'hours', hafte: 'weeks', mahine: 'months'
      };
      const num = hiNumMap[hiMatch[1].toLowerCase()] || hiMatch[1];
      const unit = unitMap[hiMatch[2].toLowerCase()] || hiMatch[2];
      return `${num} ${unit}`;
    }

    // Tamil e.g. "3 நாட்கள்", "2 மணி நேரம்"
    const taMatch = text.match(/(\d+)\s*(நாட்களாக|நாட்கள்|மணி\s*நேரம்|வாரங்கள்|மாதங்கள்)/i);
    if (taMatch) {
      const unit = taMatch[2].includes('மணி') ? 'hours' : taMatch[2].includes('வார') ? 'weeks' : taMatch[2].includes('மாத') ? 'months' : 'days';
      return `${taMatch[1]} ${unit}`;
    }

    return undefined;
  }

  /**
   * Generates adaptive questions based on deterministic keyword routing
   */
  public getNextAdaptiveQuestions(chiefComplaint: string): IntakeQuestion[] {
    return getAdaptiveSocratesQuestions(chiefComplaint);
  }
}

export const conversationService = new ConversationService();
