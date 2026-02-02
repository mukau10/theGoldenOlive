/**
 * Route planning utilities (nearest neighbor + optional OSRM polyline)
 */

const EARTH_RADIUS_KM = 6371;

export function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_KM * c;
}

/**
 * Nearest-neighbor heuristic:
 * start -> visit all stops -> returnToStart (optional)
 */
export function orderStopsNearestNeighbor(start, stops) {
  const remaining = [...stops];
  const ordered = [];
  let current = start;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = next;
  }

  return ordered;
}

export function buildStraightPolyline(start, orderedStops, returnToStart = true) {
  const points = [
    [start.latitude, start.longitude],
    ...orderedStops.map((s) => [s.latitude, s.longitude]),
  ];
  if (returnToStart) points.push([start.latitude, start.longitude]);
  return points;
}

export function sumDistanceKm(start, orderedStops, returnToStart = true) {
  let km = 0;
  let prev = start;
  for (const s of orderedStops) {
    km += haversineKm(prev, s);
    prev = s;
  }
  if (returnToStart) km += haversineKm(prev, start);
  return km;
}

/**
 * OSRM public demo server (open-source routing engine).
 * NOTE: Not guaranteed SLA. We fallback to straight lines.
 */
export async function fetchOsrmRoutePolyline(pointsLatLng) {
  // OSRM expects lon,lat pairs
  const coords = pointsLatLng
    .map(([lat, lng]) => `${lng},${lat}`)
    .join(';');

  const url =
    `https://router.project-osrm.org/route/v1/driving/${coords}` +
    `?overview=full&geometries=geojson&steps=false`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'theGoldenOlive-admin-routes' },
  });
  if (!res.ok) {
    throw new Error(`OSRM route failed: ${res.status}`);
  }
  const json = await res.json();
  const route = json?.routes?.[0];
  const geometry = route?.geometry;
  const distance = route?.distance; // meters
  const duration = route?.duration; // seconds

  if (!geometry?.coordinates?.length) {
    throw new Error('OSRM route missing geometry');
  }

  // GeoJSON coordinates are [lng,lat]
  const polyline = geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  return {
    polyline,
    distanceKm: typeof distance === 'number' ? distance / 1000 : undefined,
    durationMin: typeof duration === 'number' ? duration / 60 : undefined,
  };
}

