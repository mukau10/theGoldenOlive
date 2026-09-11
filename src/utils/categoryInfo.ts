import type { MenuCategory } from '../types/menu';
import type { IconType } from 'react-icons';
import { GiHamburger, GiMeat, GiFriedEggs, GiFireBowl, GiBasket, GiCupcake, GiStarMedal, GiFrenchFries, GiMeal } from 'react-icons/gi';
import { BiCake, BiDroplet, BiCoffee } from 'react-icons/bi';

export interface CategoryInfo {
  title: string;
  description: string;
  icon: IconType;
}

/** Logical display order: starters → mains → sides → desserts → drinks */
export const MENU_CATEGORY_ORDER: MenuCategory[] = [
  'voorgerechten',
  'burgers',
  'platter',
  'loaded-scoops',
  'mixed-bbq',
  'spareribs',
  'kindermenu',
  'supplementen',
  'desserten',
  'mocktails',
  'frisdranken',
  'warme-dranken',
];

export const CATEGORIES_WITHOUT_SIDES: MenuCategory[] = ['burgers', 'platter', 'spareribs'];
export const ITEMS_WITHOUT_SIDES = ['mixed-bbq'];

export const CATEGORIES_WITH_SIDES_PICKER: MenuCategory[] = [
  'burgers',
  'platter',
  'mixed-bbq',
  'spareribs',
  'loaded-scoops',
  'kindermenu',
];

export function isSoldWithoutSides(category: string, itemId?: string): boolean {
  if (itemId && ITEMS_WITHOUT_SIDES.includes(itemId)) return true;
  return CATEGORIES_WITHOUT_SIDES.includes(category as MenuCategory);
}

export function canAddSidesToDish(category: string, itemId?: string): boolean {
  if (itemId && ITEMS_WITHOUT_SIDES.includes(itemId)) return true;
  return CATEGORIES_WITH_SIDES_PICKER.includes(category as MenuCategory);
}

export function requiresSideChoice(category: string, itemId?: string): boolean {
  return isSoldWithoutSides(category, itemId);
}

export function isQuickAddCategory(category: string, itemId?: string): boolean {
  return (
    category === 'frisdranken' ||
    category === 'warme-dranken' ||
    category === 'supplementen' ||
    Boolean(itemId?.startsWith('saus-'))
  );
}

export function sortMenuCategories(categories: MenuCategory[]): MenuCategory[] {
  return [...categories].sort((a, b) => {
    const indexA = MENU_CATEGORY_ORDER.indexOf(a);
    const indexB = MENU_CATEGORY_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}

export const categoryInfoMap: Record<MenuCategory, CategoryInfo> = {
  voorgerechten: {
    title: 'Voorgerechten',
    description: 'Heerlijke starters om je maaltijd mee te beginnen',
    icon: GiFriedEggs,
  },
  'mixed-bbq': {
    title: 'Mix BBQ',
    description: 'Mix Grill zonder bijgerecht. Kies er friet maison of kroketjes bij.',
    icon: GiFireBowl,
  },
  spareribs: {
    title: 'Spareribs',
    description: 'Spareribs zonder bijgerecht. Kies er friet maison, kroketjes, krieltjes of mac and cheese bij.',
    icon: GiMeat,
  },
  'loaded-scoops': {
    title: 'Loaded Scoops',
    description: 'Gevulde scoops met frietjes, mac & cheese en toppings',
    icon: GiBasket,
  },
  burgers: {
    title: 'Burgers',
    description: 'Burgers zonder bijgerecht. Kies er friet maison of kroketjes bij.',
    icon: GiHamburger,
  },
  platter: {
    title: 'Platter',
    description: 'Platters zonder bijgerecht. Kies er friet maison of kroketjes bij.',
    icon: GiMeal,
  },
  kindermenu: {
    title: 'Kindermenu',
    description: 'Speciaal samengesteld voor onze jongste gasten',
    icon: GiStarMedal,
  },
  supplementen: {
    title: 'Sides & sauzen',
    description: 'Kies je bijgerecht extra bij je burger of platter. Koude sauzen +€1, warme sauzen +€2,50.',
    icon: GiFrenchFries,
  },
  desserten: {
    title: 'Desserten',
    description: 'Zoete afsluiting van je perfecte maaltijd',
    icon: BiCake,
  },
  mocktails: {
    title: 'Mocktails',
    description: 'Verfrissende alcoholvrije cocktails',
    icon: GiCupcake,
  },
  frisdranken: {
    title: 'Frisdranken',
    description: 'Koude en verfrissende drankjes',
    icon: BiDroplet,
  },
  'warme-dranken': {
    title: 'Warme Dranken',
    description: 'Warme dranken voor gezellige momenten',
    icon: BiCoffee,
  },
};

