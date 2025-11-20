import type { MenuCategory } from '../types/menu';

export interface CategoryInfo {
  title: string;
  description: string;
  icon: string;
}

export const categoryInfoMap: Record<MenuCategory, CategoryInfo> = {
  voorgerechten: {
    title: 'Voorgerechten',
    description: 'Heerlijke starters om je maaltijd mee te beginnen',
    icon: 'bi-egg-fried',
  },
  'mixed-bbq': {
    title: 'Mix BBQ',
    description: 'Een combinatie van verschillende soorten vlees.',
    icon: 'bi-fire',
  },
  spareribs: {
    title: 'Spareribs',
    description: 'Malse spareribs met onze huisgemaakte sauzen',
    icon: 'bi-meat',
  },
  'loaded-scoops': {
    title: 'Loaded Scoops',
    description: 'Gevulde scoops met frietjes of nacho\'s, mac & cheese en toppings',
    icon: 'bi-basket',
  },
  'rijst-pannetjes': {
    title: 'Rijst Pannetjes',
    description: 'Gevulde rijst pannetjes met verschillende toppings',
    icon: 'bi-bowl-rice',
  },
  'gevulde-aardappel-pannetje': {
    title: 'Gevulde Aardappel Pannetje',
    description: 'Gevulde aardappel pannetjes met verschillende toppings',
    icon: 'bi-egg-fried',
  },
  burgers: {
    title: 'Burgers',
    description: 'Sappige burgers met verse ingrediënten',
    icon: 'bi-hamburger',
  },
  kindermenu: {
    title: 'Kindermenu',
    description: 'Speciaal samengesteld voor onze jongste gasten',
    icon: 'bi-star',
  },
  supplementen: {
    title: 'Supplementen',
    description: "Extra's om je gerecht compleet te maken",
    icon: 'bi-plus-circle',
  },
  desserten: {
    title: 'Desserten',
    description: 'Zoete afsluiting van je perfecte maaltijd',
    icon: 'bi-cake',
  },
  mocktails: {
    title: 'Mocktails',
    description: 'Verfrissende alcoholvrije cocktails',
    icon: 'bi-cup-straw',
  },
  frisdranken: {
    title: 'Frisdranken',
    description: 'Koude en verfrissende drankjes',
    icon: 'bi-droplet',
  },
  'warme-dranken': {
    title: 'Warme Dranken',
    description: 'Warme dranken voor gezellige momenten',
    icon: 'bi-cup-hot',
  },
};

