import { DocumentClassification } from '../models/document';
import { evaluateTextQuality } from '../ocr/textQualityChecker';

export interface ClassificationResult {
  classification: DocumentClassification;
  confidence: number;
  matchedKeywords: string[];
  requiresVerification: boolean;
}

interface SignalGroup {
  type: DocumentClassification;
  strongPatterns: RegExp[];
  secondaryPatterns: RegExp[];
  strongWeight: number;
  secondaryWeight: number;
}

const SIGNAL_GROUPS: SignalGroup[] = [
  {
    type: 'DISCHARGE_SUMMARY',
    strongPatterns: [
      /discharge\s+summary/i,
      /(?:date\s+of\s+admission|admission\s+date)/i,
      /(?:date\s+of\s+discharge|discharge\s+date)/i,
      /hospital\s+course/i,
      /condition\s+at\s+discharge/i,
      /ipd\s+no/i,
      /treating\s+consultant/i,
      /discharge\s+medications/i
    ],
    secondaryPatterns: [
      /final\s+diagnosis/i,
      /follow-?up\s+advice/i,
      /inpatient/i,
      /hospital/i,
      /admission/i,
      /discharge/i
    ],
    strongWeight: 4.0,
    secondaryWeight: 1.0
  },
  {
    type: 'LAB_REPORT',
    strongPatterns: [
      /laboratory\s+report/i,
      /pathology\s+(?:report|labs)/i,
      /diagnostic\s+report/i,
      /reference\s+range/i,
      /reference\s+interval/i,
      /biological\s+reference/i,
      /observed\s+value/i,
      /department\s+of\s+(?:clinical\s+)?biochemistry/i,
      /nabl\s+accredited/i,
      /investigation\s+name/i
    ],
    secondaryPatterns: [
      /\bhba1c\b/i,
      /fasting\s+(?:plasma\s+)?glucose/i,
      /(?:serum\s+)?creatinine/i,
      /hemoglobin/i,
      /\bcbc\b/i,
      /lipid\s+profile/i,
      /\bmg\/dl\b/i,
      /\bg\/dl\b/i,
      /specimen/i,
      /test\s+name/i,
      /result\s+value/i
    ],
    strongWeight: 4.0,
    secondaryWeight: 1.0
  },
  {
    type: 'PRESCRIPTION',
    strongPatterns: [
      /\bprescription\b/i,
      /\brx\s*[:\(]/i,
      /medications\s+prescribed/i,
      /\bclinic\b/i,
      /reg\.?\s*no/i
    ],
    secondaryPatterns: [
      /\btab\.?\s+[a-z]+/i,
      /\bcap\.?\s+[a-z]+/i,
      /\bsyp\.?\s+[a-z]+/i,
      /twice\s+daily/i,
      /once\s+daily/i,
      /\b(?:bd|od|tid|hs|qid)\b/i,
      /\b(?:tablet|capsule|syrup)\b/i,
      /duration[:\s]+\d+\s+days/i,
      /physician/i,
      /dr\.?\s+[a-z]+/i,
      /diagnosis/i
    ],
    strongWeight: 3.5,
    secondaryWeight: 1.0
  }
];

export function classifyDocumentText(rawText: string): ClassificationResult {
  if (!rawText || rawText.trim().length === 0) {
    return {
      classification: 'OTHER',
      confidence: 0.2,
      matchedKeywords: [],
      requiresVerification: true
    };
  }

  const quality = evaluateTextQuality(rawText);
  const isFadedOrDegraded = /faded|illegible|unreadable|unverified|\.{3,}|\?{2,}/i.test(rawText) || quality.score < 0.65;

  const scores: {
    type: DocumentClassification;
    totalScore: number;
    strongMatches: string[];
    secondaryMatches: string[];
  }[] = [];

  for (const group of SIGNAL_GROUPS) {
    const strongMatches: string[] = [];
    const secondaryMatches: string[] = [];

    for (const pattern of group.strongPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        strongMatches.push(match[0]);
      }
    }

    for (const pattern of group.secondaryPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        secondaryMatches.push(match[0]);
      }
    }

    const totalScore = (strongMatches.length * group.strongWeight) + (secondaryMatches.length * group.secondaryWeight);

    scores.push({
      type: group.type,
      totalScore,
      strongMatches,
      secondaryMatches
    });
  }

  // Sort by total score descending
  scores.sort((a, b) => b.totalScore - a.totalScore);
  const top = scores[0];
  const allMatches = [...top.strongMatches, ...top.secondaryMatches];

  // If the document is faded or degraded, route to OTHER or mark explicit verification
  if (isFadedOrDegraded && top.strongMatches.length <= 1) {
    return {
      classification: 'OTHER',
      confidence: 0.45,
      matchedKeywords: allMatches.slice(0, 3),
      requiresVerification: true
    };
  }

  // Discharge Summary Priority: If document contains explicit admission & discharge dates or 'discharge summary', it is definitely a discharge summary
  const dischargeGroup = scores.find(s => s.type === 'DISCHARGE_SUMMARY')!;
  if (dischargeGroup.strongMatches.length >= 2 || (dischargeGroup.strongMatches.length >= 1 && dischargeGroup.secondaryMatches.length >= 2)) {
    const conf = Math.min(0.98, 0.75 + dischargeGroup.strongMatches.length * 0.08);
    return {
      classification: 'DISCHARGE_SUMMARY',
      confidence: conf,
      matchedKeywords: [...dischargeGroup.strongMatches, ...dischargeGroup.secondaryMatches].slice(0, 5),
      requiresVerification: isFadedOrDegraded || conf < 0.70
    };
  }

  // Lab Report Priority: If document contains reference ranges or multiple lab test indicators, it is definitely a lab report
  const labGroup = scores.find(s => s.type === 'LAB_REPORT')!;
  if (labGroup.strongMatches.length >= 2 || (labGroup.strongMatches.length >= 1 && labGroup.secondaryMatches.length >= 2)) {
    const conf = Math.min(0.98, 0.75 + labGroup.strongMatches.length * 0.08);
    return {
      classification: 'LAB_REPORT',
      confidence: conf,
      matchedKeywords: [...labGroup.strongMatches, ...labGroup.secondaryMatches].slice(0, 5),
      requiresVerification: isFadedOrDegraded || conf < 0.70
    };
  }

  // Prescription: Needs strong prescription markers or prescription header
  const rxGroup = scores.find(s => s.type === 'PRESCRIPTION')!;
  if (rxGroup.strongMatches.length >= 1 && (rxGroup.secondaryMatches.length >= 2 || rxGroup.strongMatches.length >= 2)) {
    const conf = Math.min(0.96, 0.70 + rxGroup.strongMatches.length * 0.08);
    return {
      classification: 'PRESCRIPTION',
      confidence: conf,
      matchedKeywords: [...rxGroup.strongMatches, ...rxGroup.secondaryMatches].slice(0, 5),
      requiresVerification: isFadedOrDegraded || conf < 0.70
    };
  }

  // General Top Candidate threshold check
  if (top.totalScore >= 5.0 && top.strongMatches.length >= 1) {
    const conf = Math.min(0.95, 0.65 + top.totalScore * 0.04);
    return {
      classification: top.type,
      confidence: conf,
      matchedKeywords: allMatches.slice(0, 5),
      requiresVerification: isFadedOrDegraded || conf < 0.70
    };
  }

  // Fallback to OTHER / Requires Clinical Verification if confidence is low
  return {
    classification: 'OTHER',
    confidence: 0.40,
    matchedKeywords: allMatches.slice(0, 3),
    requiresVerification: true
  };
}
