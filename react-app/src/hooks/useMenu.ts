import { useState, useEffect } from 'react';
import type { MenuData } from '../types/menu';

// Cache for menu data
let menuCache: MenuData | null = null;
let menuPromise: Promise<MenuData> | null = null;

export const useMenu = () => {
  const [menuData, setMenuData] = useState<MenuData | null>(menuCache);
  const [loading, setLoading] = useState(!menuCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If we already have cached data, use it immediately
    if (menuCache) {
      setMenuData(menuCache);
      setLoading(false);
      return;
    }

    // If a fetch is already in progress, wait for it
    if (menuPromise) {
      menuPromise
        .then((data) => {
          setMenuData(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load menu');
          setLoading(false);
        });
      return;
    }

    // Start new fetch
    const fetchMenu = async () => {
      try {
        const response = await fetch('/data/menu.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        menuCache = data;
        setMenuData(data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load menu');
        setLoading(false);
      }
    };

    menuPromise = fetchMenu().then(() => menuCache!);
    menuPromise.catch(() => {
      menuPromise = null;
    });
  }, []);

  return { menuData, loading, error };
};

// Preload menu data immediately
export const preloadMenu = async (): Promise<MenuData | null> => {
  if (menuCache) {
    return menuCache;
  }

  if (menuPromise) {
    return menuPromise;
  }

  try {
    const response = await fetch('/data/menu.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    menuCache = data;
    menuPromise = Promise.resolve(data);
    return data;
  } catch (err) {
    console.error('Failed to preload menu:', err);
    return null;
  }
};

