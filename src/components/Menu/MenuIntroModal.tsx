import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'tgo_menu_intro_seen';

const MenuIntroModal = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setIsOpen(false);
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      // still show the intro
    }
    const timer = window.setTimeout(() => setIsOpen(true), 250);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [close, isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="menu-intro-backdrop" onClick={close}>
      <div
        className="menu-intro-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-intro-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="menu-intro-title">{t('menuOrder.intro.title')}</h2>
        <ol className="menu-intro-steps">
          <li>{t('menuOrder.intro.step1')}</li>
          <li>{t('menuOrder.intro.step2')}</li>
          <li>{t('menuOrder.intro.step3')}</li>
        </ol>
        <button type="button" onClick={close}>
          {t('menuOrder.intro.gotIt')}
        </button>
      </div>
    </div>,
    document.body
  );
};

export default MenuIntroModal;
