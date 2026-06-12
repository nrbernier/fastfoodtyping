# Diner Polish Pass — 15 Fixes (2026-06-12)

A batch of bug-fixes and visual-polish items from `notes.md` ("List of fixes
2026-06-12"). Most are independent; three carried a design decision, resolved
below.

## Resolved design decisions

- **Money denomination:** scores are tracked in **cents** to match the menu's
  5¢–25¢ prices. A great single order tips under a dollar; a full shift totals a
  few dollars. Displayed as `"85¢"` below a dollar, `"$1.20"` at/above.
- **Order rail / spike:** **additive** — keep the per-customer order tickets
  above each customer's head; on serve, a small ticket flies to a metal counter
  spike and piles up (impaled). No relocation of the live order display.
- **Shift end:** **hard stop at 0:00** — the instant the shift timer expires,
  standing customers are released and the shift ends. Overtime (infinite
  duration) still ends only on 3 strikes.

## Pure-logic changes (TDD)

### #8 Money in cents
- `core/scoring.ts`: `baseTip` → `3 * letters` (cents). Multipliers unchanged.
- New Phaser-free `core/money.ts`: `formatMoney(cents)` → `"<n>¢"` when
  `cents < 100`, else `"$D.CC"`. Unit-tested.
- Wire `formatMoney` into `Hud.setScore`, the tip popup in `GameScene`, and the
  results receipt (`ResultsScene`).

### #14 Hard stop at 0:00
- `core/shiftEngine.ts` `update`: when `elapsed >= durationMs` (finite), release
  every active customer's lock and `end(true)` immediately. Overtime unaffected.

## Customer / typing feel

### #1 Spawn variety
- `shiftEngine.spawn`: choose a **random** free slot instead of the lowest.
- `CustomerView`: small deterministic per-customer horizontal jitter so seats
  aren't a perfect grid.

### #15 Word-done confirmation
- On completion, the live ticket renders **fully green** and does a quick
  flash/pop before the customer is served, so the final letter never lingers
  un-typed. `LiveTicket` gains an "all green" render; `CustomerView` gains a
  `flashComplete(onDone)`; `GameScene.orderServed` calls it before `serve`.

## Scenery / HUD

- **#2 Neon:** one large neon **"Mel's Diner"**; remove the small script title
  and the "EAT" sign. Shift name kept as a small subtitle.
- **#3 Counter props:** add a ketchup/mustard/salt condiment *group*
  (`makeCondimentGroup`), repeated at several spots along the counter, slightly
  reordered each time.
- **#4 Grill above counter:** `PrepStation` and every object it spawns (box,
  dish, powder, steam) get a depth above the counter.
- **#5 / #6:** remove the "NOW PREPARING" label and the cream backdrop rectangle
  at the grill.
- **#7:** remove the clock hand; keep the starburst face + digits.
- **#9 Strikes:** move the three plates to the **top** of the screen, enlarge
  them, and animate a visible crack on the plate that just broke.
- **#10 Receipt spike:** `makeReceiptSpike` on the counter; on serve a small
  ticket flies to it and piles up, growing through the shift.
- **#12 Menu board:** later shifts show progressively weirder tier-3 items
  instead of the plain burger/shake list. Shift index threaded
  `GameScene → DinerBackdrop → makeMenuBoard`.
- **#13 Tip popup:** bigger, rises higher, lingers ~1.6s with a pop.

## Asset fix

### #11 Character corners
- `tools/` script (uv + Pillow) clears the dark chevron/frame remnants in the
  top-left/top-right corners of `businessman.png` and `kid.png`, masking only the
  corners above the shoulder line (hats/bodies untouched). Output to both
  `public/characters/` and `assets-src/characters/`. Eyeball and re-run.

## Verification

- `vitest` for `money.ts`, `scoring.ts`, and the shift-end behaviour.
- `npm run build` for type-safety.
- `tests/screenshot-tour.mjs` to eyeball the visual changes.
</content>
