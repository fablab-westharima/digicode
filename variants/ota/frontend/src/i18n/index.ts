import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ja from './locales/ja.json';
import en from './locales/en.json';
import es from './locales/es.json';
import ptPt from './locales/pt-PT.json';
import zhTw from './locales/zh-TW.json';

const resources = {
  ja: { translation: ja },
  en: { translation: en },
  es: { translation: es },
  'pt-PT': { translation: ptPt },
  'zh-TW': { translation: zhTw },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ['ja', 'en', 'es', 'pt-PT', 'zh-TW'],
    nonExplicitSupportedLngs: true, // en-US → en, zh-TW → zh-TW, etc.
    fallbackLng: 'en', // ブラウザ言語が未対応の場合は英語
    load: 'currentOnly', // Use exact language code (pt-PT, zh-TW)
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
