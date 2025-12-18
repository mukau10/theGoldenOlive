import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './SplashScreen.css';

const SplashScreen = () => {
  const { t, i18n } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);
  const [languageSelected, setLanguageSelected] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  // Check if language was already selected before
  useEffect(() => {
    const savedLanguage = localStorage.getItem('i18nextLng');
    if (savedLanguage) {
      setLanguageSelected(true);
      // Auto-hide after showing logo and text
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setShouldRender(false);
        }, 500);
      }, 2500);
      return () => clearTimeout(timer);
    } else {
      // Show language selector after logo animation
      const timer = setTimeout(() => {
        setShowLanguageSelector(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleLanguageSelect = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
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

        {!showLanguageSelector && (
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
