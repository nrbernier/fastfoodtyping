# Draws a wooden washtub into the s-17-180 scan in place of the original
# whirlpool, seen from above so the water swirls sit inside its rim.
# usage: python3 tools/draw-tub.py assets-src/characters/originals/s-17-180.png assets-src/characters/stivers/s-17-180.png
import math, sys
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from scipy import ndimage
import numpy as np

src, out = sys.argv[1], sys.argv[2]
orig = Image.open(src).convert("L")
PAD = 50                                   # widen the canvas so the rim fits
im = ImageOps.expand(orig, border=(PAD, 0, PAD, 0), fill=255)
W, H = im.size
S = 4                                      # supersample for smooth ink
# The man's silhouette: everything the open paper around him can't reach
# from the top edge (his outline plus the cream inside it). The back of the
# rim is hidden only there.
paper = np.asarray(im) >= 190
lab, _ = ndimage.label(paper)
outside = np.isin(lab, np.unique(lab[0][lab[0] > 0]))
body = ndimage.binary_dilation(~outside, iterations=3)
big = im.resize((W * S, H * S), Image.LANCZOS)
d = ImageDraw.Draw(big)

cx, cy = 195 + PAD, 234                    # rim ellipse (scan pixels)
RX, RY = 222, 72
bot, RXB, RYB = 396, 170, 46               # bottom ellipse


def inside_rim(x, y):
    return ((x - cx) / RX) ** 2 + ((y - cy) / RY) ** 2 <= 1


# Erase the whirlpool: everything low down that falls outside the rim.
px = big.load()
for y in range(196 * S, H * S):
    for x in range(W * S):
        if not inside_rim(x / S, y / S):
            px[x, y] = 255


def lerp(a, b, t):
    return a + (b - a) * t


def ring(y0, rx, ry, a0, a1, step=2):
    return [(S * (cx + rx * math.cos(math.radians(a))), S * (y0 + ry * math.sin(math.radians(a))))
            for a in range(a0, a1 + 1, step)]


# Tub body: paper fill between the rim's front half and the bottom.
d.polygon(ring(cy, RX, RY, 0, 180, 3) + ring(bot, RXB, RYB, 180, 0, -3)[::1], fill=255)


def line(pts, w):
    d.line(pts, fill=0, width=int(w * S), joint="curve")


# Staves follow the taper and the curve of the front.
for t in (-0.78, -0.47, -0.16, 0.16, 0.47, 0.78):
    pts = []
    for i in range(0, 41):
        f = i / 40
        y0, rx, ry = lerp(cy, bot, f), lerp(RX, RXB, f), lerp(RY, RYB, f)
        pts.append((S * (cx + t * rx), S * (y0 + ry * math.sqrt(1 - t * t))))
    line(pts, 3)
# Iron hoops.
for f in (0.28, 0.78):
    line(ring(lerp(cy, bot, f), lerp(RX, RXB, f), lerp(RY, RYB, f), 0, 180), 11)
line(ring(bot, RXB, RYB, 0, 180), 9)                       # bottom edge
line([(S * (cx - RX), S * cy), (S * (cx - RXB), S * bot)], 9)  # sides
line([(S * (cx + RX), S * cy), (S * (cx + RXB), S * bot)], 9)
line(ring(cy, RX, RY, 0, 180), 9)                          # rim, front half
# Rim, back half: drawn all the way round, hidden where he stands in front.
seg = []
for a10 in range(1800, 3601, 5):
    a = a10 / 10
    x = cx + RX * math.cos(math.radians(a))
    y = cy + RY * math.sin(math.radians(a))
    if body[min(H - 1, int(round(y))), min(W - 1, int(round(x)))]:
        if len(seg) > 1:
            line(seg, 9)
        seg = []
        continue
    seg.append((S * x, S * y))
if len(seg) > 1:
    line(seg, 9)

res = big.filter(ImageFilter.GaussianBlur(S * 0.25)).resize((W, H), Image.LANCZOS)
res.save(out)
