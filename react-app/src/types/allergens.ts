export interface Allergen {
  code: string;
  type: string;
  color: string;
  description: string;
  icon?: string;
}

export interface AllergensData {
  allergens: Allergen[];
  dietary: Allergen[];
}

