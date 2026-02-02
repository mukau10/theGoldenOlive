import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';

const Header = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Check if we're on the homepage
  const isHomePage = location.pathname === '/';

  // Check if restaurant is currently open
  useEffect(() => {
    const checkStatus = () => {
      const now = new Date();
      const hour = now.getHours();
      // Restaurant is open Ma-Zo: 17:00 - 23:00
      setIsOpen(hour >= 17 && hour < 23);
    };
    
    checkStatus();
    // Update every minute to reflect status changes
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Throttle scroll handler for better performance
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 100);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Memoize scroll function to prevent unnecessary re-renders
  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  }, []);

  return (
    <>
      {/* Topbar */}
      <div id="topbar" className="d-none d-sm-flex align-items-center justify-content-center small position-fixed top-0 start-0 end-0" style={{ height: 'auto', minHeight: '36px', padding: '6px 12px', zIndex: 1050, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(10px)' }} role="complementary" aria-label={t('header.contactInfo')}>
        <div className="d-flex align-items-center justify-content-center small w-100">
          <div className="d-flex align-items-center text-warning overflow-hidden flex-wrap justify-content-center gap-2 gap-sm-3">
            <div className="d-none d-sm-flex align-items-center">
              <i className="bi bi-phone text-warning me-1 me-sm-2" style={{ fontSize: '0.85rem' }}></i>
              <span style={{ fontSize: '0.75rem' }}>
                <a 
                  href="tel:+32494194397" 
                  className="text-white text-decoration-none" 
                  style={{ 
                    fontSize: 'inherit',
                    transition: 'all 0.3s ease',
                    fontWeight: '600'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--bs-golden)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  +32 494 19 43 97
                </a>
              </span>
            </div>
            <div className="d-none d-sm-flex align-items-center">
              <i className={`bi ${isOpen ? 'bi-circle-fill' : 'bi-circle'} me-2`} style={{ fontSize: '0.6rem', color: isOpen ? '#28a745' : '#dc3545' }}></i>
              <span className="text-white fw-semibold" style={{ fontSize: '0.75rem' }}>
                {isOpen ? (t('trustSignals.openNow') || 'Nu open') : (t('trustSignals.closedNow') || 'Nu gesloten')}
              </span>
            </div>
            <div className="d-none d-md-flex align-items-center">
              <i className="bi bi-clock text-warning me-2" style={{ fontSize: '0.85rem' }}></i>
              <span className="text-white" style={{ fontSize: '0.75rem' }}>{t('header.hours')}</span>
            </div>
            <div className="d-none d-lg-flex align-items-center">
              <i className="bi bi-geo-alt text-warning me-2" style={{ fontSize: '0.85rem' }}></i>
              <span className="text-white" style={{ fontSize: '0.75rem' }}>{t('header.address')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header
        id="header"
        className={`position-fixed start-0 end-0 ${isScrolled ? 'header-scrolled' : ''}`}
        style={{ 
          zIndex: 1040,
          background: 'transparent',
        }}
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
                  className="header-logo"
                  style={{ objectFit: 'contain' }}
                />
              </a>
            </h1>

            {/* Desktop Navigation */}
            <nav id="navbar" className="d-none d-lg-block" role="navigation" aria-label={t('header.navigation')}>
              <ul className="d-flex align-items-center mb-0 list-unstyled" style={{ gap: '2rem' }} role="menubar">
                <li role="none">
                  <Link
                    className="nav-link-modern text-white text-decoration-none fw-medium"
                    to="/"
                    role="menuitem"
                    aria-label={t('header.goToHome')}
                  >
                    {t('common.home')}
                  </Link>
                </li>
                <li>
                  {isHomePage ? (
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
                  ) : (
                    <Link
                      className="nav-link-modern text-white text-decoration-none fw-medium"
                      to="/#about"
                    >
                      {t('common.about')}
                    </Link>
                  )}
                </li>
                <li>
                  <Link
                    className="nav-link-modern text-white text-decoration-none fw-medium"
                    to="/menu"
                  >
                    {t('common.menu')}
                  </Link>
                </li>
                <li>
                  {isHomePage ? (
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
                  ) : (
                    <Link
                      className="nav-link-modern text-white text-decoration-none fw-medium"
                      to="/#events"
                    >
                      {t('common.events')}
                    </Link>
                  )}
                </li>
                <li>
                  {isHomePage ? (
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
                  ) : (
                    <Link
                      className="nav-link-modern text-white text-decoration-none fw-medium"
                      to="/#gallery"
                    >
                      {t('common.gallery')}
                    </Link>
                  )}
                </li>
                <li>
                  <Link
                    className="nav-link-modern text-white text-decoration-none fw-medium"
                    to="/contact"
                  >
                    {t('common.contact')}
                  </Link>
                </li>
                <li>
                  <LanguageSwitcher />
                </li>
              </ul>
            </nav>

            {/* Mobile: Language Switcher + Menu Button */}
            <div className="d-lg-none d-flex align-items-center" style={{ gap: '0.75rem' }}>
              <LanguageSwitcher />
              <button
                className="mobile-nav-toggle"
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
        </div>

        {/* Mobile Navigation Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="d-lg-none position-fixed top-0 start-0 w-100 h-100"
            style={{
              zIndex: 1055,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Navigation Menu */}
        <div
          id="mobile-nav"
          className={`d-lg-none position-fixed top-0 start-0 h-100`}
          style={{
            zIndex: 1060,
            width: '85%',
            maxWidth: '320px',
            transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            background: '#0a0a0a',
            boxShadow: isMobileMenuOpen ? '8px 0 40px rgba(0, 0, 0, 0.8)' : 'none',
          }}
        >
          <div className="d-flex flex-column h-100">
            {/* Mobile Header */}
            <div 
              className="d-flex align-items-center justify-content-between p-4"
              style={{ 
                background: '#0a0a0a',
                borderBottom: '1px solid rgba(255, 193, 7, 0.15)'
              }}
            >
              <img
                src="/img/favicon11.png"
                alt="The Golden Olive"
                style={{ height: '40px', objectFit: 'contain' }}
              />
              <button
                className="d-flex align-items-center justify-content-center"
                aria-label={t('header.closeMobileMenu')}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 193, 7, 0.3)',
                  color: 'var(--bs-golden)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  transition: 'all 0.2s ease',
                }}
              >
                <i className="bi bi-x-lg" style={{ fontSize: '1.1rem' }}></i>
              </button>
            </div>

            {/* Order Button - Prominent CTA */}
            <div className="px-4 py-4" style={{ background: '#0a0a0a' }}>
              <Link
                to="/bestellen"
                onClick={() => setIsMobileMenuOpen(false)}
                className="d-flex align-items-center justify-content-center gap-2 w-100 py-3 text-decoration-none"
                style={{
                  background: 'linear-gradient(135deg, var(--bs-golden) 0%, #e6ac00 100%)',
                  color: '#000',
                  fontWeight: '700',
                  fontSize: '1rem',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(255, 193, 7, 0.3)',
                  transition: 'all 0.3s ease',
                }}
              >
                <i className="bi bi-bag-check" style={{ fontSize: '1.2rem' }}></i>
                {t('hero.orderOnline', 'Online Bestellen')}
              </Link>
            </div>

            {/* Mobile Navigation Links */}
            <nav 
              className="flex-fill px-4 overflow-auto" 
              style={{ background: '#0a0a0a' }} 
              role="navigation" 
              aria-label={t('header.mobileNavigation')}
            >
              <ul className="list-unstyled mb-0">
                {/* Home */}
                <li>
                  <Link
                    className="mobile-nav-link-modern d-flex align-items-center text-white text-decoration-none py-3"
                    to="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mobile-nav-icon">
                      <i className="bi-house-door"></i>
                    </span>
                    <span>{t('common.home')}</span>
                  </Link>
                </li>
                {/* About */}
                <li>
                  {isHomePage ? (
                    <a
                      className="mobile-nav-link-modern d-flex align-items-center text-white text-decoration-none py-3"
                      href="#about"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection('about');
                      }}
                    >
                      <span className="mobile-nav-icon">
                        <i className="bi-info-circle"></i>
                      </span>
                      <span>{t('common.about')}</span>
                    </a>
                  ) : (
                    <Link
                      className="mobile-nav-link-modern d-flex align-items-center text-white text-decoration-none py-3"
                      to="/#about"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="mobile-nav-icon">
                        <i className="bi-info-circle"></i>
                      </span>
                      <span>{t('common.about')}</span>
                    </Link>
                  )}
                </li>
                {/* Menu */}
                <li>
                  <Link
                    className="mobile-nav-link-modern d-flex align-items-center text-white text-decoration-none py-3"
                    to="/menu"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mobile-nav-icon">
                      <i className="bi-book"></i>
                    </span>
                    <span>{t('common.menu')}</span>
                  </Link>
                </li>
                {/* Events */}
                <li>
                  {isHomePage ? (
                    <a
                      className="mobile-nav-link-modern d-flex align-items-center text-white text-decoration-none py-3"
                      href="#events"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection('events');
                      }}
                    >
                      <span className="mobile-nav-icon">
                        <i className="bi-calendar-event"></i>
                      </span>
                      <span>{t('common.events')}</span>
                    </a>
                  ) : (
                    <Link
                      className="mobile-nav-link-modern d-flex align-items-center text-white text-decoration-none py-3"
                      to="/#events"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="mobile-nav-icon">
                        <i className="bi-calendar-event"></i>
                      </span>
                      <span>{t('common.events')}</span>
                    </Link>
                  )}
                </li>
                {/* Gallery */}
                <li>
                  {isHomePage ? (
                    <a
                      className="mobile-nav-link-modern d-flex align-items-center text-white text-decoration-none py-3"
                      href="#gallery"
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection('gallery');
                      }}
                    >
                      <span className="mobile-nav-icon">
                        <i className="bi-images"></i>
                      </span>
                      <span>{t('common.gallery')}</span>
                    </a>
                  ) : (
                    <Link
                      className="mobile-nav-link-modern d-flex align-items-center text-white text-decoration-none py-3"
                      to="/#gallery"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="mobile-nav-icon">
                        <i className="bi-images"></i>
                      </span>
                      <span>{t('common.gallery')}</span>
                    </Link>
                  )}
                </li>
                {/* Contact */}
                <li>
                  <Link
                    className="mobile-nav-link-modern d-flex align-items-center text-white text-decoration-none py-3"
                    to="/contact"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span className="mobile-nav-icon">
                      <i className="bi-telephone"></i>
                    </span>
                    <span>{t('common.contact')}</span>
                  </Link>
                </li>
              </ul>
            </nav>

            {/* Mobile Footer */}
            <div 
              className="p-4" 
              style={{ 
                background: '#0a0a0a',
                borderTop: '1px solid rgba(255, 193, 7, 0.15)'
              }}
            >
              {/* Language Switcher */}
              <div className="mb-4">
                <LanguageSwitcher />
              </div>
              
              {/* Contact Info */}
              <div className="d-flex flex-column gap-3" style={{ fontSize: '0.9rem' }}>
                <a 
                  href="tel:+32494194397" 
                  className="d-flex align-items-center text-white text-decoration-none"
                  style={{ transition: 'color 0.2s' }}
                >
                  <i className="bi bi-telephone-fill me-3" style={{ color: 'var(--bs-golden)', width: '20px' }}></i>
                  +32 494 19 43 97
                </a>
                <div className="d-flex align-items-center text-white" style={{ opacity: 0.8 }}>
                  <i className="bi bi-clock me-3" style={{ color: 'var(--bs-golden)', width: '20px' }}></i>
                  <span style={{ fontSize: '0.85rem' }}>{t('header.hours')}</span>
                </div>
                <div className="d-flex align-items-start text-white" style={{ opacity: 0.8 }}>
                  <i className="bi bi-geo-alt-fill me-3" style={{ color: 'var(--bs-golden)', width: '20px', marginTop: '2px' }}></i>
                  <span style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>{t('header.address')}</span>
                </div>
              </div>
              
              {/* Status Badge */}
              <div 
                className="d-flex align-items-center justify-content-center mt-4 py-2 px-3"
                style={{
                  background: isOpen ? 'rgba(40, 167, 69, 0.15)' : 'rgba(220, 53, 69, 0.15)',
                  borderRadius: '8px',
                  border: `1px solid ${isOpen ? 'rgba(40, 167, 69, 0.3)' : 'rgba(220, 53, 69, 0.3)'}`,
                }}
              >
                <span 
                  style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: isOpen ? '#28a745' : '#dc3545',
                    marginRight: '8px',
                    animation: isOpen ? 'pulse 2s infinite' : 'none'
                  }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: isOpen ? '#28a745' : '#dc3545' }}>
                  {isOpen ? (t('trustSignals.openNow') || 'Nu open') : (t('trustSignals.closedNow') || 'Nu gesloten')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;

