# Short-Order Hero — Design Spec

*(Working title — the game can be renamed later with no design impact.)*

**Date:** 2026-06-09
**Status:** Approved by user (brainstorming session)

## Concept

A typing-trainer arcade game inspired by *The Typing of the Dead*, with a quirky, non-violent theme: you are a short-order cook in a cartoonish 1950's American diner. Customers line up across the counter with orders shown in speech bubbles; you type each order to cook and serve it before the customer's patience runs out.

The menu escalates from normal diner fare ("burger", "malt") to increasingly absurd dishes ("zebra soufflé", "quantum quince bisque"). The escalating absurdity is both the joke and the difficulty curve: the orders get longer and use rarer letters as the game progresses.

Primary purpose: **typing training**. Large vocabulary, natural letter-frequency coverage including rare letters, minimal word repetition.

Target platforms: desktop browsers (physical keyboard) and phones (native virtual keyboard), shipped as one responsive web app / PWA. No backend, no accounts.

## Game Flow & Screens

1. **Title screen** — neon-sign 50's styling. Buttons: Start Shift, Overtime (locked until all shifts complete), high scores.
2. **Shift select** — 5 themed shifts forming a difficulty ramp (e.g., *Monday: Breakfast Rush* → *Friday: Full Moon Special*). Each shift unlocks the next. Completing all five unlocks **Overtime** (endless mode).
3. **Gameplay** — see Layout and Core Mechanics below.
4. **Shift end** — results styled as a till receipt: customers served, accuracy, WPM, tips (score), best combo. On failure: a gently comic "YOU'RE FIRED" stamp, then retry. New high scores recorded.

**Persistence:** shift unlocks and high scores in localStorage (versioned wrapper). No server.

## Gameplay Layout

First-person "behind the counter" view (user-selected over a side-scrolling queue):

- **Top — the counter:** customers face the player across the counter. Each has a speech-bubble order and a patience bar. Expressions sour as patience drains.
- **Middle — the prep station:** ingredient boxes and a food-processor bowl. Typing visibly "cooks" the order: completing each word of an order tips a labeled box (e.g., "ZEBRA") that pours powder into the bowl; on the order's final letter the processor whirs, the dish pops out and slides to the customer, who leaves happy with a tip. Non-graphic, cartoon style.
- **Bottom — HUD:** strikes (angry-customer icons), the currently locked order with typed letters highlighted, and the tip jar (score). On phones this HUD sits directly above the native keyboard.

## Core Mechanics

**Customers & waves:** customers arrive in small overlapping waves. 1–4 visible at once on desktop, 2–3 on phones. All concurrently visible orders are guaranteed distinct first letters (enforced at spawn) so lock-on is never ambiguous.

**Typing & lock-on (Typing-of-the-Dead style):**
- Typing a letter locks onto the customer whose order starts with that letter; their bubble enlarges and the HUD mirrors the order with typed letters highlighted.
- Wrong keystrokes buzz, shake the bowl, and count against accuracy, but never lose progress — the player just presses the correct key.
- No Enter to submit; the order completes on its last letter. No backspace needed.
- Spaces in multi-word orders are typed normally.
- Matching is case-insensitive; accents are normalized (typing `souffle` matches `soufflé`).

**Patience & strikes:** patience bars drain steadily (green → yellow → red). An emptied bar means the customer storms out: 1 strike. 3 strikes ends the shift. Serving while the bar is still green earns a patience bonus.

**Scoring:** tips = base value scaled by order length + patience bonus, multiplied by a combo multiplier (consecutive orders completed without a wrong keystroke; reset on mistake). The shift-end receipt also reports WPM and accuracy.

## Vocabulary & Difficulty System

**Tiers:**
- **Tier 1 — The Regulars:** real short menu words (`burger`, `malt`, `fries`, `soda`, `pie`).
- **Tier 2 — The Specials:** real, longer items (`banana split`, `chicken pot pie`, `onion rings`).
- **Tier 3+ — The Weird Stuff:** combinatorially generated from curated pools: `[preparation] [ingredient] [dish form]` — e.g., `pickled zebra waffles`, `flambéed cactus chowder`. Three pools of ~60–80 words each yield tens of thousands of dishes that always parse logically as food.

**Typing-training requirements:**
- Pools curated so all letters, including rare ones, appear at natural rates (`quince`, `jicama`, `yuzu`, `zucchini`, `xigua`, …).
- A recent-words buffer prevents any pool word from reappearing within its last 50 uses in the session.
- All order text lowercase for matching; display may be styled.

**Difficulty knobs:** word tier mix, words per order (1→3), spawn rate, max simultaneous customers, patience duration. Each shift defines fixed curves over its duration (Monday ≈ all Tier 1; Friday starts Tier 2, ends deep Tier 3 with 3-word orders). Overtime escalates the same knobs continuously without limit.

## Mobile Layout & Input

- Portrait phone: diner scene compresses to the top ~45% of the viewport, HUD directly below it, native keyboard below that.
- A visually-hidden DOM input field keeps the keyboard summoned during gameplay, with `autocorrect`, `autocapitalize`, `spellcheck`, and suggestions disabled. Its events feed the same input pipeline as physical keystrokes.
- The `visualViewport` API provides the actual keyboard height so no gameplay-critical element is covered.
- Desktop listens to the physical keyboard directly; the hidden input is mobile-only.

## Architecture

**Stack:** Phaser 3 + TypeScript + Vite; PWA via `vite-plugin-pwa` (installable, offline-capable). No backend.

**Two-layer split:**

- **Game core (plain TypeScript, zero Phaser imports):**
  - Order generator: vocabulary pools, tier mixing, first-letter dedup, recent-words buffer.
  - Typing engine: lock-on state machine, match/mistake handling, accent/case normalization.
  - Rules: patience, strikes, scoring/combo, difficulty curves, shift definitions (data files).
  - Emits events: `orderLocked`, `wordCompleted`, `orderServed`, `customerLeft`, `mistake`, `shiftEnded`.
  - Fully unit-testable without a browser.

- **Phaser layer (rendering only):**
  - Scenes: `Boot`, `Title`, `ShiftSelect`, `Game`, `Results`.
  - Customers, prep-station animations, dish slide, tweens, audio, HUD.
  - Subscribes to core events and renders consequences; contains no game rules.

- **Input adapter:** normalizes physical-keyboard events and hidden-mobile-input events into one keystroke stream for the core.

- **Persistence module:** versioned localStorage wrapper for unlocks and high scores.

## Error Handling

- Unknown/non-matching keys are ignored by the engine (beyond the mistake buzz for wrong letters while locked).
- The input adapter filters IME/autocomplete artifacts from mobile keyboards.
- Window/tab focus loss pauses the game with a resume overlay ("Back to the grill?").
- localStorage failures degrade to in-memory state with a non-blocking notice (progress simply isn't saved).
- The game never hard-fails on input weirdness.

## Testing

- **Vitest unit tests** for the entire game core:
  - Typing engine: lock-on, mistakes, accents, multi-word completion.
  - Order generator: first-letter uniqueness among concurrent orders, repetition window, letter-frequency sanity check across pools.
  - Scoring/combo math, patience/strike rules, difficulty curve outputs.
- **Phaser layer:** kept thin (no rules); verified by running the game manually.

## Out of Scope (v1)

- Accounts, servers, online leaderboards, multiplayer.
- App-store wrappers (PWA only).
- Languages other than English vocabulary.
- Custom on-screen keyboard.
