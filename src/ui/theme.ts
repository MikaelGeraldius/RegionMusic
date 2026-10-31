import type { RegionKind } from '../region/lookup';

// Dark 60/30/10: deep blue-black base, warm off-white text, one accent per area kind.
export const color = {
  bg: '#111319',
  surface: '#1B1E27',
  ink: '#F1EEE6',
  inkBody: 'rgba(241,238,230,0.8)',
  inkMuted: 'rgba(241,238,230,0.6)',
  line: 'rgba(241,238,230,0.08)',
  border: 'rgba(241,238,230,0.14)',
  footer: 'rgba(17,19,25,0.94)',
  live: '#4CC38A',
  liveTint: 'rgba(76,195,138,0.14)',
  error: '#F07A6E',
  errorTint: 'rgba(240,122,110,0.12)',
};

export const kindStyle: Record<RegionKind, { label: string; plural: string; accent: string; tint: string }> = {
  city: { label: 'City', plural: 'cities', accent: '#9A9BFF', tint: 'rgba(154,155,255,0.14)' },
  town: { label: 'Town', plural: 'towns', accent: '#4CC38A', tint: 'rgba(76,195,138,0.14)' },
  route: { label: 'Route', plural: 'routes', accent: '#F0A45C', tint: 'rgba(240,164,92,0.14)' },
};

// Four sizes, two weights.
export const type = {
  hero: { fontSize: 32, lineHeight: 40, fontWeight: '600' },
  stat: { fontSize: 20, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 16, fontWeight: '400' },
} as const;

// 8-point grid.
export const space = { xs: 4, s: 8, m: 16, l: 24, xl: 32, xxl: 48 };
