import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface MenuImageLightboxProps {
  src: string;
  alt: string;
  caption?: string;
  onClose: () => void;
}

const MenuImageLightbox = ({ src, alt, caption, onClose }: MenuImageLightboxProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="menu-image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={caption || alt}
      onClick={onClose}
    >
      <button
        type="button"
        className="menu-image-lightbox-close"
        onClick={onClose}
        aria-label={t('common.close')}
      >
        <i className="bi bi-x-lg" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
      />
      {caption && <p className="menu-image-lightbox-caption">{caption}</p>}
    </div>,
    document.body
  );
};

export default MenuImageLightbox;
