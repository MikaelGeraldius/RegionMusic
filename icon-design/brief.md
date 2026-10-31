# Icon brief: RegionMusic
Assumptions: "Pokemon themed" = evoke GBA-era monster-RPG overworlds (route signs, tall grass, chunky pixel edges) with an original mark. No franchise characters, Poké Ball or logo. House style is overridden in one way only: edges may be pixel-stepped to read as retro handheld art; everything else (symmetric glyph, one accent, flat dark background) stays.
Product: personal Android app that autoplays a city / town / route theme for the area you're in  ·  Audience: one user, walking and riding around Jakarta  ·  Category neighbors: music players (notes, headphones, vinyl, waveforms), maps (location pin, folded map), the previous RegionMusic icon (pin + note).

## Concepts

### 1. Route sign  (axis: vertical)
Depicts: a route signpost
Metaphor: the wooden sign you pass when you enter a new route; here it announces the area's theme instead of its name.
Gestalt device: figure-ground (a music note knocked out of the sign board)
16px risk: the note's stem and flag close up; the board + post silhouette must carry it alone.
Distinct from: notes/headphones (music apps), pins/folded maps (map apps); no music app uses a signpost.
Not a UI glyph: checked against location pin, info, settings, share; a board on a post matches none.

### 2. Tall grass  (axis: vertical)
Depicts: a grass tuft
Metaphor: the patch of tall grass where things happen in every overworld; the music is hiding in it.
Gestalt device: figure-ground (the gap between the two middle blades forms a note)
16px risk: the hidden note vanishes; what's left is a generic plant icon.
Distinct from: music and map clichés, but close to gardening and eco apps.
Not a UI glyph: checked against refresh, upload, sparkle; none match.

### 3. Creature egg  (axis: vertical)
Depicts: a spotted egg
Metaphor: something collectible waiting to hatch; each area is a new find.
Gestalt device: similarity-break (a row of round spots where one spot is a note head)
16px risk: spots turn to noise; reads as an Easter egg.
Distinct from: music and map clichés, but generic as a holiday symbol.
Not a UI glyph: checked against record and microphone; the egg shape matches neither.

## Palette
Background #2A2A2E · Glyph #E8E8EA · Accent #F0A45C (route orange from the app)

## Recommendation
1. Route sign: it names an object, has real mass, and *is* what the app does (announce each area like a route sign), and the signpost is the most era-evoking shape that isn't owned by anyone.

## Revision (2026-10-31): user chose a monster-RPG sprite
The user asked for the icon to be Pokémon-inspired outright, so the route-sign concepts (candidates/) were set aside. Final: an original GBA-style pixel creature (round blue body, leaf sprout, headphones) on a grass battle platform over a pale green backdrop. Drawn from one pixel map by scripts/make-icon.py, which writes icon-design/icon.svg and every PNG in assets/. House-style overrides, deliberate: light background, 12-colour sprite palette, full-square canvas (Android/iOS mask it themselves). check_svg.py security checks pass; its three house-style errors are these overrides.
