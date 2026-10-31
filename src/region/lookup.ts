import { fetchWithTimeout } from '../net';
import { CUSTOM_TOWNS, type CustomTown } from './customTowns';
import { distanceM } from './geo';
import { inHomeArea } from './home';

export { distanceM };

// Pokemon-style place kinds: each plays from its own pool of themes.
export type RegionKind = 'city' | 'town' | 'route';

export type Region = {
  id: string; // stable id, used to pick the region's theme
  name: string;
  kind: RegionKind;
  home?: boolean; // in the starting area around the user's home (see home.ts)
};

// Nominatim reverse geocoding (Overpass is unreachable from the user's network).
// Usage policy: identify the app and stay under 1 request/s; we only look up
// after moving TRACKING.requeryDistanceM. Phase 3 replaces this with cached polygons.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const REQUEST_GAP_MS = 1100;
// Big places whose insides reverse geocoding hides behind a shop or parking lot.
const NEARBY_PHRASES = ['mall', 'university'];
// Search box half-size in degrees (~330 m), big enough for any of them around us.
const NEARBY_SEARCH_DEG = 0.003;

// City rule: malls of any size, or anything big you can be inside of (buildings,
// campuses, hospitals, stations...) of at least this footprint.
const LARGE_BUILDING_M2 = 5000;
const CITY_SHOPS = ['mall', 'department_store'];
// Big outlines that are land, not a building or complex.
const NOT_BUILDINGS = ['highway', 'landuse', 'place', 'boundary', 'natural', 'waterway'];
const BUILDING_LEISURE = ['stadium', 'sports_centre', 'sports_hall'];
// Housing complexes are often mapped as place=neighbourhood with these words.
const COMPLEX_NAME = /\b(komplek|kompleks|perumahan|perum|cluster|residence|residen)\b/i;

type Geometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'Polygon'; coordinates: [number, number][][] }
  | { type: 'MultiPolygon'; coordinates: [number, number][][][] }
  | { type: string; coordinates: unknown };

type Place = {
  osm_type?: string;
  osm_id?: number;
  category?: string;
  type?: string;
  name?: string;
  geojson?: Geometry;
  address?: Record<string, string>;
  boundingbox?: [string, string, string, string]; // south, north, west, east
};

let lastRequestAt = 0;

async function nominatim<T>(path: string): Promise<T> {
  const wait = lastRequestAt + REQUEST_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  const res = await fetchWithTimeout(`${NOMINATIM_URL}${path}&format=jsonv2`, {
    headers: {
      // Android's default "okhttp/x" User-Agent is rejected by OSM services.
      'User-Agent': 'RegionMusic/0.1 (personal test app)',
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Region lookup ${res.status}`);
  return res.json();
}

async function reverse(lat: number, lon: number, zoom: number): Promise<Place | null> {
  const body = await nominatim<Place>(
    `/reverse?zoom=${zoom}&addressdetails=1&polygon_geojson=1&polygon_threshold=0.00001&lat=${lat}&lon=${lon}`,
  );
  return body?.osm_id ? body : null; // null e.g. at sea
}

// Inside a mall or campus, reverse geocoding returns the nearest shop, restaurant
// or parking lot in it, not the place itself. So search for those places nearby,
// keep the ones whose bounding box holds the point, then fetch their outlines.
async function bigPlaceAt(lat: number, lon: number): Promise<Place | null> {
  const d = NEARBY_SEARCH_DEG;
  const candidates: Place[] = [];
  for (const phrase of NEARBY_PHRASES) {
    const nearby = await nominatim<Place[]>(
      `/search?q=${phrase}&bounded=1&limit=20&viewbox=${lon - d},${lat + d},${lon + d},${lat - d}`,
    );
    candidates.push(
      ...nearby.filter((p) => {
        if (!p.boundingbox || p.osm_type === 'node') return false;
        const [s, n, w, e] = p.boundingbox.map(Number);
        return lat >= s && lat <= n && lon >= w && lon <= e;
      }),
    );
  }
  if (candidates.length === 0) return null;
  const ids = candidates.map((p) => `${p.osm_type![0].toUpperCase()}${p.osm_id}`).join(',');
  const outlines = await nominatim<Place[]>(
    `/lookup?osm_ids=${ids}&polygon_geojson=1&polygon_threshold=0.00001`,
  );
  return outlines.find((p) => contains(p.geojson, lat, lon)) ?? null;
}

const placeId = (p: Place) => `osm-${p.osm_type}-${p.osm_id}`;

export async function regionAt(lat: number, lon: number): Promise<Region | null> {
  const region = await classify(lat, lon);
  if (!region || !inHomeArea(lat, lon)) return region;
  // A separate id, so the same kelurahan switches music at the home area's edge.
  return { ...region, id: `${region.id}@home`, home: true };
}

// City = inside a mall or a large building. Town = inside a housing complex.
// Route = anywhere else, named after the kelurahan so a stretch keeps its theme.
async function classify(lat: number, lon: number): Promise<Region | null> {
  const spot = await reverse(lat, lon, 18);
  if (spot?.name && isCity(spot, lat, lon)) {
    return { id: placeId(spot), name: spot.name, kind: 'city' };
  }
  const big = await bigPlaceAt(lat, lon);
  if (big?.name) return { id: placeId(big), name: big.name, kind: 'city' };

  const custom = customTownAt(lat, lon);
  if (custom) return { id: custom.id, name: custom.name, kind: 'town' };

  const area = await reverse(lat, lon, 15);
  if (area?.name && isComplex(area) && contains(area.geojson, lat, lon)) {
    return { id: placeId(area), name: area.name, kind: 'town' };
  }

  const addr = spot?.address ?? area?.address ?? {};
  const routeName = addr.village ?? addr.suburb ?? addr.neighbourhood ?? addr.city_district;
  if (!routeName) return null;
  return { id: `route-${routeName}`, name: routeName, kind: 'route' };
}

function isCity(p: Place, lat: number, lon: number): boolean {
  if (!contains(p.geojson, lat, lon)) return false;
  if (p.category === 'shop' && CITY_SHOPS.includes(p.type ?? '')) return true;
  const category = p.category ?? '';
  if (NOT_BUILDINGS.includes(category)) return false;
  if (category === 'leisure' && !BUILDING_LEISURE.includes(p.type ?? '')) return false; // parks, pitches
  return areaM2(p.geojson) >= LARGE_BUILDING_M2;
}

function customTownAt(lat: number, lon: number): CustomTown | null {
  return (
    CUSTOM_TOWNS.find((t) =>
      'area' in t
        ? inRing(t.area, lat, lon)
        : t.near.some(([pLon, pLat]) => distanceM(lat, lon, pLat, pLon) <= t.radiusM),
    ) ?? null
  );
}

function isComplex(p: Place): boolean {
  if (p.category === 'landuse' && p.type === 'residential') return true;
  return p.category === 'place' && p.type === 'neighbourhood' && COMPLEX_NAME.test(p.name ?? '');
}

function polygons(g: Geometry | undefined): [number, number][][][] {
  if (g?.type === 'Polygon') return [g.coordinates as [number, number][][]];
  if (g?.type === 'MultiPolygon') return g.coordinates as [number, number][][][];
  return [];
}

// Ray casting on [lon, lat] rings; holes are the rings after the first.
function inRing(ring: [number, number][], lat: number, lon: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function contains(g: Geometry | undefined, lat: number, lon: number): boolean {
  return polygons(g).some(
    ([outer, ...holes]) => inRing(outer, lat, lon) && !holes.some((h) => inRing(h, lat, lon)),
  );
}

// Shoelace on an equirectangular projection; plenty accurate at building scale.
function areaM2(g: Geometry | undefined): number {
  const mPerDeg = 111_320;
  let total = 0;
  for (const [outer] of polygons(g)) {
    const kx = mPerDeg * Math.cos((outer[0][1] * Math.PI) / 180);
    let sum = 0;
    for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
      sum += outer[j][0] * kx * (outer[i][1] * mPerDeg) - outer[i][0] * kx * (outer[j][1] * mPerDeg);
    }
    total += Math.abs(sum) / 2;
  }
  return total;
}
