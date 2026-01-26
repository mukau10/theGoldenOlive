/**
 * Cache Manager Utility
 * Handles browser caching, localStorage, and service worker cache management
 */

// Cache duration constants (in milliseconds)
export const CACHE_DURATIONS = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 24 * 60 * 60 * 1000, // 24 hours
  VERY_LONG: 7 * 24 * 60 * 60 * 1000, // 7 days
};

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * LocalStorage Cache Manager
 */
export class LocalCacheManager {
  private static prefix = 'golden-olive-cache-';

  /**
   * Set item in cache with expiration
   */
  static set<T>(key: string, data: T, duration: number = CACHE_DURATIONS.MEDIUM): void {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + duration,
      };
      localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to set cache item:', error);
      // If storage is full, try to clear expired items
      this.clearExpired();
      try {
        const item: CacheItem<T> = {
          data,
          timestamp: Date.now(),
          expiresAt: Date.now() + duration,
        };
        localStorage.setItem(`${this.prefix}${key}`, JSON.stringify(item));
      } catch (retryError) {
        console.error('Failed to set cache item after cleanup:', retryError);
      }
    }
  }

  /**
   * Get item from cache
   */
  static get<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(`${this.prefix}${key}`);
      if (!itemStr) return null;

      const item: CacheItem<T> = JSON.parse(itemStr);

      // Check if expired
      if (Date.now() > item.expiresAt) {
        localStorage.removeItem(`${this.prefix}${key}`);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to get cache item:', error);
      return null;
    }
  }

  /**
   * Check if item exists and is valid
   */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Remove item from cache
   */
  static remove(key: string): void {
    try {
      localStorage.removeItem(`${this.prefix}${key}`);
    } catch (error) {
      console.warn('Failed to remove cache item:', error);
    }
  }

  /**
   * Clear all expired cache items
   */
  static clearExpired(): void {
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();

      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          try {
            const itemStr = localStorage.getItem(key);
            if (itemStr) {
              const item: CacheItem<any> = JSON.parse(itemStr);
              if (now > item.expiresAt) {
                localStorage.removeItem(key);
              }
            }
          } catch (error) {
            // Invalid item, remove it
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.warn('Failed to clear expired cache:', error);
    }
  }

  /**
   * Clear all cache items
   */
  static clearAll(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  }
}

/**
 * Fetch with cache support
 */
export async function fetchWithCache<T>(
  url: string,
  options: RequestInit = {},
  cacheKey?: string,
  cacheDuration: number = CACHE_DURATIONS.MEDIUM
): Promise<T> {
  const key = cacheKey || url;

  // Try to get from cache first
  const cached = LocalCacheManager.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  try {
    // Fetch from network
    const response = await fetch(url, {
      ...options,
      headers: {
        'Cache-Control': 'max-age=3600',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Store in cache
    LocalCacheManager.set(key, data, cacheDuration);

    return data;
  } catch (error) {
    // If network fails, try to return stale cache
    const staleCache = LocalCacheManager.get<T>(key);
    if (staleCache !== null) {
      console.warn('Using stale cache due to network error:', error);
      return staleCache;
    }
    throw error;
  }
}

/**
 * Service Worker Cache Manager
 */
export class ServiceWorkerCacheManager {
  /**
   * Check if service worker is supported
   */
  static isSupported(): boolean {
    return 'serviceWorker' in navigator && 'caches' in window;
  }

  /**
   * Clear all service worker caches
   */
  static async clearAllCaches(): Promise<void> {
    if (!this.isSupported()) return;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.log('[Cache Manager] All service worker caches cleared');
    } catch (error) {
      console.error('[Cache Manager] Failed to clear caches:', error);
    }
  }

  /**
   * Get cache size estimate
   */
  static async getCacheSize(): Promise<number> {
    if (!this.isSupported()) return 0;

    try {
      const cacheNames = await caches.keys();
      let totalSize = 0;

      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        // Rough estimate: each request is ~1KB
        totalSize += keys.length * 1024;
      }

      return totalSize;
    } catch (error) {
      console.error('[Cache Manager] Failed to get cache size:', error);
      return 0;
    }
  }
}

// Initialize: clear expired cache items on load
if (typeof window !== 'undefined') {
  LocalCacheManager.clearExpired();
  // Clear expired items every hour
  setInterval(() => {
    LocalCacheManager.clearExpired();
  }, 60 * 60 * 1000);
}
