export type Region = {
  id: string; // stable OSM area id, used to pick the region's music
  name: string;
  level: number; // OSM admin_level: 7 = kelurahan/desa, 6 = kecamatan
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Spike-only: one online query per lookup. Phase 3 replaces this with cached polygons.
export async function regionAt(lat: number, lon: number): Promise<Region | null> {
  const query =
    `[out:json][timeout:15];is_in(${lat},${lon})->.a;` +
    `area.a["boundary"="administrative"]["admin_level"~"^(6|7)$"];out tags;`;
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  const { elements } = (await res.json()) as {
    elements: { id: number; tags?: Record<string, string> }[];
  };

  // Most specific first: kelurahan (7), then kecamatan (6).
  const areas = elements
    .filter((e) => e.tags?.name)
    .map((e) => ({ id: `osm-${e.id}`, name: e.tags!.name, level: Number(e.tags!.admin_level) }))
    .sort((a, b) => b.level - a.level);
  return areas[0] ?? null;
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
