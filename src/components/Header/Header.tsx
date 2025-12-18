import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';

const Header = () => {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Topbar */}
      <div id="topbar" className="d-flex align-items-center justify-content-center small position-fixed top-0 start-0 end-0" style={{ height: 'auto', minHeight: '36px', padding: '6px 12px', zIndex: 1050, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(10px)' }} role="complementary" aria-label={t('header.contactInfo')}>
        <div className="d-flex align-items-center justify-content-center small w-100">
          <div className="d-flex align-items-center text-warning overflow-hidden flex-wrap justify-content-center gap-2 gap-sm-3">
            <div className="d-flex align-items-center">
              <i className="bi bi-phone text-warning me-1 me-sm-2" style={{ fontSize: '0.85rem' }}></i>
              <span style={{ fontSize: '0.75rem' }}>
                <a href="tel:+32494194397" className="text-white text-decoration-none" style={{ fontSize: 'inherit' }}>+32 494 19 43 97</a>
              </span>
            </div>
            <div className="d-none d-sm-flex align-items-center">
              <i className="bi bi-clock text-warning me-2" style={{ fontSize: '0.85rem' }}></i>
              <span className="text-white" style={{ fontSize: '0.75rem' }}>{t('header.hours')}</span>
            </div>
            <div className="d-none d-md-flex align-items-center">
              <i className="bi bi-geo-alt text-warning me-2" style={{ fontSize: '0.85rem' }}></i>
              <span className="text-white" style={{ fontSize: '0.75rem' }}>{t('header.address')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header
        id="header"
        className={`position-fixed start-0 end-0 backdrop-blur ${isScrolled ? 'header-scrolled' : ''}`}
        style={{ top: '36px', zIndex: 1040 }}
        role="banner"
      >
        <div className="container-fluid px-3 px-md-4 py-2 py-md-3">
          <div className="d-flex align-items-center justify-content-between">
            {/* Logo */}
            <h1 className="logo mb-0">
              <a
                href="#hero"
                className="d-flex align-items-center text-white text-decoration-none fw-light"
                style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.1em', transition: 'color 0.3s', fontSize: 'clamp(0.85rem, 2.5vw, 1rem)' }}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('hero');
                }}
              >
                <img
                  src="/img/favicon11.png"
                  alt="The Golden Olive Logo"
                  className="me-2 me-md-3"
                  style={{ width: 'clamp(24px, 5vw, 32px)', height: 'clamp(24px, 5vw, 32px)', objectFit: 'contain' }}
                />
                <span className="d-none d-sm-inline">THE GOLDEN OLIVE</span>
                <span className="d-sm-none">GOLDEN OLIVE</span>
              </a>
            </h1>

            {/* Desktop Navigation */}
            <nav id="navbar" className="d-none d-lg-block" role="navigation" aria-label={t('header.navigation')}>
              <ul className="d-flex align-items-center mb-0 list-unstyled" style={{ gap: '2rem' }} role="menubar">
                <li role="none">
                  <a
                    className="nav-link-modern text-white text-decoration-none fw-medium"
                    href="#hero"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection('hero');
                    }}
                    role="menuitem"
                    aria-label={t('header.goToHome')}
                  >
                    {t('common.home')}
                  </a>
                </li>
                <li>
                  <a
                    className="nav-link-modern text-white text-decoration-none fw-medium"
                    href="#about"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection('about');
                    }}
                  >
                    {t('common.about')}
                  </a>
                </li>
                <li>
                  <a
                    className="nav-link-modern text-white text-decoration-none fw-medium"
                    href="#menu"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection('menu');
                    }}
                  >
                    {t('common.menu')}
                  </a>
                </li>
                <li>
                  <a
                    className="nav-link-modern text-white text-decoration-none fw-medium"
                    href="#events"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection('events');
                    }}
                  >
                    {t('common.events')}
                  </a>
                </li>
                <li>
                  <a
                    className="nav-link-modern text-white text-decoration-none fw-medium"
                    href="#gallery"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection('gallery');
                    }}
                  >
                    {t('common.gallery')}
                  </a>
                </li>
                <li>
                  <a
                    className="nav-link-modern text-white text-decoration-none fw-medium"
                    href="#contact"
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSection('contact');
                    }}
                  >
                    {t('common.contact')}
                  </a>
                </li>
                <li>
                  <LanguageSwitcher />
                </li>
              </ul>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="d-lg-none mobile-nav-toggle"
              aria-label={t('header.toggleMobileMenu')}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                background: '#000',
                border: '2px solid var(--bs-golden)',
                color: 'var(--bs-golden)',
                width: '44px',
                height: '44px',
                borderRadius: '4px',
                position: 'relative',
                minWidth: '44px',
                minHeight: '44px',
              }}
            >
              <span style={{ fontSize: 0 }}>
                {isMobileMenuOpen ? (
                  <i className="bi bi-x" style={{ fontSize: '1.5rem' }}></i>
                ) : (
                  <i className="bi bi-list" style={{ fontSize: '1.5rem' }}></i>
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div
          id="mobile-nav"
          className={`d-lg-none position-fixed top-0 start-0 w-100 h-100`}
          style={{
            zIndex: 1060,
            transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease-in-out',
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255, 193, 7, 0.2)',
            boxShadow: '4px 0 32px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div className="d-flex flex-column h-100" style={{ background: '#000' }}>
            {/* Mobile Header */}
            <div className="d-flex align-items-center justify-content-between p-4 border-bottom border-warning bg-black">
              <h2 className="fs-5 text-warning mb-0" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>
                Menu
              </h2>
              <button
                className="mobile-nav-close text-warning fs-2 p-2 border border-warning rounded bg-black"
                aria-label={t('header.closeMobileMenu')}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>

            {/* Mobile Navigation Links */}
            <nav className="flex-fill px-4 py-4" style={{ background: '#000' }} role="navigation" aria-label={t('header.mobileNavigation')}>
              <ul className="list-unstyled">
                {[
                  { href: '#hero', label: t('common.home'), icon: 'bi-house-door' },
                  { href: '#about', label: t('common.about'), icon: 'bi-info-circle' },
                  { href: '#menu', label: t('common.menu'), icon: 'bi-list-ul' },
                  { href: '#events', label: t('common.events'), icon: 'bi-calendar-event' },
                  { href: '#gallery', label: t('common.gallery'), icon: 'bi-images' },
                  { href: '#contact', label: t('common.contact'), icon: 'bi-telephone' },
                ].map((item) => (
                  <li key={item.href} className="mb-3">
                    <a
                      className="mobile-nav-link d-block fs-5 text-white text-decoration-none py-3 border-bottom border-warning"
                      href={item.href}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(item.href.substring(1));
                      }}
                    >
                      <i className={`${item.icon} me-3 text-warning`}></i>
                      {item.label}
                    </a>
                  </li>
                ))}
                <li className="mb-3 mt-4 pt-3 border-top border-warning">
                  <div className="px-2">
                    <LanguageSwitcher />
                  </div>
                </li>
              </ul>
            </nav>

            {/* Mobile Contact Info */}
            <div className="p-4 border-top border-warning" style={{ background: '#000' }}>
              <div className="small text-white">
                <div className="d-flex align-items-center mb-3">
                  <i className="bi bi-phone text-warning me-3"></i>
                  <a href="tel:+32494194397" className="text-white text-decoration-none">
                    +32 494 19 43 97
                  </a>
                </div>
                <div className="d-flex align-items-center mb-3">
                  <i className="bi bi-clock text-warning me-3"></i>
                  <span>{t('header.hours')}</span>
                </div>
                <div className="d-flex align-items-center">
                  <i className="bi bi-geo-alt text-warning me-3"></i>
                  <span>{t('header.address')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;

