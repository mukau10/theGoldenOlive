import { useState, useEffect } from 'react';
import type { AllergensData, Allergen } from '../types/allergens';
import { LocalCacheManager, fetchWithCache, CACHE_DURATIONS } from '../utils/cacheManager';

// Cache for allergens data (in-memory)
let allergensCache: AllergensData | null = null;
let allergensPromise: Promise<AllergensData> | null = null;
const CACHE_KEY = 'allergens-data';

export const useAllergens = () => {
  const [allergensData, setAllergensData] = useState<AllergensData | null>(allergensCache);
  const [loading, setLoading] = useState(!allergensCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check in-memory cache first
    if (allergensCache) {
      setAllergensData(allergensCache);
      setLoading(false);
      return;
    }

    // Check localStorage cache
    const cachedData = LocalCacheManager.get<AllergensData>(CACHE_KEY);
    if (cachedData) {
      allergensCache = cachedData;
      setAllergensData(cachedData);
      setLoading(false);
      // Still fetch in background to update cache
      fetchAllergens(true);
      return;
    }

    // If a fetch is already in progress, wait for it
    if (allergensPromise) {
      allergensPromise
        .then((data) => {
          setAllergensData(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load allergens');
          setLoading(false);
        });
      return;
    }

    // Start new fetch
    fetchAllergens(false);
  }, []);

  const fetchAllergens = async (silent: boolean = false) => {
    try {
      const data = await fetchWithCache<AllergensData>(
        '/data/allergens.json',
        {},
        CACHE_KEY,
        CACHE_DURATIONS.VERY_LONG // Cache allergens for 7 days (rarely changes)
      );
      
      allergensCache = data;
      LocalCacheManager.set(CACHE_KEY, data, CACHE_DURATIONS.VERY_LONG);
      
      if (!silent) {
        setAllergensData(data);
        setLoading(false);
      }
      
      allergensPromise = Promise.resolve(data);
      return data;
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load allergens');
        setLoading(false);
      }
      allergensPromise = null;
      throw err;
    }
  };

  // Helper function to get allergen by code
  const getAllergenByCode = (code: string): Allergen | undefined => {
    if (!allergensData) return undefined;
    return allergensData.allergens.find((a) => a.code === code) || 
           allergensData.dietary.find((a) => a.code === code);
  };

  // Helper function to get all allergen codes
  const getAllAllergenCodes = (): string[] => {
    if (!allergensData) return [];
    return [
      ...allergensData.allergens.map((a) => a.code),
      ...allergensData.dietary.map((a) => a.code),
    ];
  };

  return {
    allergensData,
    loading,
    error,
    getAllergenByCode,
    getAllAllergenCodes,
  };
};

// Preload allergens data immediately
export const preloadAllergens = async (): Promise<AllergensData | null> => {
  if (allergensCache) {
    return allergensCache;
  }

  // Check localStorage cache
  const cachedData = LocalCacheManager.get<AllergensData>(CACHE_KEY);
  if (cachedData) {
    allergensCache = cachedData;
    return cachedData;
  }

  if (allergensPromise) {
    return allergensPromise;
  }

  try {
    const data = await fetchWithCache<AllergensData>(
      '/data/allergens.json',
      {},
      CACHE_KEY,
      CACHE_DURATIONS.VERY_LONG
    );
    allergensCache = data;
    LocalCacheManager.set(CACHE_KEY, data, CACHE_DURATIONS.VERY_LONG);
    allergensPromise = Promise.resolve(data);
    return data;
  } catch (err) {
    console.error('Failed to preload allergens:', err);
    return null;
  }
};

