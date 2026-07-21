import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from '../locales/en.json';
import tr from '../locales/tr.json';

const resources = {
  en: { translation: en },
  tr: { translation: tr },
};

// English by default; Turkish only when the phone actually is. Some devices
// list several locales, so any Turkish one is enough — and languageCode can be
// null, hence the guards.
function initialLanguage(): 'en' | 'tr' {
  try {
    const isTurkish = Localization.getLocales().some(
      (l) => l.languageCode?.toLowerCase() === 'tr',
    );
    return isTurkish ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v4',
    resources,
    lng: initialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // RN has no HTML to escape; our values are plain text
    },
  });

export default i18n;
