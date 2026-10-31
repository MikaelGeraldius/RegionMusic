import type { RegionKind } from '../region/lookup';

// Taken from the app icon: pale meadow green base, deep green ink (the sprite's
// outline), pastel area colours, and the critter's cheek pink for the main button.
export const color = {
  bg: '#E3F2D9',
  surface: '#FAFDF5',
  ink: '#21352A',
  inkBody: 'rgba(33,53,42,0.8)',
  inkMuted: 'rgba(33,53,42,0.6)',
  line: 'rgba(33,53,42,0.08)',
  border: 'rgba(33,53,42,0.14)',
  footer: 'rgba(227,242,217,0.94)',
  live: '#2F8A4C',
  liveTint: 'rgba(108,203,95,0.22)',
  error: '#C4483D',
  errorTint: 'rgba(196,72,61,0.1)',
  primary: '#F7B8D3',
  primaryShadow: '#E07FAA',
};

// Pastel tint for surfaces, deeper accent for text and icons on them.
export const kindStyle: Record<RegionKind, { label: string; plural: string; accent: string; tint: string }> = {
  city: { label: 'City', plural: 'cities', accent: '#5563D1', tint: 'rgba(111,179,242,0.24)' },
  town: { label: 'Town', plural: 'towns', accent: '#2F8A4C', tint: 'rgba(108,203,95,0.24)' },
  route: { label: 'Route', plural: 'routes', accent: '#B8641A', tint: 'rgba(240,164,92,0.26)' },
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
