import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const Footer = () => {
  const { t } = useTranslation();
  
  return (
    <footer id="footer" role="contentinfo" className="footer-modern">
      {/* Decorative top border */}
      <div className="footer-border"></div>
      
      {/* Main Footer Content */}
      <div className="footer-main">
        <div className="container-fluid px-4 px-md-5">
          <div className="row g-5 justify-content-between">
            {/* Brand Column */}
            <div className="col-12 col-lg-4">
              <div className="footer-brand">
                <img
                  src="/img/logo.png"
                  alt="The Golden Olive Restaurant Logo"
                  className="footer-logo"
                  loading="lazy"
                />
                <p className="footer-tagline">
                  {t('footer.tagline', 'Authentieke smaken, warme gastvrijheid')}
                </p>
                
                {/* Social Links */}
                <div className="footer-social">
                  <a
                    href="https://www.facebook.com/TheGoldenolivee"
                    className="social-link"
                    aria-label={t('footer.visitFacebook')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-facebook"></i>
                  </a>
                  <a
                    href="https://www.instagram.com/thegoldenolive._"
                    className="social-link"
                    aria-label={t('footer.followInstagram')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-instagram"></i>
                  </a>
                  <a
                    href="https://wa.me/32494194397"
                    className="social-link"
                    aria-label={t('footer.whatsapp')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <i className="bi bi-whatsapp"></i>
                  </a>
                </div>
              </div>
            </div>
            
            {/* Contact Column */}
            <div className="col-6 col-lg-3">
              <h4 className="footer-title">{t('footer.contact', 'Contact')}</h4>
              <ul className="footer-links">
                <li>
                  <i className="bi bi-geo-alt"></i>
                  <span>Vlaamsekaai 65<br />2000 Antwerpen</span>
                </li>
                <li>
                  <i className="bi bi-telephone"></i>
                  <a href="tel:+32494194397">+32 494 19 43 97</a>
                </li>
                <li>
                  <i className="bi bi-clock"></i>
                  <span>Ma - Zo: 17:00 - 23:00</span>
                </li>
              </ul>
            </div>
            
            {/* Quick Links Column */}
            <div className="col-6 col-lg-3">
              <h4 className="footer-title">{t('footer.quickLinks', 'Links')}</h4>
              <ul className="footer-nav">
                <li><Link to="/menu">{t('common.menu')}</Link></li>
                <li><Link to="/bestellen">{t('order.orderOnline', 'Bestellen')}</Link></li>
                <li><Link to="/contact">{t('common.contact')}</Link></li>
                <li><Link to="/galerij">{t('common.gallery')}</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Section */}
      <div className="footer-bottom">
        <div className="container-fluid px-4 px-md-5">
          <div className="footer-bottom-content">
            <div className="footer-copyright">
              &copy; 2025 <span>The Golden Olive</span>. {t('footer.copyright')}
            </div>
            <div className="footer-legal">
              <span>{t('footer.vatNumber')} BE0738909475</span>
              <Link to="/privacy-policy">{t('footer.privacyPolicy')}</Link>
              <Link to="/cookie-policy">{t('footer.cookiePolicy')}</Link>
              <Link to="/allergenen">{t('footer.allergenInfo')}</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

