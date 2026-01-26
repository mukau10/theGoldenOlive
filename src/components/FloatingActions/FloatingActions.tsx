import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './FloatingActions.css';

const FloatingActions = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Show floating actions after scrolling past hero
  useEffect(() => {
    const handleScroll = () => {
      const hero = document.getElementById('hero');
      if (hero) {
        const heroBottom = hero.getBoundingClientRect().bottom;
        setIsVisible(heroBottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setShowMenu(false);
    }
  };

  const handlePhoneClick = () => {
    window.location.href = 'tel:+32494194397';
  };

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent(t('floatingActions.whatsappMessage') || 'Hallo, ik wil graag reserveren bij The Golden Olive!');
    window.open(`https://wa.me/32494194397?text=${message}`, '_blank');
  };

  if (!isVisible) return null;

  return (
    <div className="floating-actions">
      {/* Main floating menu button */}
      <button
        className={`floating-menu-toggle ${showMenu ? 'active' : ''}`}
        onClick={() => setShowMenu(!showMenu)}
        aria-label={t('floatingActions.toggleMenu') || 'Toggle menu'}
        aria-expanded={showMenu}
      >
        <i className={`bi ${showMenu ? 'bi-x' : 'bi-three-dots-vertical'}`}></i>
      </button>

      {/* Action buttons */}
      <div className={`floating-actions-menu ${showMenu ? 'visible' : ''}`}>
        {/* Reserveer button */}
        <button
          className="floating-action-btn floating-action-reserve"
          onClick={() => scrollToSection('contact')}
          aria-label={t('floatingActions.reserve') || 'Reserveer'}
          title={t('floatingActions.reserve') || 'Reserveer'}
        >
          <i className="bi bi-calendar-check"></i>
          <span className="floating-action-label">{t('floatingActions.reserve') || 'Reserveer'}</span>
        </button>

        {/* Menu button */}
        <button
          className="floating-action-btn floating-action-menu"
          onClick={() => scrollToSection('menu')}
          aria-label={t('common.menu') || 'Menu'}
          title={t('common.menu') || 'Menu'}
        >
          <i className="bi bi-menu-button-wide"></i>
          <span className="floating-action-label">{t('common.menu') || 'Menu'}</span>
        </button>

        {/* Phone button */}
        <button
          className="floating-action-btn floating-action-phone"
          onClick={handlePhoneClick}
          aria-label={t('floatingActions.call') || 'Bel ons'}
          title={t('floatingActions.call') || 'Bel ons'}
        >
          <i className="bi bi-telephone"></i>
          <span className="floating-action-label">{t('floatingActions.call') || 'Bel'}</span>
        </button>

        {/* WhatsApp button */}
        <button
          className="floating-action-btn floating-action-whatsapp"
          onClick={handleWhatsAppClick}
          aria-label={t('floatingActions.whatsapp') || 'WhatsApp'}
          title={t('floatingActions.whatsapp') || 'WhatsApp'}
        >
          <i className="bi bi-whatsapp"></i>
          <span className="floating-action-label">{t('floatingActions.whatsapp') || 'WhatsApp'}</span>
        </button>
      </div>
    </div>
  );
};

export default FloatingActions;
