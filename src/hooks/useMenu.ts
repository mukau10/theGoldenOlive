import { useState, useEffect } from 'react';
import type { MenuData } from '../types/menu';
import { LocalCacheManager, fetchWithCache, CACHE_DURATIONS } from '../utils/cacheManager';

// Cache for menu data (in-memory)
let menuCache: MenuData | null = null;
let menuPromise: Promise<MenuData> | null = null;
const CACHE_KEY = 'menu-data';

export const useMenu = () => {
  const [menuData, setMenuData] = useState<MenuData | null>(menuCache);
  const [loading, setLoading] = useState(!menuCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check in-memory cache first
    if (menuCache) {
      setMenuData(menuCache);
      setLoading(false);
      return;
    }

    // Check localStorage cache
    const cachedData = LocalCacheManager.get<MenuData>(CACHE_KEY);
    if (cachedData) {
      menuCache = cachedData;
      setMenuData(cachedData);
      setLoading(false);
      // Still fetch in background to update cache
      fetchMenu(true);
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
    fetchMenu(false);
  }, []);

  const fetchMenu = async (silent: boolean = false) => {
    try {
      // Prefer live API (admin-editable), fall back to static JSON
      let data: MenuData | null = null;
      try {
        const apiUrl = `${import.meta.env.VITE_API_URL || '/api'}/menu`;
        const resp = await fetch(apiUrl, { cache: 'no-store' });
        if (resp.ok) {
          const json = await resp.json();
          data = (json?.data || json) as MenuData;
        }
      } catch {
        // fall through to static file
      }

      if (!data) {
        data = await fetchWithCache<MenuData>(
          '/data/menu.json',
          {},
          CACHE_KEY,
          CACHE_DURATIONS.LONG
        );
      }
      
      menuCache = data;
      LocalCacheManager.set(CACHE_KEY, data, CACHE_DURATIONS.MEDIUM);
      
      if (!silent) {
        setMenuData(data);
        setLoading(false);
      }
      
      menuPromise = Promise.resolve(data);
      return data;
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load menu');
        setLoading(false);
      }
      menuPromise = null;
      throw err;
    }
  };

  return { menuData, loading, error };
};

// Preload menu data immediately
export const preloadMenu = async (): Promise<MenuData | null> => {
  if (menuCache) {
    return menuCache;
  }

  // Check localStorage cache
  const cachedData = LocalCacheManager.get<MenuData>(CACHE_KEY);
  if (cachedData) {
    menuCache = cachedData;
    return cachedData;
  }

  if (menuPromise) {
    return menuPromise;
  }

  try {
    const data = await fetchWithCache<MenuData>(
      '/data/menu.json',
      {},
      CACHE_KEY,
      CACHE_DURATIONS.LONG
    );
    menuCache = data;
    LocalCacheManager.set(CACHE_KEY, data, CACHE_DURATIONS.LONG);
    menuPromise = Promise.resolve(data);
    return data;
  } catch (err) {
    console.error('Failed to preload menu:', err);
    return null;
  }
};

