import type { Region } from './region/lookup';
import type { Visit } from './storage';

// Sample data for public screenshots, so they show no real location history or
// soundtrack titles. On only when the dev server runs with EXPO_PUBLIC_DEMO=1;
// tracking and music stay off.
export const DEMO = process.env.EXPO_PUBLIC_DEMO === '1';

export const DEMO_REGION: Region = {
  id: 'demo-sms',
  name: 'Summarecon Mall Serpong',
  kind: 'city',
};

export const DEMO_SONG = 'City theme';

const at = (h: number, m: number) => new Date().setHours(h, m, 0, 0);

export const DEMO_VISITS: Visit[] = [
  { t: at(13, 5), name: 'Summarecon Mall Serpong', kind: 'city', song: 'City theme' },
  { t: at(12, 52), name: 'Kelapa Dua', kind: 'route', song: 'Route theme' },
  { t: at(12, 40), name: 'Scientia Residences', kind: 'town', song: 'Town theme' },
  { t: at(12, 28), name: 'Curug Sangereng', kind: 'route', song: 'Route theme' },
  { t: at(12, 10), name: 'Universitas Multimedia Nusantara', kind: 'city', song: 'City theme' },
];
