import { CUSTOM_TOWNS } from './customTowns';
import { distanceM } from './geo';

// The starting area, like the first town and routes in the game: everywhere
// within HOME_RADIUS_M of Citra Garden (the user's home estate).
const HOME_TOWN_ID = 'custom-citra-garden';
const HOME_RADIUS_M = 1000;

// Themes for the home area, by song title (file name in assets/music/).
// Kinds not listed here (city) keep their normal pool.
export const HOME_THEMES: Partial<Record<'city' | 'town' | 'route', string[]>> = {
  town: ['Littleroot Town'],
  route: ['Route 101', 'Route 104'],
};

const home = CUSTOM_TOWNS.find((t) => t.id === HOME_TOWN_ID);
const homePoints = home && 'near' in home ? home.near : [];

export function inHomeArea(lat: number, lon: number): boolean {
  return homePoints.some(([pLon, pLat]) => distanceM(lat, lon, pLat, pLon) <= HOME_RADIUS_M);
}
