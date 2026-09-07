import { IntakeQuestion } from '../data-models/intake';

export const BASE_CHIEF_COMPLAINT_QUESTION: IntakeQuestion = {
  id: 'socrates_chief_complaint',
  step: 'CHIEF_COMPLAINT',
  mode: 'GENERAL_CLINICAL',
  questionText: {
    en: 'What is the main problem or reason for your doctor visit today?',
    hi: 'आज डॉक्टर के पास आने का आपका मुख्य कारण या तकलीफ क्या है?',
    ta: 'இன்று நீங்கள் மருத்துவரிடம் வர முக்கிய காரணம் அல்லது சிரமம் என்ன?'
  },
  explanation: {
    en: 'Describe your primary symptom in your own words (e.g., knee joint pain, stomach ache, fever, severe headache).',
    hi: 'अपने मुख्य लक्षण को अपने शब्दों में बताएं (जैसे: घुटने में दर्द, पेट दर्द, बुखार, सिरदर्द)।',
    ta: 'உங்கள் முக்கிய பிரச்சினையை விவரிக்கவும் (எ.கா. மூட்டு வலி, வயிற்று வலி, காய்ச்சல், தலைவலி).'
  },
  inputType: 'chips_and_text',
  options: [
    { id: 'opt_headache', label: { en: 'Headache & Dizziness', hi: 'सिरदर्द और चक्कर आना', ta: 'தலைவலி மற்றும் மயக்கம்' } },
    { id: 'opt_chest_pain', label: { en: 'Chest Pain & Breathlessness', hi: 'सीने में दर्द और सांस लेने में तकलीफ', ta: 'நெஞ்சு வலி மற்றும் மூச்சு திணறல்' } },
    { id: 'opt_joint_pain', label: { en: 'Joint or Back Pain', hi: 'जोड़ों या कमर का दर्द', ta: 'மூட்டு அல்லது முதுகு வலி' } },
    { id: 'opt_stomach_acidity', label: { en: 'Acidity, Gas & Stomach Pain', hi: 'एसिडिटी, गैस या पेट दर्द', ta: 'அமிலத்தன்மை மற்றும் வயிற்று வலி' } },
    { id: 'opt_fever_cough', label: { en: 'Fever, Cold & Cough', hi: 'बुखार, सर्दी और खांसी', ta: 'காய்ச்சல், சளி மற்றும் இருமல்' } }
  ],
  placeholder: {
    en: 'Type your main health complaint (e.g. Mild headache for two days / Severe chest pain)...',
    hi: 'अपनी मुख्य समस्या लिखें (उदा: 2 दिन से सिरदर्द / सीने में तेज दर्द)...',
    ta: 'உங்கள் முக்கிய பிரச்சனையை தட்டச்சு செய்யவும்...'
  }
};

/**
 * Dynamically builds adaptive SOCRATES questions based on chief complaint keywords
 */
export function getAdaptiveSocratesQuestions(chiefComplaintText: string = ''): IntakeQuestion[] {
  const lower = chiefComplaintText.toLowerCase();

  // Branch 1: Headache / Neurological Complaints (e.g. "Mild headache for two days")
  if (lower.includes('headache') || lower.includes('head') || lower.includes('सिरदर्द') || lower.includes('தலைவலி') || lower.includes('migraine')) {
    return [
      BASE_CHIEF_COMPLAINT_QUESTION,
      {
        id: 'socrates_site_headache',
        step: 'SOCRATES_SITE',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'Where in your head is the pain located (Forehead, One side / Temple, Back of head)?',
          hi: 'सिर में दर्द कहां पर है (माथा, एक तरफ / कनपटी, सिर के पिछले हिस्से में)?',
          ta: 'தலையில் வலி எங்கு உள்ளது (நெற்றி, ஒரு பக்கம், தலையின் பின்புறம்)?'
        },
        inputType: 'chips_and_text',
        options: [
          { id: 'site_forehead', label: { en: 'Forehead & Eyebrows (Frontal)', hi: 'माथा और आंखों के ऊपर', ta: 'நெற்றி பகுதி' } },
          { id: 'site_one_side', label: { en: 'One side only (Temples / Hemilateral)', hi: 'केवल एक तरफ (कनपटी)', ta: 'ஒரு பக்க தலைவலி' } },
          { id: 'site_back_head', label: { en: 'Back of Head & Upper Neck (Occipital)', hi: 'सिर के पीछे और गर्दन में', ta: 'தலையின் பின்புறம்' } },
          { id: 'site_band_like', label: { en: 'Tight band around entire head', hi: 'पूरे सिर पर दबाव / पट्टी जैसा खिंचाव', ta: 'முழு தலையிலும் அழுத்தம்' } }
        ],
        placeholder: { en: 'Specify exact location in head...', hi: 'सिर के स्थान का विवरण...', ta: 'தலைப்பகுதியை குறிப்பிடவும்...' }
      },
      {
        id: 'socrates_character_headache',
        step: 'SOCRATES_CHARACTER',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'How would you describe the headache (Throbbing/Pulsating, Dull pressure, Constant tight band)?',
          hi: 'सिरदर्द किस प्रकार का है (धक-धक करने वाला, भारीपन/दबाव, लगातार खिंचाव)?',
          ta: 'தலைவலியின் தன்மை எப்படி உள்ளது (துடிக்கும் வலி, மந்தமான அழுத்தம், தொடர் வலி)?'
        },
        inputType: 'chips_and_text',
        options: [
          { id: 'char_throbbing', label: { en: 'Throbbing / Pulsing with heartbeat', hi: 'धक-धक करने वाला तेज दर्द', ta: 'துடிக்கும் தலைவலி' } },
          { id: 'char_dull_pressure', label: { en: 'Dull heavy pressure / Tension', hi: 'सिर में भारीपन और तनाव', ta: 'மந்தமான கனமான அழுத்தம்' } },
          { id: 'char_sharp_shooting', label: { en: 'Sharp shooting / Electric sensation', hi: 'अचानक तेज चुभने वाला दर्द', ta: 'கூர்மையான வலி' } }
        ],
        placeholder: { en: 'Describe how the headache feels...', hi: 'सिरदर्द का अनुभव बताएं...', ta: 'தலைவலியை விவரிக்கவும்...' }
      },
      {
        id: 'socrates_association_headache',
        step: 'SOCRATES_ASSOCIATION',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'Do you notice any associated symptoms (Sensitivity to light/sound, Nausea, Eye strain, Aura)?',
          hi: 'क्या सिरदर्द के साथ अन्य लक्षण हैं (रोशनी या आवाज से परेशानी, उल्टी का मन, आंखों में खिंचाव)?',
          ta: 'வெளிச்சம்/ஒலியால் சிரமம், குமட்டல் அல்லது கண் சோர்வு போன்ற அறிகுறிகள் உள்ளதா?'
        },
        inputType: 'chips_and_text',
        options: [
          { id: 'assoc_light_sound', label: { en: 'Light & Sound Sensitivity (Photophobia)', hi: 'रोशनी और तेज आवाज से चिड़चिड़ाहट', ta: 'வெளிச்சம் மற்றும் சத்தம் ஒவ்வாமை' } },
          { id: 'assoc_nausea', label: { en: 'Nausea or Queasiness', hi: 'जी मिचलाना / उल्टी का मन', ta: 'குமட்டல் உணர்வு' } },
          { id: 'assoc_screen_time', label: { en: 'Heavy computer / mobile screen strain', hi: 'स्क्रीन देखने से आंखों में थकान', ta: 'திரை பயன்பாட்டால் சோர்வு' } },
          { id: 'assoc_none', label: { en: 'No other associated symptoms', hi: 'कोई अन्य लक्षण नहीं', ta: 'வேறு அறிகுறிகள் இல்லை' } }
        ],
        placeholder: { en: 'Mention any vision changes or triggers...', hi: 'आंखों के आगे धुंधलापन आदि...', ta: 'பார்வை மாற்றங்கள் ஏதேனும்...' }
      },
      {
        id: 'socrates_severity_headache',
        step: 'SOCRATES_SEVERITY',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'On a scale of 1 to 10, how severe is this headache right now?',
          hi: '1 से 10 के पैमाने पर, सिरदर्द इस समय कितना तेज है?',
          ta: '1 முதல் 10 வரையிலான அளவில், தலைவலி இப்போது எவ்வளவு தீவிரமாக உள்ளது?'
        },
        inputType: 'scale_rating',
        options: [
          { id: 'sev_mild', label: { en: '1 - 3 (Mild, can work easily)', hi: '1 - 3 (हल्का, काम जारी रख सकते हैं)', ta: '1 - 3 (லேசானது)' } },
          { id: 'sev_moderate', label: { en: '4 - 6 (Moderate, limits screen/focus)', hi: '4 - 6 (मध्यम, ध्यान लगाने में बाधा)', ta: '4 - 6 (மிதமானது)' } },
          { id: 'sev_severe', label: { en: '7 - 9 (Severe, need dark room & rest)', hi: '7 - 9 (तीव्र, अंधेरे कमरे में आराम की जरूरत)', ta: '7 - 9 (கடுமையானது)' } },
          { id: 'sev_thunderclap', label: { en: '10 (Worst headache of life - Sudden)', hi: '10 (जीवन का सबसे असहनीय सिरदर्द)', ta: '10 (தாங்க முடியாதது)' } }
        ],
        placeholder: { en: 'Any impact on work or sleep...', hi: 'नींद या कार्यक्षमता पर प्रभाव...', ta: 'தூக்க பாதிப்பு...' }
      },
      {
        id: 'general_past_history_headache',
        step: 'PAST_HISTORY',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'Do you have high blood pressure, history of migraines, or taking any pain relief tablets?',
          hi: 'क्या आपको हाई बीपी, माइग्रेन की समस्या है या आप कोई दर्द की दवा ले रहे हैं?',
          ta: 'உங்களுக்கு ரத்த அழுத்தம், மைக்ரேன் அல்லது வலி மாத்திரைகள் உட்கொள்ளும் பழக்கம் உள்ளதா?'
        },
        inputType: 'chips_and_text',
        options: [
          { id: 'hist_migraine', label: { en: 'Previous history of Migraine', hi: 'माइग्रेन का पुराना इतिहास', ta: 'மைக்ரேன் வரலாறு' } },
          { id: 'hist_htn', label: { en: 'High Blood Pressure', hi: 'हाई ब्लड प्रेशर (बीपी)', ta: 'உயர் ரத்த அழுத்தம்' } },
          { id: 'hist_paracetamol', label: { en: 'Took Paracetamol / Painkillers recently', hi: 'हाल ही में पैरासिटामोल या दर्द की दवा ली', ta: 'வலி நிவாரணி மாத்திரை எடுத்தேன்' } },
          { id: 'hist_none', label: { en: 'No existing medical conditions', hi: 'कोई पुरानी बीमारी नहीं', ta: 'வேறு நோய்கள் இல்லை' } }
        ],
        placeholder: { en: 'List any current medicines...', hi: 'वर्तमान दवाएं लिखें...', ta: 'தற்போதைய மருந்துகள்...' }
      }
    ];
  }

  // Branch 2: Chest Pain / Cardiovascular / Respiratory (e.g. "Severe chest pain with difficulty breathing")
  if (lower.includes('chest') || lower.includes('breath') || lower.includes('heart') || lower.includes('सीने') || lower.includes('छाती') || lower.includes('सांस') || lower.includes('நெஞ்சு') || lower.includes('மூச்சு')) {
    return [
      BASE_CHIEF_COMPLAINT_QUESTION,
      {
        id: 'socrates_site_chest',
        step: 'SOCRATES_SITE',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'Where exactly is the chest discomfort, and does it spread (radiate) anywhere?',
          hi: 'सीने में दर्द कहां है, और क्या यह किसी अन्य हिस्से (बाएं हाथ, जबड़े, पीठ) में फैल रहा है?',
          ta: 'நெஞ்சு வலி எங்கு உள்ளது, மற்றும் இடது கை, தாடை அல்லது முதுகுக்கு பரவுகிறதா?'
        },
        inputType: 'chips_and_text',
        options: [
          { id: 'site_mid_chest', label: { en: 'Center / Mid-Chest (Retrosternal)', hi: 'सीने के बिल्कुल बीच में', ta: 'நெஞ்சின் நடுப்பகுதி' } },
          { id: 'site_rad_left_arm', label: { en: 'Radiating to Left Arm or Shoulder', hi: 'बाएं हाथ या कंधे की तरफ फैलता हुआ', ta: 'இடது கைக்கு பரவுகிறது' } },
          { id: 'site_rad_jaw', label: { en: 'Radiating to Jaw / Neck / Throat', hi: 'जबड़े और गर्दन की तरफ जाता हुआ', ta: 'தாடை/கழுத்துக்கு பரவுகிறது' } },
          { id: 'site_left_chest', label: { en: 'Left side of chest only', hi: 'सीने के बाईं तरफ', ta: 'இடது நெஞ்சு பகுதி' } }
        ],
        placeholder: { en: 'Describe exact chest sensation and radiation...', hi: 'सीने के दर्द का सटीक स्थान बताएं...', ta: 'வலியை விவரிக்கவும்...' }
      },
      {
        id: 'socrates_character_chest',
        step: 'SOCRATES_CHARACTER',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'How does the chest sensation feel (Crushing pressure, Heavy tightness, Burning heartburn, Sharp on breathing)?',
          hi: 'दर्द कैसा महसूस हो रहा है (भारी दबाव, जकड़न, जलन, सांस लेने पर चुभन)?',
          ta: 'நெஞ்சு வலி எப்படி உணர்கிறது (கனமான அழுத்தம், இறுக்கம், நெஞ்செரிச்சல், கூர்மையான வலி)?'
        },
        inputType: 'chips_and_text',
        options: [
          { id: 'char_crushing', label: { en: 'Heavy crushing weight / Tight squeeze', hi: 'भारी पत्थर जैसा दबाव / जकड़न', ta: 'கனமான அழுத்தம் மற்றும் இறுக்கம்' } },
          { id: 'char_burning_reflux', label: { en: 'Burning sensation / Heartburn / Acidity', hi: 'खट्टी डकार व सीने में जलन', ta: 'நெஞ்செரிச்சல் / அமிலத்தன்மை' } },
          { id: 'char_sharp_pleuritic', label: { en: 'Sharp pain when taking deep breath or coughing', hi: 'गहरी सांस लेने या खांसने पर चुभन', ta: 'மூச்சு விடும்போது கூர்மையான வலி' } }
        ],
        placeholder: { en: 'Describe how heavy or intense it feels...', hi: 'दबाव या जलन का अनुभव बताएं...', ta: 'வலி தன்மையை விவரிக்கவும்...' }
      },
      {
        id: 'socrates_association_chest',
        step: 'SOCRATES_ASSOCIATION',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'Are you experiencing breathlessness, cold sweating, dizziness, or palpitations?',
          hi: 'क्या आपको सांस फूलना, ठंडा पसीना आना, चक्कर या घबराहट महसूस हो रही है?',
          ta: 'உங்களுக்கு மூச்சுத்திணறல், குளிர்ந்த வியர்வை, மயக்கம் அல்லது படபடப்பு உள்ளதா?'
        },
        inputType: 'chips_and_text',
        options: [
          { id: 'assoc_breathless', label: { en: 'Severe Shortness of Breath (Dyspnea)', hi: 'सांस लेने में अत्यधिक कठिनाई', ta: 'தீவிர மூச்சுத்திணறல்' } },
          { id: 'assoc_sweat', label: { en: 'Profuse cold sweating & Clamminess', hi: 'अत्यधिक ठंडा पसीना आना', ta: 'அதிக குளிர்ந்த வியர்வை' } },
          { id: 'assoc_palpitations', label: { en: 'Rapid racing heart rate (Palpitations)', hi: 'दिल की धड़कन तेज होना / घबराहट', ta: 'படபடப்பு / வேகமான இதய துடிப்பு' } },
          { id: 'assoc_none_chest', label: { en: 'None of these symptoms', hi: 'इनमें से कोई नहीं', ta: 'இவை எதுவும் இல்லை' } }
        ],
        placeholder: { en: 'Any sweating, nausea, or dizziness...', hi: 'पसीना, चक्कर या घबराहट...', ta: 'வியர்வை அல்லது மயக்கம்...' }
      },
      {
        id: 'socrates_severity_chest',
        step: 'SOCRATES_SEVERITY',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'On a scale of 1 to 10, how severe is this chest symptom right now?',
          hi: '1 से 10 के पैमाने पर, सीने का दर्द कितना तीव्र है?',
          ta: '1 முதல் 10 வரையிலான அளவில், நெஞ்சு வலி எவ்வளவு தீவிரமாக உள்ளது?'
        },
        inputType: 'scale_rating',
        options: [
          { id: 'sev_mild_chest', label: { en: '1 - 3 (Mild discomfort)', hi: '1 - 3 (हल्की बेचैनी)', ta: '1 - 3 (லேசானது)' } },
          { id: 'sev_mod_chest', label: { en: '4 - 6 (Moderate, tight feeling)', hi: '4 - 6 (मध्यम जकड़न)', ta: '4 - 6 (மிதமானது)' } },
          { id: 'sev_severe_chest', label: { en: '7 - 9 (Severe, difficult to breathe)', hi: '7 - 9 (तीव्र, सांस लेना कठिन)', ta: '7 - 9 (கடுமையானது)' } },
          { id: 'sev_critical_chest', label: { en: '10 (Emergency level chest distress)', hi: '10 (अत्यंत गंभीर आपातकालीन दर्द)', ta: '10 (அவசர நிலை)' } }
        ],
        placeholder: { en: 'Rate severity...', hi: 'तीव्रता बताएं...', ta: 'தீவிரத்தை குறிப்பிடவும்...' }
      },
      {
        id: 'general_past_history_chest',
        step: 'PAST_HISTORY',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'Do you have existing heart conditions, high blood pressure, diabetes, or smoking history?',
          hi: 'क्या आपको पहले से हृदय रोग, उच्च रक्तचाप, मधुमेह या धूम्रपान का इतिहास है?',
          ta: 'உங்களுக்கு இதய நோய், ரத்த அழுத்தம், சர்க்கரை நோய் அல்லது புகைபிடிக்கும் பழக்கம் உள்ளதா?'
        },
        inputType: 'chips_and_text',
        options: [
          { id: 'cardio_htn', label: { en: 'High Blood Pressure (Hypertension)', hi: 'उच्च रक्तचाप (बीपी)', ta: 'உயர் ரத்த அழுத்தம்' } },
          { id: 'cardio_diabetes', label: { en: 'Diabetes Mellitus', hi: 'डायबिटीज (शुगर)', ta: 'சர்க்கரை நோய்' } },
          { id: 'cardio_prior_heart', label: { en: 'Previous Stent / Heart Treatment', hi: 'पूर्व में स्टेंट या हृदय का इलाज', ta: 'முந்தைய இதய சிகிச்சை' } },
          { id: 'cardio_none', label: { en: 'No previous cardiac history', hi: 'कोई पुराना हृदय रोग नहीं', ta: 'முந்தைய இதய நோய் இல்லை' } }
        ],
        placeholder: { en: 'List existing medicines like blood thinners or BP pills...', hi: 'बीपी या खून पतला करने की दवाएं...', ta: 'தற்போதைய மருந்துகள்...' }
      }
    ];
  }

  // Branch 3: Abdomen / Gastrointestinal / Stomach (e.g. "Mujhe teen din se pet mein dard hai" / "Mujhe 3 din se stomach mein pain hai")
  if (lower.includes('stomach') || lower.includes('abdom') || lower.includes('pet') || lower.includes('acidity') || lower.includes('gas') || lower.includes('पेट') || lower.includes('வயிறு') || lower.includes('vomit') || lower.includes('loose motion')) {
    return [
      BASE_CHIEF_COMPLAINT_QUESTION,
      {
        id: 'socrates_site_abdomen',
        step: 'SOCRATES_SITE',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'Where in your stomach or abdomen is the pain (Upper stomach, Lower abdomen, Right side, All over)?',
          hi: 'पेट में दर्द किस जगह है (ऊपरी पेट, नाभि के आसपास, निचला पेट, दाहिनी तरफ)?',
          ta: 'வயிற்றில் வலி எங்கு உள்ளது (மேல் வயிறு, தொப்புள் பகுதி, கீழ் வயிறு, வலது பக்கம்)?'
        },
        inputType: 'chips_and_text',
        options: [
          { id: 'site_upper_epigastric', label: { en: 'Upper Middle Stomach (Epigastric / Acidity)', hi: 'ऊपरी पेट / छाती के नीचे (खट्टी डकार/जलन)', ta: 'மேல் நடு வயிறு' } },
          { id: 'site_lower_abdomen', label: { en: 'Lower Abdomen / Pelvic', hi: 'नाभि के नीचे / निचला पेट', ta: 'கீழ் வயிறு' } },
          { id: 'site_right_lower', label: { en: 'Right Lower Side (Appendix area)', hi: 'दाहिनी तरफ नीचे (अपेंडिक्स क्षेत्र)', ta: 'வலது கீழ் பக்கம்' } },
          { id: 'site_generalized_cramps', label: { en: 'All Over Stomach / Generalized Cramps', hi: 'पूरे पेट में मरोड़ / ऐंठन', ta: 'முழு வயிறு பிடிப்பு' } }
        ],
        placeholder: { en: 'Specify abdomen location...', hi: 'पेट के स्थान का विवरण...', ta: 'வயிற்று பகுதியை குறிப்பிடவும்...' }
      },
      {
        id: 'socrates_character_abdomen',
        step: 'SOCRATES_CHARACTER',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'How would you describe the stomach pain (Burning acidity, Colicky cramps, Dull persistent ache, Sharp)?',
          hi: 'पेट दर्द किस प्रकार का है (जलन/एसिडिटी, मरोड़/ऐंठन, लगातार भारीपन, तेज चुभन)?',
          ta: 'வயிற்று வலி எப்படி உள்ளது (எரியும் அமிலத்தன்மை, பிடிப்பு வலி, தொடர் வலி, கூர்மையான வலி)?'
        },
        inputType: 'chips_and_text',
        options: [
          { id: 'char_burning_acid', label: { en: 'Burning sensation / Sour burps (Acidity)', hi: 'सीने-पेट में जलन व खट्टी डकारें', ta: 'எரியும் அமிலத்தன்மை' } },
          { id: 'char_cramping', label: { en: 'Twisting colicky cramps / Spasms', hi: 'मरोड़ उठना / पेट में ऐंठन', ta: 'பிடிப்பு மற்றும் வலி' } },
          { id: 'char_dull_bloated', label: { en: 'Bloated heaviness / Gas distension', hi: 'पेट में भारीपन और गैस का फूलना', ta: 'வாயு மற்றும் உப்பசம்' } }
        ],
        placeholder: { en: 'Describe how the stomach feels...', hi: 'दर्द का अनुभव बताएं...', ta: 'வலியின் தன்மையை விளக்குங்கள்...' }
      },
      {
        id: 'socrates_association_abdomen',
        step: 'SOCRATES_ASSOCIATION',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'Do you have vomiting, diarrhea, constipation, fever, or pain after food intake?',
          hi: 'क्या आपको उल्टी, दस्त, कब्ज, बुखार या खाना खाने के बाद दर्द बढ़ता है?',
          ta: 'உங்களுக்கு வாந்தி, வயிற்றுப்போக்கு, மலச்சிக்கல், காய்ச்சல் அல்லது சாப்பிட்ட பின் வலி உள்ளதா?'
        },
        inputType: 'chips_and_text',
        options: [
          { id: 'assoc_nausea_vomit', label: { en: 'Nausea or Vomiting', hi: 'जी मिचलाना या उल्टी होना', ta: 'குமட்டல் அல்லது வாந்தி' } },
          { id: 'assoc_loose_motions', label: { en: 'Loose Stools / Diarrhea', hi: 'पतले दस्त (लूज मोशन)', ta: 'வயிற்றுப்போக்கு' } },
          { id: 'assoc_post_meal', label: { en: 'Worse immediately after meals', hi: 'खाना खाते ही दर्द बढ़ना', ta: 'சாப்பிட்டவுடன் வலி அதிகம்' } },
          { id: 'assoc_none_gi', label: { en: 'No other GI symptoms', hi: 'कोई अन्य लक्षण नहीं', ta: 'வேறு அறிகுறிகள் இல்லை' } }
        ],
        placeholder: { en: 'Note bowel habits or food triggers...', hi: 'खान-पान या शौच संबंधी विवरण...', ta: 'உணவு அல்லது செரிமான குறிப்புகள்...' }
      },
      {
        id: 'socrates_severity_abdomen',
        step: 'SOCRATES_SEVERITY',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'On a scale of 1 to 10, how severe is this stomach pain right now?',
          hi: '1 से 10 के पैमाने पर, पेट का दर्द इस समय कितना तीव्र है?',
          ta: '1 முதல் 10 வரையிலான அளவில், வயிற்று வலி எவ்வளவு தீவிரமாக உள்ளது?'
        },
        inputType: 'scale_rating',
        options: [
          { id: 'sev_mild_gi', label: { en: '1 - 3 (Mild, manageable with food/water)', hi: '1 - 3 (हल्का, पानी या भोजन से ठीक)', ta: '1 - 3 (லேசானது)' } },
          { id: 'sev_mod_gi', label: { en: '4 - 6 (Moderate, limits work)', hi: '4 - 6 (मध्यम, कार्य में रुकावट)', ta: '4 - 6 (மிதமானது)' } },
          { id: 'sev_severe_gi', label: { en: '7 - 9 (Severe, unable to stand straight)', hi: '7 - 9 (तीव्र, सीधा खड़ा होना कठिन)', ta: '7 - 9 (கடுமையானது)' } },
          { id: 'sev_acute_abdomen', label: { en: '10 (Extreme acute abdominal distress)', hi: '10 (अत्यधिक असहनीय पेट दर्द)', ta: '10 (அவசர நிலை)' } }
        ],
        placeholder: { en: 'Rate stomach pain...', hi: 'तीव्रता बताएं...', ta: 'தீவிரத்தை குறிப்பிடவும்...' }
      },
      {
        id: 'general_past_history_abdomen',
        step: 'PAST_HISTORY',
        mode: 'GENERAL_CLINICAL',
        questionText: {
          en: 'Do you have previous history of stomach ulcers, gallstones, acid reflux (GERD), or taking painkillers?',
          hi: 'क्या आपको पहले अल्सर, पित्त की पथरी, गैस/एसिडिटी की पुरानी समस्या रही है?',
          ta: 'உங்களுக்கு அல்சர், பித்தப்பை கல், வாயு பிரச்சனை அல்லது வலி மாத்திரைகள் எடுக்கும் பழக்கம் உள்ளதா?'
        },
        inputType: 'chips_and_text',
        options: [
          { id: 'hist_acidity_gerd', label: { en: 'Chronic Acidity / GERD', hi: 'पुरानी एसिडिटी / गैस की समस्या', ta: 'நாள்பட்ட அமிலத்தன்மை' } },
          { id: 'hist_gallstones', label: { en: 'Gallstones / Kidney Stones', hi: 'पित्ताशय या गुर्दे की पथरी', ta: 'பித்தப்பை / சிறுநீரக கல்' } },
          { id: 'hist_antacids', label: { en: 'Taking Antacids / Omeprazole / Pantocid', hi: 'गैस की दवा (पेंटासिड / ओमेज) ले रहे हैं', ta: 'அமில எதிர்ப்பு மாத்திரை எடுக்கிறேன்' } },
          { id: 'hist_none_gi', label: { en: 'No previous stomach history', hi: 'कोई पुराना पेट का रोग नहीं', ta: 'முந்தைய வயிற்று நோய் இல்லை' } }
        ],
        placeholder: { en: 'List previous GI medicines or surgeries...', hi: 'पेट की पुरानी दवाएं लिखें...', ta: 'தற்போதைய மருந்துகள்...' }
      }
    ];
  }

  // Default Standard SOCRATES Framework for other symptoms (Joints, Fever, etc.)
  return [
    BASE_CHIEF_COMPLAINT_QUESTION,
    {
      id: 'socrates_site_general',
      step: 'SOCRATES_SITE',
      mode: 'GENERAL_CLINICAL',
      questionText: {
        en: 'Where exactly in your body do you feel this discomfort or pain?',
        hi: 'शरीर के किस हिस्से में आपको यह दर्द या परेशानी महसूस हो रही है?',
        ta: 'உடலின் எந்த பகுதியில் இந்த அசௌகரியம் அல்லது வலி ஏற்படுகிறது?'
      },
      inputType: 'chips_and_text',
      options: [
        { id: 'site_knees', label: { en: 'Both Knees / Joints', hi: 'दोनों घुटने या जोड़', ta: 'இரு முழங்கால்கள் / மூட்டுகள்' } },
        { id: 'site_lower_back', label: { en: 'Lower Back / Spine', hi: 'कमर का निचला हिस्सा', ta: 'கீழ் முதுகு' } },
        { id: 'site_upper_abdomen', label: { en: 'Stomach / Abdomen', hi: 'पेट का हिस्सा', ta: 'வயிறு பகுதி' } },
        { id: 'site_generalized', label: { en: 'All Over Body / Generalized', hi: 'पूरे शरीर में', ta: 'முழு உடல்' } }
      ],
      placeholder: { en: 'Specify the exact body location...', hi: 'शरीर का सटीक हिस्सा लिखें...', ta: 'குறிப்பிட்ட இடத்தை குறிப்பிடவும்...' }
    },
    {
      id: 'socrates_character_general',
      step: 'SOCRATES_CHARACTER',
      mode: 'GENERAL_CLINICAL',
      questionText: {
        en: 'How would you describe the feeling of the symptom (Ache, Stiffness, Burning, Sharp)?',
        hi: 'आप इस दर्द या परेशानी की प्रकृति को कैसे समझाएंगे?',
        ta: 'இந்த வலியின் தன்மையை நீங்கள் எவ்வாறு விவரிப்பீர்கள்?'
      },
      inputType: 'chips_and_text',
      options: [
        { id: 'char_dull_ache', label: { en: 'Dull Continuous Ache', hi: 'हल्का लगातार दर्द', ta: 'தொடர்ச்சியான மந்த வலி' } },
        { id: 'char_sharp_stabbing', label: { en: 'Sharp or Stabbing Pain', hi: 'तेज या चुभने वाला दर्द', ta: 'கூர்மையான வலி' } },
        { id: 'char_burning', label: { en: 'Burning sensation / Acidity', hi: 'जलन जैसा दर्द', ta: 'எரியும் உணர்வு' } },
        { id: 'char_stiffness', label: { en: 'Stiffness & Difficulty Moving', hi: 'अकड़न और चलने में कठिनाई', ta: 'விறைப்பு மற்றும் அசைக்க சிரமம்' } }
      ],
      placeholder: { en: 'Describe how it feels in your own words...', hi: 'अपने शब्दों में बताएं कैसा महसूस होता है...', ta: 'உங்கள் வார்த்தைகளில் விளக்குங்கள்...' }
    },
    {
      id: 'socrates_severity_general',
      step: 'SOCRATES_SEVERITY',
      mode: 'GENERAL_CLINICAL',
      questionText: {
        en: 'On a scale of 1 to 10, how severe is this problem right now?',
        hi: '1 से 10 के पैमाने पर, यह परेशानी इस समय कितनी तीव्र है?',
        ta: '1 முதல் 10 வரையிலான அளவில், இந்த பிரச்சனை இப்போது எவ்வளவு தீவிரமாக உள்ளது?'
      },
      inputType: 'scale_rating',
      options: [
        { id: 'sev_mild', label: { en: '1 - 3 (Mild, doesn\'t stop daily work)', hi: '1 - 3 (हल्का, काम पर असर नहीं)', ta: '1 - 3 (லேசானது)' } },
        { id: 'sev_moderate', label: { en: '4 - 6 (Moderate, limits some activities)', hi: '4 - 6 (मध्यम, काम में बाधा)', ta: '4 - 6 (மிதமானது)' } },
        { id: 'sev_severe', label: { en: '7 - 9 (Severe, hard to perform tasks)', hi: '7 - 9 (तीव्र, काम करना कठिन)', ta: '7 - 9 (கடுமையானது)' } },
        { id: 'sev_unbearable', label: { en: '10 (Unbearable / Extreme)', hi: '10 (असहनीय)', ta: '10 (தாங்க முடியாதது)' } }
      ],
      placeholder: { en: 'Add details regarding routine impact...', hi: 'दिनचर्या पर प्रभाव...', ta: 'வேலை பாதிப்பு...' }
    },
    {
      id: 'general_past_history',
      step: 'PAST_HISTORY',
      mode: 'GENERAL_CLINICAL',
      questionText: {
        en: 'Do you have any existing health conditions (Diabetes, BP, Thyroid, Allergies)?',
        hi: 'क्या आपको पहले से कोई बीमारी है (शुगर, बीपी, थायराइड)?',
        ta: 'உங்களுக்கு ஏற்கனவே ஏதேனும் உடல்நலப் பிரச்சனைகள் உள்ளதா (சர்க்கரை நோய், ரத்த அழுத்தம்)?'
      },
      inputType: 'chips_and_text',
      options: [
        { id: 'cond_none', label: { en: 'No known chronic conditions', hi: 'कोई पुरानी बीमारी नहीं', ta: 'வேறு நோய்கள் எதுவும் இல்லை' } },
        { id: 'cond_diabetes', label: { en: 'Type 2 Diabetes (Sugar)', hi: 'डायबिटीज (शुगर)', ta: 'சர்க்கரை நோய்' } },
        { id: 'cond_htn', label: { en: 'High Blood Pressure (BP)', hi: 'हाई ब्लड प्रेशर (बीपी)', ta: 'உயர் ரத்த அழுத்தம்' } },
        { id: 'cond_thyroid', label: { en: 'Hypothyroidism / Thyroid', hi: 'थायराइड की समस्या', ta: 'தைராய்டு' } }
      ],
      placeholder: { en: 'List any current medicines or health history...', hi: 'अपनी वर्तमान दवाएं लिखें...', ta: 'மருந்துகளை குறிப்பிடவும்...' }
    }
  ];
}

export const SOCRATES_QUESTIONS = getAdaptiveSocratesQuestions('');
