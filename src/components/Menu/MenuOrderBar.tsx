import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatEuro } from '../../utils/price';
import { lineTotal, useMenuOrder } from './MenuOrderContext';

const MenuOrderBar = () => {
  const { t, i18n } = useTranslation();
  const { lines, itemCount, total, updateQuantity, removeLine, clearOrder, ticketId } = useMenuOrder();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('has-menu-order-bar', itemCount > 0);
    return () => document.body.classList.remove('has-menu-order-bar');
  }, [itemCount]);

  useEffect(() => {
    if (itemCount === 0) setIsOpen(false);
  }, [itemCount]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const issuedAt = useMemo(
    () =>
      new Date().toLocaleString(i18n.language, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [i18n.language, itemCount]
  );

  if (itemCount === 0) return null;

  return (
    <>
      <div className="menu-order-bar" role="region" aria-label={t('menuOrder.yourTicket')}>
        <div className="menu-order-bar-row">
          <div className="menu-order-bar-summary">
            <small>
              {itemCount === 1
                ? t('menuOrder.itemSingular')
                : t('menuOrder.items', { count: itemCount })}
            </small>
            <strong>
              {t('menuOrder.yourTicket')} · {formatEuro(total)}
            </strong>
          </div>
          <button
            type="button"
            className="menu-order-bar-view"
            onClick={() => setIsOpen(true)}
          >
            <i className="bi bi-receipt" />
            {t('menuOrder.viewTicket')}
          </button>
        </div>
      </div>

      {isOpen && (
        <>
          <div className="guest-ticket-backdrop" onClick={() => setIsOpen(false)} />
          <div
            className="guest-ticket-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-ticket-title"
          >
            <article className="guest-ticket">
              <header className="guest-ticket-head">
                <img src="/img/logo.png" alt="The Golden Olive" className="guest-ticket-logo" />
                <h2 id="guest-ticket-title">The Golden Olive</h2>
                <p className="guest-ticket-kicker">{t('menuOrder.tableTicket')}</p>
                <p className="guest-ticket-meta">{t('menuOrder.ticketAddress')}</p>
                <div className="guest-ticket-meta-row">
                  <span>
                    {t('menuOrder.ticketNumber')} {ticketId}
                  </span>
                  <span>{issuedAt}</span>
                </div>
              </header>

              <div className="guest-ticket-divider" />

              <ul className="guest-ticket-lines">
                {lines.map((line) => (
                  <li key={line.uid} className="guest-ticket-line">
                    <div className="guest-ticket-line-main">
                      <span className="guest-ticket-qty">{line.quantity}×</span>
                      <span className="guest-ticket-name">{line.name}</span>
                      <span className="guest-ticket-dots" />
                      <span className="guest-ticket-price">{formatEuro(lineTotal(line))}</span>
                    </div>
                    {line.extras.length > 0 && (
                      <ul className="guest-ticket-extras">
                        {line.extras.map((extra) => (
                          <li key={extra.id}>
                            + {extra.name}
                            <span>{formatEuro(extra.price)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="guest-ticket-line-actions">
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.uid, line.quantity - 1)}
                        aria-label={t('menuOrder.decreaseQty')}
                      >
                        −
                      </button>
                      <strong>{line.quantity}</strong>
                      <button
                        type="button"
                        onClick={() => updateQuantity(line.uid, line.quantity + 1)}
                        aria-label={t('menuOrder.increaseQty')}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(line.uid)}
                        aria-label={t('menuOrder.removeItem')}
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="guest-ticket-divider" />

              <div className="guest-ticket-total">
                <span>{t('menuOrder.total')}</span>
                <strong>{formatEuro(total)}</strong>
              </div>

              <p className="guest-ticket-note">{t('menuOrder.showToWaiter')}</p>
              <p className="guest-ticket-hint">{t('menuOrder.ticketHint')}</p>

              <div className="guest-ticket-footer">
                <button type="button" className="guest-ticket-clear" onClick={clearOrder}>
                  {t('menuOrder.clearTicket')}
                </button>
                <button type="button" className="guest-ticket-close" onClick={() => setIsOpen(false)}>
                  {t('menuOrder.closeTicket')}
                </button>
              </div>
            </article>
          </div>
        </>
      )}
    </>
  );
};

export default MenuOrderBar;
