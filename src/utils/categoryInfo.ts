import type { MenuCategory } from '../types/menu';
import type { IconType } from 'react-icons';
import { GiHamburger, GiMeat, GiFriedEggs, GiFireBowl, GiBasket, GiCupcake, GiStarMedal, GiFrenchFries } from 'react-icons/gi';
import { BiCake, BiDroplet, BiCoffee } from 'react-icons/bi';

export interface CategoryInfo {
  title: string;
  description: string;
  icon: IconType;
}

export const categoryInfoMap: Record<MenuCategory, CategoryInfo> = {
  voorgerechten: {
    title: 'Voorgerechten',
    description: 'Heerlijke starters om je maaltijd mee te beginnen',
    icon: GiFriedEggs,
  },
  'mixed-bbq': {
    title: 'Mix BBQ',
    description: 'Een combinatie van verschillende soorten vlees.',
    icon: GiFireBowl,
  },
  spareribs: {
    title: 'Spareribs',
    description: 'Malse spareribs met onze huisgemaakte sauzen',
    icon: GiMeat,
  },
  'loaded-scoops': {
    title: 'Loaded Scoops',
    description: 'Gevulde scoops met frietjes of nacho\'s, mac & cheese en toppings',
    icon: GiBasket,
  },
  burgers: {
    title: 'Burgers',
    description: 'Sappige burgers met verse ingrediënten',
    icon: GiHamburger,
  },
  kindermenu: {
    title: 'Kindermenu',
    description: 'Speciaal samengesteld voor onze jongste gasten',
    icon: GiStarMedal,
  },
  supplementen: {
    title: 'Supplementen',
    description: "Extra's om je gerecht compleet te maken",
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

