import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();
  
  return (
    <footer
      id="footer"
      role="contentinfo"
      className="bg-black border-top border-warning position-relative"
      style={{ background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)' }}
    >
      <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-50"></div>
      <div className="py-4 py-md-5 position-relative" style={{ zIndex: 2 }}>
        <div className="container-fluid px-3 px-md-4">
          <div className="row justify-content-center mb-4 mb-md-5">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="text-center bg-black border border-warning rounded-3 p-3 p-md-4 shadow">
                <img
                  src="/img/logo.png"
                  alt="The Golden Olive Restaurant Logo"
                  className="mb-3 mb-md-4"
                  style={{ width: 'clamp(80px, 15vw, 120px)', height: 'auto' }}
                  loading="lazy"
                />

                {/* Quick Contact Buttons */}
                <div className="d-flex flex-column flex-sm-row justify-content-center gap-2 gap-sm-3 mb-3 mb-md-4">
                  <a
                    href="tel:+32494194397"
                    className="btn btn-warning rounded-pill px-4 py-2 fw-semibold"
                    style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)', transition: 'all 0.3s ease' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(255, 193, 7, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <i className="bi bi-telephone-fill me-2"></i>
                    {t('footer.callNow') || 'Bel Nu'}
                  </a>
                  <a
                    href="https://wa.me/32494194397"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-warning rounded-pill px-4 py-2 fw-semibold"
                    style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)', transition: 'all 0.3s ease' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                      e.currentTarget.style.borderColor = 'var(--bs-golden)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    }}
                  >
                    <i className="bi bi-whatsapp me-2"></i>
                    {t('footer.whatsapp') || 'WhatsApp'}
                  </a>
                </div>

                <div className="d-flex justify-content-center gap-3 mb-3 mb-md-4" aria-label="Social media links">
                  <a
                    href="https://www.facebook.com/TheGoldenolivee"
                    className="btn btn-outline-warning rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 'clamp(44px, 8vw, 50px)', height: 'clamp(44px, 8vw, 50px)', transition: 'all 0.3s' }}
                    aria-label={t('footer.visitFacebook')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-facebook text-warning" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }} aria-hidden="true"></i>
                  </a>
                  <a
                    href="https://www.instagram.com/thegoldenolive._"
                    className="btn btn-outline-warning rounded-circle d-flex align-items-center justify-content-center"
                    style={{ width: 'clamp(44px, 8vw, 50px)', height: 'clamp(44px, 8vw, 50px)', transition: 'all 0.3s' }}
                    aria-label={t('footer.followInstagram')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-instagram text-warning" style={{ fontSize: 'clamp(1.25rem, 3vw, 1.5rem)' }} aria-hidden="true"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Section */}
      <div
        className="border-top border-warning bg-black position-relative"
        style={{ zIndex: 2, background: 'rgba(0,0,0,0.9) !important' }}
      >
        <div className="container-fluid px-3 px-md-4 py-3 py-md-4">
          <div className="text-center">
            <div className="text-white mb-2" style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)' }}>
              &copy; 2025 Copyright{' '}
              <strong>
                <span className="text-warning">The Golden Olive</span>
              </strong>
              . {t('footer.copyright')}
            </div>
            <div className="text-white-50 small" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
              <div className="d-flex flex-column flex-sm-row align-items-center justify-content-center gap-2 gap-sm-3">
                <div>
                  {t('footer.vatNumber')}{' '}
                  <a href="#" aria-label={t('footer.vatNumber')} className="text-warning text-decoration-none">
                    BE0738909475
                  </a>
                </div>
                <div className="d-none d-sm-block text-secondary">|</div>
                <div>
                  <a href="/privacy-policy" className="text-warning text-decoration-none">
                    {t('footer.privacyPolicy')}
                  </a>
                </div>
                <div className="d-none d-sm-block text-secondary">|</div>
                <div>
                  <a href="/cookie-policy" className="text-warning text-decoration-none">
                    {t('footer.cookiePolicy')}
                  </a>
                </div>
                <div className="d-none d-sm-block text-secondary">|</div>
                <div>
                  <a href="/allergenen" className="text-warning text-decoration-none">
                    {t('footer.allergenInfo')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

