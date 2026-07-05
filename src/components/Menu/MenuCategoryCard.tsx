import type { IconType } from 'react-icons';

interface MenuCategoryCardProps {
  filter: string;
  icon: IconType;
  title: string;
  subtitle: string;
  isActive: boolean;
  onClick: () => void;
  variant?: 'default' | 'carousel';
}

const MenuCategoryCard = ({
  icon: IconComponent,
  title,
  subtitle,
  isActive,
  onClick,
  variant = 'default',
}: MenuCategoryCardProps) => {
  const isCarousel = variant === 'carousel';

  return (
    <div
      className={`menu-category-card-enhanced text-center position-relative overflow-hidden ${
        isCarousel ? 'menu-category-card-carousel' : ''
      } ${
        isActive
          ? 'menu-category-card-active'
          : 'menu-category-card-inactive'
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Background gradient overlay */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{
          background: isActive
            ? 'linear-gradient(135deg, #ffc107 0%, #ffb300 50%, #ffa000 100%)'
            : 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 100%)',
          opacity: 1,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 0,
        }}
      />
      
      {/* Shine effect */}
      <div
        className="menu-category-shine position-absolute top-0 start-0 w-100 h-100"
        style={{
          background: 'linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)',
          transform: 'translateX(-100%)',
          transition: 'transform 0.6s ease',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {isCarousel && (
        <>
          <IconComponent
            className="menu-category-card-carousel-bg-icon"
            aria-hidden="true"
          />
          <div className="menu-category-card-carousel-scrim" aria-hidden="true" />
        </>
      )}

      {/* Content */}
      <div
        className={`position-relative h-100 ${
          isCarousel
            ? 'menu-category-card-carousel-content d-flex align-items-end p-2'
            : 'd-flex flex-column justify-content-center align-items-center p-4'
        }`}
        style={{ zIndex: 2, minHeight: isCarousel ? undefined : '160px' }}
      >
        {!isCarousel && (
          <div className="position-relative mb-3">
            <div
              className="position-absolute top-50 start-50 translate-middle rounded-circle"
              style={{
                width: 'clamp(100px, 25vw, 70px)',
                height: 'clamp(100px, 25vw, 70px)',
                background: isActive
                  ? 'rgba(0, 0, 0, 0.1)'
                  : 'rgba(255, 193, 7, 0.15)',
                transform: 'translate(-50%, -50%)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: isActive ? 'none' : 'blur(10px)',
              }}
            />
            <IconComponent
              className="position-relative"
              style={{
                fontSize: 'clamp(4rem, 12vw, 2.5rem)',
                color: isActive ? '#000' : '#ffc107',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                filter: isActive ? 'none' : 'drop-shadow(0 0 8px rgba(255, 193, 7, 0.6))',
              }}
            />
          </div>
        )}

        <div className={isCarousel ? 'menu-category-card-carousel-text w-100' : 'text-center'}>
          {/* Title */}
          <h6
            className={`fw-bold ${isCarousel ? 'menu-category-card-carousel-title mb-0' : 'mb-2'}`}
            style={
              isCarousel
                ? undefined
                : {
                    fontSize: '1.1rem',
                    color: isActive ? '#000' : '#fff',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: "'Playfair Display', serif",
                    letterSpacing: '0.5px',
                  }
            }
          >
            {title}
          </h6>

          {/* Subtitle */}
          {subtitle && (
            <small
              className={
                isCarousel
                  ? 'menu-category-card-carousel-subtitle d-block'
                  : 'text-uppercase fw-medium'
              }
              style={
                isCarousel
                  ? undefined
                  : {
                      fontSize: '0.75rem',
                      color: isActive ? 'rgba(0, 0, 0, 0.7)' : '#ffc107',
                      letterSpacing: '1px',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    }
              }
            >
              {subtitle}
            </small>
          )}
        </div>
      </div>

      {/* Border glow effect */}
      <div
        className={`position-absolute top-0 start-0 w-100 h-100 menu-category-card-border ${
          isCarousel ? 'menu-category-card-border-carousel' : ''
        }`}
        style={
          isCarousel
            ? undefined
            : {
                border: `2px solid ${isActive ? '#000' : '#ffc107'}`,
                borderRadius: '12px',
                opacity: isActive ? 0.2 : 1,
                boxShadow: isActive
                  ? 'inset 0 0 20px rgba(0, 0, 0, 0.1)'
                  : '0 0 20px rgba(255, 193, 7, 0.3)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: 1,
                pointerEvents: 'none',
              }
        }
      />
    </div>
  );
};

export default MenuCategoryCard;

