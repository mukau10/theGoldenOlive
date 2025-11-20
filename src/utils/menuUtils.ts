import type { MenuData, MenuItem } from '../types/menu';
import type { Allergen } from '../types/allergens';

/**
 * Utility functions for menu data manipulation
 */

/**
 * Get all unique allergens from menu data
 */
export const getAllAllergensFromMenu = (menuData: MenuData | null): Allergen[] => {
  if (!menuData) return [];

  const allergenMap = new Map<string, Allergen>();

  Object.values(menuData).forEach((category: MenuItem[]) => {
    category.forEach((item: MenuItem) => {
      item.allergens.forEach((allergen: { code: string; type: string; color: string; description: string }) => {
        if (!allergenMap.has(allergen.code)) {
          allergenMap.set(allergen.code, {
            code: allergen.code,
            type: allergen.type,
            color: allergen.color,
            description: allergen.description,
          });
        }
      });
    });
  });

  return Array.from(allergenMap.values());
};

/**
 * Get menu items by allergen code
 */
export const getMenuItemsByAllergen = (menuData: MenuData | null, allergenCode: string): MenuItem[] => {
  if (!menuData) return [];

  const items: MenuItem[] = [];

  Object.values(menuData).forEach((category: MenuItem[]) => {
    category.forEach((item: MenuItem) => {
      if (item.allergens.some((a: { code: string }) => a.code === allergenCode)) {
        items.push(item);
      }
    });
  });

  return items;
};

/**
 * Filter menu items that contain specific allergens
 */
export const filterItemsByAllergens = (
  menuData: MenuData | null,
  allergenCodes: string[],
  exclude: boolean = false
): MenuItem[] => {
  if (!menuData) return [];

  const items: MenuItem[] = [];

  Object.values(menuData).forEach((category: MenuItem[]) => {
    category.forEach((item: MenuItem) => {
      const hasAllergen = item.allergens.some((a: { code: string }) => allergenCodes.includes(a.code));
      if (exclude ? !hasAllergen : hasAllergen) {
        items.push(item);
      }
    });
  });

  return items;
};

/**
 * Get menu items that are safe for specific dietary requirements
 */
export const getDietarySafeItems = (menuData: MenuData | null, dietaryCode: string): MenuItem[] => {
  if (!menuData) return [];

  const items: MenuItem[] = [];

  Object.values(menuData).forEach((category: MenuItem[]) => {
    category.forEach((item: MenuItem) => {
      // Check if item has the dietary code (e.g., "V" for vegetarian)
      const hasDietary = item.allergens.some((a: { code: string }) => a.code === dietaryCode);
      if (hasDietary) {
        items.push(item);
      }
    });
  });

  return items;
};

/**
 * Search menu items by name or description
 */
export const searchMenuItems = (menuData: MenuData | null, searchTerm: string): MenuItem[] => {
  if (!menuData || !searchTerm) return [];

  const term = searchTerm.toLowerCase();
  const items: MenuItem[] = [];

  Object.values(menuData).forEach((category: MenuItem[]) => {
    category.forEach((item: MenuItem) => {
      const nameMatch = item.name.toLowerCase().includes(term);
      const descMatch = item.description.toLowerCase().includes(term);
      if (nameMatch || descMatch) {
        items.push(item);
      }
    });
  });

  return items;
};

