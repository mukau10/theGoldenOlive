/**
 * Product permission helpers for admin vs staff
 */

export const DRINK_CATEGORY_SLUGS = ['mocktails', 'frisdranken', 'warme-dranken'];
export const ADMIN_ONLY_TOGGLE_SLUGS = ['mocktails'];

export function isDrinkCategory(slug) {
  return DRINK_CATEGORY_SLUGS.includes(String(slug || '').toLowerCase());
}

export function isFoodCategory(slug) {
  return !isDrinkCategory(slug);
}

export function isAdminOnlyToggleCategory(slug) {
  return ADMIN_ONLY_TOGGLE_SLUGS.includes(String(slug || '').toLowerCase());
}

export function parseJsonSetting(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getPinProtectedCategories(settingsMap) {
  const raw = settingsMap?.pin_protected_categories;
  const parsed = parseJsonSetting(raw, ['mocktails']);
  return Array.isArray(parsed) ? parsed.map((s) => String(s).toLowerCase()) : ['mocktails'];
}

export function categoryRequiresPin(slug, settingsMap) {
  const protectedCats = getPinProtectedCategories(settingsMap);
  return protectedCats.includes(String(slug || '').toLowerCase());
}
