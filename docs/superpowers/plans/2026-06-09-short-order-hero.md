# Short-Order Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 50's-diner typing-trainer arcade game (PWA, desktop + mobile) where players type escalating-absurdity food orders before customer patience runs out.

**Architecture:** A pure-TypeScript game core (order generation, typing lock-on engine, patience/strike/scoring rules, difficulty curves) with zero Phaser imports, fully unit-tested with Vitest. A thin Phaser 3 rendering layer subscribes to core events. An input adapter normalizes physical-keyboard and hidden-mobile-input events into one keystroke stream.

**Tech Stack:** Phaser 3, TypeScript, Vite, Vitest (+ happy-dom for DOM tests), vite-plugin-pwa. No backend; localStorage persistence.

**Spec:** `docs/superpowers/specs/2026-06-09-typing-game-design.md`

---

## File Structure

```
package.json, tsconfig.json, vite.config.ts, vitest.config.ts, index.html
public/icon.svg
src/
  main.ts                       # Phaser bootstrap + visualViewport handling
  core/                         # PURE TS — no Phaser imports allowed
    types.ts                    # shared interfaces + GameEvents map
    emitter.ts                  # tiny typed event emitter
    text.ts                     # normalizeText (lowercase + strip accents)
    rng.ts                      # seedable RNG (mulberry32) + pick()
    vocabulary.ts               # word pools (TIER1, TIER2, PREPARATIONS, INGREDIENTS, DISH_FORMS)
    orderGenerator.ts           # tier mixing, first-letter dedup, recent-words buffer
    typingEngine.ts             # lock-on state machine
    scoring.ts                  # tips, patience bonus, combo multiplier
    difficulty.ts               # lerp, tier mixing, paramsAt(config, elapsed)
    shifts.ts                   # the 5 shift configs + OVERTIME
    shiftEngine.ts              # ties it all together; emits GameEvents
  input/
    inputAdapter.ts             # physical keyboard + hidden mobile input + isTouchDevice
  persistence/
    storage.ts                  # versioned localStorage wrapper (SaveStore)
  ui/                           # Phaser layer — rendering only, no game rules
    theme.ts                    # colors + button helper
    CustomerView.ts             # face + speech bubble + patience bar
    Hud.ts                      # strikes, current order (typed highlight), score
    PrepStation.ts              # bowl + ingredient-box drop animations
    scenes/
      BootScene.ts
      TitleScene.ts
      ShiftSelectScene.ts
      GameScene.ts
      ResultsScene.ts
tests/
  core/*.test.ts                # one test file per core module
  input/inputAdapter.test.ts    # happy-dom environment
  persistence/storage.test.ts
```

**Conventions used throughout:**
- All vocabulary is lowercase; words contain only letters (and accented letters that normalize to a–z). TIER2 entries may contain spaces. No hyphens or apostrophes anywhere (mobile-keyboard friendliness).
- `normalizeText` is length-preserving for our vocabulary (é→e is 1 char→1 char), so display text can be sliced by the engine's `typedCount` directly.
- Scene keys: `'boot'`, `'title'`, `'shiftselect'`, `'game'`, `'results'`.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/main.ts`, `tests/smoke.test.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "short-order-hero",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "phaser": "^3.90.0"
  },
  "devDependencies": {
    "happy-dom": "^18.0.0",
    "typescript": "^5.9.0",
    "vite": "^7.0.0",
    "vite-plugin-pwa": "^1.0.0",
    "vitest": "^3.2.0"
  }
}
```

- [ ] **Step 2: Run `npm install`**

Expected: completes without errors, `node_modules/` created.

- [ ] **Step 3: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 4: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({});
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
});
```

- [ ] **Step 6: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content"
    />
    <title>Short-Order Hero</title>
    <style>
      html,
      body {
        margin: 0;
        padding: 0;
        height: 100%;
        overflow: hidden;
        background: #fdf3e3;
      }
      #app {
        width: 100%;
        height: 100dvh;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 7: Create placeholder `src/main.ts`** (replaced in Task 12)

```ts
console.log('Short-Order Hero — scaffold OK');
```

- [ ] **Step 8: Create `tests/smoke.test.ts`**

```ts
import { describe, expect, it } from 'vitest';

describe('scaffold', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 9: Verify everything runs**

Run: `npm test`
Expected: 1 test passes.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts vitest.config.ts index.html src/main.ts tests/smoke.test.ts
git commit -m "chore: scaffold Vite + TypeScript + Vitest project"
```

### Task 2: Shared Types + Event Emitter

**Files:**
- Create: `src/core/types.ts`, `src/core/emitter.ts`
- Test: `tests/core/emitter.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/core/emitter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Emitter } from '../../src/core/emitter';

interface TestEvents extends Record<string, unknown> {
  ping: { value: number };
}

describe('Emitter', () => {
  it('delivers payloads to subscribers', () => {
    const e = new Emitter<TestEvents>();
    const seen: number[] = [];
    e.on('ping', (p) => seen.push(p.value));
    e.emit('ping', { value: 7 });
    expect(seen).toEqual([7]);
  });

  it('unsubscribes via the returned function', () => {
    const e = new Emitter<TestEvents>();
    const seen: number[] = [];
    const off = e.on('ping', (p) => seen.push(p.value));
    off();
    e.emit('ping', { value: 1 });
    expect(seen).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/emitter.test.ts`
Expected: FAIL — cannot resolve `src/core/emitter`.

- [ ] **Step 3: Create `src/core/emitter.ts`**

```ts
export type Listener<T> = (payload: T) => void;

export class Emitter<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<Listener<never>>>();

  on<K extends keyof Events>(event: K, fn: Listener<Events[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(fn as Listener<never>);
    return () => set.delete(fn as Listener<never>);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of [...set]) (fn as Listener<Events[K]>)(payload);
  }
}
```

- [ ] **Step 4: Create `src/core/types.ts`** (no test — pure declarations, compile-checked)

```ts
export interface Order {
  /** Display words, e.g. ['zebra', 'soufflé'] */
  words: string[];
  /** Display text: words joined with single spaces */
  text: string;
  /** Lowercased, accent-stripped form used for matching */
  normalized: string;
}

export interface CustomerState {
  id: number;
  /** Counter position index, 0-based from the left */
  slot: number;
  order: Order;
  patienceTotalMs: number;
  patienceMs: number;
  /** True once served or stormed out */
  resolved: boolean;
}

export interface TierWeights {
  t1: number;
  t2: number;
  t3: number;
}

export interface OrderParams {
  tierWeights: TierWeights;
  /** Fractional 1..3; e.g. 1.4 = 40% chance of 2 words (tier 3 only) */
  wordsPerOrder: number;
}

export interface ShiftConfig {
  id: string;
  name: string;
  /** Shift length; Infinity for Overtime (ends only on 3 strikes) */
  durationMs: number;
  /** Time over which params interpolate start→end (clamped at 1) */
  rampMs: number;
  maxCustomers: { start: number; end: number };
  spawnIntervalMs: { start: number; end: number };
  patienceMs: { start: number; end: number };
  tierWeights: { start: TierWeights; end: TierWeights };
  wordsPerOrder: { start: number; end: number };
}

export interface LiveParams {
  spawnIntervalMs: number;
  patienceMs: number;
  maxCustomers: number;
  order: OrderParams;
}

export interface ShiftResult {
  shiftId: string;
  won: boolean;
  score: number;
  served: number;
  strikes: number;
  /** 0..1 */
  accuracy: number;
  wpm: number;
  bestCombo: number;
  elapsedMs: number;
}

export interface GameEvents extends Record<string, unknown> {
  customerArrived: { customer: CustomerState };
  orderLocked: { customerId: number };
  orderProgress: { customerId: number; typedCount: number };
  wordCompleted: { customerId: number; wordIndex: number };
  orderServed: { customerId: number; tip: number; finalWordIndex: number };
  customerLeft: { customerId: number; strikes: number };
  mistake: { customerId: number | null };
  shiftEnded: { result: ShiftResult };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/core/emitter.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/core/types.ts src/core/emitter.ts tests/core/emitter.test.ts
git commit -m "feat: core types and typed event emitter"
```

---

### Task 3: Text Normalization + Seedable RNG

**Files:**
- Create: `src/core/text.ts`, `src/core/rng.ts`
- Test: `tests/core/text.test.ts`, `tests/core/rng.test.ts`

- [ ] **Step 1: Write the failing tests**

`tests/core/text.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeText } from '../../src/core/text';

describe('normalizeText', () => {
  it('lowercases', () => {
    expect(normalizeText('Burger')).toBe('burger');
  });

  it('strips accents', () => {
    expect(normalizeText('soufflé')).toBe('souffle');
    expect(normalizeText('jalapeño')).toBe('jalapeno');
    expect(normalizeText('sautéed')).toBe('sauteed');
  });

  it('preserves length for accented vocabulary', () => {
    expect(normalizeText('zebra soufflé')).toHaveLength('zebra soufflé'.length);
  });
});
```

`tests/core/rng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32, pick } from '../../src/core/rng';

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('pick', () => {
  it('picks an element of the array', () => {
    const rng = mulberry32(1);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(pick(rng, items));
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/core/text.test.ts tests/core/rng.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/core/text.ts`**

```ts
/** Lowercase + strip combining accents. Length-preserving for our vocabulary. */
export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
```

- [ ] **Step 4: Create `src/core/rng.ts`**

```ts
export type Rng = () => number;

/** Small, fast, seedable PRNG. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/core/text.test.ts tests/core/rng.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/core/text.ts src/core/rng.ts tests/core/text.test.ts tests/core/rng.test.ts
git commit -m "feat: text normalization and seedable RNG"
```

---

### Task 4: Vocabulary Pools

**Files:**
- Create: `src/core/vocabulary.ts`
- Test: `tests/core/vocabulary.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/core/vocabulary.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeText } from '../../src/core/text';
import { DISH_FORMS, INGREDIENTS, PREPARATIONS, TIER1, TIER2 } from '../../src/core/vocabulary';

const ALL_POOLS = [TIER1, TIER2, PREPARATIONS, INGREDIENTS, DISH_FORMS];
const ALL_WORDS = ALL_POOLS.flat().flatMap((entry) => entry.split(' '));

describe('vocabulary', () => {
  it('normalizes to a-z and spaces only (no hyphens, apostrophes, digits)', () => {
    for (const entry of ALL_POOLS.flat()) {
      expect(normalizeText(entry)).toMatch(/^[a-z]+( [a-z]+)*$/);
    }
  });

  it('covers every letter of the alphabet in at least 2 words', () => {
    for (const letter of 'abcdefghijklmnopqrstuvwxyz') {
      const count = ALL_WORDS.filter((w) => normalizeText(w).includes(letter)).length;
      expect(count, `letter "${letter}" appears in ${count} words`).toBeGreaterThanOrEqual(2);
    }
  });

  it('has no duplicate entries within a pool', () => {
    for (const pool of ALL_POOLS) {
      expect(new Set(pool).size).toBe(pool.length);
    }
  });

  it('has large enough pools', () => {
    expect(TIER1.length).toBeGreaterThanOrEqual(25);
    expect(TIER2.length).toBeGreaterThanOrEqual(20);
    expect(PREPARATIONS.length).toBeGreaterThanOrEqual(60);
    expect(INGREDIENTS.length).toBeGreaterThanOrEqual(60);
    expect(DISH_FORMS.length).toBeGreaterThanOrEqual(60);
  });

  it('keeps TIER1 single-word and short', () => {
    for (const w of TIER1) {
      expect(w).not.toContain(' ');
      expect(w.length).toBeLessThanOrEqual(8);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/vocabulary.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/core/vocabulary.ts`**

```ts
/** Tier 1 — The Regulars: short, real diner words. Single words only. */
export const TIER1: readonly string[] = [
  'burger', 'malt', 'fries', 'soda', 'pie', 'shake', 'toast', 'eggs', 'bacon',
  'ham', 'cola', 'melt', 'hash', 'grits', 'soup', 'salad', 'donut', 'coffee',
  'cocoa', 'waffle', 'pancake', 'sundae', 'float', 'chili', 'corn', 'beans',
  'rice', 'gravy', 'biscuit', 'jello',
];

/** Tier 2 — The Specials: real, longer menu items. May contain spaces. */
export const TIER2: readonly string[] = [
  'banana split', 'chicken pot pie', 'onion rings', 'grilled cheese',
  'apple pie', 'root beer float', 'tuna melt', 'club sandwich',
  'mashed potatoes', 'meat loaf', 'cherry malt', 'blueberry pancakes',
  'fried chicken', 'peach cobbler', 'strawberry shake', 'patty melt',
  'corned beef hash', 'hot fudge sundae', 'egg salad sandwich',
  'french toast', 'clam chowder', 'pot roast', 'lemon pie', 'baked beans',
  'sloppy joe',
];

/** Tier 3 pool — preparations/modifiers. Single words only. */
export const PREPARATIONS: readonly string[] = [
  'pickled', 'smoked', 'candied', 'deviled', 'jellied', 'frosted', 'glazed',
  'whipped', 'toasted', 'charred', 'blackened', 'breaded', 'battered',
  'curried', 'herbed', 'iced', 'marinated', 'poached', 'roasted', 'salted',
  'sautéed', 'scorched', 'seared', 'simmered', 'smothered', 'spiced',
  'steamed', 'stewed', 'stuffed', 'sugared', 'tangy', 'tenderized',
  'twisted', 'fermented', 'gilded', 'haunted', 'hypnotized', 'irradiated',
  'jittery', 'juggled', 'kingly', 'lacquered', 'levitating', 'lukewarm',
  'magnetized', 'mummified', 'nervous', 'orbiting', 'oversized', 'panicked',
  'pixelated', 'polished', 'quivering', 'quartered', 'radioactive',
  'rubbery', 'sentient', 'shimmering', 'sneaky', 'sparkling', 'squeaky',
  'translucent', 'turbocharged', 'varnished', 'velvety', 'vibrating',
  'whistling', 'wobbly', 'xeroxed', 'yodeling', 'zesty',
];

/** Tier 3 pool — ingredients. Single words only. */
export const INGREDIENTS: readonly string[] = [
  'zebra', 'cactus', 'quince', 'jicama', 'yuzu', 'xigua', 'kelp', 'walnut',
  'mango', 'pickle', 'octopus', 'dragonfruit', 'turnip', 'radish', 'kumquat',
  'lobster', 'anchovy', 'beet', 'broccoli', 'bubblegum', 'cabbage',
  'caramel', 'cashew', 'dandelion', 'durian', 'eel', 'eggplant', 'fig',
  'garlic', 'ginger', 'hazelnut', 'huckleberry', 'jackfruit', 'jalapeño',
  'kale', 'kiwi', 'lavender', 'leek', 'lemon', 'licorice', 'lychee',
  'maple', 'marshmallow', 'meteor', 'moonbeam', 'mushroom', 'mustard',
  'noodle', 'nutmeg', 'okra', 'olive', 'onion', 'papaya', 'parsnip',
  'peanut', 'pumpkin', 'quail', 'rhubarb', 'saffron', 'seaweed', 'squid',
  'stardust', 'tofu', 'tomato', 'truffle', 'unicorn', 'vanilla', 'venison',
  'wasabi', 'watermelon', 'yam', 'zucchini',
];

/** Tier 3 pool — dish forms. Single words only. */
export const DISH_FORMS: readonly string[] = [
  'soufflé', 'waffles', 'bisque', 'chowder', 'gumbo', 'fritters',
  'casserole', 'dumplings', 'flapjacks', 'goulash', 'hotpot', 'jambalaya',
  'kebabs', 'lasagna', 'meatballs', 'nachos', 'omelette', 'pancakes',
  'quesadilla', 'ravioli', 'risotto', 'sandwich', 'skewers', 'smoothie',
  'sorbet', 'stew', 'strudel', 'sushi', 'terrine', 'turnovers', 'milkshake',
  'muffins', 'nuggets', 'pudding', 'quiche', 'relish', 'sliders', 'syrup',
  'wraps', 'juice', 'jerky', 'fondue', 'flan', 'curry', 'custard',
  'crumble', 'croquettes', 'cupcakes', 'dip', 'donuts', 'eclairs',
  'empanadas', 'enchiladas', 'fajitas', 'parfait', 'popsicle', 'porridge',
  'pretzels', 'tacos', 'brownies', 'burrito', 'calzone', 'cobbler',
  'compote', 'crepes', 'velouté', 'yogurt', 'ziti',
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/vocabulary.test.ts`
Expected: PASS (5 tests). If the letter-coverage assertion fails for some letter, add 1–2 thematic words containing it to any pool — do not delete the test.

- [ ] **Step 5: Commit**

```bash
git add src/core/vocabulary.ts tests/core/vocabulary.test.ts
git commit -m "feat: tiered food vocabulary pools with full alphabet coverage"
```

---

### Task 5: Order Generator

**Files:**
- Create: `src/core/orderGenerator.ts`
- Test: `tests/core/orderGenerator.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/core/orderGenerator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { OrderGenerator } from '../../src/core/orderGenerator';
import { mulberry32 } from '../../src/core/rng';
import { TIER1 } from '../../src/core/vocabulary';
import type { OrderParams } from '../../src/core/types';

const T1_ONLY: OrderParams = { tierWeights: { t1: 1, t2: 0, t3: 0 }, wordsPerOrder: 1 };
const T3_ONLY: OrderParams = { tierWeights: { t1: 0, t2: 0, t3: 1 }, wordsPerOrder: 3 };

describe('OrderGenerator', () => {
  it('generates tier-1 orders from TIER1', () => {
    const gen = new OrderGenerator(mulberry32(1));
    for (let i = 0; i < 20; i++) {
      const order = gen.next(T1_ONLY, new Set());
      expect(order.words).toHaveLength(1);
      expect(TIER1).toContain(order.words[0]);
    }
  });

  it('generates 3-word tier-3 orders when wordsPerOrder is 3', () => {
    const gen = new OrderGenerator(mulberry32(2));
    const order = gen.next(T3_ONLY, new Set());
    expect(order.words).toHaveLength(3);
    expect(order.text).toBe(order.words.join(' '));
  });

  it('normalizes accents in the normalized field', () => {
    const gen = new OrderGenerator(mulberry32(3));
    for (let i = 0; i < 50; i++) {
      const order = gen.next(T3_ONLY, new Set());
      expect(order.normalized).toMatch(/^[a-z]+( [a-z]+)*$/);
      expect(order.normalized).toHaveLength(order.text.length);
    }
  });

  it('respects excluded first letters', () => {
    const gen = new OrderGenerator(mulberry32(4));
    const exclude = new Set(['b', 'p', 's']);
    for (let i = 0; i < 200; i++) {
      const order = gen.next(T1_ONLY, exclude);
      expect(exclude.has(order.normalized[0])).toBe(false);
    }
  });

  it('avoids repeating tier-3 pool words within the recent window', () => {
    const gen = new OrderGenerator(mulberry32(5));
    const seen = new Set<string>();
    // 15 orders x 3 words = 45 marks, under the 50-word buffer:
    // every word must be unique.
    for (let i = 0; i < 15; i++) {
      const order = gen.next(T3_ONLY, new Set());
      for (const w of order.words) {
        expect(seen.has(w), `repeated word "${w}"`).toBe(false);
        seen.add(w);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/orderGenerator.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/core/orderGenerator.ts`**

```ts
import { pick, type Rng } from './rng';
import { normalizeText } from './text';
import { DISH_FORMS, INGREDIENTS, PREPARATIONS, TIER1, TIER2 } from './vocabulary';
import type { Order, OrderParams, TierWeights } from './types';

/** Pool words are not reused while inside this many recent uses. */
const RECENT_CAP = 50;
/** Attempts before relaxing the freshness constraint, then the letter constraint. */
const FRESH_ATTEMPTS = 60;
const MAX_ATTEMPTS = 80;

export class OrderGenerator {
  private recent: string[] = [];

  constructor(private rng: Rng) {}

  /**
   * Generate the next order. The order's first (normalized) letter will not be
   * in `excludeFirstLetters` — guaranteeing unambiguous lock-on — unless the
   * constraints are unsatisfiable after MAX_ATTEMPTS (practically unreachable
   * with <=4 concurrent customers).
   */
  next(params: OrderParams, excludeFirstLetters: ReadonlySet<string>): Order {
    let words: string[] = [];
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      words = this.candidate(params);
      const first = normalizeText(words[0])[0];
      const fresh = !words.some((w) => this.recent.includes(w));
      if (!excludeFirstLetters.has(first) && (fresh || attempt >= FRESH_ATTEMPTS)) break;
    }
    for (const w of words) this.markUsed(w);
    const text = words.join(' ');
    return { words, text, normalized: normalizeText(text) };
  }

  private candidate(params: OrderParams): string[] {
    const tier = this.pickTier(params.tierWeights);
    if (tier === 1) return [pick(this.rng, TIER1)];
    if (tier === 2) return pick(this.rng, TIER2).split(' ');
    const count = this.resolveCount(params.wordsPerOrder);
    if (count <= 1) return [pick(this.rng, DISH_FORMS)];
    if (count === 2) return [pick(this.rng, INGREDIENTS), pick(this.rng, DISH_FORMS)];
    return [pick(this.rng, PREPARATIONS), pick(this.rng, INGREDIENTS), pick(this.rng, DISH_FORMS)];
  }

  private pickTier(w: TierWeights): 1 | 2 | 3 {
    const total = w.t1 + w.t2 + w.t3;
    const r = this.rng() * total;
    if (r < w.t1) return 1;
    if (r < w.t1 + w.t2) return 2;
    return 3;
  }

  /** 1.4 -> 1 (60%) or 2 (40%); clamped to [1, 3]. */
  private resolveCount(n: number): number {
    const base = Math.floor(n);
    const c = base + (this.rng() < n - base ? 1 : 0);
    return Math.max(1, Math.min(3, c));
  }

  private markUsed(word: string): void {
    this.recent.push(word);
    if (this.recent.length > RECENT_CAP) this.recent.shift();
  }
}
```

Note: with tier-1-heavy params the 30-word pool cannot satisfy a 50-word freshness window forever — the `attempt >= FRESH_ATTEMPTS` relaxation handles that gracefully. Tier-3 pools (70+ words each) satisfy it comfortably.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/orderGenerator.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/orderGenerator.ts tests/core/orderGenerator.test.ts
git commit -m "feat: order generator with tier mixing, first-letter dedup, recent-words buffer"
```

---

### Task 6: Typing Engine (Lock-On State Machine)

**Files:**
- Create: `src/core/typingEngine.ts`
- Test: `tests/core/typingEngine.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/core/typingEngine.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { TypingEngine } from '../../src/core/typingEngine';
import { normalizeText } from '../../src/core/text';

const orders = [
  { id: 1, normalized: 'burger' },
  { id: 2, normalized: 'malt' },
  { id: 3, normalized: normalizeText('zebra soufflé') }, // 'zebra souffle'
];

describe('TypingEngine', () => {
  let engine: TypingEngine;

  beforeEach(() => {
    engine = new TypingEngine();
  });

  it('locks onto the customer whose order starts with the typed letter', () => {
    expect(engine.handleKey('m', orders)).toEqual({ kind: 'locked', customerId: 2 });
    expect(engine.locked).toBe(2);
    expect(engine.typedCount).toBe(1);
  });

  it('reports a mistake when no order starts with the letter', () => {
    expect(engine.handleKey('x', orders)).toEqual({ kind: 'mistake', customerId: null });
    expect(engine.locked).toBeNull();
  });

  it('progresses on correct letters and keeps progress on wrong ones', () => {
    engine.handleKey('b', orders);
    expect(engine.handleKey('u', orders)).toEqual({ kind: 'progress', customerId: 1, typedCount: 2 });
    expect(engine.handleKey('q', orders)).toEqual({ kind: 'mistake', customerId: 1 });
    expect(engine.typedCount).toBe(2);
    expect(engine.handleKey('r', orders)).toEqual({ kind: 'progress', customerId: 1, typedCount: 3 });
  });

  it('completes a single-word order on its last letter and releases the lock', () => {
    for (const ch of 'mal') engine.handleKey(ch, orders);
    expect(engine.handleKey('t', orders)).toEqual({ kind: 'completed', customerId: 2, finalWordIndex: 0 });
    expect(engine.locked).toBeNull();
    expect(engine.typedCount).toBe(0);
  });

  it('emits wordCompleted at word boundaries of multi-word orders', () => {
    engine.handleKey('z', orders);
    for (const ch of 'ebr') engine.handleKey(ch, orders);
    expect(engine.handleKey('a', orders)).toEqual({
      kind: 'wordCompleted',
      customerId: 3,
      wordIndex: 0,
      typedCount: 5,
    });
    expect(engine.handleKey(' ', orders)).toEqual({ kind: 'progress', customerId: 3, typedCount: 6 });
  });

  it('matches accent-free typing against accented orders', () => {
    for (const ch of 'zebra souffl') engine.handleKey(ch, orders);
    expect(engine.handleKey('e', orders)).toEqual({ kind: 'completed', customerId: 3, finalWordIndex: 1 });
  });

  it('release() clears the lock when the locked customer leaves', () => {
    engine.handleKey('b', orders);
    engine.release(1);
    expect(engine.locked).toBeNull();
    expect(engine.typedCount).toBe(0);
  });

  it('ignores multi-character keys', () => {
    expect(engine.handleKey('Shift', orders)).toEqual({ kind: 'ignored' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/typingEngine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/core/typingEngine.ts`**

```ts
import { normalizeText } from './text';

export interface TypableOrder {
  id: number;
  normalized: string;
}

export type KeyResult =
  | { kind: 'ignored' }
  | { kind: 'locked'; customerId: number }
  | { kind: 'progress'; customerId: number; typedCount: number }
  | { kind: 'wordCompleted'; customerId: number; wordIndex: number; typedCount: number }
  | { kind: 'completed'; customerId: number; finalWordIndex: number }
  | { kind: 'mistake'; customerId: number | null };

export class TypingEngine {
  private lockedId: number | null = null;
  private typed = 0;

  get locked(): number | null {
    return this.lockedId;
  }

  get typedCount(): number {
    return this.typed;
  }

  /** Call when a customer despawns so a stale lock doesn't linger. */
  release(customerId: number): void {
    if (this.lockedId === customerId) {
      this.lockedId = null;
      this.typed = 0;
    }
  }

  handleKey(rawChar: string, orders: ReadonlyArray<TypableOrder>): KeyResult {
    if (rawChar.length !== 1) return { kind: 'ignored' };
    const char = normalizeText(rawChar);

    if (this.lockedId === null) {
      const target = orders.find((o) => o.normalized[0] === char);
      if (!target) return { kind: 'mistake', customerId: null };
      this.lockedId = target.id;
      this.typed = 1;
      return this.checkBoundaries(target) ?? { kind: 'locked', customerId: target.id };
    }

    const target = orders.find((o) => o.id === this.lockedId);
    if (!target) {
      // Locked customer vanished without release(); recover by unlocking.
      this.lockedId = null;
      this.typed = 0;
      return this.handleKey(rawChar, orders);
    }

    if (target.normalized[this.typed] !== char) {
      return { kind: 'mistake', customerId: target.id };
    }

    this.typed += 1;
    return (
      this.checkBoundaries(target) ?? {
        kind: 'progress',
        customerId: target.id,
        typedCount: this.typed,
      }
    );
  }

  /** Returns completed / wordCompleted if `typed` sits on a boundary, else null. */
  private checkBoundaries(target: TypableOrder): KeyResult | null {
    if (this.typed === target.normalized.length) {
      const finalWordIndex = target.normalized.split(' ').length - 1;
      const id = target.id;
      this.lockedId = null;
      this.typed = 0;
      return { kind: 'completed', customerId: id, finalWordIndex };
    }
    if (target.normalized[this.typed] === ' ') {
      const wordIndex = target.normalized.slice(0, this.typed).split(' ').length - 1;
      return { kind: 'wordCompleted', customerId: target.id, wordIndex, typedCount: this.typed };
    }
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/typingEngine.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/typingEngine.ts tests/core/typingEngine.test.ts
git commit -m "feat: typing engine with first-letter lock-on and word boundaries"
```

---

### Task 7: Scoring

**Files:**
- Create: `src/core/scoring.ts`
- Test: `tests/core/scoring.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/core/scoring.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { baseTip, comboMultiplier, orderTip, patienceMultiplier } from '../../src/core/scoring';
import type { Order } from '../../src/core/types';

function order(text: string): Order {
  return { words: text.split(' '), text, normalized: text };
}

describe('scoring', () => {
  it('baseTip is 5 per letter, spaces excluded', () => {
    expect(baseTip(order('malt'))).toBe(20);
    expect(baseTip(order('zebra souffle'))).toBe(60); // 12 letters
  });

  it('patienceMultiplier rewards fast service', () => {
    expect(patienceMultiplier(0.8)).toBe(1.5);
    expect(patienceMultiplier(0.5)).toBe(1.5);
    expect(patienceMultiplier(0.3)).toBe(1.2);
    expect(patienceMultiplier(0.1)).toBe(1.0);
  });

  it('comboMultiplier grows 0.25 per clean order, capped at 3', () => {
    expect(comboMultiplier(0)).toBe(1.0);
    expect(comboMultiplier(2)).toBe(1.5);
    expect(comboMultiplier(100)).toBe(3.0);
  });

  it('orderTip combines all three, rounded', () => {
    // 60 * 1.5 * 1.5 = 135
    expect(orderTip(order('zebra souffle'), 0.6, 2)).toBe(135);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/scoring.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/core/scoring.ts`**

```ts
import type { Order } from './types';

/** 5 tip dollars per letter (spaces excluded). */
export function baseTip(order: Order): number {
  return 5 * order.normalized.replace(/ /g, '').length;
}

/** Serve in the green (>=50% patience left) for 1.5x, yellow (>=20%) for 1.2x. */
export function patienceMultiplier(fractionLeft: number): number {
  if (fractionLeft >= 0.5) return 1.5;
  if (fractionLeft >= 0.2) return 1.2;
  return 1.0;
}

/** +0.25x per consecutive clean order before this one, capped at 3x. */
export function comboMultiplier(cleanStreak: number): number {
  return Math.min(1 + 0.25 * cleanStreak, 3);
}

export function orderTip(order: Order, patienceFractionLeft: number, cleanStreak: number): number {
  return Math.round(baseTip(order) * patienceMultiplier(patienceFractionLeft) * comboMultiplier(cleanStreak));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/scoring.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/core/scoring.ts tests/core/scoring.test.ts
git commit -m "feat: tip scoring with patience bonus and combo multiplier"
```

---

### Task 8: Difficulty Curves + Shift Definitions

**Files:**
- Create: `src/core/difficulty.ts`, `src/core/shifts.ts`
- Test: `tests/core/difficulty.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/core/difficulty.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { lerp, mixTiers, paramsAt } from '../../src/core/difficulty';
import { OVERTIME, SHIFTS } from '../../src/core/shifts';

describe('lerp', () => {
  it('interpolates linearly', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(10, 0, 1)).toBe(0);
  });
});

describe('mixTiers', () => {
  it('interpolates and normalizes to sum 1', () => {
    const m = mixTiers({ t1: 1, t2: 0, t3: 0 }, { t1: 0, t2: 1, t3: 0 }, 0.5);
    expect(m.t1).toBeCloseTo(0.5);
    expect(m.t2).toBeCloseTo(0.5);
    expect(m.t1 + m.t2 + m.t3).toBeCloseTo(1);
  });
});

describe('paramsAt', () => {
  const monday = SHIFTS[0];

  it('returns start params at t=0', () => {
    const p = paramsAt(monday, 0);
    expect(p.spawnIntervalMs).toBe(monday.spawnIntervalMs.start);
    expect(p.patienceMs).toBe(monday.patienceMs.start);
  });

  it('returns end params at and beyond the ramp', () => {
    const p = paramsAt(monday, monday.rampMs * 2);
    expect(p.spawnIntervalMs).toBe(monday.spawnIntervalMs.end);
    expect(p.patienceMs).toBe(monday.patienceMs.end);
  });
});

describe('shift definitions', () => {
  it('has 5 shifts plus overtime', () => {
    expect(SHIFTS).toHaveLength(5);
    expect(OVERTIME.durationMs).toBe(Infinity);
  });

  it('gets harder across the week', () => {
    const first = SHIFTS[0];
    const last = SHIFTS[4];
    expect(last.patienceMs.end).toBeLessThan(first.patienceMs.start);
    expect(last.spawnIntervalMs.end).toBeLessThan(first.spawnIntervalMs.start);
    expect(last.tierWeights.end.t3).toBeGreaterThan(0.9);
  });

  it('never goes below sane floors at max overtime difficulty', () => {
    const p = paramsAt(OVERTIME, 10 * 60 * 1000);
    expect(p.spawnIntervalMs).toBeGreaterThanOrEqual(1500);
    expect(p.patienceMs).toBeGreaterThanOrEqual(4000);
    expect(p.order.wordsPerOrder).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/difficulty.test.ts`
Expected: FAIL — modules not found.

- [ ] **Step 3: Create `src/core/difficulty.ts`**

```ts
import type { LiveParams, ShiftConfig, TierWeights } from './types';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Componentwise lerp, clamped >= 0, normalized to sum 1. */
export function mixTiers(a: TierWeights, b: TierWeights, t: number): TierWeights {
  const raw = {
    t1: Math.max(0, lerp(a.t1, b.t1, t)),
    t2: Math.max(0, lerp(a.t2, b.t2, t)),
    t3: Math.max(0, lerp(a.t3, b.t3, t)),
  };
  const total = raw.t1 + raw.t2 + raw.t3 || 1;
  return { t1: raw.t1 / total, t2: raw.t2 / total, t3: raw.t3 / total };
}

/** Live difficulty parameters at a moment in the shift. t clamps at 1 (ramp end = max difficulty). */
export function paramsAt(config: ShiftConfig, elapsedMs: number): LiveParams {
  const t = Math.min(elapsedMs / config.rampMs, 1);
  return {
    spawnIntervalMs: lerp(config.spawnIntervalMs.start, config.spawnIntervalMs.end, t),
    patienceMs: lerp(config.patienceMs.start, config.patienceMs.end, t),
    maxCustomers: Math.round(lerp(config.maxCustomers.start, config.maxCustomers.end, t)),
    order: {
      tierWeights: mixTiers(config.tierWeights.start, config.tierWeights.end, t),
      wordsPerOrder: lerp(config.wordsPerOrder.start, config.wordsPerOrder.end, t),
    },
  };
}
```

- [ ] **Step 4: Create `src/core/shifts.ts`**

```ts
import type { ShiftConfig } from './types';

export const SHIFTS: readonly ShiftConfig[] = [
  {
    id: 'monday',
    name: 'Monday: Breakfast Rush',
    durationMs: 90_000,
    rampMs: 90_000,
    maxCustomers: { start: 2, end: 2 },
    spawnIntervalMs: { start: 6000, end: 4500 },
    patienceMs: { start: 14_000, end: 11_000 },
    tierWeights: { start: { t1: 1, t2: 0, t3: 0 }, end: { t1: 0.7, t2: 0.3, t3: 0 } },
    wordsPerOrder: { start: 1, end: 1 },
  },
  {
    id: 'tuesday',
    name: 'Tuesday: Lunch Counter',
    durationMs: 100_000,
    rampMs: 100_000,
    maxCustomers: { start: 2, end: 3 },
    spawnIntervalMs: { start: 5000, end: 4000 },
    patienceMs: { start: 12_000, end: 9500 },
    tierWeights: { start: { t1: 0.6, t2: 0.4, t3: 0 }, end: { t1: 0.3, t2: 0.6, t3: 0.1 } },
    wordsPerOrder: { start: 1, end: 1.5 },
  },
  {
    id: 'wednesday',
    name: 'Wednesday: Dinner Bell',
    durationMs: 110_000,
    rampMs: 110_000,
    maxCustomers: { start: 3, end: 3 },
    spawnIntervalMs: { start: 4500, end: 3500 },
    patienceMs: { start: 11_000, end: 8500 },
    tierWeights: { start: { t1: 0.3, t2: 0.5, t3: 0.2 }, end: { t1: 0.1, t2: 0.4, t3: 0.5 } },
    wordsPerOrder: { start: 1.5, end: 2 },
  },
  {
    id: 'thursday',
    name: 'Thursday: Graveyard Shift',
    durationMs: 120_000,
    rampMs: 120_000,
    maxCustomers: { start: 3, end: 4 },
    spawnIntervalMs: { start: 4000, end: 3000 },
    patienceMs: { start: 10_000, end: 7500 },
    tierWeights: { start: { t1: 0.1, t2: 0.4, t3: 0.5 }, end: { t1: 0, t2: 0.2, t3: 0.8 } },
    wordsPerOrder: { start: 2, end: 2.5 },
  },
  {
    id: 'friday',
    name: 'Friday: Full Moon Special',
    durationMs: 135_000,
    rampMs: 135_000,
    maxCustomers: { start: 4, end: 4 },
    spawnIntervalMs: { start: 3500, end: 2500 },
    patienceMs: { start: 9000, end: 6500 },
    tierWeights: { start: { t1: 0, t2: 0.3, t3: 0.7 }, end: { t1: 0, t2: 0, t3: 1 } },
    wordsPerOrder: { start: 2, end: 3 },
  },
];

/**
 * Endless mode. Ends only on 3 strikes. Difficulty ramps to its brutal
 * maximum over 3 minutes and stays there (floors: 1500ms spawns, 4000ms patience).
 */
export const OVERTIME: ShiftConfig = {
  id: 'overtime',
  name: 'Overtime',
  durationMs: Infinity,
  rampMs: 180_000,
  maxCustomers: { start: 2, end: 4 },
  spawnIntervalMs: { start: 5000, end: 1500 },
  patienceMs: { start: 12_000, end: 4000 },
  tierWeights: { start: { t1: 0.5, t2: 0.4, t3: 0.1 }, end: { t1: 0, t2: 0, t3: 1 } },
  wordsPerOrder: { start: 1, end: 3 },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/core/difficulty.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/core/difficulty.ts src/core/shifts.ts tests/core/difficulty.test.ts
git commit -m "feat: difficulty interpolation and the five shift configs plus overtime"
```

---

### Task 9: Shift Engine

**Files:**
- Create: `src/core/shiftEngine.ts`
- Test: `tests/core/shiftEngine.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/core/shiftEngine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ShiftEngine } from '../../src/core/shiftEngine';
import { mulberry32 } from '../../src/core/rng';
import type { ShiftConfig, ShiftResult } from '../../src/core/types';

const TEST_CONFIG: ShiftConfig = {
  id: 'test',
  name: 'Test Shift',
  durationMs: 10_000,
  rampMs: 10_000,
  maxCustomers: { start: 2, end: 2 },
  spawnIntervalMs: { start: 1000, end: 1000 },
  patienceMs: { start: 3000, end: 3000 },
  tierWeights: { start: { t1: 1, t2: 0, t3: 0 }, end: { t1: 1, t2: 0, t3: 0 } },
  wordsPerOrder: { start: 1, end: 1 },
};

function makeEngine(overrides: Partial<ShiftConfig> = {}) {
  return new ShiftEngine({ config: { ...TEST_CONFIG, ...overrides }, rng: mulberry32(99) });
}

function step(engine: ShiftEngine, totalMs: number, dt = 100) {
  for (let t = 0; t < totalMs; t += dt) engine.update(dt);
}

function typeOrder(engine: ShiftEngine, normalized: string) {
  for (const ch of normalized) engine.handleKey(ch);
}

describe('ShiftEngine', () => {
  it('spawns customers up to maxCustomers with distinct first letters', () => {
    const engine = makeEngine();
    step(engine, 5000);
    expect(engine.activeCustomers.length).toBe(2);
    const firsts = engine.activeCustomers.map((c) => c.order.normalized[0]);
    expect(new Set(firsts).size).toBe(firsts.length);
  });

  it('drains patience and counts strikes when customers storm out', () => {
    const engine = makeEngine();
    const left: number[] = [];
    engine.events.on('customerLeft', (e) => left.push(e.customerId));
    step(engine, 4500);
    expect(left.length).toBeGreaterThanOrEqual(1);
    expect(engine.strikes).toBe(left.length);
  });

  it('ends the shift as a loss on 3 strikes', () => {
    const engine = makeEngine();
    let result: ShiftResult | null = null;
    engine.events.on('shiftEnded', (e) => (result = e.result));
    step(engine, 10_000);
    expect(engine.isOver).toBe(true);
    expect(result).not.toBeNull();
    expect(result!.won).toBe(false);
    expect(result!.strikes).toBe(3);
  });

  it('serves a customer when their order is fully typed', () => {
    const engine = makeEngine();
    const served: number[] = [];
    engine.events.on('orderServed', (e) => served.push(e.customerId));
    step(engine, 1000); // first customer in
    const customer = engine.activeCustomers[0];
    typeOrder(engine, customer.order.normalized);
    expect(served).toEqual([customer.id]);
    expect(engine.served).toBe(1);
    expect(engine.score).toBeGreaterThan(0);
    expect(customer.resolved).toBe(true);
  });

  it('counts mistakes and reports accuracy and wpm in the result', () => {
    const engine = makeEngine({ durationMs: 2000, spawnIntervalMs: { start: 9000, end: 9000 } });
    let result: ShiftResult | null = null;
    engine.events.on('shiftEnded', (e) => (result = e.result));
    step(engine, 1000);
    const customer = engine.activeCustomers[0];
    const wrong = customer.order.normalized[0] === 'q' ? 'z' : 'q';
    engine.handleKey(wrong); // 1 mistake
    typeOrder(engine, customer.order.normalized);
    step(engine, 2000); // past durationMs with no customers left -> win
    expect(result).not.toBeNull();
    expect(result!.won).toBe(true);
    expect(result!.served).toBe(1);
    expect(result!.accuracy).toBeLessThan(1);
    expect(result!.accuracy).toBeGreaterThan(0.5);
    expect(result!.wpm).toBeGreaterThan(0);
  });

  it('stops spawning after durationMs and wins when the room clears', () => {
    const engine = makeEngine({ durationMs: 1500, patienceMs: { start: 10_000, end: 10_000 } });
    let result: ShiftResult | null = null;
    engine.events.on('shiftEnded', (e) => (result = e.result));
    step(engine, 1500);
    for (const c of [...engine.activeCustomers]) typeOrder(engine, c.order.normalized);
    step(engine, 200);
    expect(result).not.toBeNull();
    expect(result!.won).toBe(true);
  });

  it('ignores input after the shift is over', () => {
    const engine = makeEngine();
    step(engine, 10_000);
    expect(engine.isOver).toBe(true);
    expect(() => engine.handleKey('a')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/core/shiftEngine.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/core/shiftEngine.ts`**

```ts
import { Emitter } from './emitter';
import { paramsAt } from './difficulty';
import { OrderGenerator } from './orderGenerator';
import { mulberry32, type Rng } from './rng';
import { orderTip } from './scoring';
import { TypingEngine } from './typingEngine';
import type { CustomerState, GameEvents, LiveParams, ShiftConfig, ShiftResult } from './types';

export interface ShiftEngineOptions {
  config: ShiftConfig;
  rng?: Rng;
  /** Rendering-driven cap (e.g. 3 on narrow phones). Defaults to 4. */
  maxCustomersCap?: number;
}

const FIRST_SPAWN_MS = 800;
const MAX_STRIKES = 3;

export class ShiftEngine {
  readonly events = new Emitter<GameEvents>();

  score = 0;
  strikes = 0;
  served = 0;
  bestCombo = 0;

  private readonly config: ShiftConfig;
  private readonly cap: number;
  private readonly typing = new TypingEngine();
  private readonly generator: OrderGenerator;
  private customers: CustomerState[] = [];
  private nextId = 1;
  private elapsed = 0;
  private spawnAt = FIRST_SPAWN_MS;
  private over = false;
  private correctChars = 0;
  private mistakes = 0;
  private cleanStreak = 0;

  constructor(opts: ShiftEngineOptions) {
    this.config = opts.config;
    this.cap = opts.maxCustomersCap ?? 4;
    this.generator = new OrderGenerator(opts.rng ?? mulberry32(Date.now() >>> 0));
  }

  get isOver(): boolean {
    return this.over;
  }

  get activeCustomers(): ReadonlyArray<CustomerState> {
    return this.customers.filter((c) => !c.resolved);
  }

  get lockedCustomerId(): number | null {
    return this.typing.locked;
  }

  get typedCount(): number {
    return this.typing.typedCount;
  }

  update(dtMs: number): void {
    if (this.over) return;
    this.elapsed += dtMs;
    const params = paramsAt(this.config, this.elapsed);
    const stillServing = this.elapsed < this.config.durationMs;

    if (
      stillServing &&
      this.elapsed >= this.spawnAt &&
      this.activeCustomers.length < Math.min(params.maxCustomers, this.cap)
    ) {
      this.spawn(params);
      this.spawnAt = this.elapsed + params.spawnIntervalMs;
    }

    for (const c of this.activeCustomers) {
      c.patienceMs -= dtMs;
      if (c.patienceMs <= 0) {
        c.patienceMs = 0;
        c.resolved = true;
        this.typing.release(c.id);
        this.strikes += 1;
        this.cleanStreak = 0;
        this.events.emit('customerLeft', { customerId: c.id, strikes: this.strikes });
        if (this.strikes >= MAX_STRIKES) return this.end(false);
      }
    }

    if (!stillServing && this.activeCustomers.length === 0) this.end(true);
  }

  handleKey(char: string): void {
    if (this.over) return;
    const orders = this.activeCustomers.map((c) => ({ id: c.id, normalized: c.order.normalized }));
    const res = this.typing.handleKey(char, orders);
    switch (res.kind) {
      case 'ignored':
        return;
      case 'locked':
        this.correctChars += 1;
        this.events.emit('orderLocked', { customerId: res.customerId });
        return;
      case 'progress':
        this.correctChars += 1;
        this.events.emit('orderProgress', { customerId: res.customerId, typedCount: res.typedCount });
        return;
      case 'wordCompleted':
        this.correctChars += 1;
        this.events.emit('wordCompleted', { customerId: res.customerId, wordIndex: res.wordIndex });
        return;
      case 'completed':
        this.correctChars += 1;
        this.serve(res.customerId, res.finalWordIndex);
        return;
      case 'mistake':
        this.mistakes += 1;
        this.cleanStreak = 0;
        this.events.emit('mistake', { customerId: res.customerId });
        return;
    }
  }

  private spawn(params: LiveParams): void {
    const usedLetters = new Set(this.activeCustomers.map((c) => c.order.normalized[0]));
    const order = this.generator.next(params.order, usedLetters);
    const usedSlots = new Set(this.activeCustomers.map((c) => c.slot));
    let slot = 0;
    while (usedSlots.has(slot)) slot += 1;
    const customer: CustomerState = {
      id: this.nextId++,
      slot,
      order,
      patienceTotalMs: params.patienceMs,
      patienceMs: params.patienceMs,
      resolved: false,
    };
    this.customers.push(customer);
    this.events.emit('customerArrived', { customer });
  }

  private serve(customerId: number, finalWordIndex: number): void {
    const c = this.customers.find((x) => x.id === customerId);
    if (!c || c.resolved) return;
    c.resolved = true;
    this.served += 1;
    const tip = orderTip(c.order, c.patienceMs / c.patienceTotalMs, this.cleanStreak);
    this.score += tip;
    this.cleanStreak += 1;
    this.bestCombo = Math.max(this.bestCombo, this.cleanStreak);
    this.events.emit('orderServed', { customerId, tip, finalWordIndex });
  }

  private end(won: boolean): void {
    this.over = true;
    const minutes = this.elapsed / 60_000;
    const attempted = this.correctChars + this.mistakes;
    const result: ShiftResult = {
      shiftId: this.config.id,
      won,
      score: this.score,
      served: this.served,
      strikes: this.strikes,
      accuracy: attempted === 0 ? 1 : this.correctChars / attempted,
      wpm: minutes > 0 ? this.correctChars / 5 / minutes : 0,
      bestCombo: this.bestCombo,
      elapsedMs: this.elapsed,
    };
    this.events.emit('shiftEnded', { result });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/core/shiftEngine.test.ts`
Expected: PASS (7 tests).

Run: `npm test`
Expected: all suites pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/shiftEngine.ts tests/core/shiftEngine.test.ts
git commit -m "feat: shift engine orchestrating spawning, patience, strikes, scoring"
```

---

### Task 10: Persistence (SaveStore)

**Files:**
- Create: `src/persistence/storage.ts`
- Test: `tests/persistence/storage.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/persistence/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SaveStore } from '../../src/persistence/storage';

function fakeBacking() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

function throwingBacking() {
  return {
    getItem: (): string | null => {
      throw new Error('quota');
    },
    setItem: (): void => {
      throw new Error('quota');
    },
  };
}

describe('SaveStore', () => {
  it('returns defaults when empty', () => {
    const store = new SaveStore(fakeBacking());
    expect(store.load()).toEqual({ version: 1, unlockedShift: 0, highScores: {} });
  });

  it('persists unlocks and never goes backwards', () => {
    const backing = fakeBacking();
    const store = new SaveStore(backing);
    store.unlockShift(2);
    store.unlockShift(1);
    expect(new SaveStore(backing).load().unlockedShift).toBe(2);
  });

  it('records only improved scores', () => {
    const store = new SaveStore(fakeBacking());
    expect(store.recordScore('monday', 100)).toBe(true);
    expect(store.recordScore('monday', 50)).toBe(false);
    expect(store.recordScore('monday', 150)).toBe(true);
    expect(store.load().highScores.monday).toBe(150);
  });

  it('survives corrupted JSON', () => {
    const backing = fakeBacking();
    backing.setItem('short-order-hero-save', 'not json{');
    const store = new SaveStore(backing);
    expect(store.load().unlockedShift).toBe(0);
  });

  it('degrades to in-memory when backing throws', () => {
    const store = new SaveStore(throwingBacking());
    expect(() => store.unlockShift(1)).not.toThrow();
    expect(store.load().unlockedShift).toBe(1);
  });

  it('works with a null backing (storage unavailable)', () => {
    const store = new SaveStore(null);
    store.recordScore('overtime', 42);
    expect(store.load().highScores.overtime).toBe(42);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/persistence/storage.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/persistence/storage.ts`**

```ts
export interface SaveData {
  version: 1;
  /** Highest unlocked shift index (0-based). >= SHIFTS.length unlocks Overtime. */
  unlockedShift: number;
  highScores: Record<string, number>;
}

export type StorageBacking = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'short-order-hero-save';
const DEFAULTS: SaveData = { version: 1, unlockedShift: 0, highScores: {} };

/** Returns window.localStorage if present and writable, else null. */
export function safeLocalStorage(): StorageBacking | null {
  try {
    const s = window.localStorage;
    s.setItem('__probe__', '1');
    s.removeItem('__probe__');
    return s;
  } catch {
    return null;
  }
}

export class SaveStore {
  /** In-memory fallback, also a write-through cache. */
  private memory: SaveData = structuredClone(DEFAULTS);
  private loaded = false;

  constructor(private backing: StorageBacking | null) {}

  load(): SaveData {
    if (!this.loaded) {
      this.loaded = true;
      try {
        const raw = this.backing?.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as SaveData;
          if (parsed && parsed.version === 1) this.memory = parsed;
        }
      } catch {
        // corrupted or unreadable -> keep defaults
      }
    }
    return structuredClone(this.memory);
  }

  save(data: SaveData): void {
    this.loaded = true;
    this.memory = structuredClone(data);
    try {
      this.backing?.setItem(KEY, JSON.stringify(data));
    } catch {
      // storage full/unavailable -> in-memory only
    }
  }

  unlockShift(index: number): void {
    const d = this.load();
    if (index > d.unlockedShift) {
      d.unlockedShift = index;
      this.save(d);
    }
  }

  /** Returns true if this is a new high score. */
  recordScore(shiftId: string, score: number): boolean {
    const d = this.load();
    if (score > (d.highScores[shiftId] ?? 0)) {
      d.highScores[shiftId] = score;
      this.save(d);
      return true;
    }
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/persistence/storage.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/persistence/storage.ts tests/persistence/storage.test.ts
git commit -m "feat: versioned save store with graceful storage degradation"
```

---

### Task 11: Input Adapter

**Files:**
- Create: `src/input/inputAdapter.ts`
- Test: `tests/input/inputAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/input/inputAdapter.test.ts` (note the happy-dom pragma on line 1):

```ts
// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { attachPhysicalKeyboard, createHiddenInput } from '../../src/input/inputAdapter';

describe('attachPhysicalKeyboard', () => {
  it('forwards single-character keys', () => {
    const chars: string[] = [];
    const detach = attachPhysicalKeyboard(window, (c) => chars.push(c));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    detach();
    expect(chars).toEqual(['a', ' ']);
  });

  it('ignores modifier combos and special keys', () => {
    const chars: string[] = [];
    const detach = attachPhysicalKeyboard(window, (c) => chars.push(c));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', metaKey: true }));
    detach();
    expect(chars).toEqual([]);
  });

  it('stops forwarding after detach', () => {
    const chars: string[] = [];
    const detach = attachPhysicalKeyboard(window, (c) => chars.push(c));
    detach();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(chars).toEqual([]);
  });
});

describe('createHiddenInput', () => {
  it('forwards typed characters and clears its value', () => {
    const chars: string[] = [];
    const hidden = createHiddenInput(document, (c) => chars.push(c));
    const el = document.querySelector('input')!;
    el.value = 'ab';
    el.dispatchEvent(new Event('input'));
    expect(chars).toEqual(['a', 'b']);
    expect(el.value).toBe('');
    hidden.destroy();
  });

  it('disables autocorrect-family attributes', () => {
    const hidden = createHiddenInput(document, () => {});
    const el = document.querySelector('input')!;
    expect(el.getAttribute('autocapitalize')).toBe('none');
    expect(el.getAttribute('autocomplete')).toBe('off');
    expect(el.getAttribute('autocorrect')).toBe('off');
    expect(el.getAttribute('spellcheck')).toBe('false');
    hidden.destroy();
    expect(document.querySelector('input')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/input/inputAdapter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/input/inputAdapter.ts`**

```ts
/** Forward printable single characters from a physical keyboard. Returns a detach fn. */
export function attachPhysicalKeyboard(target: EventTarget, onChar: (c: string) => void): () => void {
  const handler = (e: Event) => {
    const ke = e as KeyboardEvent;
    if (ke.ctrlKey || ke.metaKey || ke.altKey) return;
    if (ke.key.length !== 1) return;
    if (ke.key === ' ') ke.preventDefault(); // avoid page scroll
    onChar(ke.key);
  };
  target.addEventListener('keydown', handler);
  return () => target.removeEventListener('keydown', handler);
}

export interface HiddenInput {
  focus(): void;
  destroy(): void;
}

/**
 * Invisible input that keeps the mobile keyboard summoned. Characters are
 * forwarded then the field is cleared, so autocomplete has nothing to chew on.
 */
export function createHiddenInput(doc: Document, onChar: (c: string) => void): HiddenInput {
  const el = doc.createElement('input');
  el.type = 'text';
  el.setAttribute('autocapitalize', 'none');
  el.setAttribute('autocomplete', 'off');
  el.setAttribute('autocorrect', 'off');
  el.setAttribute('spellcheck', 'false');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText =
    'position:fixed;bottom:0;left:0;width:1px;height:1px;opacity:0.01;border:0;padding:0;background:transparent;z-index:-1;';
  doc.body.appendChild(el);

  const onInput = () => {
    const value = el.value;
    el.value = '';
    for (const ch of value) onChar(ch);
  };
  el.addEventListener('input', onInput);

  return {
    focus: () => el.focus(),
    destroy: () => {
      el.removeEventListener('input', onInput);
      el.remove();
    },
  };
}

export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/input/inputAdapter.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/input/inputAdapter.ts tests/input/inputAdapter.test.ts
git commit -m "feat: input adapter for physical keyboard and hidden mobile input"
```

---

### Task 12: Phaser Bootstrap + Theme + Stub Scenes

No unit tests — this is the rendering layer. Verification is running the game.

**Files:**
- Modify: `src/main.ts` (replace placeholder)
- Create: `src/ui/theme.ts`, `src/ui/scenes/BootScene.ts`, `src/ui/scenes/TitleScene.ts`, `src/ui/scenes/ShiftSelectScene.ts`, `src/ui/scenes/GameScene.ts`, `src/ui/scenes/ResultsScene.ts`

- [ ] **Step 1: Create `src/ui/theme.ts`**

```ts
import Phaser from 'phaser';

export const COLORS = {
  wall: 0x7fd4cf,
  wallDark: 0x5bbab5,
  counter: 0xd9d9d9,
  counterEdge: 0x9e9e9e,
  hud: 0x2e2a26,
  cream: '#fdf3e3',
  creamHex: 0xfdf3e3,
  red: '#c0392b',
  redHex: 0xc0392b,
  dark: '#2e2a26',
  green: '#27ae60',
  yellow: '#f1c40f',
  white: '#ffffff',
};

export const FONT = 'Verdana, Geneva, sans-serif';

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  enabled = true,
): Phaser.GameObjects.Text {
  const btn = scene.add
    .text(x, y, label, {
      fontFamily: FONT,
      fontSize: '26px',
      fontStyle: 'bold',
      color: COLORS.cream,
      backgroundColor: enabled ? COLORS.red : '#8a8a8a',
      padding: { x: 20, y: 10 },
    })
    .setOrigin(0.5);
  if (enabled) {
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setAlpha(0.85));
    btn.on('pointerout', () => btn.setAlpha(1));
    btn.on('pointerdown', onClick);
  }
  return btn;
}
```

- [ ] **Step 2: Create stub scenes**

`src/ui/scenes/BootScene.ts`:

```ts
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    this.scene.start('title');
  }
}
```

`src/ui/scenes/TitleScene.ts` (stub — finalized in Task 15):

```ts
import Phaser from 'phaser';
import { COLORS, FONT, makeButton } from '../theme';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.3, 'SHORT-ORDER HERO', {
        fontFamily: FONT,
        fontSize: '48px',
        fontStyle: 'bold',
        color: COLORS.red,
      })
      .setOrigin(0.5);
    makeButton(this, width / 2, height * 0.55, 'START SHIFT', () =>
      this.scene.start('shiftselect'),
    );
  }
}
```

`src/ui/scenes/ShiftSelectScene.ts` (stub — finalized in Task 15):

```ts
import Phaser from 'phaser';
import { SHIFTS } from '../../core/shifts';
import { makeButton } from '../theme';

export class ShiftSelectScene extends Phaser.Scene {
  constructor() {
    super('shiftselect');
  }

  create() {
    const { width } = this.scale;
    makeButton(this, width / 2, 120, SHIFTS[0].name, () =>
      this.scene.start('game', { config: SHIFTS[0] }),
    );
  }
}
```

`src/ui/scenes/GameScene.ts` (stub — replaced in Task 13):

```ts
import Phaser from 'phaser';
import type { ShiftConfig } from '../../core/types';
import { FONT, makeButton } from '../theme';

export class GameScene extends Phaser.Scene {
  private config!: ShiftConfig;

  constructor() {
    super('game');
  }

  init(data: { config: ShiftConfig }) {
    this.config = data.config;
  }

  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.4, `GAME: ${this.config.name}`, { fontFamily: FONT, fontSize: '28px', color: '#2e2a26' })
      .setOrigin(0.5);
    makeButton(this, width / 2, height * 0.6, 'END (stub)', () =>
      this.scene.start('results', {
        config: this.config,
        result: {
          shiftId: this.config.id,
          won: true,
          score: 123,
          served: 5,
          strikes: 1,
          accuracy: 0.95,
          wpm: 30,
          bestCombo: 3,
          elapsedMs: 60_000,
        },
      }),
    );
  }
}
```

`src/ui/scenes/ResultsScene.ts` (stub — finalized in Task 15):

```ts
import Phaser from 'phaser';
import type { ShiftConfig, ShiftResult } from '../../core/types';
import { FONT, makeButton } from '../theme';

export class ResultsScene extends Phaser.Scene {
  private result!: ShiftResult;

  constructor() {
    super('results');
  }

  init(data: { config: ShiftConfig; result: ShiftResult }) {
    this.result = data.result;
  }

  create() {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height * 0.4, `RESULT: $${this.result.score}`, { fontFamily: FONT, fontSize: '28px', color: '#2e2a26' })
      .setOrigin(0.5);
    makeButton(this, width / 2, height * 0.6, 'MENU', () => this.scene.start('title'));
  }
}
```

- [ ] **Step 3: Replace `src/main.ts`**

```ts
import Phaser from 'phaser';
import { BootScene } from './ui/scenes/BootScene';
import { TitleScene } from './ui/scenes/TitleScene';
import { ShiftSelectScene } from './ui/scenes/ShiftSelectScene';
import { GameScene } from './ui/scenes/GameScene';
import { ResultsScene } from './ui/scenes/ResultsScene';

// Keep the canvas exactly the size of the *visual* viewport so the mobile
// keyboard never covers gameplay (interactive-widget=resizes-content helps,
// visualViewport is the belt to those braces).
function fitToViewport() {
  const app = document.getElementById('app')!;
  const vv = window.visualViewport;
  if (vv) app.style.height = `${vv.height}px`;
}
window.visualViewport?.addEventListener('resize', fitToViewport);
fitToViewport();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#fdf3e3',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, TitleScene, ShiftSelectScene, GameScene, ResultsScene],
});
```

- [ ] **Step 4: Verify by running**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npm run dev` and open the printed URL.
Expected: Title → START SHIFT → shift button → game stub → END (stub) → results stub → MENU loops back. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/ui/
git commit -m "feat: Phaser bootstrap, theme, and navigable stub scenes"
```

---

### Task 13: Game Scene — Customers, HUD, Typing Loop, Pause

No unit tests (rendering layer); all rules live in the already-tested core. Verification is playing the game.

**Files:**
- Create: `src/ui/CustomerView.ts`, `src/ui/Hud.ts`
- Modify: `src/ui/scenes/GameScene.ts` (replace the stub entirely)

- [ ] **Step 1: Create `src/ui/CustomerView.ts`**

```ts
import Phaser from 'phaser';
import { COLORS, FONT } from './theme';
import type { CustomerState } from '../core/types';

const FACES = ['🧔', '👵', '👦', '👩', '🤠', '👨‍🦰', '👸', '🧑‍🎤', '👽', '🤖'];

export class CustomerView extends Phaser.GameObjects.Container {
  readonly customerId: number;
  private bubble: Phaser.GameObjects.Container;
  private bar: Phaser.GameObjects.Graphics;
  private face: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, customer: CustomerState, x: number, y: number) {
    super(scene, x, y);
    this.customerId = customer.id;

    this.face = scene.add
      .text(0, 0, FACES[customer.id % FACES.length], { fontSize: '56px' })
      .setOrigin(0.5, 1);

    const label = scene.add
      .text(0, -86, customer.order.text, {
        fontFamily: FONT,
        fontSize: '20px',
        fontStyle: 'bold',
        color: COLORS.dark,
        backgroundColor: COLORS.white,
        padding: { x: 10, y: 6 },
        align: 'center',
        wordWrap: { width: 220 },
      })
      .setOrigin(0.5, 1);
    this.bubble = scene.add.container(0, 0, [label]);

    this.bar = scene.add.graphics();
    this.add([this.bubble, this.bar, this.face]);
    scene.add.existing(this);

    this.setScale(0);
    scene.tweens.add({ targets: this, scale: 1, duration: 250, ease: 'Back.Out' });
  }

  setLocked(locked: boolean) {
    this.scene.tweens.add({
      targets: this.bubble,
      scaleX: locked ? 1.12 : 1,
      scaleY: locked ? 1.12 : 1,
      duration: 120,
    });
  }

  updatePatience(fraction: number) {
    const f = Math.max(0, fraction);
    const color = f > 0.5 ? 0x27ae60 : f > 0.2 ? 0xf1c40f : 0xe74c3c;
    this.bar.clear();
    this.bar.fillStyle(0x000000, 0.15).fillRect(-40, -78, 80, 8);
    this.bar.fillStyle(color, 1).fillRect(-40, -78, 80 * f, 8);
    // jitter when about to storm out
    this.face.setAngle(f < 0.2 ? Math.sin(this.scene.time.now / 50) * 4 : 0);
  }

  serve(onDone: () => void) {
    this.scene.tweens.add({
      targets: this,
      y: this.y - 24,
      alpha: 0,
      duration: 350,
      onComplete: () => {
        this.destroy();
        onDone();
      },
    });
  }

  stormOut(onDone: () => void) {
    this.face.setText('😡');
    this.scene.tweens.add({
      targets: this,
      x: this.x + this.scene.scale.width * 0.4,
      alpha: 0,
      duration: 450,
      onComplete: () => {
        this.destroy();
        onDone();
      },
    });
  }
}
```

- [ ] **Step 2: Create `src/ui/Hud.ts`**

```ts
import Phaser from 'phaser';
import { COLORS, FONT } from './theme';

export class Hud {
  private bg: Phaser.GameObjects.Rectangle;
  private strikesText: Phaser.GameObjects.Text;
  private scoreText: Phaser.GameObjects.Text;
  private orderContainer: Phaser.GameObjects.Container;
  private typedText: Phaser.GameObjects.Text;
  private restText: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {
    this.bg = scene.add.rectangle(0, 0, 10, 10, COLORS.hud).setOrigin(0, 0);
    this.strikesText = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '22px', color: COLORS.cream })
      .setOrigin(0, 0.5);
    this.scoreText = scene.add
      .text(0, 0, '$ 0', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: COLORS.cream })
      .setOrigin(1, 0.5);
    this.typedText = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: COLORS.green })
      .setOrigin(0, 0.5);
    this.restText = scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: '#bdb3a4' })
      .setOrigin(0, 0.5);
    this.orderContainer = scene.add.container(0, 0, [this.typedText, this.restText]);
    this.setStrikes(0);
  }

  layout(width: number, height: number, hudTop: number) {
    const cy = hudTop + (height - hudTop) / 2;
    this.bg.setPosition(0, hudTop).setSize(width, height - hudTop);
    this.strikesText.setPosition(16, cy);
    this.scoreText.setPosition(width - 16, cy);
    this.orderContainer.setY(cy);
    this.centerOrder(width);
  }

  setStrikes(n: number) {
    this.strikesText.setText('😠'.repeat(n) + ' · '.repeat(Math.max(0, 3 - n)));
  }

  setScore(n: number) {
    this.scoreText.setText(`$ ${n}`);
  }

  showOrder(text: string, typedCount: number) {
    this.typedText.setText(text.slice(0, typedCount));
    this.restText.setText(text.slice(typedCount));
    this.restText.setX(this.typedText.width);
    this.centerOrder(this.scene.scale.width);
  }

  flashMistake() {
    this.scene.tweens.add({
      targets: this.orderContainer,
      x: this.orderContainer.x + 8,
      duration: 40,
      yoyo: true,
      repeat: 3,
    });
  }

  private centerOrder(width: number) {
    const total = this.typedText.width + this.restText.width;
    this.orderContainer.setX(width / 2 - total / 2);
  }
}
```

- [ ] **Step 3: Replace `src/ui/scenes/GameScene.ts`**

```ts
import Phaser from 'phaser';
import { ShiftEngine } from '../../core/shiftEngine';
import type { ShiftConfig } from '../../core/types';
import { attachPhysicalKeyboard } from '../../input/inputAdapter';
import { CustomerView } from '../CustomerView';
import { Hud } from '../Hud';
import { COLORS, FONT } from '../theme';

const HUD_TOP_FRACTION = 0.86;
const COUNTER_Y_FRACTION = 0.58;

export class GameScene extends Phaser.Scene {
  private config!: ShiftConfig;
  private engine!: ShiftEngine;
  private views = new Map<number, CustomerView>();
  private orderTexts = new Map<number, string>();
  private hud!: Hud;
  private pauseOverlay!: Phaser.GameObjects.Container;
  private gamePaused = false;
  private maxSlots = 4;
  private cleanupFns: Array<() => void> = [];

  constructor() {
    super('game');
  }

  init(data: { config: ShiftConfig }) {
    this.config = data.config;
  }

  create() {
    const { width, height } = this.scale;
    this.views.clear();
    this.orderTexts.clear();
    this.gamePaused = false;
    this.cleanupFns = [];
    this.maxSlots = width < 700 ? 3 : 4;
    this.engine = new ShiftEngine({ config: this.config, maxCustomersCap: this.maxSlots });

    this.drawDiner(width, height);
    this.hud = new Hud(this);
    this.hud.layout(width, height, height * HUD_TOP_FRACTION);
    this.buildPauseOverlay(width, height);

    this.wireEngineEvents();

    const detach = attachPhysicalKeyboard(window, (ch) => this.onChar(ch));
    this.cleanupFns.push(detach);

    const onBlur = () => this.pauseGame();
    window.addEventListener('blur', onBlur);
    this.cleanupFns.push(() => window.removeEventListener('blur', onBlur));
    const onVis = () => {
      if (document.visibilityState === 'hidden') this.pauseGame();
    };
    document.addEventListener('visibilitychange', onVis);
    this.cleanupFns.push(() => document.removeEventListener('visibilitychange', onVis));

    this.input.on('pointerdown', () => {
      if (this.gamePaused) this.resumeGame();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const fn of this.cleanupFns) fn();
    });
  }

  update(_time: number, delta: number) {
    if (this.gamePaused || this.engine.isOver) return;
    this.engine.update(delta);
    for (const c of this.engine.activeCustomers) {
      this.views.get(c.id)?.updatePatience(c.patienceMs / c.patienceTotalMs);
    }
  }

  // ---- input ----

  private onChar(ch: string) {
    if (this.gamePaused) {
      this.resumeGame();
      return;
    }
    this.engine.handleKey(ch);
  }

  // ---- engine event wiring ----

  private wireEngineEvents() {
    const e = this.engine.events;

    e.on('customerArrived', ({ customer }) => {
      this.orderTexts.set(customer.id, customer.order.text);
      const view = new CustomerView(this, customer, this.slotX(customer.slot), this.counterY());
      this.views.set(customer.id, view);
    });

    e.on('orderLocked', ({ customerId }) => {
      this.views.get(customerId)?.setLocked(true);
      this.hud.showOrder(this.orderTexts.get(customerId) ?? '', this.engine.typedCount);
    });

    e.on('orderProgress', ({ customerId, typedCount }) => {
      this.hud.showOrder(this.orderTexts.get(customerId) ?? '', typedCount);
    });

    e.on('wordCompleted', ({ customerId }) => {
      // Prep station hooks in here in the next task.
      this.hud.showOrder(this.orderTexts.get(customerId) ?? '', this.engine.typedCount);
    });

    e.on('orderServed', ({ customerId }) => {
      const view = this.views.get(customerId);
      view?.serve(() => this.views.delete(customerId));
      this.hud.setScore(this.engine.score);
      this.hud.showOrder('', 0);
    });

    e.on('customerLeft', ({ customerId, strikes }) => {
      const view = this.views.get(customerId);
      view?.stormOut(() => this.views.delete(customerId));
      this.hud.setStrikes(strikes);
      if (this.engine.lockedCustomerId === null) this.hud.showOrder('', 0);
      this.cameras.main.shake(150, 0.008);
    });

    e.on('mistake', () => {
      this.hud.flashMistake();
    });

    e.on('shiftEnded', ({ result }) => {
      this.time.delayedCall(700, () =>
        this.scene.start('results', { config: this.config, result }),
      );
    });
  }

  // ---- layout & scenery ----

  private slotX(slot: number): number {
    const w = this.scale.width;
    return w * (0.1 + (0.8 * (slot + 0.5)) / this.maxSlots);
  }

  private counterY(): number {
    return this.scale.height * COUNTER_Y_FRACTION;
  }

  private drawDiner(width: number, height: number) {
    const counterY = height * COUNTER_Y_FRACTION;
    this.add.rectangle(0, 0, width, counterY, COLORS.wall).setOrigin(0);
    this.add
      .text(width / 2, 24, "★ MEL'S DINER ★", {
        fontFamily: FONT,
        fontSize: '24px',
        fontStyle: 'bold',
        color: COLORS.red,
      })
      .setOrigin(0.5, 0);
    this.add.rectangle(0, counterY, width, 18, COLORS.counterEdge).setOrigin(0);
    this.add.rectangle(0, counterY + 18, width, height * 0.1, COLORS.counter).setOrigin(0);
    this.add
      .text(width / 2, 60, this.config.name, {
        fontFamily: FONT,
        fontSize: '16px',
        color: COLORS.dark,
      })
      .setOrigin(0.5, 0);
  }

  // ---- pause ----

  private buildPauseOverlay(width: number, height: number) {
    const rect = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
    const txt = this.add
      .text(width / 2, height / 2, 'PAUSED\nBack to the grill? Press any key or tap.', {
        fontFamily: FONT,
        fontSize: '26px',
        fontStyle: 'bold',
        color: COLORS.cream,
        align: 'center',
      })
      .setOrigin(0.5);
    this.pauseOverlay = this.add.container(0, 0, [rect, txt]).setDepth(100).setVisible(false);
  }

  private pauseGame() {
    if (this.gamePaused || this.engine.isOver) return;
    this.gamePaused = true;
    this.pauseOverlay.setVisible(true);
  }

  private resumeGame() {
    this.gamePaused = false;
    this.pauseOverlay.setVisible(false);
  }
}
```

- [ ] **Step 4: Verify by playing**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npm run dev`, navigate Title → shift select → Monday.

Checklist:
- Customers pop in with order bubbles and green patience bars; bars drain to yellow/red; faces jitter when nearly out of patience.
- Typing the first letter of an order enlarges that customer's bubble and shows the order in the HUD with typed letters in green.
- A wrong key shakes the HUD order text; progress is kept.
- Completing an order makes the customer float away happily and the tip jar increases.
- Letting a customer drain makes them storm off; an 😠 appears in the HUD; camera shakes.
- 3 strikes (or surviving the full shift) lands on the Results stub.
- Switching to another window pauses; any key or tap resumes.

- [ ] **Step 5: Commit**

```bash
git add src/ui/CustomerView.ts src/ui/Hud.ts src/ui/scenes/GameScene.ts
git commit -m "feat: playable game scene with customers, lock-on HUD, strikes, pause"
```

---

### Task 14: Prep Station Animations

**Files:**
- Create: `src/ui/PrepStation.ts`
- Modify: `src/ui/scenes/GameScene.ts` (hook prep station into events)

- [ ] **Step 1: Create `src/ui/PrepStation.ts`**

```ts
import Phaser from 'phaser';
import { COLORS, FONT } from './theme';

/**
 * The bowl on the prep counter. Completed words drop in as labeled ingredient
 * boxes that pour "powder"; a completed order pops out as a dish that slides
 * to the customer.
 */
export class PrepStation {
  private root: Phaser.GameObjects.Container;
  private bowl: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene, private x: number, private y: number) {
    this.bowl = scene.add.graphics();
    this.bowl.fillStyle(0xb0bec5, 1).fillEllipse(0, 0, 150, 44);
    this.bowl.fillStyle(0x78909c, 1).fillEllipse(0, -6, 130, 30);
    this.root = scene.add.container(x, y, [this.bowl]);
  }

  /** A labeled box tips over the bowl and pours powder. */
  dropBox(word: string) {
    const label = this.scene.add
      .text(0, 0, word.toUpperCase(), {
        fontFamily: FONT,
        fontSize: '14px',
        fontStyle: 'bold',
        color: COLORS.cream,
        backgroundColor: '#8d6e63',
        padding: { x: 8, y: 5 },
      })
      .setOrigin(0.5);
    const box = this.scene.add.container(this.x + Phaser.Math.Between(-30, 30), this.y - 130, [label]);

    this.scene.tweens.add({
      targets: box,
      y: this.y - 70,
      angle: 120,
      duration: 280,
      ease: 'Quad.In',
      onComplete: () => {
        this.pourPowder();
        this.scene.tweens.add({
          targets: box,
          alpha: 0,
          y: this.y - 90,
          delay: 250,
          duration: 200,
          onComplete: () => box.destroy(),
        });
      },
    });
  }

  /** The dish pops out of the bowl and slides to the customer. */
  serveDish(targetX: number, targetY: number, onDone?: () => void) {
    const dish = this.scene.add.text(this.x, this.y - 20, '🍽️', { fontSize: '40px' }).setOrigin(0.5);
    this.scene.tweens.chain({
      targets: dish,
      tweens: [
        { y: this.y - 80, duration: 180, ease: 'Quad.Out' },
        { x: targetX, y: targetY - 30, duration: 260, ease: 'Quad.In' },
        { alpha: 0, duration: 150 },
      ],
      onComplete: () => {
        dish.destroy();
        onDone?.();
      },
    });
    this.wiggle();
  }

  /** Buzz feedback on a wrong keystroke. */
  shake() {
    this.scene.tweens.add({
      targets: this.root,
      x: this.x + 6,
      duration: 40,
      yoyo: true,
      repeat: 2,
      onComplete: () => this.root.setX(this.x),
    });
  }

  private pourPowder() {
    for (let i = 0; i < 6; i++) {
      const grain = this.scene.add.circle(
        this.x + Phaser.Math.Between(-20, 20),
        this.y - 60,
        Phaser.Math.Between(2, 4),
        0xfff3e0,
      );
      this.scene.tweens.add({
        targets: grain,
        y: this.y - 10,
        alpha: 0.2,
        delay: i * 40,
        duration: 220,
        ease: 'Quad.In',
        onComplete: () => grain.destroy(),
      });
    }
    this.wiggle();
  }

  private wiggle() {
    this.scene.tweens.add({
      targets: this.root,
      scaleX: 1.06,
      scaleY: 0.94,
      duration: 90,
      yoyo: true,
    });
  }
}
```

- [ ] **Step 2: Hook into `GameScene`**

In `src/ui/scenes/GameScene.ts`:

1. Add the import:

```ts
import { PrepStation } from '../PrepStation';
```

2. Add a field:

```ts
private prep!: PrepStation;
```

3. In `create()`, right after `this.drawDiner(width, height);` add:

```ts
this.prep = new PrepStation(this, width / 2, height * 0.78);
```

4. In `wireEngineEvents()`, extend the handlers. `customerArrived` already stores `orderTexts`; also store words — change the `orderTexts` map declaration to:

```ts
private orderTexts = new Map<number, string>();
private orderWords = new Map<number, string[]>();
```

In the `customerArrived` handler add:

```ts
this.orderWords.set(customer.id, customer.order.words);
```

Replace the `wordCompleted` handler body with:

```ts
e.on('wordCompleted', ({ customerId, wordIndex }) => {
  this.hud.showOrder(this.orderTexts.get(customerId) ?? '', this.engine.typedCount);
  const word = this.orderWords.get(customerId)?.[wordIndex];
  if (word) this.prep.dropBox(word);
});
```

Replace the `orderServed` handler body with:

```ts
e.on('orderServed', ({ customerId, finalWordIndex }) => {
  const word = this.orderWords.get(customerId)?.[finalWordIndex];
  if (word) this.prep.dropBox(word);
  const view = this.views.get(customerId);
  const tx = view?.x ?? this.scale.width / 2;
  const ty = view?.y ?? this.scale.height * 0.4;
  this.prep.serveDish(tx, ty, () => {
    view?.serve(() => this.views.delete(customerId));
  });
  this.hud.setScore(this.engine.score);
  this.hud.showOrder('', 0);
});
```

Extend the `mistake` handler with the bowl shake:

```ts
e.on('mistake', () => {
  this.hud.flashMistake();
  this.prep.shake();
});
```

5. In `create()`, also clear the new map: add `this.orderWords.clear();` next to `this.orderTexts.clear();`.

- [ ] **Step 3: Verify by playing**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npm run dev`, play Monday and (via completing it or temporarily selecting it) a later shift with multi-word orders.

Checklist:
- Completing each word drops a labeled box (e.g. "ZEBRA") that tips and pours powder into the bowl.
- Completing the order drops the final word's box, then a dish pops out of the bowl and slides to the customer, who then floats away.
- Wrong keystrokes shake the bowl.

- [ ] **Step 4: Commit**

```bash
git add src/ui/PrepStation.ts src/ui/scenes/GameScene.ts
git commit -m "feat: prep station with ingredient box drops and dish serving"
```

---

### Task 15: Title, Shift Select, and Results Scenes (with Persistence)

**Files:**
- Modify: `src/ui/scenes/TitleScene.ts`, `src/ui/scenes/ShiftSelectScene.ts`, `src/ui/scenes/ResultsScene.ts` (replace stubs entirely)

- [ ] **Step 1: Replace `src/ui/scenes/TitleScene.ts`**

```ts
import Phaser from 'phaser';
import { OVERTIME, SHIFTS } from '../../core/shifts';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { COLORS, FONT, makeButton } from '../theme';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('title');
  }

  create() {
    const { width, height } = this.scale;
    const save = new SaveStore(safeLocalStorage()).load();
    const overtimeUnlocked = save.unlockedShift >= SHIFTS.length;

    this.add.rectangle(0, 0, width, height, COLORS.creamHex).setOrigin(0);
    this.add
      .text(width / 2, height * 0.18, 'SHORT-ORDER', {
        fontFamily: FONT,
        fontSize: '52px',
        fontStyle: 'bold',
        color: COLORS.red,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.28, 'HERO', {
        fontFamily: FONT,
        fontSize: '64px',
        fontStyle: 'bold',
        color: COLORS.dark,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.38, 'type fast · serve weird', {
        fontFamily: FONT,
        fontSize: '20px',
        color: COLORS.dark,
      })
      .setOrigin(0.5);

    makeButton(this, width / 2, height * 0.55, 'START SHIFT', () =>
      this.scene.start('shiftselect'),
    );
    makeButton(
      this,
      width / 2,
      height * 0.67,
      overtimeUnlocked ? 'OVERTIME' : '🔒 OVERTIME',
      () => this.scene.start('game', { config: OVERTIME }),
      overtimeUnlocked,
    );

    const best = save.highScores[OVERTIME.id];
    if (best) {
      this.add
        .text(width / 2, height * 0.78, `Overtime best: $${best}`, {
          fontFamily: FONT,
          fontSize: '18px',
          color: COLORS.dark,
        })
        .setOrigin(0.5);
    }
  }
}
```

- [ ] **Step 2: Replace `src/ui/scenes/ShiftSelectScene.ts`**

```ts
import Phaser from 'phaser';
import { SHIFTS } from '../../core/shifts';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { COLORS, FONT, makeButton } from '../theme';

export class ShiftSelectScene extends Phaser.Scene {
  constructor() {
    super('shiftselect');
  }

  create() {
    const { width, height } = this.scale;
    const save = new SaveStore(safeLocalStorage()).load();

    this.add.rectangle(0, 0, width, height, COLORS.creamHex).setOrigin(0);
    this.add
      .text(width / 2, height * 0.08, 'PICK YOUR SHIFT', {
        fontFamily: FONT,
        fontSize: '32px',
        fontStyle: 'bold',
        color: COLORS.red,
      })
      .setOrigin(0.5);

    SHIFTS.forEach((shift, i) => {
      const unlocked = i <= save.unlockedShift;
      const y = height * 0.2 + i * Math.min(70, height * 0.11);
      const label = unlocked ? shift.name : `🔒 ${shift.name}`;
      makeButton(this, width / 2, y, label, () => this.scene.start('game', { config: shift }), unlocked);
      const best = save.highScores[shift.id];
      if (best) {
        this.add
          .text(width / 2 + 10, y + 26, `best $${best}`, {
            fontFamily: FONT,
            fontSize: '14px',
            color: COLORS.dark,
          })
          .setOrigin(0.5, 0);
      }
    });

    makeButton(this, width / 2, height * 0.9, 'BACK', () => this.scene.start('title'));
  }
}
```

- [ ] **Step 3: Replace `src/ui/scenes/ResultsScene.ts`**

```ts
import Phaser from 'phaser';
import { OVERTIME, SHIFTS } from '../../core/shifts';
import type { ShiftConfig, ShiftResult } from '../../core/types';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { COLORS, FONT, makeButton } from '../theme';

export class ResultsScene extends Phaser.Scene {
  private config!: ShiftConfig;
  private result!: ShiftResult;

  constructor() {
    super('results');
  }

  init(data: { config: ShiftConfig; result: ShiftResult }) {
    this.config = data.config;
    this.result = data.result;
  }

  create() {
    const { width, height } = this.scale;
    const r = this.result;
    const store = new SaveStore(safeLocalStorage());
    const newHigh = store.recordScore(r.shiftId, r.score);
    const shiftIndex = SHIFTS.findIndex((s) => s.id === r.shiftId);
    if (r.won && shiftIndex >= 0) store.unlockShift(shiftIndex + 1);

    this.add.rectangle(0, 0, width, height, COLORS.creamHex).setOrigin(0);

    const lines = [
      "      MEL'S DINER      ",
      '     shift receipt     ',
      '------------------------',
      this.config.name,
      '------------------------',
      `customers served ... ${r.served}`,
      `tips earned ........ $${r.score}`,
      `accuracy ........... ${Math.round(r.accuracy * 100)}%`,
      `speed .............. ${Math.round(r.wpm)} wpm`,
      `best combo ......... x${r.bestCombo}`,
      `walkouts ........... ${r.strikes}`,
      '------------------------',
      r.won ? '   SHIFT SURVIVED! ✔   ' : "      YOU'RE FIRED      ",
      ...(r.won ? [] : ['  (see you tomorrow.)  ']),
      ...(newHigh ? ['    ★ NEW BEST! ★    '] : []),
    ];
    this.add
      .text(width / 2, height * 0.08, lines.join('\n'), {
        fontFamily: 'Courier, monospace',
        fontSize: '18px',
        color: COLORS.dark,
        backgroundColor: COLORS.white,
        padding: { x: 18, y: 16 },
        align: 'left',
      })
      .setOrigin(0.5, 0);

    const buttonsY = height * 0.82;
    const isLastShift = shiftIndex === SHIFTS.length - 1;
    if (r.won && shiftIndex >= 0 && !isLastShift) {
      makeButton(this, width * 0.5, buttonsY, 'NEXT SHIFT', () =>
        this.scene.start('game', { config: SHIFTS[shiftIndex + 1] }),
      );
    } else if (r.won && isLastShift) {
      makeButton(this, width * 0.5, buttonsY, 'OVERTIME!', () =>
        this.scene.start('game', { config: OVERTIME }),
      );
    } else {
      makeButton(this, width * 0.5, buttonsY, 'TRY AGAIN', () =>
        this.scene.start('game', { config: this.config }),
      );
    }
    makeButton(this, width * 0.5, buttonsY + Math.min(64, height * 0.1), 'MENU', () =>
      this.scene.start('title'),
    );
  }
}
```

- [ ] **Step 4: Verify by playing**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npm run dev`.

Checklist:
- Title shows the logo; OVERTIME is locked (🔒, gray, not clickable) on a fresh profile.
- Shift select shows Monday unlocked, Tuesday–Friday locked.
- Winning Monday shows the receipt with stats and a NEXT SHIFT button; Tuesday is now unlocked (verify it persists after a page reload).
- Losing shows "YOU'RE FIRED / (see you tomorrow.)" and TRY AGAIN.
- Beating a shift's previous score shows ★ NEW BEST! ★ and shift select shows `best $N`.
- In devtools → Application → Local Storage, the `short-order-hero-save` key updates.

- [ ] **Step 5: Commit**

```bash
git add src/ui/scenes/TitleScene.ts src/ui/scenes/ShiftSelectScene.ts src/ui/scenes/ResultsScene.ts
git commit -m "feat: title, shift select, and receipt-styled results with persistence"
```

---

### Task 16: Mobile Input + Viewport Handling

**Files:**
- Modify: `src/ui/scenes/GameScene.ts`

- [ ] **Step 1: Add the hidden input and tap-to-start to `GameScene`**

1. Extend the inputAdapter import:

```ts
import { attachPhysicalKeyboard, createHiddenInput, isTouchDevice, type HiddenInput } from '../../input/inputAdapter';
```

2. Add fields:

```ts
private hidden?: HiddenInput;
private pauseRect!: Phaser.GameObjects.Rectangle;
private pauseText!: Phaser.GameObjects.Text;
```

3. Rework `buildPauseOverlay` to keep references (so text/size can change):

```ts
private buildPauseOverlay(width: number, height: number) {
  this.pauseRect = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0);
  this.pauseText = this.add
    .text(width / 2, height / 2, '', {
      fontFamily: FONT,
      fontSize: '26px',
      fontStyle: 'bold',
      color: COLORS.cream,
      align: 'center',
    })
    .setOrigin(0.5);
  this.pauseOverlay = this.add.container(0, 0, [this.pauseRect, this.pauseText]).setDepth(100).setVisible(false);
}
```

4. Give `pauseGame` an optional message and use it from the blur handlers (the default stays the same):

```ts
private pauseGame(message = 'PAUSED\nBack to the grill? Press any key or tap.') {
  if (this.gamePaused || this.engine.isOver) return;
  this.gamePaused = true;
  this.pauseText.setText(message);
  this.pauseOverlay.setVisible(true);
}
```

5. In `resumeGame`, refocus the hidden input (summons the keyboard on mobile):

```ts
private resumeGame() {
  this.gamePaused = false;
  this.pauseOverlay.setVisible(false);
  this.hidden?.focus();
}
```

6. In `create()`, after the physical-keyboard attachment, add the mobile path. The tap-to-start gate matters: mobile browsers only open the keyboard on a user gesture.

```ts
if (isTouchDevice()) {
  this.hidden = createHiddenInput(document, (ch) => this.onChar(ch));
  this.cleanupFns.push(() => this.hidden?.destroy());
  this.pauseGame('TAP TO START YOUR SHIFT\n(the keyboard is your grill)');
}
```

(The existing `pointerdown` → `resumeGame()` handler turns the first tap into focus + start. Re-taps after the OS keyboard is dismissed re-focus it the same way.)

7. Re-layout when the keyboard resizes the viewport — add at the end of `create()`:

```ts
const onResize = () => {
  const w = this.scale.width;
  const h = this.scale.height;
  this.hud.layout(w, h, h * HUD_TOP_FRACTION);
  this.pauseRect.setSize(w, h);
  this.pauseText.setPosition(w / 2, h / 2);
};
this.scale.on(Phaser.Scale.Events.RESIZE, onResize);
this.cleanupFns.push(() => this.scale.off(Phaser.Scale.Events.RESIZE, onResize));
```

- [ ] **Step 2: Verify on a phone (or emulation)**

Run: `npx tsc --noEmit` — expected: no errors.
Run: `npm run dev -- --host` and open the network URL on a phone (same Wi-Fi), or use desktop devtools device emulation (note: emulation won't show a real OS keyboard — a real device is the meaningful test).

Checklist:
- Game starts paused with "TAP TO START YOUR SHIFT"; tapping opens the native keyboard and starts play.
- Typing on the native keyboard locks/progresses orders exactly like a physical keyboard.
- The scene + HUD stay fully visible above the keyboard (nothing critical hidden).
- Autocorrect/suggestions do not interfere (letters arrive one at a time).
- Dismissing the keyboard and tapping the game brings it back.
- At most 3 customers appear on a narrow screen.

- [ ] **Step 3: Commit**

```bash
git add src/ui/scenes/GameScene.ts
git commit -m "feat: mobile native-keyboard input with tap-to-start and viewport relayout"
```

---

### Task 17: PWA + README + Final Verification

**Files:**
- Modify: `vite.config.ts`
- Create: `public/icon.svg`, `README.md`

- [ ] **Step 1: Create `public/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#c0392b"/>
  <text x="256" y="350" font-size="280" text-anchor="middle">🍔</text>
</svg>
```

- [ ] **Step 2: Replace `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Short-Order Hero',
        short_name: 'ShortOrder',
        description: "A 50's diner typing arcade game — type fast, serve weird.",
        theme_color: '#c0392b',
        background_color: '#fdf3e3',
        display: 'standalone',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
});
```

- [ ] **Step 3: Create `README.md`**

```markdown
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
```

- [ ] **Step 4: Full verification**

Run: `npm test`
Expected: all suites pass (emitter, text, rng, vocabulary, orderGenerator, typingEngine, scoring, difficulty, shiftEngine, storage, inputAdapter, smoke).

Run: `npm run build`
Expected: tsc clean; Vite build succeeds; output mentions PWA files (`sw.js`, `manifest.webmanifest`).

Run: `npm run preview` and open the URL.
Checklist:
- Game plays end-to-end (Monday → receipt → unlock Tuesday).
- Browser shows the install prompt / install icon (Chrome: address-bar install button).
- Devtools → Application → Manifest shows name and icon; Service Worker is activated.
- After one load, going offline (devtools → Network → Offline) and reloading still serves the game.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts public/icon.svg README.md
git commit -m "feat: PWA manifest, service worker, icon, and README"
```

---

## Post-Plan Notes

- **Deferred (intentionally out of v1):** sound effects/music, fancier art than emoji + shapes, per-shift intro cards, settings screen. All are additive and don't change the architecture.
- **Balancing:** the difficulty numbers in `src/core/shifts.ts` are first-pass guesses; tune them by playtest after Task 15 when the full loop is playable. They are data-only changes.
- **Renaming the game:** change the title strings in `TitleScene`, `index.html`, the PWA manifest, and README. Nothing structural depends on the name.

## Code Review Follow-ups (post-Task 17)

Found during full-branch review; not yet fixed.

- **Important — `src/core/shiftEngine.ts`:** `this.customers` never removes resolved (served/stormed-out) entries, so it grows unboundedly for the life of a shift. Negligible for the 5 timed shifts, but Overtime (`durationMs: Infinity`) is endless, so a long run accumulates entries indefinitely. `activeCustomers` (a `.filter`) and `serve()` (a `.find`) both scan the full array each call. Fix: prune resolved customers once their event has been emitted, or switch to a `Map<id, CustomerState>` with delete-on-resolve.
- **Minor — `src/core/text.ts`:** the accent-stripping regex uses literal combining-diacritic characters instead of the `̀-ͯ` escape range from the plan. Functionally correct (tests pass) but the literal characters are hard to eyeball/diff in an editor. Prefer the explicit escape form.
- **Minor — `src/ui/scenes/GameScene.ts` `shiftEnded` handler:** the `this.time.delayedCall(700, …)` that transitions to the results scene isn't tracked in `cleanupFns`, so it could fire after `SHUTDOWN` in rare rapid-navigation cases. Track and cancel it on shutdown.
- **Minor — `README.md` / build output:** `vite build` warns about a ~1.2MB main chunk — this is just Phaser and is expected, but undocumented. A one-line README note would prevent it being mistaken for a regression.






