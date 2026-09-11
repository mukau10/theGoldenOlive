import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import type { MenuCategory, MenuData, MenuItem as MenuItemType } from '../../types/menu';
import { canAddSidesToDish, requiresSideChoice } from '../../utils/categoryInfo';
import { useMenuTranslation } from '../../utils/menuTranslations';
import { formatEuro, parseMenuPrice } from '../../utils/price';
import { useMenuOrder, type OrderExtra } from './MenuOrderContext';

const NO_SIDE_ID = 'no-side';

interface DishOrderSheetProps {
  item: MenuItemType;
  category: MenuCategory;
  menuData: MenuData;
  onClose: () => void;
}

function resolveImagePath(path: string): string {
  return path
    .replace(/^\/?public\/img\//, '/img/')
    .replace(/^public\/img\//, '/img/')
    .replace(/^assets\/img\//, '/img/');
}

const DishOrderSheet = ({ item, category, menuData, onClose }: DishOrderSheetProps) => {
  const { t } = useTranslation();
  const { translateMenuItem } = useMenuTranslation();
  const { addLine } = useMenuOrder();
  const [quantity, setQuantity] = useState(1);
  const [selectedSideId, setSelectedSideId] = useState<string | null>(null);
  const [selectedSauceIds, setSelectedSauceIds] = useState<string[]>([]);

  const translatedItem = useMemo(() => translateMenuItem(item), [item, translateMenuItem]);
  const showSides = canAddSidesToDish(category, item.id);
  const sideRequired = requiresSideChoice(category, item.id);
  const basePrice = parseMenuPrice(item.price);

  const extrasCatalog = useMemo(() => {
    const extras = menuData.supplementen || [];
    return {
      sides: extras.filter((extra) => !extra.id.startsWith('saus-')),
      hotSauces: extras.filter((extra) => extra.id.startsWith('saus-warm-')),
      coldSauces: extras.filter((extra) => extra.id.startsWith('saus-') && !extra.id.startsWith('saus-warm-')),
    };
  }, [menuData.supplementen]);

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

  const selectedSide = extrasCatalog.sides.find((side) => side.id === selectedSideId);
  const selectedSauces = [...extrasCatalog.hotSauces, ...extrasCatalog.coldSauces].filter((sauce) =>
    selectedSauceIds.includes(sauce.id)
  );

  const selectedExtras: OrderExtra[] = useMemo(() => {
    const extras: OrderExtra[] = [];
    if (selectedSide) {
      extras.push({
        id: selectedSide.id,
        name: translateMenuItem(selectedSide).name,
        price: parseMenuPrice(selectedSide.price),
      });
    }
    selectedSauces.forEach((sauce) => {
      extras.push({
        id: sauce.id,
        name: translateMenuItem(sauce).name,
        price: parseMenuPrice(sauce.price),
      });
    });
    return extras;
  }, [selectedSauces, selectedSide, translateMenuItem]);

  const extrasTotal = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
  const previewTotal = (basePrice + extrasTotal) * quantity;
  const canAdd = !sideRequired || Boolean(selectedSideId);

  const handleAdd = () => {
    if (!canAdd) return;
    addLine({
      itemId: item.id,
      name: translatedItem.name,
      basePrice,
      extras: selectedExtras,
      quantity,
    });
    onClose();
  };

  const renderSauceChips = (extras: MenuItemType[]) => (
    <div className="menu-order-chips">
      {extras.map((extra) => {
        const translated = translateMenuItem(extra);
        const selected = selectedSauceIds.includes(extra.id);
        return (
          <button
            key={extra.id}
            type="button"
            className={`menu-order-chip${selected ? ' is-selected' : ''}`}
            onClick={() =>
              setSelectedSauceIds((current) =>
                current.includes(extra.id)
                  ? current.filter((id) => id !== extra.id)
                  : [...current, extra.id]
              )
            }
            aria-pressed={selected}
          >
            <strong>{translated.name}</strong>
            <span>+{extra.price}</span>
          </button>
        );
      })}
    </div>
  );

  return createPortal(
    <>
      <div className="menu-order-sheet-backdrop" onClick={onClose} />
      <div
        className="menu-order-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dish-order-title"
      >
        <div className="menu-order-sheet-handle" />
        <div className="menu-order-sheet-head">
          {item.image ? (
            <img src={resolveImagePath(item.image)} alt={item.alt} />
          ) : null}
          <div className="flex-grow-1">
            <h3 id="dish-order-title">{translatedItem.name}</h3>
            <p>{item.price}</p>
          </div>
          <button
            type="button"
            className="menu-order-sheet-close"
            onClick={onClose}
            aria-label={t('menuOrder.closeSheet')}
          >
            <i className="bi bi-x-lg" />
          </button>
        </div>

        <div className="menu-order-sheet-body">
          {showSides && (
            <>
              <div className="menu-order-group">
                <h4>{t('menuOrder.sides')}{sideRequired ? ' *' : ''}</h4>
                <p>{sideRequired ? t('menuOrder.chooseSidesHint') : t('menuOrder.optional')}</p>
                <div className="menu-order-chips">
                  {extrasCatalog.sides.map((side) => {
                    const translated = translateMenuItem(side);
                    const selected = selectedSideId === side.id;
                    return (
                      <button
                        key={side.id}
                        type="button"
                        className={`menu-order-chip${selected ? ' is-selected' : ''}`}
                        onClick={() => setSelectedSideId(selected ? null : side.id)}
                        aria-pressed={selected}
                      >
                        <strong>{translated.name}</strong>
                        <span>+{side.price}</span>
                      </button>
                    );
                  })}
                  {sideRequired && (
                    <button
                      type="button"
                      className={`menu-order-chip${selectedSideId === NO_SIDE_ID ? ' is-selected' : ''}`}
                      onClick={() => setSelectedSideId(selectedSideId === NO_SIDE_ID ? null : NO_SIDE_ID)}
                      aria-pressed={selectedSideId === NO_SIDE_ID}
                    >
                      <strong>{t('menuOrder.noSide')}</strong>
                      <span>{formatEuro(0)}</span>
                    </button>
                  )}
                </div>
                {sideRequired && !selectedSideId && (
                  <p className="menu-order-required">{t('menuOrder.chooseSideRequired')}</p>
                )}
              </div>
              <div className="menu-order-group">
                <h4>{t('menuOrder.hotSauces')}</h4>
                <p>{t('menuOrder.saucesOptional')}</p>
                {renderSauceChips(extrasCatalog.hotSauces)}
              </div>
              <div className="menu-order-group">
                <h4>{t('menuOrder.coldSauces')}</h4>
                {renderSauceChips(extrasCatalog.coldSauces)}
              </div>
            </>
          )}

          <div className="menu-order-group">
            <div className="menu-order-qty">
              <h4 className="mb-0">{t('menuOrder.quantity')}</h4>
              <div className="menu-order-qty-controls">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  disabled={quantity <= 1}
                  aria-label={t('menuOrder.decreaseQty')}
                >
                  −
                </button>
                <strong>{quantity}</strong>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                  aria-label={t('menuOrder.increaseQty')}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="menu-order-sheet-footer">
          <button type="button" onClick={handleAdd} disabled={!canAdd}>
            {t('menuOrder.addToTicket')} · {formatEuro(previewTotal)}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

export default DishOrderSheet;
