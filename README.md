# Short-Order Hero

A 50's diner typing arcade game inspired by *The Typing of the Dead*: customers
line up at the counter, you type their orders before their patience runs out,
and the menu drifts from "burger" to "pickled zebra waffles". Built to train
typing — big vocabulary, full alphabet coverage, on desktop and phone.

## Develop

- `npm install`
- `npm run dev` — local dev server (add `-- --host` to test on a phone)
- `npm test` — unit tests for the game core
- `npm run build` — type-check + production/PWA build
- `npm run preview` — serve the production build

## Architecture

- `src/core/` — pure TypeScript game logic (no Phaser), fully unit-tested
- `src/ui/` — Phaser 3 rendering layer; subscribes to core events, holds no rules
- `src/input/` — physical keyboard + hidden mobile input → one keystroke stream
- `src/persistence/` — versioned localStorage save (unlocks + high scores)

Design spec: `docs/superpowers/specs/2026-06-09-typing-game-design.md`
