import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import './CookieConsent.css';

const CookieConsent = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already given consent
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setIsVisible(false);
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
