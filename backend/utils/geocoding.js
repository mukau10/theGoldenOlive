/**
 * OpenStreetMap Nominatim geocoding (open-source).
 * Stores lat/lng in DB so routing never needs manual coordinates.
 *
 * IMPORTANT: Nominatim usage policy expects rate limiting + proper User-Agent.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

// Simple in-process cache to avoid repeat calls
const cache = new Map(); // key -> { lat, lng, ts }
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

let lastRequestAt = 0;
const MIN_DELAY_MS = 1100; // ~1 req/sec

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeKey({ street, house_number, postal_code, city, country }) {
  return `${street}|${house_number}|${postal_code}|${city}|${country || ''}`.toLowerCase();
}

export async function geocodeAddress(address, opts = {}) {
  const {
    country = 'Belgium',
    language = 'nl',
    timeoutMs = 2500,
  } = opts;

  if (!address?.street || !address?.house_number || !address?.postal_code || !address?.city) {
    return null;
  }

  const key = makeKey({ ...address, country });
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return { latitude: cached.lat, longitude: cached.lng, source: 'cache' };
  }

  // Respect Nominatim rate limits
  const now = Date.now();
  const wait = Math.max(0, MIN_DELAY_MS - (now - lastRequestAt));
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const params = new URLSearchParams({
      format: 'json',
      limit: '1',
      addressdetails: '1',
      country,
      city: address.city,
      postalcode: address.postal_code,
      street: `${address.house_number} ${address.street}`,
    });

    const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Accept-Language': language,
        // Use a descriptive UA; Node fetch allows this header.
        'User-Agent': 'TheGoldenOlive/1.0 (delivery routes geocoding)',
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    const hit = Array.isArray(data) ? data[0] : null;
    if (!hit?.lat || !hit?.lon) return null;

    const lat = Number(hit.lat);
    const lng = Number(hit.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    cache.set(key, { lat, lng, ts: Date.now() });
    return { latitude: lat, longitude: lng, source: 'nominatim' };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

