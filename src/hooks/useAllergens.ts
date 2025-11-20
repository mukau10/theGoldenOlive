import { useState, useEffect } from 'react';
import type { AllergensData, Allergen } from '../types/allergens';

// Cache for allergens data
let allergensCache: AllergensData | null = null;
let allergensPromise: Promise<AllergensData> | null = null;

export const useAllergens = () => {
  const [allergensData, setAllergensData] = useState<AllergensData | null>(allergensCache);
  const [loading, setLoading] = useState(!allergensCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have cached data, use it immediately
    if (allergensCache) {
      setAllergensData(allergensCache);
      setLoading(false);
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
    const fetchAllergens = async () => {
      try {
        const response = await fetch('/data/allergens.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allergensCache = data;
        setAllergensData(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load allergens');
        setLoading(false);
      }
    };

    allergensPromise = fetchAllergens().then(() => allergensCache!);
    allergensPromise.catch(() => {
      allergensPromise = null;
    });
  }, []);

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

  if (allergensPromise) {
    return allergensPromise;
  }

  try {
    const response = await fetch('/data/allergens.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    allergensCache = data;
    allergensPromise = Promise.resolve(data);
    return data;
  } catch (err) {
    console.error('Failed to preload allergens:', err);
    return null;
  }
};

