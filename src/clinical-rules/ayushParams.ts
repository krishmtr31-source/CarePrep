export interface AyushParameterDefinition {
  id: string;
  nameSanskrit: string;
  nameEnglish: string;
  description: {
    en: string;
    hi: string;
    ta: string;
  };
  clinicalImportance: string;
  options: Array<{
    id: string;
    label: {
      en: string;
      hi: string;
      ta: string;
    };
    ayushSignificance: string;
  }>;
}

export const DASHAVIDHA_PARIKSHA_PARAMS: AyushParameterDefinition[] = [
  {
    id: 'prakriti',
    nameSanskrit: 'Prakriti (प्रकृति / உடல் வகை)',
    nameEnglish: 'Basic Constitution / Dosha Predominance',
    description: {
      en: 'Inherent psychosomatic constitution determined at conception (Vata, Pitta, Kapha or combinations).',
      hi: 'शारीरिक एवं मानसिक मूल प्रकृति (वात, पित्त, कफ अथवा द्वन्द्वज)।',
      ta: 'உடலின் அடிப்படை இயல்பு மற்றும் தோஷ அமைப்பு (வாதம், பித்தம், கபம்).'
    },
    clinicalImportance: 'Establishes baseline physiology and susceptibility to specific imbalances.',
    options: [
      {
        id: 'vata_dominant',
        label: { en: 'Vata Predominant (Lean, Light, Quick, Sensitive to cold, Dry skin)', hi: 'वात प्रधान (दुबला शरीर, चंचल, ठंड से संवेदनशील, रूखी त्वचा)', ta: 'வாத ஆதிக்கம் (மெலிந்த உடல், குளிர் உணர்திறன்)' },
        ayushSignificance: 'Predisposition to neuromuscular, joint, and dry metabolic disorders.'
      },
      {
        id: 'pitta_dominant',
        label: { en: 'Pitta Predominant (Medium build, Warm, Sharp hunger, Intolerant to heat)', hi: 'पित्त प्रधान (मध्यम शरीर, तीक्ष्ण भूख, गर्मी असहनीयता)', ta: 'பித்த ஆதிக்கம் (நடுத்தர உடல், அதிக வெப்பம் மற்றும் பசி)' },
        ayushSignificance: 'Predisposition to inflammatory, metabolic, acid-peptic, and skin disorders.'
      },
      {
        id: 'kapha_dominant',
        label: { en: 'Kapha Predominant (Sturdy build, Calm, Slow digestion, Good endurance)', hi: 'कफ प्रधान (मजबूत कद-काठी, शांत स्वभाव, मंद पाचन)', ta: 'கப ஆதிக்கம் (வலுவான கட்டமைப்பு, அமைதியான குணம்)' },
        ayushSignificance: 'Predisposition to congestion, metabolic sluggishness, obesity, and lethargy.'
      },
      {
        id: 'dvandvaja',
        label: { en: 'Dual / Mixed Constitution (Vata-Pitta, Pitta-Kapha, Vata-Kapha)', hi: 'मिश्रित प्रकृति (वात-पित्त / पित्त-कफ / वात-कफ)', ta: 'இரட்டை தோஷ கலவை' },
        ayushSignificance: 'Requires balanced multi-target lifestyle and dietary harmony.'
      }
    ]
  },
  {
    id: 'vikriti',
    nameSanskrit: 'Vikriti (विकृति / தற்போதைய நோய் நிலை)',
    nameEnglish: 'Current Pathological Imbalance',
    description: {
      en: 'Active dosha derangement causing current complaints.',
      hi: 'वर्तमान रोग अवस्था और दूषित दोषों का विवरण।',
      ta: 'தற்போதைய தோஷ ஏற்றத்தாழ்வு மற்றும் பாதிப்பு.'
    },
    clinicalImportance: 'Identifies the active disease process versus baseline constitution.',
    options: [
      {
        id: 'vata_vitiation',
        label: { en: 'Vata Imbalance (Pain, stiffness, tremors, bloating, insomnia, dryness)', hi: 'वात विकार (दर्द, अकड़न, पेट फूलना, अनिद्रा)', ta: 'வாத சீர்குலைவு (வலி, விறைப்பு, தூக்கமின்மை)' },
        ayushSignificance: 'Requires Snehana (oleation), Swedana, and Vata-pacifying regimen.'
      },
      {
        id: 'pitta_vitiation',
        label: { en: 'Pitta Imbalance (Burning sensation, acidity, redness, heat, irritability)', hi: 'पित्त विकार (जलन, खट्टी डकार, अम्लता, अत्यधिक गर्मी)', ta: 'பித்த சீர்குலைவு (எரிச்சல், அமிலத்தன்மை)' },
        ayushSignificance: 'Requires cooling, bitter, sweet pacifying interventions and Shodhana.'
      },
      {
        id: 'kapha_vitiation',
        label: { en: 'Kapha Imbalance (Heavy limbs, excessive mucus, sluggishness, loss of appetite)', hi: 'कफ विकार (शरीर में भारीपन, कफ, सुस्ती, भूख में कमी)', ta: 'கப சீர்குலைவு (பாரம், மந்தநிலை, அதிக சளி)' },
        ayushSignificance: 'Requires Deepana-Pachana, drying, and Kapha-reducing therapies.'
      }
    ]
  },
  {
    id: 'agni',
    nameSanskrit: 'Agni / Jatharagni (अग्नि / செரிமான தீ)',
    nameEnglish: 'Digestive & Metabolic Capacity',
    description: {
      en: 'Strength and stability of digestive fire and metabolism.',
      hi: 'पाचक अग्नि एवं भूख का स्तर।',
      ta: 'செரிமான மற்றும் வளர்சிதை மாற்ற திறன்.'
    },
    clinicalImportance: 'Core determinant of Ama (endotoxins) generation and medicine absorption.',
    options: [
      {
        id: 'sama_agni',
        label: { en: 'Samagni (Balanced, timely digestion without discomfort)', hi: 'समाग्नि (संतुलित और नियमित पाचन)', ta: 'சமமான செரிமானம்' },
        ayushSignificance: 'Optimal metabolic health; suitable for standard therapeutic dosages.'
      },
      {
        id: 'visham_agni',
        label: { en: 'Vishamagni (Irregular: sometimes intense hunger, sometimes no appetite)', hi: 'विषमाग्नि (अनियमित पाचन: कभी अधिक, कभी बिल्कुल नहीं)', ta: 'நிலையற்ற செரிமானம்' },
        ayushSignificance: 'Vata-associated metabolic instability; needs routine stabilization.'
      },
      {
        id: 'tikshna_agni',
        label: { en: 'Tikshnagni (Hyperactive: rapid digestion, heartburn, ravenous hunger)', hi: 'तीक्ष्णाग्नि (अति-तीव्र पाचन, जलन, बार-बार भूख)', ta: 'அதிவேக செரிமானம்' },
        ayushSignificance: 'Pitta-associated metabolic fire; needs cooling nutritional pacifiers.'
      },
      {
        id: 'manda_agni',
        label: { en: 'Mandagni (Sluggish: poor appetite, heavy feeling for hours after food)', hi: 'मंदाग्नि (धीमा पाचन, भोजन के बाद भारीपन)', ta: 'மந்தமான செரிமானம்' },
        ayushSignificance: 'Kapha/Ama associated; mandates bio-purification and digestive enhancers (Deepana).'
      }
    ]
  },
  {
    id: 'koshtha',
    nameSanskrit: 'Koshtha (कोष्ठ / குடல் இயக்கம்)',
    nameEnglish: 'Bowel Tendency & Elimination',
    description: {
      en: 'Quality and nature of bowel habits and intestinal motility.',
      hi: 'मल त्याग एवं आंतों की प्रवृत्ति।',
      ta: 'மலச்சிக்கல் மற்றும் குடல் இயக்கம்.'
    },
    clinicalImportance: 'Determines tolerance to purgatives, formulations, and internal detox.',
    options: [
      {
        id: 'krura_koshtha',
        label: { en: 'Krura Koshtha (Hard stools, prone to chronic constipation)', hi: 'क्रूर कोष्ठ (कठिन मल, बार-बार कब्ज की समस्या)', ta: 'கடின குடல் (மலச்சிக்கல் இயல்பு)' },
        ayushSignificance: 'Vata dominance in colon; requires oleation and potent mild laxation.'
      },
      {
        id: 'madhyama_koshtha',
        label: { en: 'Madhyama Koshtha (Regular, well-formed daily evacuation)', hi: 'मध्यम कोष्ठ (नियमित एवं सामान्य मल त्याग)', ta: 'இயல்பான குடல்' },
        ayushSignificance: 'Balanced Apana Vata; responds predictably to general therapy.'
      },
      {
        id: 'mridu_koshtha',
        label: { en: 'Mridu Koshtha (Soft/loose stools, reacts swiftly to milk or laxatives)', hi: 'मृदु कोष्ठ (नरम या ढीला मल, थोड़ा सा भी परिवर्तन होने पर दस्त)', ta: 'மென்மையான குடல்' },
        ayushSignificance: 'Pitta predominance in gut; mildest medications needed.'
      }
    ]
  },
  {
    id: 'ahara_shakti',
    nameSanskrit: 'Ahara Shakti (आहार शक्ति / உணவு மற்றும் செரிமான திறன்)',
    nameEnglish: 'Food Intake & Assimilation Strength',
    description: {
      en: 'Capacity to ingest, tolerate, and extract nourishment from diet.',
      hi: 'भोजन ग्रहण करने तथा पोषण अवशोषण की शक्ति।',
      ta: 'உணவு உட்கொள்ளும் மற்றும் சத்து உறிஞ்சும் திறன்.'
    },
    clinicalImportance: 'Guides dietary recommendations (Pathya-Apathya) and medicine timing.',
    options: [
      {
        id: 'pravara_ahara',
        label: { en: 'Pravara (Excellent appetite and rapid nourishment intake)', hi: 'प्रवर (उत्कृष्ट भूख और पाचन शक्ति)', ta: 'உயர்ந்த உணவு திறன்' },
        ayushSignificance: 'High nutritional stamina; supports comprehensive therapeutic regimens.'
      },
      {
        id: 'madhyama_ahara',
        label: { en: 'Madhyama (Moderate, normal food consumption)', hi: 'मध्यम (सामान्य भूख और मात्रा)', ta: 'நடுத்தர உணவு திறன்' },
        ayushSignificance: 'Average metabolic stamina.'
      },
      {
        id: 'avara_ahara',
        label: { en: 'Avara (Diminished food capacity, eats very little)', hi: 'अवर (अल्पाहार, बहुत कम खाने की इच्छा)', ta: 'குறைந்த உணவு திறன்' },
        ayushSignificance: 'Needs light gruels (Peya, Vilepi) and gentle restorative tonics.'
      }
    ]
  },
  {
    id: 'vyayama_shakti',
    nameSanskrit: 'Vyayama Shakti (व्यायाम शक्ति / உடல் உழைப்பு திறன்)',
    nameEnglish: 'Physical Endurance & Work Capacity',
    description: {
      en: 'Tolerance for physical exertion, stamina, and respiratory capacity.',
      hi: 'शारीरिक परिश्रम एवं सहनशीलता का स्तर।',
      ta: 'உடல் உழைப்பு மற்றும் சகிப்புத்தன்மை.'
    },
    clinicalImportance: 'Dictates intensity of therapeutic yoga, panchakarma tolerance, and recuperation speed.',
    options: [
      {
        id: 'pravara_vyayama',
        label: { en: 'High Endurance (Can do strenuous activity without exhaustion)', hi: 'प्रवर (कठिन परिश्रम आसानी से कर सकते हैं)', ta: 'அதிக சகிப்புத்தன்மை' },
        ayushSignificance: 'Can undergo vigorous Panchakarma and active physical therapies.'
      },
      {
        id: 'madhyama_vyayama',
        label: { en: 'Moderate Endurance (Standard daily activities, mild fatigue with heavy work)', hi: 'मध्यम (सामान्य कामकाज में कोई परेशानी नहीं)', ta: 'நடுத்தர சகிப்புத்தன்மை' },
        ayushSignificance: 'Suitable for moderate lifestyle modifications.'
      },
      {
        id: 'avara_vyayama',
        label: { en: 'Low Endurance (Gets fatigued quickly with minimal walking or exertion)', hi: 'अवर (हल्के काम से भी जल्दी थकावट)', ta: 'குறைந்த சகிப்புத்தன்மை' },
        ayushSignificance: 'Requires gentle Brimhana (nourishing) therapy and resting protocol.'
      }
    ]
  }
];
