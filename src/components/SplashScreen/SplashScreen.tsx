import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { saveLanguagePreference, getLanguagePreference } from '../../utils/languageStorage';
import './SplashScreen.css';

const SplashScreen = () => {
  // Safe translation hook - always call hooks at top level
  const translation = useTranslation();
  const { t, i18n } = translation;
  
  // Safe translation function with fallback
  const safeT = (key: string): string => {
    try {
      return t(key);
    } catch (error) {
      console.error('Translation error:', error);
      const fallbacks: Record<string, string> = {
        'splash.welcomeLine1': 'Welkom bij',
        'splash.welcomeLine2': 'The Golden Olive',
        'splash.selectLanguage': 'Selecteer uw taal',
      };
      return fallbacks[key] || key;
    }
  };
  
  // Check immediately if language preference exists - if so, don't render splash screen at all
  const savedLanguage = getLanguagePreference();
  const [isVisible, setIsVisible] = useState(!savedLanguage);
  const [shouldRender, setShouldRender] = useState(!savedLanguage);
  const [languageSelected, setLanguageSelected] = useState(!!savedLanguage);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  // Safety timeout - hide splash screen after maximum 5 seconds (reduced from 10)
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (shouldRender && isVisible) {
        console.warn('SplashScreen timeout - hiding splash screen');
        setIsVisible(false);
        setTimeout(() => {
          setShouldRender(false);
        }, 300); // Reduced from 500ms
      }
    }, 5000); // 5 seconds max (reduced from 10)

    return () => clearTimeout(safetyTimeout);
  }, [shouldRender, isVisible]);

  // Initialize language if it was already saved
  useEffect(() => {
    if (savedLanguage) {
      // Set the language if it was previously saved
      try {
        i18n.changeLanguage(savedLanguage);
      } catch (error) {
        console.error('Failed to change language:', error);
      }
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
    try {
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
    } catch (error) {
      console.error('Error selecting language:', error);
      // Still hide splash screen even if language change fails
      setLanguageSelected(true);
      setShowLanguageSelector(false);
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          setShouldRender(false);
        }, 500);
      }, 1000);
    }
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
            onError={(e) => {
              // Fallback if logo fails to load
              console.error('Logo failed to load');
              e.currentTarget.style.display = 'none';
            }}
          />
          <div className="logo-glow"></div>
        </div>
        <h2 className="splash-text">
          <span className="text-line">{safeT('splash.welcomeLine1')}</span>
          <span className="text-line">{safeT('splash.welcomeLine2')}</span>
        </h2>
        
        {showLanguageSelector && !languageSelected && (
          <div className="language-selector">
            <p className="language-selector-title">{safeT('splash.selectLanguage')}</p>
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
