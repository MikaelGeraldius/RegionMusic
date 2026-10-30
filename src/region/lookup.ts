import { fetchWithTimeout } from '../net';

export type Region = {
  id: string; // stable OSM object id, used to pick the region's music
  name: string;
  kind: string; // Nominatim addresstype, e.g. "neighbourhood" or "village" (kelurahan/desa)
};

// Nominatim reverse geocoding at zoom 13 returns the kelurahan/desa boundary in
// Jabodetabek (e.g. Gambir = relation 5802247). Usage policy: identify the app
// and stay under 1 request/s; we only look up after moving TRACKING.requeryDistanceM.
// Spike-only: Phase 3 replaces online lookups with cached polygons.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

export async function regionAt(lat: number, lon: number): Promise<Region | null> {
  const url = `${NOMINATIM_URL}?format=jsonv2&zoom=13&lat=${lat}&lon=${lon}`;
  const res = await fetchWithTimeout(url, {
    headers: {
      // Android's default "okhttp/x" User-Agent is rejected by OSM services.
      'User-Agent': 'RegionMusic/0.1 (personal test app)',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Region lookup ${res.status}`);
  const body = await res.json();
  if (!body?.osm_id || !body.name) return null; // e.g. at sea
  return { id: `osm-${body.osm_type}-${body.osm_id}`, name: body.name, kind: body.addresstype };
}

export function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
