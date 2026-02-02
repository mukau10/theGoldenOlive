/**
 * Cart Button & Drawer Component - Top Right Position
 * Shows cart icon in top-right corner with slide-out drawer
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrder } from './OrderContext';
import Cart from './Cart';
import './Order.css';

interface CartButtonProps {
  onCheckout: () => void;
}

const CartButton: React.FC<CartButtonProps> = ({ onCheckout }) => {
  const { t } = useTranslation();
  const { itemCount, total } = useOrder();
  const [isOpen, setIsOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const prevItemCount = useRef(itemCount);

  // Pulse cart button when items increase
  useEffect(() => {
    if (itemCount > prevItemCount.current) {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 300);
    }
    prevItemCount.current = itemCount;
  }, [itemCount]);

  const handleCheckout = useCallback(() => {
    setIsOpen(false);
    onCheckout();
  }, [onCheckout]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <>
      {/* Top Right Cart Button */}
      <button
        className={`cart-button-top ${itemCount > 0 ? 'has-items' : ''} ${pulse ? 'pulse' : ''}`}
        onClick={handleOpen}
        aria-label={t('order.openCart', 'Open winkelwagen')}
      >
        <i className="bi bi-bag"></i>
        {itemCount > 0 && (
          <span className="cart-badge">{itemCount}</span>
        )}
        {itemCount > 0 && (
          <span className="cart-total-badge">€{total.toFixed(2)}</span>
        )}
      </button>

      {/* Cart Drawer (Right Side) */}
      <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
        <div className="cart-drawer-header">
          <h5>
            <i className="bi bi-bag-fill me-2"></i>
            {t('order.yourCart', 'Je Bestelling')}
            {itemCount > 0 && (
              <span className="cart-drawer-count">({itemCount})</span>
            )}
          </h5>
          <button
            className="cart-drawer-close"
            onClick={handleClose}
            aria-label={t('order.close', 'Sluiten')}
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div className="cart-drawer-body">
          {itemCount === 0 ? (
            <div className="cart-empty-state">
              <i className="bi bi-bag-x"></i>
              <p>{t('order.emptyCart', 'Je winkelwagen is leeg')}</p>
              <span>{t('order.addItemsHint', 'Voeg producten toe om te bestellen')}</span>
            </div>
          ) : (
            <Cart onCheckout={handleCheckout} />
          )}
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="cart-drawer-backdrop"
          onClick={handleClose}
          role="button"
          tabIndex={-1}
          aria-label={t('order.close', 'Sluiten')}
        />
      )}
    </>
  );
};

export default CartButton;
