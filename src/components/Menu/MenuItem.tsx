import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { MenuItem as MenuItemType } from '../../types/menu';
import { useAllergens } from '../../hooks/useAllergens';
import { useMenuTranslation } from '../../utils/menuTranslations';
import { useAllergenTranslation } from '../../utils/allergenTranslations';

interface MenuItemProps {
  item: MenuItemType;
  category: string;
  onAllergenClick: (description: string) => void;
  index?: number;
}

const MenuItem = ({ item, category, onAllergenClick, index = 0 }: MenuItemProps) => {
  const { t } = useTranslation();
  const { translateMenuItem } = useMenuTranslation();
  const { translateAllergen } = useAllergenTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { getAllergenByCode } = useAllergens();
  
  const translatedItem = translateMenuItem(item);

  // Intersection Observer for entrance animation
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

  // Allergen color mapping (fallback if not in allergens.json)
  const allergenColors: Record<string, string> = {
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

  // Get allergen info from reference data or use item's allergen data
  const getEnhancedAllergenInfo = (allergen: { code: string; type: string; color: string; description: string }) => {
    const referenceAllergen = getAllergenByCode(allergen.code);
    if (referenceAllergen) {
      // Translate the reference allergen
      const translated = translateAllergen(referenceAllergen);
      // Use reference data if available, but keep item's description if it's more specific
      return {
        ...referenceAllergen,
        type: translated.type,
        description: allergen.description ? translateAllergen({ ...allergen, type: allergen.type, description: allergen.description }).description : translated.description,
        color: allergen.color || referenceAllergen.color,
      };
    }
    // Fallback to item's allergen data - translate it
    const translated = translateAllergen(allergen as any);
    return {
      ...allergen,
      type: translated.type,
      description: translated.description,
    };
  };

  // Handle placeholder items
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

  return (
    <div 
      ref={cardRef}
      className={`menu-item-modern filter-${category} col-12 col-md-6 col-lg-4 col-xl-3 mb-4`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: `opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="bg-black border border-warning rounded-3 overflow-hidden h-100 shadow-sm position-relative"
        style={{
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isHovered ? 'translateY(-12px) scale(1.02)' : 'translateY(0) scale(1)',
          boxShadow: isHovered 
            ? '0 20px 40px rgba(255, 193, 7, 0.3), 0 0 0 1px rgba(255, 193, 7, 0.5)' 
            : '0 4px 6px rgba(0, 0, 0, 0.1)',
          borderColor: isHovered ? 'rgba(255, 193, 7, 0.8)' : 'rgba(255, 193, 7, 0.3)',
        }}
      >
        {/* Shine effect overlay */}
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            background: 'linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
            transform: isHovered ? 'translateX(100%)' : 'translateX(-100%)',
            transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 3,
            pointerEvents: 'none',
          }}
        />

        {/* Glow effect */}
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            background: 'radial-gradient(circle at center, rgba(255, 193, 7, 0.15) 0%, transparent 70%)',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.5s ease',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />

        {/* Image with overlay */}
        <div className="position-relative" style={{ overflow: 'hidden', zIndex: 2 }}>
          <img
            className="w-100"
            style={{ 
              height: '220px', 
              objectFit: 'cover',
              transform: isHovered ? 'scale(1.15)' : 'scale(1)',
              transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            src={item.image.replace('assets/img', '/img')}
            alt={item.alt}
            loading="lazy"
          />
          {/* Image overlay gradient */}
          <div
            className="position-absolute bottom-0 start-0 w-100"
            style={{
              height: '60px',
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 100%)',
              opacity: isHovered ? 0.8 : 0.5,
              transition: 'opacity 0.4s ease',
              pointerEvents: 'none',
            }}
          />
          <div className="position-absolute top-0 end-0 m-3" style={{ zIndex: 4 }}>
            <span 
              className="badge bg-warning text-black fs-6 fw-bold px-3 py-2 rounded-pill"
              style={{
                transform: isHovered ? 'scale(1.15) rotate(5deg)' : 'scale(1) rotate(0deg)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isHovered 
                  ? '0 8px 20px rgba(255, 193, 7, 0.6), 0 0 0 3px rgba(255, 193, 7, 0.2)' 
                  : '0 2px 8px rgba(0, 0, 0, 0.3)',
                animation: isHovered ? 'pulse-badge 1.5s ease-in-out infinite' : 'none',
              }}
            >
              {item.price}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4" style={{ position: 'relative', zIndex: 2 }}>
          {/* Title */}
          <h5
            className="text-white fw-bold mb-3 lh-sm"
            style={{ 
              fontFamily: "'Playfair Display', serif", 
              minHeight: '2.5rem',
              transform: isHovered ? 'translateX(5px)' : 'translateX(0)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <a 
              href={`#${item.id}`} 
              className="text-decoration-none"
              style={{ 
                color: isHovered ? '#ffc107' : '#fff',
                transition: 'color 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'inline-block',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.textShadow = '0 0 10px rgba(255, 193, 7, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.textShadow = 'none';
              }}
            >
              {translatedItem.name}
            </a>
          </h5>

          {/* Description */}
          {translatedItem.description && (
            <p
              className="text-white-50 small mb-3 lh-base"
              style={{ 
                minHeight: '3rem',
                opacity: isHovered ? 1 : 0.8,
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              dangerouslySetInnerHTML={{ __html: translatedItem.description }}
            />
          )}

          {/* Allergen Section */}
          {item.allergens && item.allergens.length > 0 && (
            <div 
              className="border-top border-warning pt-3"
              style={{
                borderColor: isHovered ? 'rgba(255, 193, 7, 0.6)' : 'rgba(255, 193, 7, 0.3)',
                transition: 'border-color 0.4s ease',
              }}
            >
              <div 
                className="d-flex align-items-center mb-2"
                style={{
                  transform: isHovered ? 'translateX(3px)' : 'translateX(0)',
                  transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <i 
                  className="bi bi-info-circle text-warning me-2"
                  style={{
                    transform: isHovered ? 'scale(1.2) rotate(10deg)' : 'scale(1) rotate(0deg)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                ></i>
                <span className="small text-warning fw-medium">{t('menu.allergens')}</span>
              </div>
            <div className="d-flex flex-wrap gap-1 allergen-symbols mb-2">
              {item.allergens.map((allergen, allergenIndex) => {
                const enhancedAllergen = getEnhancedAllergenInfo(allergen);
                const bgColor = allergenColors[enhancedAllergen.color] || '#dc3545';
                const textColor = enhancedAllergen.color === 'yellow' || enhancedAllergen.color === 'amber' ? '#000' : '#fff';
                return (
                  <span
                    key={`${allergen.code}-${allergenIndex}`}
                    className={`allergen-symbol allergen-${enhancedAllergen.color} badge rounded-circle d-inline-flex align-items-center justify-content-center fw-bold`}
                    onClick={() => onAllergenClick(enhancedAllergen.description)}
                    title={`${enhancedAllergen.type}: ${enhancedAllergen.description}`}
                    style={{
                      background: `${bgColor} !important`,
                      color: `${textColor} !important`,
                      border: `2px solid ${bgColor} !important`,
                      width: '28px',
                      height: '28px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: `all 0.3s cubic-bezier(0.4, 0, 0.2, 1) ${allergenIndex * 0.05}s`,
                      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.3) rotate(10deg)';
                      e.currentTarget.style.boxShadow = `0 0 15px ${bgColor}, 0 0 25px ${bgColor}`;
                      e.currentTarget.style.zIndex = '10';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = isHovered ? 'scale(1.05)' : 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.zIndex = '1';
                    }}
                  >
                    {enhancedAllergen.code}
                  </span>
                );
              })}
            </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes pulse-badge {
          0%, 100% {
            transform: scale(1.15) rotate(5deg);
          }
          50% {
            transform: scale(1.25) rotate(-5deg);
          }
        }
      `}</style>
    </div>
  );
};

export default MenuItem;

