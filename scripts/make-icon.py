"""Draws the RegionMusic app icon: an original pocket-monster style pixel sprite
(a round blue critter with a leaf sprout and headphones) on a battle platform,
in GBA-era colours.

Writes the master SVG to icon-design/icon.svg and every PNG the app needs into
assets/. The sprite is one pixel map, so SVG and PNGs always match.
Run: python scripts/make-icon.py   (needs Pillow)
"""
import os

from PIL import Image, ImageDraw

ROOT = os.path.join(os.path.dirname(__file__), '..')
ASSETS = os.path.join(ROOT, 'assets')

# Left half of the sprite (10 columns); each row is mirrored to 20 columns.
HALF = [
    '......KK..',
    '.....KGGK.',
    '.....KGGGK',
    '...hhhh.KD',
    '..hh..KKKK',
    '..h.KKBBBB',
    '.hh.KBBBBB',
    '.h.KBBBBBB',
    'HHHKBBBBBB',
    'HHHKBEWBBB',
    'HHHKBEEBBB',
    'HHHKBEEBBB',
    'HHHKBPPBBK',
    '...KBBBBBB',
    '....KBBBLL',
    '....KBBLLL',
    '.....KBBLL',
    '....KBBKKK',
    '....KKK...',
]
SPRITE = [row + row[::-1] for row in HALF]

COLORS = {
    'K': '#1E2A26',  # outline
    'B': '#6FB3F2',  # body
    'L': '#F6EDD3',  # belly
    'G': '#6CCB5F',  # leaf
    'D': '#3E8E41',  # stem
    'E': '#1E2A26',  # eye
    'W': '#FFFFFF',  # eye glint
    'P': '#F49AC1',  # cheek
    'H': '#F0A45C',  # headphone cup
    'h': '#E8E8EA',  # headphone band
}
SKY = '#C9EBB8'       # battle background
PLATFORM = '#97CF83'  # grass platform under the sprite
PLATFORM_EDGE = '#7AB866'

CELL = 32             # sprite pixel size on the 1024 master
SIZE = 1024


def layout(scale=1.0):
    """Sprite origin and platform ellipse for a canvas where the art fills `scale`."""
    cell = CELL * scale
    w, h = len(SPRITE[0]) * cell, len(SPRITE) * cell
    x0 = (SIZE - w) / 2
    y0 = (SIZE - h) / 2 - 24 * scale
    feet = y0 + (len(SPRITE) - 1) * cell
    plat = (SIZE / 2, feet + 0.75 * cell, 9 * cell, 1.9 * cell)  # cx, cy, rx, ry
    return cell, x0, y0, plat


def runs(row):
    """Horizontal runs of equal colour: (start, length, char)."""
    i = 0
    while i < len(row):
        j = i
        while j < len(row) and row[j] == row[i]:
            j += 1
        if row[i] != '.':
            yield i, j - i, row[i]
        i = j


def write_svg(path):
    cell, x0, y0, (cx, cy, rx, ry) = layout()
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">',
        '  <title>RegionMusic</title>',
        f'  <rect id="bg" width="1024" height="1024" fill="{SKY}"/>',
        f'  <ellipse cx="{cx:g}" cy="{cy + 8:g}" rx="{rx:g}" ry="{ry:g}" fill="{PLATFORM_EDGE}"/>',
        f'  <ellipse cx="{cx:g}" cy="{cy:g}" rx="{rx:g}" ry="{ry:g}" fill="{PLATFORM}"/>',
        '  <g id="glyph">',
    ]
    for y, row in enumerate(SPRITE):
        for x, n, ch in runs(row):
            parts.append(
                f'    <rect x="{x0 + x * cell:g}" y="{y0 + y * cell:g}" width="{n * cell:g}" '
                f'height="{cell:g}" fill="{COLORS[ch]}"/>'
            )
    parts += ['  </g>', '</svg>', '']
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))


def draw(size, scale, background=True, mono=None):
    """Raster version at `size` px. scale = how much of the canvas the art fills (1 = master)."""
    k = size / SIZE
    img = Image.new('RGBA', (size, size), SKY if background else (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cell, x0, y0, (cx, cy, rx, ry) = layout(scale)
    if not mono:
        for dy, colour in ((8 * scale, PLATFORM_EDGE), (0, PLATFORM)):
            d.ellipse([(cx - rx) * k, (cy + dy - ry) * k, (cx + rx) * k, (cy + dy + ry) * k], fill=colour)
    for y, row in enumerate(SPRITE):
        for x, n, ch in runs(row):
            if mono and ch in 'EWP':
                continue  # keep the face readable as holes in the silhouette
            left = round((x0 + x * cell) * k)
            top = round((y0 + y * cell) * k)
            right = round((x0 + (x + n) * cell) * k)
            bottom = round((y0 + (y + 1) * cell) * k)
            d.rectangle([left, top, right - 1, bottom - 1], fill=mono or COLORS[ch])
    return img


def main():
    write_svg(os.path.join(ROOT, 'icon-design', 'icon.svg'))
    # Full-square icon (Android/iOS apply their own mask).
    draw(1024, 1.05).convert('RGB').save(os.path.join(ASSETS, 'icon.png'))
    # Android adaptive icon: art inside the 66% safe zone over a flat background.
    draw(1024, 0.72, background=False).save(os.path.join(ASSETS, 'android-icon-foreground.png'))
    Image.new('RGB', (1024, 1024), SKY).save(os.path.join(ASSETS, 'android-icon-background.png'))
    draw(1024, 0.72, background=False, mono='#FFFFFF').save(
        os.path.join(ASSETS, 'android-icon-monochrome.png')
    )
    draw(1024, 0.9, background=False).save(os.path.join(ASSETS, 'splash-icon.png'))
    draw(1024, 0.95).resize((48, 48), Image.NEAREST).save(os.path.join(ASSETS, 'favicon.png'))
    print('Wrote icon-design/icon.svg, icon.png, android-icon-*.png, splash-icon.png, favicon.png')


if __name__ == '__main__':
    main()
