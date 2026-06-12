"""Robot: open headroom above the head, then give both antennae a clean round
ball end. The left antenna's ball was clipped flush; the central head antenna's
tip was cut flat. Drawn from the git-original sprite so it's reproducible."""
import numpy as np
from PIL import Image, ImageDraw

MARGIN = 8
path = "public/characters/robot.png"
im = Image.open(path).convert("RGBA")
w, h = im.size

# headroom: scale down ~3% anchored at the feet
s = (h - 1 - MARGIN) / (h - 1)
nw, nh = round(w * s), round(h * s)
canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
canvas.paste(im.resize((nw, nh), Image.LANCZOS), ((w - nw) // 2, h - nh))

arr = np.array(canvas)
op = arr[..., 3] > 150
rgb = arr[..., :3][op].astype(int)
dark = rgb[rgb.sum(1) <= np.percentile(rgb.sum(1), 5)]
ink = tuple(int(v) for v in dark.mean(0)) + (255,)

# clear the flat-cut tip of the central head antenna (keep its neck at y>=11)
arr[2:11, 79:91, 3] = 0
canvas = Image.fromarray(arr)

d = ImageDraw.Draw(canvas)
d.ellipse([33, 7, 44, 18], outline=ink, width=3)  # left antenna ball
d.ellipse([79, 1, 89, 11], outline=ink, width=3)  # central head antenna ball
canvas.save(path)
canvas.save("assets-src/characters/robot.png")
print("robot: headroom + two round antenna balls")
