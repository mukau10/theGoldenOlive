import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { MenuCategory, MenuItem as MenuItemType } from '../../types/menu';
import { useAllergens } from '../../hooks/useAllergens';
import { useAllergenTranslation } from '../../utils/allergenTranslations';
import { useMenuTranslation } from '../../utils/menuTranslations';
import { hasIncludedSide } from '../../utils/categoryInfo';
import MenuImageLightbox from './MenuImageLightbox';

interface ProductDetailsModalProps {
  item: MenuItemType;
  category: string;
  onClose: () => void;
  onAddToTicket?: (item: MenuItemType, category: MenuCategory) => void;
}

const ALLERGEN_COLORS: Record<string, string> = {
  red: '#dc3545',
  orange: '#ff7e00',
  yellow: '#ffc107',
  green: '#28a745',
  blue: '#007bff',
  purple: '#6f42c1',
  cyan: '#17a2b8',
  amber: '#ff9f43',
  brown: '#8b4513',
};

function resolveImagePath(path: string): string {
  return path
    .replace(/^\/?public\/img\//, '/img/')
    .replace(/^public\/img\//, '/img/')
    .replace(/^assets\/img\//, '/img/');
}

const ProductDetailsModal = ({ item, category, onClose, onAddToTicket }: ProductDetailsModalProps) => {
  const { t } = useTranslation();
  const { translateMenuItem } = useMenuTranslation();
  const { translateAllergen } = useAllergenTranslation();
  const { getAllergenByCode } = useAllergens();
  const [activeAllergenIndex, setActiveAllergenIndex] = useState<number | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const imagePath = resolveImagePath(item.image);

  const translatedItem = useMemo(() => translateMenuItem(item), [item, translateMenuItem]);

  const allergens = useMemo(() => {
    return (item.allergens || []).map((allergen) => {
      const reference = getAllergenByCode(allergen.code);
      const source = reference || allergen;
      const translated = translateAllergen({
        ...source,
        type: allergen.type || source.type,
        description: allergen.description || source.description,
      } as never);
      return {
        code: allergen.code,
        type: translated.type,
        description: translated.description,
        color: allergen.color || reference?.color || 'red',
      };
    });
  }, [getAllergenByCode, item.allergens, translateAllergen]);

  const activeAllergen = activeAllergenIndex !== null ? allergens[activeAllergenIndex] : null;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !showFullImage) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, showFullImage]);

  return createPortal(
    <>
      <div className="product-details-backdrop" onClick={onClose}>
      <div
        className="product-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="product-details-close"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <i className="bi bi-x-lg" />
        </button>

        {item.image ? (
          <button
            type="button"
            className="product-details-image-btn"
            onClick={() => setShowFullImage(true)}
            aria-label={t('menuOrder.viewFullImage', { name: translatedItem.name })}
          >
            <img
              className="product-details-image"
              src={imagePath}
              alt={item.alt}
            />
          </button>
        ) : null}

        <div className="product-details-body">
          <div className="product-details-top">
            <h3 id="product-details-title">{translatedItem.name}</h3>
            <span className="product-details-price">{item.price}</span>
          </div>

          {translatedItem.description && (
            <p
              className="product-details-copy"
              dangerouslySetInnerHTML={{ __html: translatedItem.description }}
            />
          )}

          {hasIncludedSide(category, item.id) && (
            <p className="product-details-note">{t('menu.includedSideNote')}</p>
          )}
          {item.id === 'mix-bbq-boil' && (
            <p className="product-details-note product-details-note--highlight">{t('menu.servesFrom2')}</p>
          )}

          <div className="product-details-allergens">
            <h4>{t('menu.allergens')}</h4>
            {allergens.length > 0 ? (
              <>
                <p className="product-details-allergen-hint">{t('menu.tapAllergen')}</p>
                <div className="product-details-badges">
                  {allergens.map((allergen, index) => {
                    const bgColor = ALLERGEN_COLORS[allergen.color] || '#dc3545';
                    const textColor = allergen.color === 'yellow' || allergen.color === 'amber' ? '#000' : '#fff';
                    const selected = activeAllergenIndex === index;
                    return (
                      <button
                        key={`${allergen.code}-${index}`}
                        type="button"
                        className={`product-details-badge${selected ? ' is-selected' : ''}`}
                        style={{ background: bgColor, color: textColor, borderColor: bgColor }}
                        onClick={() => setActiveAllergenIndex(selected ? null : index)}
                        aria-pressed={selected}
                      >
                        {allergen.code}
                      </button>
                    );
                  })}
                </div>
                {activeAllergen && (
                  <div className="product-details-allergen-card">
                    <strong>{activeAllergen.type}</strong>
                    <p>{activeAllergen.description}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="product-details-allergen-hint">{t('menu.noAllergens')}</p>
            )}
          </div>
        </div>

        {onAddToTicket && (
          <div className="product-details-footer">
            <button
              type="button"
              onClick={() => {
                onAddToTicket(item, category as MenuCategory);
                onClose();
              }}
            >
              {t('menuOrder.addToTicket')} · {item.price}
            </button>
          </div>
        )}
      </div>
      </div>
      {showFullImage && (
        <MenuImageLightbox
          src={imagePath}
          alt={item.alt}
          caption={translatedItem.name}
          onClose={() => setShowFullImage(false)}
        />
      )}
    </>,
    document.body
  );
};

export default ProductDetailsModal;
