/**
 * Cart Component - Mobile First Design
 * Displays cart items with quantity controls and totals
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useOrder } from './OrderContext';
import './Order.css';

interface CartProps {
  onCheckout?: () => void;
  compact?: boolean;
}

const Cart: React.FC<CartProps> = ({ onCheckout, compact = false }) => {
  const { t } = useTranslation();
  const { cart, removeFromCart, updateQuantity, total, setDeliveryType } = useOrder();

  // Calculate subtotal
  const subtotal = cart.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  if (cart.items.length === 0) {
    return (
      <div className="cart-empty">
        <i className="bi bi-bag"></i>
        <h6>{t('order.emptyCart', 'Je bestelling is leeg')}</h6>
        <p>{t('order.emptyCartMessage', 'Voeg producten toe om te beginnen')}</p>
      </div>
    );
  }

  return (
    <div className="cart-content">
      {/* Delivery Type Selection (if not compact) */}
      {!compact && (
        <div className="delivery-toggle mb-4">
          <button
            className={cart.deliveryType === 'pickup' ? 'active' : ''}
            onClick={() => setDeliveryType('pickup')}
          >
            <i className="bi bi-shop"></i>
            <span>{t('order.pickup', 'Afhalen')}</span>
          </button>
          <button
            className={cart.deliveryType === 'delivery' ? 'active' : ''}
            onClick={() => setDeliveryType('delivery')}
          >
            <i className="bi bi-bicycle"></i>
            <span>{t('order.delivery', 'Bezorgen')}</span>
          </button>
        </div>
      )}

      {/* Cart Items */}
      <div className="cart-items">
        {cart.items.map(item => (
          <div key={item.id} className="cart-item">
            {/* Item Image (if available) */}
            {item.image && !item.image.includes('favicon') && (
              <div 
                className="cart-item-image"
                style={{ backgroundImage: `url(${item.image})` }}
              />
            )}
            
            {/* Item Details */}
            <div className="cart-item-details">
              <h6 className="cart-item-name">{item.name}</h6>
              <span className="cart-item-price">€{Number(item.price).toFixed(2)}</span>
              
              <div className="cart-item-controls">
                {/* Quantity Controls */}
                <div className="quantity-controls">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    aria-label={t('order.decrease', 'Verminder')}
                  >
                    <i className="bi bi-dash"></i>
                  </button>
                  <span className="quantity-value">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    aria-label={t('order.increase', 'Verhoog')}
                  >
                    <i className="bi bi-plus"></i>
                  </button>
                </div>
                
                {/* Subtotal */}
                <span className="cart-item-subtotal">
                  €{(Number(item.price) * item.quantity).toFixed(2)}
                </span>
                
                {/* Remove Button */}
                <button
                  className="cart-item-remove"
                  onClick={() => removeFromCart(item.id)}
                  aria-label={t('order.remove', 'Verwijder')}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Cart Totals */}
      <div className="cart-totals">
        <div className="cart-total-row subtotal">
          <span>{t('order.subtotal', 'Subtotaal')}</span>
          <span>€{subtotal.toFixed(2)}</span>
        </div>
        
        {cart.deliveryType === 'delivery' && cart.deliveryFee > 0 && (
          <div className="cart-total-row delivery">
            <span>{t('order.deliveryFee', 'Bezorgkosten')}</span>
            <span>€{cart.deliveryFee.toFixed(2)}</span>
          </div>
        )}
        
        {cart.deliveryType === 'pickup' && (
          <div className="cart-total-row delivery">
            <span>{t('order.pickupFee', 'Afhalen')}</span>
            <span className="text-success">{t('order.free', 'Gratis')}</span>
          </div>
        )}
        
        <div className="cart-total-row total">
          <span>{t('order.total', 'Totaal')}</span>
          <span className="text-golden">€{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Checkout Button */}
      {onCheckout && (
        <button
          className="btn btn-golden w-100 mt-4 py-3"
          onClick={onCheckout}
        >
          <i className="bi bi-lock me-2"></i>
          {t('order.checkout', 'Afrekenen')}
        </button>
      )}

      {/* Info Note */}
      <div className="order-note mt-3">
        <i className="bi bi-info-circle"></i>
        <span>
          {cart.deliveryType === 'delivery' 
            ? t('order.deliveryTime', 'Geschatte bezorgtijd: 30-45 min')
            : t('order.pickupTime', 'Geschatte afhaaltijd: 15-20 min')}
        </span>
      </div>
    </div>
  );
};

export default Cart;
