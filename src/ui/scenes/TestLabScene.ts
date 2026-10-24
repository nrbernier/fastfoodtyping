import Phaser from 'phaser';
import { BOSSES } from '../../core/shifts';
import type { ShiftConfig, ShiftSpecials } from '../../core/types';
import { COLORS, FONTS, makeButton } from '../theme';
import { applyPaperGrain } from '../texture';

const NONE = { start: 0, end: 0 };
const ALWAYS = { start: 1, end: 1 };
const PLAIN = { t1: 0.6, t2: 0.4, t3: 0 };

/** A calm two-minute shift that shows one thing over and over. */
function scenario(id: string, name: string, overrides: Partial<ShiftConfig> & { specials?: ShiftSpecials } = {}): ShiftConfig & { after: string } {
  return {
    id: `test-${id}`,
    // Tuesday's menu board on the wall.
    after: 'tuesday',
    name: `Test: ${name}`,
    durationMs: 120_000,
    rampMs: 120_000,
    maxCustomers: { start: 3, end: 3 },
    spawnIntervalMs: { start: 2500, end: 2500 },
    patienceMs: { start: 20_000, end: 20_000 },
    tierWeights: { start: PLAIN, end: PLAIN },
    wordsPerOrder: { start: 1, end: 1 },
    countChance: NONE,
    houseChance: NONE,
    ...overrides,
  };
}

const SCENARIOS: { label: string; config: ShiftConfig }[] = [
  { label: 'FINGER-COUNTER', config: scenario('fingers', 'Finger-Counter', { countChance: ALWAYS, maxCustomers: { start: 2, end: 2 } }) },
  { label: 'MIND-CHANGER', config: scenario('fickle', 'Mind-Changer', { specials: { fickle: 1, courses: 0, rushAtMs: [] } }) },
  { label: 'SECOND COURSE', config: scenario('courses', 'Second Course', { specials: { fickle: 0, courses: 1, rushAtMs: [] } }) },
  { label: 'DRINK RUSH', config: scenario('rush', 'Drink Rush', { specials: { fickle: 0, courses: 0, rushAtMs: [4000, 40_000, 80_000] } }) },
  { label: 'WEIRD DISHES', config: scenario('weird', 'Weird Dishes', { tierWeights: { start: { t1: 0, t2: 0, t3: 1 }, end: { t1: 0, t2: 0, t3: 1 } } }) },
  { label: 'HOUSE ORDERS', config: scenario('house', 'House Orders', { houseChance: ALWAYS }) },
  ...BOSSES.map((b) => ({ label: b.id === 'boss-lou' ? 'BIG LOU' : 'MONEYBAGS', config: b })),
];

/**
 * Preview builds only: jump straight into a shift that shows one feature,
 * like a Finger-Counter in every seat, without playing the week to find it.
 */
export class TestLabScene extends Phaser.Scene {
  constructor() {
    super('testlab');
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, COLORS.wall).setOrigin(0);
    this.add.text(width / 2, 36, 'TEST LAB', {
      fontFamily: FONTS.slab, fontSize: '30px', color: COLORS.mustard, stroke: COLORS.dark, strokeThickness: 5,
    }).setOrigin(0.5);
    this.add.text(width / 2, 72, 'Preview only. Each one repeats a single feature.', {
      fontFamily: FONTS.mono, fontSize: '14px', color: COLORS.cream, align: 'center', wordWrap: { width: width - 32 },
    }).setOrigin(0.5);

    // Two columns on wide screens, one on phones; buttons shrink to fit the height.
    const cols = width >= 600 ? 2 : 1;
    const rows = Math.ceil(SCENARIOS.length / cols);
    const top = 112;
    const bottom = height - 90;
    const gap = Math.min(62, (bottom - top) / rows);
    const fontSize = gap < 52 ? 16 : 20;
    SCENARIOS.forEach(({ label, config }, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = cols === 1 ? width / 2 : width / 2 + (col === 0 ? -1 : 1) * Math.min(160, width / 4);
      makeButton(this, x, top + gap * (row + 0.5), label, () => this.scene.start('game', { config }), true, { fontSize });
    });
    makeButton(this, width / 2, height - 44, 'BACK', () => this.scene.start('title'));
    applyPaperGrain(this);
  }
}
