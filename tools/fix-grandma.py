"""Grandma: open headroom above the hat, then close the broken crown top with a
gentle, line-weight dome arc. Kept separate so the arc can be tuned without
disturbing the robot."""
import numpy as np
from PIL import Image, ImageDraw

MARGIN = 8
path = "public/characters/grandma.png"
im = Image.open(path).convert("RGBA")
w, h = im.size

# headroom: scale down ~3% anchored at the feet
s = (h - 1 - MARGIN) / (h - 1)
nw, nh = round(w * s), round(h * s)
canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
canvas.paste(im.resize((nw, nh), Image.LANCZOS), ((w - nw) // 2, h - nh))

# sample ink colour from the figure's darkest pixels
arr = np.array(canvas)
op = arr[..., 3] > 150
rgb = arr[..., :3][op].astype(int)
dark = rgb[rgb.sum(1) <= np.percentile(rgb.sum(1), 5)]
ink = tuple(int(v) for v in dark.mean(0)) + (255,)

# straight horizontal line closing the broken top of the hat crown. It runs
# wide enough to overlap the thick part of the side outline on each side, and is
# kept thin so it reads as a continuation of those lines rather than a bar.
d = ImageDraw.Draw(canvas)
d.line([(78, 8), (108, 8)], fill=ink, width=2)

canvas.save(path)
canvas.save("assets-src/characters/grandma.png")
print("grandma: headroom + slim crown arc done")
