// i18n/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from "react-native-localize"

// 번역 파일
import translationKR from './locales/ko.json';
import translationEN from './locales/en.json';

const resources = {
  ko: {
    translation: translationKR,
  },
  en: {
    translation: translationEN,
  },
};

const locales = RNLocalize.getLocales()
const deviceLanguage =
  Array.isArray(locales) && locales.length > 0
    ? locales[0].languageCode
    : "en"

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: deviceLanguage,
    fallbackLng: 'ko',
    supportedLngs: ["en", "ko"],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;