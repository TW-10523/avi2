import { createContext, useContext, useState, ReactNode, useMemo } from 'react';
import enTranslations from '../translations/en.json';
import jaTranslations from '../translations/ja.json';

export type Lang = 'ja' | 'en';

type Translations = typeof enTranslations;

type LanguageContextType = {
  lang: Lang;
  toggleLang: () => void;
  setLang: (lang: Lang) => void;
  t: (key: string, defaultValue?: string) => string;
  translations: Translations;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

const translationMap: Record<Lang, Translations> = {
  en: enTranslations,
  ja: jaTranslations,
};

// Helper function to get nested translation values
const getTranslation = (obj: any, path: string, defaultValue?: string): string => {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    result = result?.[key];
    if (result === undefined) {
      return defaultValue || path;
    }
  }
  
  return result;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // ✅ Default Japanese
  const [lang, setLang] = useState<Lang>('ja');

  const toggleLang = () => {
    setLang(prev => (prev === 'ja' ? 'en' : 'ja'));
  };

  const value = useMemo(() => ({
    lang,
    toggleLang,
    setLang,
    t: (key: string, defaultValue?: string) => getTranslation(translationMap[lang], key, defaultValue),
    translations: translationMap[lang],
  }), [lang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
};
