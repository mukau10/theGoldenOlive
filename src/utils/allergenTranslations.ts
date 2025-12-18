import type { Allergen } from '../types/allergens';
import { useTranslation } from 'react-i18next';

/**
 * Hook to translate allergens
 * Returns translated type and description for an allergen
 */
export const useAllergenTranslation = () => {
  const { t } = useTranslation();

  const translateAllergen = (allergen: Allergen): { type: string; description: string } => {
    const allergenKey = `allergens.items.${allergen.code}`;
    const typeKey = `${allergenKey}.type`;
    const descKey = `${allergenKey}.description`;

    // Try to get translation, fallback to original if not found
    const translatedType = t(typeKey, { defaultValue: allergen.type });
    const translatedDesc = t(descKey, { defaultValue: allergen.description });

    return {
      type: translatedType,
      description: translatedDesc,
    };
  };

  return { translateAllergen };
};
