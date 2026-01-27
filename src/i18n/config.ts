import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations - these are bundled at build time
// If they fail to load, the build will fail, so we don't need runtime error handling here
import nlTranslations from './locales/nl.json';
import enTranslations from './locales/en.json';
import frTranslations from './locales/fr.json';

// Initialize i18n with error handling
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      nl: {
        translation: nlTranslations,
      },
      en: {
        translation: enTranslations,
      },
      fr: {
        translation: frTranslations,
      },
    },
    fallbackLng: 'nl',
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
    // Whitelist of supported languages
    supportedLngs: ['nl', 'en', 'fr'],
    // Add error handling - disable suspense to prevent blocking
    react: {
      useSuspense: false,
    },
    // Add error handling for missing keys
    saveMissing: false,
    missingKeyHandler: (lng, _ns, key) => {
      console.warn(`Missing translation key: ${key} for language: ${lng}`);
    },
    // Return key if translation is missing (instead of showing the key)
    returnNull: false,
    returnEmptyString: false,
    returnObjects: false,
  })
  .catch((error) => {
    console.error('i18n initialization error:', error);
    // The app will still work with fallback language
  });

export default i18n;
