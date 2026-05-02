import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { userSettingsApi } from '~/api/apiClient';
import { translations, type Language } from '~/shared/i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function translateWithParams(
  t: (key: string) => string,
  key: string,
  params?: Record<string, string | number>
): string {
  let text = t(key);
  if (params) {
    Object.keys(params).forEach((param) => {
      text = text.replace(`{${param}}`, String(params[param]));
    });
  }
  return text;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    if (saved === 'zh-TW') return 'zh-CN';
    return saved === 'en' || saved === 'zh-CN' ? saved : 'en';
  });
  const [, setIsInitialized] = useState(false);

  useEffect(() => {
    const loadUserLanguage = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (token) {
          const settings = await userSettingsApi.getSettings();
          if (settings.language) {
            const rawLanguage = settings.language as string;
            const normalized = rawLanguage === 'zh-TW' ? 'zh-CN' : rawLanguage;
            if (normalized === 'zh-CN' || normalized === 'en') {
              setLanguageState(normalized);
              localStorage.setItem('app_language', normalized);
            }
          }
        }
      } catch {
        console.log('无法从后端加载语言设置，使用本地设置');
      } finally {
        setIsInitialized(true);
      }
    };

    loadUserLanguage();
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string): string => {
    if (translations[language] && translations[language][key]) {
      return translations[language][key];
    }
    return translations.en?.[key] || key;
  };

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
