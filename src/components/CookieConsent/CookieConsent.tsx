import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LocalCacheManager } from '../../utils/cacheManager';
import './CookieConsent.css';

const COOKIE_CONSENT_KEY = 'cookieConsent';
const COOKIE_CONSENT_DATE_KEY = 'cookieConsentDate';
const COOKIE_CONSENT_EXPIRY = 365 * 24 * 60 * 60 * 1000; // 1 year

const CookieConsent = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already given consent (with expiry check)
    const consent = getCookieConsent();
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const getCookieConsent = (): string | null => {
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) return null;

      // Check if consent has expired (older than 1 year)
      const consentDate = localStorage.getItem(COOKIE_CONSENT_DATE_KEY);
      if (consentDate) {
        const date = new Date(consentDate);
        const now = new Date();
        if (now.getTime() - date.getTime() > COOKIE_CONSENT_EXPIRY) {
          // Consent expired, clear it
          localStorage.removeItem(COOKIE_CONSENT_KEY);
          localStorage.removeItem(COOKIE_CONSENT_DATE_KEY);
          return null;
        }
      }

      return consent;
    } catch (error) {
      console.warn('Failed to get cookie consent:', error);
      return null;
    }
  };

  const setCookieConsent = (value: string) => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, value);
      localStorage.setItem(COOKIE_CONSENT_DATE_KEY, new Date().toISOString());
      
      // Also store in cache manager for consistency
      LocalCacheManager.set(COOKIE_CONSENT_KEY, value, COOKIE_CONSENT_EXPIRY);
    } catch (error) {
      console.error('Failed to set cookie consent:', error);
    }
  };

  const handleAccept = () => {
    setCookieConsent('accepted');
    setIsVisible(false);
    
    // Enable service worker caching if user accepts
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        console.log('[Cookie Consent] Service Worker enabled');
      });
    }
  };

  const handleDecline = () => {
    setCookieConsent('declined');
    setIsVisible(false);
    
    // Optionally clear some caches if user declines
    // Note: Service Worker will still work, but we can limit what we cache
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="cookie-consent position-fixed bottom-0 start-0 w-100"
      style={{
        zIndex: 9999,
        animation: 'slideUp 0.5s ease-out',
      }}
      role="dialog"
      aria-labelledby="cookie-consent-title"
      aria-modal="true"
    >
      <div className="container-fluid px-3 px-md-4 py-3 py-md-4">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10 col-xl-8">
            <div className="bg-black border border-warning rounded-3 p-3 p-md-4 shadow-lg">
              <div className="row align-items-center">
                <div className="col-12 col-md-8 mb-3 mb-md-0">
                  <h5
                    id="cookie-consent-title"
                    className="text-warning fw-bold mb-2 mb-md-3"
                    style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}
                  >
                    <i className="bi bi-cookie me-2" aria-hidden="true"></i>
                    {t('cookieConsent.title')}
                  </h5>
                  <p className="text-white-50 small mb-0" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)', lineHeight: 1.6 }}>
                    {t('cookieConsent.description')}{' '}
                    <Link
                      to="/privacy-policy"
                      className="text-warning text-decoration-underline"
                      style={{ fontSize: 'inherit' }}
                    >
                      {t('cookieConsent.learnMore')}
                    </Link>
                  </p>
                </div>
                <div className="col-12 col-md-4">
                  <div className="d-flex flex-column flex-md-row gap-2 gap-md-3">
                    <button
                      onClick={handleAccept}
                      className="btn btn-warning text-dark fw-bold flex-fill"
                      style={{
                        fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                        padding: '0.75rem 1.5rem',
                        transition: 'all 0.3s ease',
                      }}
                      aria-label={t('cookieConsent.accept')}
                    >
                      {t('cookieConsent.accept')}
                    </button>
                    <button
                      onClick={handleDecline}
                      className="btn btn-outline-warning text-warning fw-bold flex-fill"
                      style={{
                        fontSize: 'clamp(0.875rem, 2vw, 1rem)',
                        padding: '0.75rem 1.5rem',
                        transition: 'all 0.3s ease',
                      }}
                      aria-label={t('cookieConsent.decline')}
                    >
                      {t('cookieConsent.decline')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
