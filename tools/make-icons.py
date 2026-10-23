"""Render the app icons: Hot Dog Hank mid-bite on a mustard starburst.

The scan trims the back of Hank's head, so he runs off the left edge of the
icon, where the cut lines up with the border.

Usage: python3 tools/make-icons.py
Writes public/icon-{512,192}.png, icon-maskable-512.png, apple-touch-icon.png
and favicon-32.png.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
SIZE = 1024  # drawn large, then scaled down for each output

RED = (214, 59, 42)
MUSTARD = (227, 165, 28)
MUSTARD_LIGHT = (240, 189, 61)
INK = (38, 34, 30)
CREAM = (244, 232, 207)


def starburst(draw, cx, cy, r, spikes, fill, inner=0.8):
    pts = []
    for i in range(spikes * 2):
        a = i / (spikes * 2) * math.tau - math.pi / 2
        rr = r if i % 2 == 0 else r * inner
        pts.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    draw.polygon(pts, fill=fill)


def render(art_scale=1.0, art_dx=0, art_dy=0):
    """Full-bleed artwork; `art_scale` shrinks Hank toward the centre (for maskable icons)."""
    img = Image.new('RGB', (SIZE, SIZE), RED)
    d = ImageDraw.Draw(img)
    starburst(d, SIZE * 0.52, SIZE * 0.46, SIZE * 0.52, 20, MUSTARD)
    starburst(d, SIZE * 0.52, SIZE * 0.46, SIZE * 0.36, 20, MUSTARD_LIGHT, inner=0.86)
    # checkerboard floor
    band = int(SIZE * 0.14)
    n = 8
    for i in range(n):
        d.rectangle([i * SIZE / n, SIZE - band, (i + 1) * SIZE / n, SIZE], fill=CREAM if i % 2 else INK)
    hank = Image.open(PUBLIC / 'characters' / 's-07-056.png').convert('RGBA')
    h = int(SIZE * 0.86 * art_scale)
    w = round(hank.width * h / hank.height)
    hank = hank.resize((w, h), Image.LANCZOS)
    # left edge (the trimmed back of his head) flush with the icon's left border
    x = int(art_dx)
    y = int(SIZE - band * 0.55 - h + art_dy)
    img.paste(hank, (x, y), hank)
    return img


def save(img, size, name):
    img.resize((size, size), Image.LANCZOS).save(PUBLIC / name, optimize=True)
    print('wrote', name)


if __name__ == '__main__':
    full = render()
    save(full, 512, 'icon-512.png')
    save(full, 192, 'icon-192.png')
    save(full, 180, 'apple-touch-icon.png')
    save(full, 32, 'favicon-32.png')
    # Android crops maskable icons to a circle or squircle: Hank a little smaller so his
    # face stays inside, still flush left so the mask hides the trimmed edge.
    save(render(art_scale=0.88, art_dy=-SIZE * 0.03), 512, 'icon-maskable-512.png')
