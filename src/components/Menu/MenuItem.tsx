import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuCategory, MenuItem as MenuItemType } from '../../types/menu';
import { useMenuTranslation } from '../../utils/menuTranslations';
import MenuImageLightbox from './MenuImageLightbox';
import ProductDetailsModal from './ProductDetailsModal';

interface MenuItemProps {
  item: MenuItemType;
  category: string;
  onOrderClick?: (item: MenuItemType, category: MenuCategory) => void;
  index?: number;
}

const MenuItem = ({ item, category, onOrderClick, index = 0 }: MenuItemProps) => {
  const { t } = useTranslation();
  const { translateMenuItem } = useMenuTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const translatedItem = useMemo(() => translateMenuItem(item), [item, translateMenuItem]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  const imagePath = useMemo(() => {
    let path = item.image;
    path = path.replace(/^\/?public\/img\//, '/img/');
    path = path.replace(/^public\/img\//, '/img/');
    path = path.replace(/^assets\/img\//, '/img/');
    return path;
  }, [item.image]);

  const handleOpenDetails = useCallback(() => {
    setShowDetails(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setShowDetails(false);
  }, []);

  const handleOpenFullImage = useCallback((event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    setShowFullImage(true);
  }, []);

  const handleCloseFullImage = useCallback(() => {
    setShowFullImage(false);
  }, []);

  const handleOrderClick = useCallback((event?: { stopPropagation: () => void }) => {
    event?.stopPropagation();
    onOrderClick?.(item, category as MenuCategory);
  }, [category, item, onOrderClick]);

  if (item.id === 'burgers-placeholder') {
    const placeholderTranslated = translateMenuItem(item);
    return (
      <div className={`col-12 mb-4`}>
        <div className="bg-black border border-warning rounded-3 p-5 text-center shadow-sm">
          <i className="bi bi-hamburger text-warning fs-1 mb-3 d-block"></i>
          <h5 className="text-warning fw-bold mb-0" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem' }}>
            {placeholderTranslated.name}
          </h5>
        </div>
      </div>
    );
  }

  const isPlainCard = category === 'frisdranken' || category === 'warme-dranken' || item.id.startsWith('saus-');
  const isLogoPlaceholder = /favicon11|\/logo\./i.test(imagePath);

  const addButton = onOrderClick ? (
    <button
      type="button"
      className="menu-add-btn"
      onClick={handleOrderClick}
      aria-label={t('menuOrder.addToTicketNamed', { name: translatedItem.name })}
    >
      <i className="bi bi-plus-lg" />
    </button>
  ) : null;

  const cardCopy = (
    <div className="menu-item-copy">
      <h5>{translatedItem.name}</h5>
      {item.id === 'mix-bbq-boil' && (
        <span className="menu-item-serves-badge menu-item-serves-badge--inline">{t('menu.servesFrom2')}</span>
      )}
      {translatedItem.description && (
        isPlainCard ? (
          <p>{translatedItem.description}</p>
        ) : (
          <p dangerouslySetInnerHTML={{ __html: translatedItem.description }} />
        )
      )}
    </div>
  );

  if (isPlainCard) {
    return (
      <div
        ref={cardRef}
        className={`menu-item-modern menu-item-card menu-item-card--plain filter-${category} col-12 col-md-6`}
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'none' : 'translateY(12px)',
          transition: `opacity 0.3s ease ${Math.min(index, 6) * 0.03}s, transform 0.3s ease ${Math.min(index, 6) * 0.03}s`,
        }}
      >
        <div
          className="menu-item-card-inner"
          onClick={handleOpenDetails}
          role="button"
          tabIndex={0}
        >
          <div className="menu-item-content">
            {cardCopy}
            <div className="menu-item-actions">
              <span className="menu-item-price">{item.price}</span>
              {addButton}
            </div>
          </div>
        </div>
        {showDetails && (
          <ProductDetailsModal
            item={item}
            category={category}
            onClose={handleCloseDetails}
            onAddToTicket={onOrderClick}
          />
        )}
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className={`menu-item-modern menu-item-card filter-${category} col-12 col-md-6`}
      style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'none' : 'translateY(12px)',
          transition: `opacity 0.3s ease ${Math.min(index, 8) * 0.03}s, transform 0.3s ease ${Math.min(index, 8) * 0.03}s`,
      }}
    >
      <div className="menu-item-card-inner">
        <div className="menu-item-media">
          <button
            type="button"
            className={`menu-item-image-wrap${isLogoPlaceholder ? ' menu-item-image-wrap--placeholder' : ''}`}
            onClick={handleOpenFullImage}
            aria-label={t('menuOrder.viewFullImage', { name: translatedItem.name })}
          >
            <img src={imagePath} alt={item.alt} loading="lazy" decoding="async" />
          </button>
          <span className="menu-item-price">{item.price}</span>
          {item.id === 'mix-bbq-boil' && (
            <span className="menu-item-serves-badge">{t('menu.servesFrom2')}</span>
          )}
          {addButton}
        </div>

        <div className="menu-item-content" onClick={handleOpenDetails} role="button" tabIndex={0}>
          {cardCopy}
        </div>
      </div>

      {showDetails && (
        <ProductDetailsModal
          item={item}
          category={category}
          onClose={handleCloseDetails}
          onAddToTicket={onOrderClick}
        />
      )}

      {showFullImage && (
        <MenuImageLightbox
          src={imagePath}
          alt={item.alt}
          caption={translatedItem.name}
          onClose={handleCloseFullImage}
        />
      )}
    </div>
  );
};

export default memo(MenuItem, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.category === nextProps.category &&
    prevProps.index === nextProps.index &&
    prevProps.onOrderClick === nextProps.onOrderClick
  );
});
