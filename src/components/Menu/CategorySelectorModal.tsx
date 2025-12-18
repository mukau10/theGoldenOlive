import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuCategory } from '../../types/menu';
import { categoryInfoMap } from '../../utils/categoryInfo';
import type { IconType } from 'react-icons';
import { BiGridAlt } from 'react-icons/bi';
import { translateCategory, translateCategoryDescription } from '../../utils/menuTranslations';

interface CategorySelectorModalProps {
  categories: MenuCategory[];
  selectedCategory: MenuCategory | '*';
  onSelectCategory: (category: MenuCategory | '*') => void;
  isOpen: boolean;
  onClose: () => void;
}

const CategorySelectorModal = ({
  categories,
  selectedCategory,
  onSelectCategory,
  isOpen,
  onClose,
}: CategorySelectorModalProps) => {
  const { t } = useTranslation();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleCategorySelect = (category: MenuCategory | '*') => {
    onSelectCategory(category);
    handleClose();
    // Scroll to menu items after a short delay
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
    }, 300);
  };

  if (!isOpen && !isClosing) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`position-fixed top-0 start-0 w-100 h-100 ${
          isOpen && !isClosing ? 'd-block' : 'd-none'
        }`}
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 9998,
          transition: 'opacity 0.3s ease',
          opacity: isClosing ? 0 : 1,
          pointerEvents: 'auto',
        }}
        onClick={handleClose}
        onTouchEnd={(e) => {
          // Only close if clicking directly on backdrop, not if event bubbled from modal
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      />

      {/* Modal */}
      <div
        className={`position-fixed d-md-none ${
          isOpen && !isClosing ? 'd-block' : 'd-none'
        }`}
        style={{
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          transform: isClosing ? 'translateY(100%)' : 'translateY(0)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div
          className="bg-dark border-top border-warning rounded-top-4"
          style={{
            borderWidth: '2px',
            maxHeight: '85vh',
            boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.5)',
            touchAction: 'pan-y',
          }}
        >
          {/* Header */}
          <div
            className="d-flex align-items-center justify-content-between p-4 border-bottom border-warning"
            style={{ borderWidth: '1px', touchAction: 'manipulation' }}
          >
            <div className="d-flex align-items-center">
              <div
                className="bg-warning rounded-circle d-flex align-items-center justify-content-center me-3"
                style={{ width: '40px', height: '40px' }}
              >
                <i className="bi bi-grid-3x3-gap text-black fs-5"></i>
              </div>
              <div>
                <h4 className="text-warning fw-bold mb-0" style={{ fontSize: '1.25rem' }}>
                  {t('menu.chooseCategory')}
                </h4>
                <small className="text-white-50">{t('menu.selectCategory')}</small>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="btn-close btn-close-white"
              aria-label={t('common.close')}
              style={{ fontSize: '1.2rem', touchAction: 'manipulation' }}
            ></button>
          </div>

          {/* Categories List */}
          <div
            className="p-3"
            style={{
              maxHeight: 'calc(85vh - 100px)',
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255, 193, 7, 0.5) transparent',
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
              overscrollBehavior: 'contain',
            }}
          >
            <style>{`
              div::-webkit-scrollbar {
                width: 6px;
              }
              div::-webkit-scrollbar-track {
                background: transparent;
              }
              div::-webkit-scrollbar-thumb {
                background: rgba(255, 193, 7, 0.5);
                border-radius: 3px;
              }
              div::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 193, 7, 0.7);
              }
            `}</style>
            {/* All Categories Option */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCategorySelect('*');
              }}
              className={`w-100 text-start p-3 mb-2 rounded-3 border-0 ${
                selectedCategory === '*'
                  ? 'bg-warning text-black'
                  : 'bg-dark text-white border border-warning'
              }`}
              style={{
                transition: 'all 0.3s ease',
                fontSize: '1rem',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                cursor: 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== '*') {
                  e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.5)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== '*') {
                  e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 1)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              <div className="d-flex align-items-center">
                <div
                  className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${
                    selectedCategory === '*'
                      ? 'bg-black text-warning'
                      : 'bg-warning text-black'
                  }`}
                  style={{ 
                    width: 'clamp(64px, 16vw, 48px)', 
                    height: 'clamp(64px, 16vw, 48px)', 
                    minWidth: 'clamp(64px, 16vw, 48px)' 
                  }}
                >
                  <BiGridAlt 
                    style={{ 
                      fontSize: 'clamp(2rem, 10vw, 1.25rem)' 
                    }} 
                  />
                </div>
                <div className="flex-grow-1">
                  <div className="fw-bold mb-1">{t('menu.allCategories')}</div>
                  <small className={selectedCategory === '*' ? 'text-black-50' : 'text-white-50'}>
                    {t('menu.completeMenu')}
                  </small>
                </div>
                {selectedCategory === '*' && (
                  <i className="bi bi-check-circle-fill fs-4"></i>
                )}
              </div>
            </button>

            {/* Category Options */}
            {categories.map((category) => {
              const info = categoryInfoMap[category];
              if (!info) return null;

              const isSelected = selectedCategory === category;

              return (
                <button
                  key={category}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCategorySelect(category);
                  }}
                  className={`w-100 text-start p-3 mb-2 rounded-3 border-0 ${
                    isSelected
                      ? 'bg-warning text-black'
                      : 'bg-dark text-white border border-warning'
                  }`}
                  style={{
                    transition: 'all 0.3s ease',
                    fontSize: '1rem',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    cursor: 'pointer',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 0.5)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'rgba(255, 193, 7, 1)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  <div className="d-flex align-items-center">
                    <div
                      className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${
                        isSelected ? 'bg-black text-warning' : 'bg-warning text-black'
                      }`}
                      style={{ 
                        width: 'clamp(64px, 16vw, 48px)', 
                        height: 'clamp(64px, 16vw, 48px)', 
                        minWidth: 'clamp(64px, 16vw, 48px)' 
                      }}
                    >
                      {(() => {
                        const IconComponent = info.icon as IconType;
                        return (
                          <IconComponent 
                            style={{ 
                              fontSize: 'clamp(2rem, 10vw, 1.25rem)' 
                            }} 
                          />
                        );
                      })()}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold mb-1">{translateCategory(category, t)}</div>
                      <small className={isSelected ? 'text-black-50' : 'text-white-50'}>
                        {translateCategoryDescription(category, t)}
                      </small>
                    </div>
                    {isSelected && <i className="bi bi-check-circle-fill fs-4"></i>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default CategorySelectorModal;

