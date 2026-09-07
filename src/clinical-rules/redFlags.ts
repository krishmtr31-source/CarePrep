import { RedFlagRule } from '../data-models/redFlag';

export const CLINICAL_RED_FLAG_RULES: RedFlagRule[] = [
  {
    id: 'RF-CARDIO-01',
    category: 'CARDIOVASCULAR',
    title: 'Suspected Acute Coronary Syndrome',
    description: 'Crushing or radiating chest pain, severe tightness with breathlessness or sweating',
    severity: 'CRITICAL',
    keywords: [
      'crushing chest pain',
      'chest pain',
      'chest tightness',
      'radiating to left arm',
      'radiating to jaw',
      'heavy chest',
      'सीने में तेज दर्द',
      'छाती में दर्द',
      'நெஞ்சு வலி',
      'நெஞ்சு அடைப்பது'
    ],
    immediateActionNotice: {
      en: 'CRITICAL RED FLAG: Possible acute cardiovascular emergency detected. Please seek emergency medical care (Call 108 / Visit Emergency Room) immediately.',
      hi: 'गंभीर चेतावनी: आपातकालीन हृदय समस्या के लक्षण मिले हैं। कृपया तुरंत 108 पर कॉल करें या निकटतम आपातकालीन कक्ष में जाएं।',
      ta: 'அவசர எச்சரிக்கை: கடுமையான இதய பிரச்சினைக்கான அறிகுறிகள். உடனடியாக 108 அழைக்கவும் அல்லது அவசர சிகிச்சை பிரிவுக்கு செல்லவும்.'
    }
  },
  {
    id: 'RF-RESP-01',
    category: 'RESPIRATORY',
    title: 'Severe Respiratory Distress',
    description: 'Difficulty breathing, severe breathlessness, stridor or bluish discoloration',
    severity: 'CRITICAL',
    keywords: [
      'difficulty breathing',
      'breathing difficulty',
      'severe breathlessness',
      'shortness of breath',
      'cannot breathe',
      'choking',
      'gasping for air',
      'turning blue',
      'सांस लेने में तकलीफ',
      'सांस लेने में बहुत तकलीफ',
      'सांस फूल',
      'दम घुट रहा है',
      'மூச்சு திணறல்',
      'மூச்சு விட முடியவில்லை'
    ],
    immediateActionNotice: {
      en: 'CRITICAL RED FLAG: Severe respiratory distress detected. Please alert clinic triage or seek immediate emergency care.',
      hi: 'गंभीर चेतावनी: सांस लेने में अत्यधिक समस्या। कृपया तुरंत आपातकालीन सहायता लें।',
      ta: 'அவசர எச்சரிக்கை: தீவிர சுவாச பிரச்சனை கண்டறியப்பட்டுள்ளது. அவசர உதவியை நாடவும்.'
    }
  },
  {
    id: 'RF-NEURO-01',
    category: 'NEUROLOGICAL',
    title: 'Acute Stroke / Neurological Deficit',
    description: 'Sudden facial droop, arm weakness, slurred speech, sudden loss of consciousness',
    severity: 'CRITICAL',
    keywords: [
      'facial drooping',
      'slurred speech',
      'sudden weakness in arm',
      'sudden numbness',
      'loss of consciousness',
      'sudden paralysis',
      'fainting',
      'thunderclap headache',
      'चेहरे का टेढ़ा होना',
      'आवाज लड़खड़ाना',
      'बेहोश हो जाना',
      'முக கோணல்',
      'திடீர் பலவீனம்'
    ],
    immediateActionNotice: {
      en: 'CRITICAL RED FLAG: Acute neurological symptoms (FAST alert). Time-critical emergency response required.',
      hi: 'गंभीर चेतावनी: तीव्र तंत्रिका तंत्र समस्या के लक्षण। तुरंत अस्पताल जाएं।',
      ta: 'அவசர எச்சரிக்கை: நரம்பியல் அவசர நிலை. உடனடியாக மருத்துவமனை செல்லவும்.'
    }
  },
  {
    id: 'RF-ACUTE-ABD-01',
    category: 'ACUTE_ABDOMEN',
    title: 'Acute Rigid Abdomen / Severe Peritonitis',
    description: 'Sudden unbearable abdominal pain, board-like rigidity, severe vomiting with blood',
    severity: 'URGENT',
    keywords: [
      'vomiting blood',
      'blood in vomit',
      'black tarry stool',
      'unbearable abdominal pain',
      'board like belly',
      'खून की उल्टी',
      'पेट में असहनीय दर्द',
      'இரத்த வாந்தி',
      'கடுமையான வயிற்று வலி'
    ],
    immediateActionNotice: {
      en: 'URGENT RED FLAG: Severe gastrointestinal / acute abdomen alert. Requires prompt physical medical evaluation.',
      hi: 'आवश्यक चेतावनी: पेट की गंभीर समस्या के लक्षण। तुरंत डॉक्टर से मिलें।',
      ta: 'அவசர எச்சரிக்கை: தீவிர வயிற்று பகுதி பிரச்சனை. உடனடி மருத்துவ பரிசோதனை தேவை.'
    }
  }
];

export function checkRedFlags(text: string): RedFlagRule[] {
  if (!text) return [];
  const lower = text.toLowerCase().trim();
  const matchedRules: RedFlagRule[] = [];

  for (const rule of CLINICAL_RED_FLAG_RULES) {
    const hasMatch = rule.keywords.some(kw => lower.includes(kw.toLowerCase()));
    if (hasMatch) {
      matchedRules.push(rule);
    }
  }

  return matchedRules;
}
