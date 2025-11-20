import type { MenuItem as MenuItemType } from '../../types/menu';
import { useAllergens } from '../../hooks/useAllergens';

interface MenuItemProps {
  item: MenuItemType;
  category: string;
  onAllergenClick: (description: string) => void;
}

const MenuItem = ({ item, category, onAllergenClick }: MenuItemProps) => {
  const { getAllergenByCode } = useAllergens();

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
      // Use reference data if available, but keep item's description if it's more specific
      return {
        ...referenceAllergen,
        description: allergen.description || referenceAllergen.description,
        color: allergen.color || referenceAllergen.color,
      };
    }
    // Fallback to item's allergen data
    return allergen;
  };

  // Handle placeholder items
  if (item.id === 'burgers-placeholder') {
    return (
      <div className={`col-12 mb-4`}>
        <div className="bg-black border border-warning rounded-3 p-5 text-center shadow-sm">
          <i className="bi bi-hamburger text-warning fs-1 mb-3 d-block"></i>
          <h5 className="text-warning fw-bold mb-0" style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem' }}>
            {item.name}
          </h5>
        </div>
      </div>
    );
  }

  return (
    <div className={`menu-item-modern filter-${category} col-12 col-md-6 col-lg-4 col-xl-3 mb-4`}>
      <div className="bg-black border border-warning rounded-3 overflow-hidden h-100 shadow-sm">
        {/* Image with overlay */}
        <div className="position-relative">
          <img
            className="w-100"
            style={{ height: '220px', objectFit: 'cover' }}
            src={item.image.replace('assets/img', '/img')}
            alt={item.alt}
            loading="lazy"
          />
          <div className="position-absolute top-0 end-0 m-3">
            <span className="badge bg-warning text-black fs-6 fw-bold px-3 py-2 rounded-pill">
              {item.price}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h5
            className="text-white fw-bold mb-3 lh-sm"
            style={{ fontFamily: "'Playfair Display', serif", minHeight: '2.5rem' }}
          >
            <a href={`#${item.id}`} className="text-white text-decoration-none" style={{ transition: 'color 0.3s' }}>
              {item.name}
            </a>
          </h5>

          {/* Description */}
          {item.description && (
            <p
              className="text-white-50 small mb-3 lh-base"
              style={{ minHeight: '3rem' }}
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
          )}

          {/* Allergen Section */}
          {item.allergens && item.allergens.length > 0 && (
            <div className="border-top border-warning pt-3">
              <div className="d-flex align-items-center mb-2">
                <i className="bi bi-info-circle text-warning me-2"></i>
                <span className="small text-warning fw-medium">Allergenen:</span>
              </div>
            <div className="d-flex flex-wrap gap-1 allergen-symbols mb-2">
              {item.allergens.map((allergen, index) => {
                const enhancedAllergen = getEnhancedAllergenInfo(allergen);
                const bgColor = allergenColors[enhancedAllergen.color] || '#dc3545';
                const textColor = enhancedAllergen.color === 'yellow' || enhancedAllergen.color === 'amber' ? '#000' : '#fff';
                return (
                  <span
                    key={`${allergen.code}-${index}`}
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
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.1)';
                      e.currentTarget.style.boxShadow = `0 0 8px ${bgColor}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
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
    </div>
  );
};

export default MenuItem;

