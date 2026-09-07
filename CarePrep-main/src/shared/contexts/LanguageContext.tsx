import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../translations/en.json';
import hi from '../translations/hi.json';
import ta from '../translations/ta.json';

export type LanguageCode = 'en' | 'hi' | 'ta';

export interface LanguageOption {
  code: LanguageCode;
  nativeName: string;
  englishName: string;
  scriptLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', scriptLabel: 'Standard English' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', scriptLabel: 'देवनागरी लिपि' },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', scriptLabel: 'தமிழ் எழுத்துமுறை' }
];

const translationsMap = { en, hi, ta };

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (keyPath: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('sih_language');
    return (saved === 'hi' || saved === 'ta' || saved === 'en') ? saved : 'en';
  });

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem('sih_language', lang);
  };

  const t = (keyPath: string): string => {
    const keys = keyPath.split('.');
    let curr: any = translationsMap[language] || translationsMap.en;
    for (const k of keys) {
      if (curr && typeof curr === 'object' && k in curr) {
        curr = curr[k];
      } else {
        // Fallback to English
        let fb: any = translationsMap.en;
        for (const fbk of keys) {
          if (fb && typeof fb === 'object' && fbk in fb) {
            fb = fb[fbk];
          } else {
            return keyPath;
          }
        }
        return typeof fb === 'string' ? fb : keyPath;
      }
    }
    return typeof curr === 'string' ? curr : keyPath;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
