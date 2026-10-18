# Draws a wooden washtub into the s-17-180 scan in place of the original whirlpool.
# usage: python3 tools/draw-tub.py assets-src/characters/originals/s-17-180.png assets-src/characters/stivers/s-17-180.png
import math, sys
from PIL import Image, ImageDraw, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("L")
W, H = im.size
S = 4  # supersample for smooth ink
big = im.resize((W * S, H * S), Image.LANCZOS)
d = ImageDraw.Draw(big)
d.rectangle([0, 270 * S, W * S, H * S], fill=255)            # erase whirlpool
cx, top, bot = 200, 262, 418
rx_top, rx_bot, ry = 152, 112, 20
def rx_at(y): return rx_top + (rx_bot - rx_top) * (y - top) / (bot - top)
def arc(y, rx, ryy, w, a0=0, a1=180):
    pts = [(S * (cx + rx * math.cos(math.radians(a))), S * (y + ryy * math.sin(math.radians(a))))
           for a in range(a0, a1 + 1, 2)]
    d.line(pts, fill=0, width=w * S, joint="curve")
# body of the tub: cream fill bounded by rim front, sides, bottom
poly = [(S * (cx + rx_top * math.cos(math.radians(a))), S * (top + ry * math.sin(math.radians(a)))) for a in range(0, 181, 3)]
poly += [(S * (cx + rx_bot * math.cos(math.radians(a))), S * (bot + 14 * math.sin(math.radians(a)))) for a in range(180, -1, -3)]
d.polygon(poly, fill=255)
# staves: gently bowed lines following the taper
for t in (-0.66, -0.31, 0.04, 0.42, 0.74):
    pts = []
    for y in range(top + 18, bot + 8, 4):
        rx = rx_at(y)
        bow = 1 + 0.04 * math.sin(math.pi * (y - top) / (bot - top))
        pts.append((S * (cx + t * rx * bow), S * (y + ry * 0.9 * math.sqrt(max(0, 1 - t * t)))))
    d.line(pts, fill=0, width=3 * S)
# iron hoops: thick bands
for y in (300, 380):
    rx = rx_at(y)
    arc(y, rx, ry * 0.9, 12)
arc(top, rx_top, ry, 9)                                       # rim front
arc(bot, rx_bot, 14, 9)                                       # bottom edge
d.line([(S * (cx - rx_top), S * top), (S * (cx - rx_bot), S * bot)], fill=0, width=9 * S)
d.line([(S * (cx + rx_top), S * top), (S * (cx + rx_bot), S * bot)], fill=0, width=9 * S)
im2 = big.filter(ImageFilter.GaussianBlur(S * 0.25)).resize((W, H), Image.LANCZOS)
im2.save(out)
