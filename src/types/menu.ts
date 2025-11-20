export interface Allergen {
  code: string;
  type: string;
  color: string;
  description: string;
}

export interface MenuItem {
  id: string;
  name: string;
  price: string;
  description: string;
  image: string;
  alt: string;
  allergens: Allergen[];
}

export interface MenuData {
  voorgerechten: MenuItem[];
  'mixed-bbq': MenuItem[];
  spareribs: MenuItem[];
  'loaded-scoops': MenuItem[];
  'rijst-pannetjes': MenuItem[];
  'gevulde-aardappel-pannetje': MenuItem[];
  burgers: MenuItem[];
  kindermenu: MenuItem[];
  supplementen: MenuItem[];
  desserten: MenuItem[];
  mocktails: MenuItem[];
  frisdranken: MenuItem[];
  'warme-dranken': MenuItem[];
}

export type MenuCategory = keyof MenuData;

