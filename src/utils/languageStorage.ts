/**
 * Utility functions for managing language preference in localStorage
 * This ensures language preference is saved and persists across sessions
 */

const LANGUAGE_STORAGE_KEY = 'i18nextLng';

/**
 * Save language preference to localStorage
 * @param langCode - Language code (e.g., 'nl', 'en', 'fr')
 */
export const saveLanguagePreference = (langCode: string): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
    // Also save timestamp for tracking
    localStorage.setItem(`${LANGUAGE_STORAGE_KEY}_date`, new Date().toISOString());
  } catch (error) {
    console.error('Failed to save language preference:', error);
  }
};

/**
 * Get saved language preference from localStorage
 * @returns Language code or null if not found
 */
export const getLanguagePreference = (): string | null => {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to get language preference:', error);
    return null;
  }
};

/**
 * Check if language preference exists in localStorage
 * @returns true if language preference is saved
 */
export const hasLanguagePreference = (): boolean => {
  return getLanguagePreference() !== null;
};
