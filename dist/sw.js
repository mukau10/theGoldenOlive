// Service Worker for The Golden Olive
// Version 1.0.0
const CACHE_NAME = 'the-golden-olive-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/data/menu.json',
  '/data/allergens.json',
  '/img/favicon11.png',
  '/img/logo.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      // Cache assets one by one to handle failures gracefully
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) =>
          fetch(asset)
            .then((response) => {
              // Only cache full responses (200), not partial (206)
              if (response.ok && response.status === 200) {
                return cache.put(asset, response);
              }
              console.warn(`[Service Worker] Skipping cache for ${asset}: status ${response.status}`);
            })
            .catch((err) => {
              console.warn(`[Service Worker] Failed to cache ${asset}:`, err);
            })
        )
      );
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches that don't match current version
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip range requests (partial content requests) - these can't be cached
  const rangeHeader = request.headers.get('range');
  if (rangeHeader) {
    // For range requests, just fetch from network without caching
    event.respondWith(fetch(request));
    return;
  }

  // Strategy: Cache First for static assets, Network First for API/data
  if (
    request.url.includes('/data/') ||
    request.url.includes('/api/')
  ) {
    // Network First strategy for API and data
    event.respondWith(networkFirstStrategy(request));
  } else if (
    request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|webp|mp4)$/i) ||
    request.url.includes('/assets/')
  ) {
    // Cache First strategy for static assets
    // Note: Video files (mp4) with range requests are handled above
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // Stale While Revalidate for HTML pages
    event.respondWith(staleWhileRevalidateStrategy(request));
  }
});

// Cache First Strategy - good for static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    // Only cache full responses (200), not partial responses (206)
    // Partial responses occur with range requests (e.g., video streaming)
    if (networkResponse.ok && networkResponse.status === 200) {
      // Also check if this is a range request - don't cache those
      const rangeHeader = request.headers.get('range');
      if (!rangeHeader) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
      }
    }
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache First failed:', error);
    // Return offline fallback if available
    const cachedResponse = await caches.match('/');
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Network First Strategy - good for API/data that changes frequently
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    // Only cache full responses (200), not partial responses (206)
    if (networkResponse.ok && networkResponse.status === 200) {
      const rangeHeader = request.headers.get('range');
      if (!rangeHeader) {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, networkResponse.clone());
      }
    }
    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return a basic offline response
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Stale While Revalidate Strategy - good for HTML pages
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  // Fetch from network in background
  const fetchPromise = fetch(request).then((networkResponse) => {
    // Only cache full responses (200), not partial responses (206)
    if (networkResponse.ok && networkResponse.status === 200) {
      const rangeHeader = request.headers.get('range');
      if (!rangeHeader) {
        cache.put(request, networkResponse.clone());
      }
    }
    return networkResponse;
  }).catch(() => {
    // Ignore network errors
  });

  // Return cached version immediately, update in background
  return cachedResponse || (await fetchPromise) || new Response('Offline', { status: 503 });
}

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
