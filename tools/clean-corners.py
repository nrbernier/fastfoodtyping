"""Erase the leftover dark diamond-frame marks in the top corners of the
businessman and newspaper-boy sprites.

The marks are isolated opaque islands disconnected from the figure by
transparency. The trick is telling them apart from the figure's *interior*
detail (eyes, nose, mouth) which are ALSO disconnected dark islands floating in
the light skin. The discriminator: the corner frame marks touch the image
border, while interior facial features never do. So: label connected opaque
regions, keep the big one (the figure), and erase only the *other* regions that
sit entirely above the shoulder line AND touch the top/left/right edge. A small
dilation mops up the anti-aliased fringe, and we never touch the figure
component or anything below the shoulder line.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SHOULDER_Y = 115  # marks live well above this; the figure's head is the big component

for name in ("businessman", "kid"):
    path = f"public/characters/{name}.png"
    arr = np.array(Image.open(path).convert("RGBA"))
    h, w = arr.shape[:2]
    opaque = arr[..., 3] > 40
    lbl, n = ndimage.label(opaque, structure=np.ones((3, 3)))  # 8-connectivity
    sizes = ndimage.sum(np.ones_like(lbl), lbl, index=range(1, n + 1))
    main = 1 + int(np.argmax(sizes))

    remove = np.zeros_like(opaque)
    for comp in range(1, n + 1):
        if comp == main:
            continue
        ys, xs = np.where(lbl == comp)
        above_shoulders = ys.max() < SHOULDER_Y
        touches_border = ys.min() == 0 or xs.min() == 0 or xs.max() == w - 1
        if above_shoulders and touches_border:  # a corner frame mark, not a face
            remove |= lbl == comp

    dil = ndimage.binary_dilation(remove, iterations=2)
    dil &= lbl != main                                  # never bite into the figure
    rows = np.arange(h)[:, None]
    dil &= rows < SHOULDER_Y                             # stay in the top region
    arr[..., 3][dil] = 0

    # Bottom-corner residue: the diamond frame also leaves tiny triangular wedges
    # in the two bottom corners (businessman). Clear a small right-triangle in
    # each bottom corner — the figures' legs/feet sit well inboard of here.
    CORNER = 13
    yy, xx = np.mgrid[0:h, 0:w]
    dy = (h - 1) - yy
    bl = (xx + dy) < CORNER                              # bottom-left triangle
    br = ((w - 1 - xx) + dy) < CORNER                    # bottom-right triangle
    cleared = int((arr[..., 3][bl | br] > 0).sum())
    arr[..., 3][bl | br] = 0

    out = Image.fromarray(arr)
    out.save(path)
    out.save(f"assets-src/characters/{name}.png")
    print(f"{name}: {n} components, erased {int(remove.sum())}px top (+fringe), {cleared}px bottom corners")
