import { IntakeQuestion } from '../data-models/intake';
import { DASHAVIDHA_PARIKSHA_PARAMS } from '../clinical-rules/ayushParams';

export const AYUSH_INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: 'ayush_chief_complaint',
    step: 'CHIEF_COMPLAINT',
    mode: 'AYUSH',
    questionText: {
      en: 'What is the primary health imbalance or symptom you are seeking AYUSH consultation for?',
      hi: 'किस मुख्य स्वास्थ्य समस्या या लक्षण के समाधान के लिए आप परामर्श चाहते हैं?',
      ta: 'எந்த முதன்மையான உடல்நலக் குறைபாட்டிற்கு ஆயுஷ் மருத்துவ ஆலோசனையை நாடுகிறீர்கள்?'
    },
    explanation: {
      en: 'In AYUSH, understanding your chief complaint alongside your lifestyle helps us restore bodily dosha harmony.',
      hi: 'आयुष में मुख्य शिकायत के साथ आपकी जीवनशैली को समझना दोष संतुलन के लिए आवश्यक है।',
      ta: 'ஆயுஷ் மருத்துவத்தில் உங்கள் முக்கிய பிரச்சனையுடன் வாழ்வியல் முறையை அறிவது தோஷ சமநிலைக்கு உதவுகிறது.'
    },
    inputType: 'chips_and_text',
    options: [
      { id: 'ayush_joint_vata', label: { en: 'Joint Pain, Stiffness & Sciatica (Sandhivata / Kati Shula)', hi: 'संधिवात / जोड़ों में दर्द और अकड़न', ta: 'மூட்டு வலி மற்றும் வாத பிடிப்பு' } },
      { id: 'ayush_acidity_pitta', label: { en: 'Acidity, GERD & Indigestion (Amlapitta / Agnimandya)', hi: 'अम्लपित्त / खट्टी डकार व सीने में जलन', ta: 'அமிலப்பித்தம் / செரிமானமின்மை' } },
      { id: 'ayush_cough_kapha', label: { en: 'Chronic Sinusitis, Wheezing & Cough (Kasa / Shwasa)', hi: 'कास-श्वास / पुरानी खांसी और जुकाम', ta: 'தொடர் இருமல் மற்றும் சளி' } },
      { id: 'ayush_skin_rakta', label: { en: 'Skin Allergies, Eczema & Psoriasis (Kushtha Roga)', hi: 'त्वचा विकार / खाज-खुजली व चकत्ते', ta: 'தோல் நோய்கள் மற்றும் அரிப்பு' } },
      { id: 'ayush_stress_insomnia', label: { en: 'Stress, Anxiety & Sleeplessness (Anidra / Manas Roga)', hi: 'अनिद्रा / मानसिक तनाव और बेचैनी', ta: 'தூக்கமின்மை மற்றும் மன அழுத்தம்' } }
    ],
    placeholder: {
      en: 'Describe your symptom and how it affects your daily energy...',
      hi: 'अपनी परेशानी और शारीरिक कमजोरी के बारे में बताएं...',
      ta: 'உங்கள் அறிகுறி மற்றும் ஆற்றல் குறைபாட்டை விவரிக்கவும்...'
    }
  },
  {
    id: 'ayush_prakriti_q',
    step: 'AYUSH_PRAKRITI',
    mode: 'AYUSH',
    questionText: {
      en: 'Dashavidha Pariksha 1/5: How would you describe your natural physical constitution and sensitivity to climate?',
      hi: 'दशविध परीक्षा 1/5: आपकी शारीरिक प्रकृति और मौसम के प्रति संवेदनशीलता कैसी है?',
      ta: 'தசவித பரீக்ஷா 1/5: உங்கள் உடல் அமைப்பு மற்றும் தட்பவெப்பநிலை சகிப்புத்தன்மை எப்படி உள்ளது?'
    },
    explanation: {
      en: 'Evaluates your baseline Prakriti (Vata, Pitta, Kapha constitutional predominance).',
      hi: 'यह आपकी मूल प्रकृति (वात, पित्त, कफ) का निर्धारण करता है।',
      ta: 'இது உங்கள் அடிப்படை உடல் வகையை (வாதம், பித்தம், கபம்) கண்டறிய உதவுகிறது.'
    },
    inputType: 'chips_and_text',
    options: DASHAVIDHA_PARIKSHA_PARAMS[0].options.map(o => ({
      id: o.id,
      label: o.label
    })),
    placeholder: {
      en: 'Any specific bodily characteristics like dry skin, heavy sweating, hair thinning...',
      hi: 'त्वचा का सूखापन, पसीना या अन्य लक्षण...',
      ta: 'தோல் வறட்சி, அதிக வியர்வை போன்ற விவரங்களை சேர்க்கவும்...'
    }
  },
  {
    id: 'ayush_agni_q',
    step: 'AYUSH_AGNI',
    mode: 'AYUSH',
    questionText: {
      en: 'Dashavidha Pariksha 2/5: How is your digestive fire (Jatharagni) and hunger pattern throughout the day?',
      hi: 'दशविध परीक्षा 2/5: आपकी पाचक अग्नि और भूख का स्तर कैसा रहता है?',
      ta: 'தசவித பரீக்ஷா 2/5: உங்கள் செரிமான சக்தி மற்றும் பசி எப்படி உள்ளது?'
    },
    explanation: {
      en: 'Agni is fundamental in Ayurveda for digestion, vitality, and metabolic health.',
      hi: 'आयुर्वेद में अग्नि पाचन और शक्ति का मुख्य आधार है।',
      ta: 'செரிமான தீ உடலின் ஆரோக்கியத்திற்கு மிக முக்கியமானது.'
    },
    inputType: 'chips_and_text',
    options: DASHAVIDHA_PARIKSHA_PARAMS[2].options.map(o => ({
      id: o.id,
      label: o.label
    })),
    placeholder: {
      en: 'Describe how long after meals you feel comfortable or bloated...',
      hi: 'भोजन के कितने समय बाद भारीपन लगता है, बताएं...',
      ta: 'உணவுக்குப் பின் ஏற்படும் மாற்றங்களை குறிப்பிடவும்...'
    }
  },
  {
    id: 'ayush_koshtha_q',
    step: 'AYUSH_KOSHTHA',
    mode: 'AYUSH',
    questionText: {
      en: 'Dashavidha Pariksha 3/5: What is your bowel habit and evacuation pattern (Koshtha)?',
      hi: 'दशविध परीक्षा 3/5: आपका मल त्याग और पेट साफ होने की स्थिति (कोष्ठ) कैसी है?',
      ta: 'தசவித பரீக்ஷா 3/5: உங்கள் குடல் இயக்கம் மற்றும் மலம் கழிக்கும் தன்மை எப்படி உள்ளது?'
    },
    explanation: {
      en: 'Koshtha examination indicates colon health and appropriate therapeutic formulations.',
      hi: 'कोष्ठ परीक्षण से उपयुक्त आयुर्वेदिक औषधि का निर्धारण होता है।',
      ta: 'குடல் இயக்கம் மருந்துகளின் தேர்வை தீர்மானிக்கிறது.'
    },
    inputType: 'chips_and_text',
    options: DASHAVIDHA_PARIKSHA_PARAMS[3].options.map(o => ({
      id: o.id,
      label: o.label
    })),
    placeholder: {
      en: 'Frequency, difficulty, or use of triphala/laxatives...',
      hi: 'कब्ज, दस्त या त्रिफला आदि का उपयोग...',
      ta: 'மலச்சிக்கல் அல்லது மலமிளக்கி பயன்பாடு...'
    }
  },
  {
    id: 'ayush_ahara_q',
    step: 'AYUSH_AHARA_SHAKTI',
    mode: 'AYUSH',
    questionText: {
      en: 'Dashavidha Pariksha 4/5: How is your dietary capacity, food craving, and water intake (Ahara Shakti)?',
      hi: 'दशविध परीक्षा 4/5: आपकी आहार शक्ति, भोजन की मात्रा और पानी पीने की आदत कैसी है?',
      ta: 'தசவித பரீக்ஷா 4/5: உங்கள் உணவு உட்கொள்ளும் திறன் மற்றும் தாகம் எப்படி உள்ளது?'
    },
    inputType: 'chips_and_text',
    options: DASHAVIDHA_PARIKSHA_PARAMS[4].options.map(o => ({
      id: o.id,
      label: o.label
    })),
    placeholder: {
      en: 'Preferred tastes (sweet, sour, spicy, bitter) and meal regularity...',
      hi: 'पसंदीदा स्वाद (मीठा, खट्टा, तीखा) और भोजन का समय...',
      ta: 'விருப்பமான சுவைகள் மற்றும் உணவு நேரம்...'
    }
  },
  {
    id: 'ayush_vyayama_q',
    step: 'AYUSH_VYAYAMA_SHAKTI',
    mode: 'AYUSH',
    questionText: {
      en: 'Dashavidha Pariksha 5/5: What is your physical stamina, exercise tolerance, and daily energy level (Vyayama Shakti)?',
      hi: 'दशविध परीक्षा 5/5: आपकी शारीरिक शक्ति, सहनशीलता और दैनिक ऊर्जा स्तर (व्यायाम शक्ति) कैसा है?',
      ta: 'தசவித பரீக்ஷா 5/5: உங்கள் உடல் வலிமை மற்றும் உடற்பயிற்சி சகிப்புத்தன்மை எப்படி உள்ளது?'
    },
    inputType: 'chips_and_text',
    options: DASHAVIDHA_PARIKSHA_PARAMS[5].options.map(o => ({
      id: o.id,
      label: o.label
    })),
    placeholder: {
      en: 'e.g., Can walk 30 mins easily / Feel exhausted after climbing stairs...',
      hi: 'उदा: 30 मिनट आसानी से टहल सकते हैं / सीढ़ी चढ़ने पर सांस फूलती है...',
      ta: 'எ.கா., 30 நிமிடம் நடைபயிற்சி செய்ய முடிகிறது...'
    }
  }
];
