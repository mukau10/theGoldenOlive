import { useState, useEffect, useRef } from 'react';
import AOS from 'aos';
import { useTranslation } from 'react-i18next';
import { useMenu } from '../../hooks/useMenu';
import type { MenuCategory } from '../../types/menu';
import { categoryInfoMap, sortMenuCategories } from '../../utils/categoryInfo';
import MenuItem from './MenuItem';
import MenuCategoryCarousel from './MenuCategoryCarousel';
import CategorySelectorModal from './CategorySelectorModal';
import { translateCategory, translateCategoryDescription, useMenuTranslation } from '../../utils/menuTranslations';

const Menu = () => {
  const { t } = useTranslation();
  const { menuData, loading, error } = useMenu();
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | '*'>('*');
  const [showAllergenPopup, setShowAllergenPopup] = useState(false);
  const [allergenDescription, setAllergenDescription] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isMenuSectionVisible, setIsMenuSectionVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (selectedCategory !== '*') {
      // Small delay to ensure menu items are rendered
      setTimeout(() => {
        // Try to find the first menu item card
        const firstMenuItem = document.querySelector('#menu-items-container .menu-item-modern');
        if (firstMenuItem) {
          // Calculate position with offset to show the card fully from the beginning
          const cardRect = firstMenuItem.getBoundingClientRect();
          const scrollOffset = 120; // Offset to account for fixed headers/spacing and show card fully
          const targetPosition = window.scrollY + cardRect.top - scrollOffset;
          
          window.scrollTo({
            top: Math.max(0, targetPosition), // Ensure we don't scroll to negative position
            behavior: 'smooth'
          });
        } else {
          // Fallback to menu items container
          const menuItemsContainer = document.getElementById('menu-items-container');
          if (menuItemsContainer) {
            const containerRect = menuItemsContainer.getBoundingClientRect();
            const scrollOffset = 120;
            const targetPosition = window.scrollY + containerRect.top - scrollOffset;
            
            window.scrollTo({
              top: Math.max(0, targetPosition),
              behavior: 'smooth'
            });
          } else {
            // Final fallback to menu section
            const menuSection = document.getElementById('menu');
            if (menuSection) {
              const sectionRect = menuSection.getBoundingClientRect();
              const scrollOffset = 120;
              const targetPosition = window.scrollY + sectionRect.top - scrollOffset;
              
              window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: 'smooth'
              });
            }
          }
        }
      }, 100);
    }
  }, [selectedCategory]);

  // Track menu section visibility for floating button
  useEffect(() => {
    const menuSection = menuSectionRef.current || document.getElementById('menu');
    if (!menuSection) return;

    // Check visibility - show button as soon as menu section enters viewport
    const checkVisibility = () => {
      const rect = menuSection.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      // Show button when menu section top is visible in viewport (even if just a small part)
      const isVisible = rect.top < windowHeight && rect.bottom > 0;
      setIsMenuSectionVisible(isVisible);
    };

    // Check immediately on mount
    checkVisibility();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Show button immediately when menu section enters viewport (any part visible)
          setIsMenuSectionVisible(entry.isIntersecting);
        });
      },
      {
        threshold: 0, // Trigger as soon as any part of the element is visible
        rootMargin: '0px', // No margin - trigger immediately when entering viewport
      }
    );

    observer.observe(menuSection);

    // Also check on scroll for immediate responsiveness
    const handleScroll = () => {
      checkVisibility();
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Re-scan AOS after menu data loads (content mounts after initial AOS init on /menu)
  useEffect(() => {
    if (!loading && menuData) {
      const timer = setTimeout(() => {
        try {
          AOS.refresh();
        } catch (error) {
          console.error('Failed to refresh AOS for menu:', error);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [loading, menuData]);

  const handleAllergenClick = (description: string) => {
    setAllergenDescription(description);
    setShowAllergenPopup(true);
  };

  const handleCategorySelect = (category: MenuCategory | '*') => {
    setSearchQuery('');
    setSelectedCategory(category);
  };

  const categories: MenuCategory[] = menuData
    ? sortMenuCategories(Object.keys(menuData) as MenuCategory[])
    : [];

  // Search functionality
  const { translateMenuItem } = useMenuTranslation();
  
  const filteredItems = () => {
    if (!menuData) return [];
    
    let items: Array<{ item: any; category: MenuCategory; isHeader?: boolean }> = [];
    
    // If search query exists, search across all items
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      categories.forEach((category) => {
        const categoryItems = menuData[category];
        if (categoryItems && categoryItems.length > 0) {
          categoryItems.forEach((item) => {
            const translated = translateMenuItem(item);
            const searchText = `${translated.name} ${translated.description} ${item.price || ''}`.toLowerCase();
            if (searchText.includes(query)) {
              items.push({ item, category, isHeader: false });
            }
          });
        }
      });
      return items;
    }
    
    // Normal category filtering
    if (selectedCategory === '*') {
      // Show all categories with headers
      categories.forEach((category) => {
        const categoryItems = menuData[category];
        if (categoryItems && categoryItems.length > 0) {
          // Add category header
          items.push({ item: null as any, category, isHeader: true });
          // Add category items
          categoryItems.forEach((item) => {
            items.push({ item, category, isHeader: false });
          });
        }
      });
      return items;
    }
    // When a specific category is selected, show all items including placeholder
    if (menuData[selectedCategory]) {
      return menuData[selectedCategory].map((item) => ({ item, category: selectedCategory, isHeader: false }));
    }
    return [];
  };

  if (loading) {
    return (
      <section id="menu" className="py-5 bg-dark-custom">
        <div className="container-fluid px-4">
          <div className="text-center">
            <div className="spinner-border text-warning" role="status">
              <span className="visually-hidden">{t('menu.loading')}</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error || !menuData) {
    return (
      <section id="menu" className="py-5 bg-dark-custom">
        <div className="container-fluid px-4">
          <div className="text-center">
            <p className="text-white">{t('menu.error')}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="menu" ref={menuSectionRef} className="py-5 bg-dark-custom">
      <div className="container-fluid px-4" data-aos="fade-up">
        <div className="text-center mb-4 mb-md-5">
          <h2 id="menu-heading" className="display-4 display-md-3 fw-bold text-warning mb-2 mb-md-3" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.75rem, 5vw, 3rem)' }}>
            <i className="bi bi-journal-bookmark text-warning me-2 me-md-3" style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)' }}></i>{t('menu.title')}
          </h2>
          <p className="fs-6 fs-md-5 text-white mb-3 mb-md-4 opacity-75" style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.25rem)' }}>{t('menu.subtitle')}</p>
          
          {/* Search Bar */}
          <div className="row justify-content-center mb-4">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control form-control-lg bg-black border-warning text-white"
                  placeholder={t('menu.searchPlaceholder') || 'Zoek in menu...'}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (e.target.value) {
                      setSelectedCategory('*'); // Reset category when searching
                    }
                  }}
                  style={{
                    borderRadius: '50px',
                    paddingLeft: '3rem',
                    paddingRight: searchQuery ? '3rem' : '1.5rem',
                    fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                    border: '2px solid var(--bs-golden)',
                    boxShadow: '0 4px 16px rgba(192, 187, 175, 0.2)',
                  }}
                />
                <i className="bi bi-search text-warning position-absolute" style={{ left: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}></i>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="btn btn-link text-warning position-absolute p-0"
                    style={{ right: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}
                    aria-label={t('common.close') || 'Sluiten'}
                  >
                    <i className="bi bi-x-circle"></i>
                  </button>
                )}
              </div>
              {searchQuery && (
                <div className="mt-2">
                  <small className="text-white-50">
                    {filteredItems().length} {t('menu.searchResults') || 'resultaten gevonden'}
                  </small>
                </div>
              )}
            </div>
          </div>

          <div className="row justify-content-center">
            <div className="col-12 col-md-8">
              <div className="bg-black border border-warning rounded-pill p-2 p-md-3 d-flex align-items-center justify-content-center flex-wrap gap-2">
                <i className="bi bi-info-circle text-warning" style={{ fontSize: 'clamp(0.9rem, 2vw, 1rem)' }}></i>
                <span className="text-warning small fw-medium" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>{t('menu.clickAllergens')}</span>
                <span className="text-white-50 small d-none d-sm-inline" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>|</span>
                <a href="/allergenen" className="text-warning small text-decoration-none" style={{ fontSize: 'clamp(0.75rem, 2vw, 0.875rem)' }}>
                  <i className="bi bi-shield-exclamation me-1"></i>{t('menu.extendedAllergenInfo')}
                </a>
              </div>
            </div>
          </div>
        </div>

        <MenuCategoryCarousel
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
        />

        {/* Menu Items */}
        <div id="menu-items-container" className="row g-4">
          {filteredItems().map(({ item, category, isHeader }, index) => {
            if (isHeader) {
              const info = categoryInfoMap[category];
              if (!info) return null;
              return (
                <div key={`header-${category}`} className="col-12">
                  <div
                    className="category-header d-flex align-items-center justify-content-center py-5 mb-4 mt-5"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 193, 7, 0.05))',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 193, 7, 0.2)',
                    }}
                  >
                    <div className="text-center" style={{ maxWidth: '600px' }}>
                      <div className="d-flex align-items-center justify-content-center mb-4">
                        <div className="bg-warning opacity-50" style={{ width: '60px', height: '1px' }}></div>
                        <div
                          className="mx-3 bg-dark border border-warning rounded-circle d-flex align-items-center justify-content-center"
                          style={{ 
                            width: 'clamp(64px, 16vw, 48px)', 
                            height: 'clamp(64px, 16vw, 48px)' 
                          }}
                        >
                          {(() => {
                            const IconComponent = info.icon;
                            return (
                              <IconComponent 
                                className="text-warning" 
                                style={{ 
                                  fontSize: 'clamp(2rem, 10vw, 1.5rem)' 
                                }} 
                              />
                            );
                          })()}
                        </div>
                        <div className="bg-warning opacity-50" style={{ width: '60px', height: '1px' }}></div>
                      </div>
                      <h3
                        className="display-6 fw-bold text-warning mb-2"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {translateCategory(category, t)}
                      </h3>
                      <p className="text-white-50 small">{translateCategoryDescription(category, t)}</p>
                    </div>
                  </div>
                </div>
              );
            }
            // Calculate item index (excluding headers) for staggered animation
            const itemIndex = filteredItems()
              .slice(0, index)
              .filter(({ isHeader }) => !isHeader).length;
            return (
              <MenuItem
                key={`${category}-${item.id}-${index}`}
                item={item}
                category={category}
                onAllergenClick={handleAllergenClick}
                index={itemIndex}
              />
            );
          })}
        </div>
      </div>

      {/* Allergen Popup */}
      {showAllergenPopup && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 10000,
            padding: '1rem',
          }}
          onClick={() => setShowAllergenPopup(false)}
        >
          <div
            className="bg-dark border border-warning rounded-3 p-4"
            style={{ maxWidth: '400px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="text-warning mb-0">
                <i className="bi bi-shield-exclamation me-2"></i>{t('menu.allergenInfo')}
              </h6>
              <button
                className="btn-close btn-close-white"
                onClick={() => setShowAllergenPopup(false)}
                aria-label="Close"
              ></button>
            </div>
            <p className="text-white mb-0">{allergenDescription}</p>
            <div className="mt-3 text-center">
              <button
                className="btn btn-warning btn-sm px-3 py-2 rounded-pill"
                onClick={() => setShowAllergenPopup(false)}
              >
                <i className="bi bi-check-circle me-1"></i>{t('menu.understood')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Selector - Floating Button - Only show when menu section is visible */}
      {isMenuSectionVisible && (
        <div
          className="position-fixed"
          style={{
            bottom: '20px',
            right: '20px',
            zIndex: 9997,
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
        {/* Pulse Animation Ring */}
        <div
          className="position-absolute rounded-circle"
          style={{
            width: '64px',
            height: '64px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 193, 7, 0.3)',
            animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            pointerEvents: 'none',
          }}
        />
        <style>{`
          @keyframes pulse-ring {
            0% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(-50%, -50%) scale(1.5);
              opacity: 0;
            }
          }
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: scale(0.8);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          .menu-button-tooltip {
            position: absolute;
            bottom: calc(100% + 12px);
            right: 0;
            background: rgba(0, 0, 0, 0.95);
            color: #ffc107;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 0.875rem;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 193, 7, 0.3);
            border: 1px solid rgba(255, 193, 7, 0.3);
          }
          @media (max-width: 767.98px) {
            .menu-button-tooltip {
              opacity: 1 !important;
            }
          }
          .menu-button-tooltip::after {
            content: '';
            position: absolute;
            top: 100%;
            right: 20px;
            border: 6px solid transparent;
            border-top-color: rgba(0, 0, 0, 0.95);
          }
          .menu-button-tooltip::before {
            content: '';
            position: absolute;
            top: 100%;
            right: 19px;
            border: 7px solid transparent;
            border-top-color: rgba(255, 193, 7, 0.3);
            z-index: -1;
          }
          .menu-button-wrapper:hover .menu-button-tooltip {
            opacity: 1;
          }
        `}</style>
        <div className="menu-button-wrapper position-relative">
          <div 
            className="menu-button-tooltip"
            style={{ opacity: showTooltip ? 1 : undefined }}
          >
            {t('menu.showCategories')}
          </div>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="btn btn-warning rounded-circle shadow-lg border-0 d-flex align-items-center justify-content-center position-relative"
            style={{
              width: '64px',
              height: '64px',
              boxShadow: '0 4px 20px rgba(255, 193, 7, 0.4), 0 0 0 4px rgba(255, 193, 7, 0.1)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
              setShowTooltip(true);
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 30px rgba(255, 193, 7, 0.6), 0 0 0 6px rgba(255, 193, 7, 0.2)';
              setShowTooltip(true);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 193, 7, 0.4), 0 0 0 4px rgba(255, 193, 7, 0.1)';
              setShowTooltip(false);
            }}
            aria-label={t('menu.showCategories')}
          >
            <i className="bi bi-grid-3x3-gap text-black fs-3"></i>
          </button>
        </div>
      </div>
      )}

      {/* Category Selector Modal */}
      <CategorySelectorModal
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
      />
    </section>
  );
};

export default Menu;

