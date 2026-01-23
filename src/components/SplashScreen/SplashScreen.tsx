import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { saveLanguagePreference, getLanguagePreference } from '../../utils/languageStorage';
import './SplashScreen.css';

const SplashScreen = () => {
  const { t, i18n } = useTranslation();
  
  // Check immediately if language preference exists - if so, don't render splash screen at all
  const savedLanguage = getLanguagePreference();
  const [isVisible, setIsVisible] = useState(!savedLanguage);
  const [shouldRender, setShouldRender] = useState(!savedLanguage);
  const [languageSelected, setLanguageSelected] = useState(!!savedLanguage);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  // Initialize language if it was already saved
  useEffect(() => {
    if (savedLanguage) {
      // Set the language if it was previously saved
      i18n.changeLanguage(savedLanguage);
      // Don't show splash screen at all if language is already saved
      return;
    } else {
      // Only show language selector if no language is saved
      const timer = setTimeout(() => {
        setShowLanguageSelector(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [i18n, savedLanguage]);

  const handleLanguageSelect = (lang: string) => {
    i18n.changeLanguage(lang);
    saveLanguagePreference(lang);
    setLanguageSelected(true);
    setShowLanguageSelector(false);
    
    // Hide splash screen after language selection
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        setShouldRender(false);
      }, 500);
    }, 1000);
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div className={`splash-screen ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="splash-background"></div>
      <div className="splash-content">
        <div className="logo-container">
          <img
            src="/img/logo.png"
            alt="The Golden Olive Logo"
            className="splash-logo"
          />
          <div className="logo-glow"></div>
        </div>
        <h2 className="splash-text">
          <span className="text-line">{t('splash.welcomeLine1')}</span>
          <span className="text-line">{t('splash.welcomeLine2')}</span>
        </h2>
        
        {showLanguageSelector && !languageSelected && (
          <div className="language-selector">
            <p className="language-selector-title">{t('splash.selectLanguage')}</p>
            <div className="language-buttons">
              <button
                className="language-btn"
                onClick={() => handleLanguageSelect('nl')}
                aria-label="Nederlands"
              >
                <span className="language-flag">🇳🇱</span>
                <span>Nederlands</span>
              </button>
              <button
                className="language-btn"
                onClick={() => handleLanguageSelect('en')}
                aria-label="English"
              >
                <span className="language-flag">🇬🇧</span>
                <span>English</span>
              </button>
              <button
                className="language-btn"
                onClick={() => handleLanguageSelect('fr')}
                aria-label="Français"
              >
                <span className="language-flag">🇫🇷</span>
                <span>Français</span>
              </button>
            </div>
          </div>
        )}

        {!showLanguageSelector && !languageSelected && (
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplashScreen;
