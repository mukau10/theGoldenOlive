/**
 * Order Page Component - Modern Premium Design
 * The Golden Olive - Premium Food Ordering Experience
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { useOrder, OrderProvider } from './OrderContext';
import CartButton from './CartButton';
import Checkout from './Checkout';
import Footer from '../Footer/Footer';
import './Order.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category_name: string;
  category_slug: string;
  allergens: Array<{ code: string; type: string; color: string }>;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  products: Product[];
}

// Allergen color mapping
const allergenColors: Record<string, string> = {
  G: '#dc3545',    // Gluten - red
  M: '#0d6efd',    // Milk - blue
  E: '#fd7e14',    // Eggs - amber
  F: '#198754',    // Fish - green
  S: '#fd7e14',    // Shellfish - orange
  N: '#6f42c1',    // Tree nuts - purple
  P: '#20c997',    // Peanuts - teal
  So: '#198754',   // Soy - green
  Se: '#6f42c1',   // Sesame - purple
  C: '#0dcaf0',    // Celery - cyan
  Mu: '#ffc107',   // Mustard - yellow
  L: '#6c757d',    // Lupin - gray
  Mo: '#adb5bd',   // Molluscs - light gray
  Su: '#e83e8c',   // Sulphites - pink
};

// Allergen full names in Dutch
const allergenNames: Record<string, string> = {
  G: 'Gluten',
  M: 'Melk',
  E: 'Eieren',
  F: 'Vis',
  S: 'Schaaldieren',
  N: 'Noten',
  P: 'Pinda\'s',
  So: 'Soja',
  Se: 'Sesamzaad',
  C: 'Selderij',
  Mu: 'Mosterd',
  L: 'Lupine',
  Mo: 'Weekdieren',
  Su: 'Sulfiet',
};

// Product Detail Modal Component
const ProductDetailModal: React.FC<{
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  isAdded: boolean;
}> = ({ product, onClose, onAddToCart, isAdded }) => {
  const { t } = useTranslation();
  
  if (!product) return null;
  
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  const handleAddAndClose = () => {
    onAddToCart(product);
  };
  
  return (
    <div className="product-modal-backdrop" onClick={handleBackdropClick}>
      <div className="product-modal">
        {/* Close Button */}
        <button className="product-modal-close" onClick={onClose} aria-label={t('common.close', 'Sluiten')}>
          <i className="bi bi-x-lg"></i>
        </button>
        
        {/* Product Image */}
        <div className="product-modal-image-container">
          {product.image_url && !product.image_url.includes('favicon') ? (
            <img 
              src={product.image_url}
              alt={product.name}
              className="product-modal-image"
            />
          ) : (
            <div className="product-modal-image-placeholder">
              <i className="bi bi-image"></i>
            </div>
          )}
        </div>
        
        {/* Product Content */}
        <div className="product-modal-content">
          <h3 className="product-modal-title">{product.name}</h3>
          
          {product.description && (
            <p className="product-modal-description">{product.description}</p>
          )}
          
          <div className="product-modal-price">
            €{parseFloat(String(product.price)).toFixed(2)}
          </div>
          
          {/* Allergens Section */}
          {product.allergens && product.allergens.length > 0 && (
            <div className="product-modal-allergens">
              <h6 className="allergens-title">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {t('order.allergenInfo', 'Allergenen informatie')}
              </h6>
              <div className="allergens-list">
                {product.allergens.map(allergen => (
                  <div key={allergen.code} className="allergen-item">
                    <span 
                      className="allergen-code"
                      style={{ backgroundColor: allergenColors[allergen.code] || '#6c757d' }}
                    >
                      {allergen.code}
                    </span>
                    <span className="allergen-name">
                      {allergenNames[allergen.code] || allergen.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* No Allergens Message */}
          {(!product.allergens || product.allergens.length === 0) && (
            <div className="product-modal-no-allergens">
              <i className="bi bi-check-circle me-2"></i>
              {t('order.noAllergens', 'Geen bekende allergenen')}
            </div>
          )}
          
          {/* Add to Cart Button */}
          <button
            className={`product-modal-add-btn ${isAdded ? 'added' : ''}`}
            onClick={handleAddAndClose}
          >
            {isAdded ? (
              <>
                <i className="bi bi-check-lg me-2"></i>
                {t('order.addedToCart', 'Toegevoegd aan bestelling')}
              </>
            ) : (
              <>
                <i className="bi bi-bag-plus me-2"></i>
                {t('order.addToCart', 'Toevoegen aan bestelling')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const OrderPageContent: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { addToCart, cart, setDeliveryType } = useOrder();
  
  const [view, setView] = useState<'menu' | 'checkout' | 'success'>('menu');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Check for success redirect
  useEffect(() => {
    const order = searchParams.get('order');
    if (order && searchParams.get('success') !== null) {
      setOrderNumber(order);
      setView('success');
    }
  }, [searchParams]);

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch(`${API_URL}/products/grouped`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || 'Fout bij laden');
        }
        
        setCategories(data.data);
        if (data.data.length > 0) {
          setSelectedCategory(data.data[0].slug);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Er is een fout opgetreden');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const handleAddToCart = useCallback((product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: parseFloat(String(product.price)),
      image: product.image_url
    });
    
    // Visual feedback
    setAddedItems(prev => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedItems(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 1500);
  }, [addToCart]);

  // Navigation Header Component
  const OrderHeader = () => (
    <header className="order-nav-header">
      <div className="container">
        <div className="order-nav-content">
          <Link to="/" className="order-nav-home" aria-label={t('order.backToWebsite', 'Terug naar website')}>
            <i className="bi bi-arrow-left"></i>
            <span className="d-none d-sm-inline">{t('order.backToWebsite', 'Website')}</span>
          </Link>
          <Link to="/" className="order-nav-logo">
            <img src="/img/logo.png" alt="The Golden Olive" />
          </Link>
          {/* Spacer for cart button alignment */}
          <div className="order-nav-spacer"></div>
        </div>
      </div>
    </header>
  );

  // Success View
  if (view === 'success') {
    return (
      <>
        <div className="order-page order-page-success">
          <OrderHeader />
          <main className="order-main">
            <div className="container">
              <div className="success-card">
                <div className="success-icon-wrapper">
                  <div className="success-icon-bg"></div>
                  <i className="bi bi-check-lg success-icon"></i>
                </div>
                <h1 className="success-title">{t('order.thankYou', 'Bedankt!')}</h1>
                <p className="success-subtitle">{t('order.successMessage', 'Je bestelling is succesvol ontvangen en wordt voorbereid.')}</p>
                {orderNumber && (
                  <div className="order-number-card">
                    <span className="order-number-label">{t('order.orderNumber', 'Bestelnummer')}</span>
                    <span className="order-number-value">{orderNumber}</span>
                  </div>
                )}
                <div className="success-info">
                  <i className="bi bi-envelope-check"></i>
                  <span>{t('order.confirmationEmail', 'Je ontvangt een bevestiging per e-mail.')}</span>
                </div>
                <Link to="/bestellen" className="success-btn" onClick={() => { setView('menu'); setOrderNumber(null); }}>
                  <i className="bi bi-arrow-left"></i>
                  {t('order.backToMenu', 'Terug naar Menu')}
                </Link>
              </div>
            </div>
          </main>
        </div>
        <Footer />
      </>
    );
  }

  // Checkout View
  if (view === 'checkout') {
    return (
      <>
        <div className="order-page order-page-checkout">
          <OrderHeader />
          <main className="order-main">
            <div className="container">
              <div className="checkout-header">
                <button className="back-to-menu-btn" onClick={() => setView('menu')}>
                  <i className="bi bi-arrow-left"></i>
                  <span>{t('order.backToMenu', 'Terug naar Menu')}</span>
                </button>
                <h1 className="checkout-title">{t('order.checkout', 'Afrekenen')}</h1>
              </div>
              <Checkout
                onBack={() => setView('menu')}
                onSuccess={(num) => {
                  setOrderNumber(num);
                  setView('success');
                }}
              />
            </div>
          </main>
        </div>
        <Footer />
      </>
    );
  }

  // Menu View
  return (
    <>
      <div className="order-page order-page-menu">
        <OrderHeader />
        <main className="order-main">
          {/* Hero Section */}
          <div className="order-hero">
            <div className="container">
              <h1 className="order-hero-title">{t('order.orderOnline', 'Online Bestellen')}</h1>
              <p className="order-hero-subtitle">
                {cart.deliveryType === 'delivery' 
                  ? t('order.deliveryInfo', 'Bezorging in Antwerpen en omgeving')
                  : t('order.pickupInfo', 'Afhalen bij ons restaurant')}
              </p>
            </div>
          </div>
          
          <div className="container">

        {/* Delivery Type Toggle */}
        <div className="delivery-toggle">
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

        {loading ? (
          <div className="order-loading">
            <div className="spinner-border text-warning" role="status">
              <span className="visually-hidden">Laden...</span>
            </div>
            <p className="text-muted">{t('order.loadingMenu', 'Menu laden...')}</p>
          </div>
        ) : error ? (
          <div className="order-error">
            <i className="bi bi-exclamation-triangle"></i>
            <h5 className="text-white">{t('order.errorTitle', 'Oeps!')}</h5>
            <p className="text-muted">{error}</p>
            <button 
              className="btn btn-outline-golden mt-3"
              onClick={() => window.location.reload()}
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              {t('order.retry', 'Opnieuw proberen')}
            </button>
          </div>
        ) : (
          <>
            {/* Category Navigation - Filter out unavailable categories */}
            <div className="category-nav">
              <div className="category-pills">
                {categories
                  .filter(cat => cat.slug !== 'warme-dranken' && cat.slug !== 'mocktails')
                  .map(cat => (
                    <button
                      key={cat.slug}
                      className={`category-pill ${selectedCategory === cat.slug ? 'active' : ''}`}
                      onClick={() => setSelectedCategory(cat.slug)}
                    >
                      {cat.name}
                    </button>
                  ))}
              </div>
            </div>

            {/* Products Grid - Filter out unavailable categories */}
            {categories
              .filter(cat => cat.slug !== 'warme-dranken' && cat.slug !== 'mocktails')
              .filter(cat => !selectedCategory || cat.slug === selectedCategory)
              .map(category => (
                <div key={category.slug} className="category-section">
                  {!selectedCategory && (
                    <h3 className="category-section-title">{category.name}</h3>
                  )}
                  
                  {/* Frisdranken: Compact List View */}
                  {category.slug === 'frisdranken' ? (
                    <div className="drinks-list">
                      {category.products.map(product => (
                        <div key={product.id} className="drink-item">
                          <div className="drink-info">
                            <span className="drink-name">{product.name}</span>
                            {product.description && (
                              <span className="drink-description">{product.description}</span>
                            )}
                          </div>
                          <div className="drink-actions">
                            <span className="drink-price">
                              €{parseFloat(String(product.price)).toFixed(2)}
                            </span>
                            <button
                              className={`drink-add-btn ${addedItems.has(product.id) ? 'added' : ''}`}
                              onClick={() => handleAddToCart(product)}
                              aria-label={t('order.addToCart', 'Toevoegen')}
                            >
                              <i className={addedItems.has(product.id) ? 'bi bi-check' : 'bi bi-plus-lg'}></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Regular Products: Card Grid View */
                    <div className="products-grid">
                      {category.products.map(product => (
                        <div 
                          key={product.id} 
                          className="product-card-order clickable"
                          onClick={() => setSelectedProduct(product)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedProduct(product)}
                        >
                          {/* Product Image */}
                          {product.image_url && !product.image_url.includes('favicon') ? (
                            <div 
                              className="product-image"
                              style={{ backgroundImage: `url(${product.image_url})` }}
                            />
                          ) : (
                            <div className="product-image no-image">
                              <i className="bi bi-image"></i>
                            </div>
                          )}
                          
                          {/* Product Info */}
                          <div className="product-info">
                            <div>
                              <h6 className="product-name">{product.name}</h6>
                              {product.description && (
                                <p className="product-description">{product.description}</p>
                              )}
                            </div>
                            
                            <div className="product-footer">
                              <div>
                                <span className="product-price">
                                  €{parseFloat(String(product.price)).toFixed(2)}
                                </span>
                                {product.allergens && product.allergens.length > 0 && (
                                  <div className="allergens-badges mt-1">
                                    {product.allergens.slice(0, 3).map(a => (
                                      <span key={a.code} className="allergen-badge" title={a.type}>
                                        {a.code}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              <button
                                className={`add-to-cart-btn compact ${addedItems.has(product.id) ? 'added' : ''}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToCart(product);
                                }}
                                aria-label={t('order.addToCart', 'Toevoegen')}
                              >
                                <i className={addedItems.has(product.id) ? 'bi bi-check' : 'bi bi-plus'}></i>
                                <span>{addedItems.has(product.id) ? t('order.added', 'Toegevoegd!') : t('order.add', 'Toevoegen')}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </>
        )}
          </div>
        </main>

        {/* Product Detail Modal */}
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
            isAdded={addedItems.has(selectedProduct.id)}
          />
        )}

        {/* Cart Button */}
        <CartButton onCheckout={() => setView('checkout')} />
      </div>
      <Footer />
    </>
  );
};

// Wrapped with Provider
const OrderPage: React.FC = () => {
  return (
    <OrderProvider>
      <OrderPageContent />
    </OrderProvider>
  );
};

export default OrderPage;
