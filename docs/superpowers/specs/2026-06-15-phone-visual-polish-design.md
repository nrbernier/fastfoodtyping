# Phone Visual Polish — Stove, Register & Bubbles (2026-06-15)

Eight phone-readability fixes from a phone screenshot of the frozen demo
(`demo/game-state-phone.html`). Pure layout + scenery polish on `GameScene`,
`PrepStation`, `scenery.ts`, `theme.ts`, `Hud`, `DinerBackdrop`. **No engine,
scoring, or typing-logic changes.**

## Resolved design decisions

- **The "stove":** there is no stove drawn today — the prep area is an abstract
  cream "bowl" ellipse. We **evolve that bowl into a clear stove top** (range
  surface + burner ring(s), cream fill, dark line-art edges) rather than
  introducing a foreign object. It stays the prep/serve origin; steam, serve,
  wiggle, and shake animations are unchanged. (User reads the cream bowl as a
  stove already; this just makes it unmistakable.)
- **Score location:** the bottom black HUD bar is removed; the live score renders
  in the **display window of a new vintage cash register** standing right of the
  stove, and updates on every serve (replaces the old mustard score text).
- **Bubble legibility over density:** bigger order bubbles win even on a narrow
  3-seat phone counter; if neighbours crowd, lean on the existing per-seat
  vertical stagger rather than shrinking bubbles back down.

## Vertical re-layout (items 4, 5, 6)

- **Remove the black HUD bar** — `Hud` no longer draws the bottom `bg` rectangle,
  `rail`, or score text. The 3 strike plates stay (top-left, depth 1000). The
  receding floor extends down into the reclaimed space.
- **Shrink the counter band** (currently body height `H*0.1`) and **tighten the
  stove level** to reclaim vertical room.
- **Pull wall furniture down** (neon marquee, menu board, window blinds, shift
  subtitle) using the reclaimed room so the **"Mel's Diner" neon sits clear below
  the 3 strike plates** instead of colliding with them.

## Stove + counter props (items 3, 7, 8 + register)

- **`PrepStation` → stove top:** the bowl graphic becomes a range surface with a
  burner ring; cream/`counterEdge` fills, dark outline. Same `(x, y)`, depth,
  `reposition`, and spawn origins.
- **Red cooking dish:** a round pot/pan filled `COLORS.red` (dark rim, maybe a
  cream highlight) sits on a burner. Dishes still pop from the stove on serve.
- **Receipt spike drops one level:** from counter level (`counterY + 12`) down to
  **stove level, just left of the stove**. `spikeX`/`spikeY` recompute from the
  stove position; already-impaled receipts re-seat via the existing resize path
  (`receiptRestX/Y`, the loop in `layoutDiner`).
- **Vintage cash register:** new `makeCashRegister(scene, x, y)` in `scenery.ts`,
  FCM 1950s line-art style (body, keys, crank, paper-tape, **display window**).
  Stands right of the stove. The score text is re-parented to its display window;
  `Hud.setScore` (or a small register handle) drives it.

## Text bubbles (items 1, 2)

- **Bigger bubbles:** raise `makeLiveTicket` base font (~17 → ~22px); the card
  sizes to text so it grows with it.
- **Phone scale floor:** floor the ticket's effective on-screen scale so bubbles
  stay readable when `uiScale` bottoms out at 0.5 (the customer sprite may still
  shrink to 0.5, but the bubble does not go below a legible minimum).
- **Active ticket always on top:** the locked/served ticket already jumps to
  depth `ticketActive` (1001). Verify the enlarged bubbles can't occlude it —
  keep its depth above sibling tickets and the HUD strikes.

## Verification

- `npm run build` (`tsc --noEmit` + vite) for type-safety.
- Rebuild the demo and eyeball at phone size:
  `node demo/gen-assets.mjs` → `npx vite build --config demo/vite.config.ts` →
  `cp dist-demo/index.html demo/game-state-phone.html` → `node demo/shoot.mjs`.
- Confirm against the 8 requested items: bubbles larger & legible, active ticket
  on top, spike at stove level left of stove, no black bar, score on register,
  shorter counter/stove, neon clear of the 3 plates, red dish on stove.
