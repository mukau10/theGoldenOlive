import type { MenuItem } from '../types/menu';
import { useTranslation } from 'react-i18next';

/**
 * Hook to translate menu items
 * Returns translated name and description for a menu item
 */
export const useMenuTranslation = () => {
  const { t } = useTranslation();

  const translateMenuItem = (item: MenuItem): { name: string; description: string } => {
    const itemKey = `menu.items.${item.id}`;
    const nameKey = `${itemKey}.name`;
    const descKey = `${itemKey}.description`;

    // Try to get translation, fallback to original if not found
    const translatedName = t(nameKey, { defaultValue: item.name });
    const translatedDesc = t(descKey, { defaultValue: item.description || '' });

    return {
      name: translatedName,
      description: translatedDesc,
    };
  };

  return { translateMenuItem };
};

/**
 * Translate category name
 */
export const translateCategory = (categoryKey: string, t: (key: string) => string): string => {
  return t(`menu.categories.${categoryKey}.title`, { defaultValue: categoryKey });
};

/**
 * Translate category description
 */
export const translateCategoryDescription = (categoryKey: string, t: (key: string) => string): string => {
  return t(`menu.categories.${categoryKey}.description`, { defaultValue: '' });
};
