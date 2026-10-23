import Phaser from 'phaser';
import { SaveStore, safeLocalStorage } from '../../persistence/storage';
import { BIOS } from '../bios';
import { POSES, type PoseDef } from '../cast';
import { COLORS, FONTS, makeButton } from '../theme';
import { applyPaperGrain } from '../texture';
import { UNLOCK_ALL } from '../preview';

interface Entry {
  character: string;
  poses: PoseDef[];
  met: number;
}

const TOP = 112;
const GAP = 10;

/**
 * Mel's scrapbook: every customer in the cast, pasted in once they've been
 * served. Tap a card for their bio and all their poses; drag to scroll.
 */
export class ScrapbookScene extends Phaser.Scene {
  private entries: Entry[] = [];
  private grid!: Phaser.GameObjects.Container;
  private scrollY = 0;
  private maxScroll = 0;
  private cardW = 0;
  private cardH = 0;
  private cols = 3;
  private detail?: Phaser.GameObjects.Container;
  private gridBottom = 0;
  private pressed?: Entry;
  private velocity = 0;

  constructor() {
    super('scrapbook');
  }

  create() {
    const { width, height } = this.scale;
    const met = new SaveStore(safeLocalStorage()).met();
    const byCharacter = new Map<string, PoseDef[]>();
    for (const p of POSES) byCharacter.set(p.character, [...(byCharacter.get(p.character) ?? []), p]);
    // Previews show everyone, as if each had been served once.
    this.entries = [...byCharacter].map(([character, poses]) => ({
      character, poses, met: met[character] ?? (UNLOCK_ALL ? 1 : 0),
    }));
    // Met customers first, most-served at the top; the rest keep cast order.
    this.entries.sort((a, b) => Number(b.met > 0) - Number(a.met > 0) || b.met - a.met);
    const known = this.entries.filter((e) => e.met > 0).length;

    this.add.rectangle(0, 0, width, height, COLORS.wall).setOrigin(0);
    this.add.text(width / 2, 34, "MEL'S SCRAPBOOK", { fontFamily: FONTS.slab, fontSize: '30px', color: COLORS.mustard, stroke: COLORS.dark, strokeThickness: 5 }).setOrigin(0.5);
    this.add.text(width / 2, 74, `${known} of ${this.entries.length} regulars met — tap one to read about them`, {
      fontFamily: FONTS.mono, fontSize: '14px', color: COLORS.cream, align: 'center', wordWrap: { width: width - 32 },
    }).setOrigin(0.5);

    this.cols = width < 520 ? 3 : width < 900 ? 5 : 7;
    const usable = Math.min(width - 24, 1100);
    this.cardW = (usable - GAP * (this.cols - 1)) / this.cols;
    this.cardH = this.cardW * 1.3;
    const left = (width - usable) / 2;
    this.grid = this.add.container(left, TOP);
    this.entries.forEach((e, i) => this.grid.add(this.card(e, (i % this.cols) * (this.cardW + GAP), Math.floor(i / this.cols) * (this.cardH + GAP))));
    this.gridBottom = height - 78;

    const bottom = height - 78;
    const rows = Math.ceil(this.entries.length / this.cols);
    this.maxScroll = Math.max(0, rows * (this.cardH + GAP) - (bottom - TOP));
    const mask = this.make.graphics({}, false).fillRect(0, TOP, width, bottom - TOP).createGeometryMask();
    this.grid.setMask(mask);

    this.wireScrolling(left, bottom);
    this.add.rectangle(0, bottom, width, height - bottom, COLORS.wall).setOrigin(0);
    makeButton(this, width / 2, height - 40, 'BACK', () => this.scene.start('title'));
    applyPaperGrain(this);
  }

  private card(e: Entry, x: number, y: number): Phaser.GameObjects.Container {
    const w = this.cardW;
    const h = this.cardH;
    const paper = this.add.rectangle(0, 0, w, h, COLORS.creamHex).setOrigin(0).setStrokeStyle(2, COLORS.darkHex);
    const tape = this.add.rectangle(w / 2, 2, w * 0.4, 10, 0xf2e1a6, 0.85).setAngle(-3);
    const img = this.add.image(w / 2, h - 26, e.poses[0].key).setOrigin(0.5, 1);
    img.setScale(Math.min((w - 10) / img.width, (h - 34) / img.height));
    if (e.met === 0) img.setTintFill(COLORS.darkHex).setAlpha(0.8);
    const name = this.add.text(w / 2, h - 13, e.met ? BIOS[e.character]?.name ?? '' : '???', {
      fontFamily: FONTS.sans, fontSize: '12px', fontStyle: 'bold', color: COLORS.dark, align: 'center',
      fixedWidth: w - 6,
    }).setOrigin(0.5);
    if (name.width > w - 6) name.setScale((w - 6) / name.width);
    // The card itself is the hit area, so a tap always opens what is under the
    // finger. It only counts if the press started on this card with no page
    // open, so the finger lifting after closing a page never reopens one.
    paper.setInteractive({ useHandCursor: true })
      .on('pointerdown', (p: Phaser.Input.Pointer) => {
        this.pressed = !this.detail && p.y >= TOP && p.y <= this.gridBottom ? e : undefined;
      })
      .on('pointerup', (p: Phaser.Input.Pointer) => {
        const moved = Math.hypot(p.x - p.downX, p.y - p.downY);
        const tapped = this.pressed === e && moved < 10 && !this.detail;
        this.pressed = undefined;
        if (tapped) this.showDetail(e);
      });
    return this.add.container(x, y, [paper, img, tape, name]).setAngle((x * 7 + y * 3) % 5 - 2);
  }

  /** Drag (or wheel) to scroll, with a little glide after a flick. */
  private wireScrolling(_left: number, bottom: number) {
    let lastY = 0;
    let lastT = 0;
    let dragging = false;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.detail || p.y < TOP || p.y > bottom) return;
      dragging = true;
      this.velocity = 0;
      lastY = p.y;
      lastT = p.time;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!dragging || !p.isDown) return;
      const dy = p.y - lastY;
      const dt = Math.max(1, p.time - lastT);
      this.scrollTo(this.scrollY - dy);
      this.velocity = (-dy / dt) * 16; // px per frame
      lastY = p.y;
      lastT = p.time;
    });
    const release = () => {
      dragging = false;
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);
    this.input.on('gameout', release);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (!this.detail) this.scrollTo(this.scrollY + dy);
    });
  }

  update() {
    if (Math.abs(this.velocity) < 0.3 || this.detail) return;
    this.scrollTo(this.scrollY + this.velocity);
    this.velocity *= 0.92;
  }

  private scrollTo(y: number) {
    this.scrollY = Phaser.Math.Clamp(y, 0, this.maxScroll);
    this.grid.setY(TOP - this.scrollY);
  }

  /** A pasted-in page for one customer: big art, name, bio, and every pose. */
  private showDetail(e: Entry) {
    const { width, height } = this.scale;
    const w = Math.min(440, width - 24);
    const met = e.met > 0;
    const bio = BIOS[e.character];
    const shade = this.add.rectangle(0, 0, width, height, COLORS.darkHex, 0.75).setOrigin(0).setInteractive();
    const artH = Math.min(260, height * 0.36);
    const page = this.add.rectangle(0, 0, w, 10, COLORS.creamHex).setStrokeStyle(3, COLORS.darkHex).setOrigin(0.5, 0);
    let poseIndex = 0;
    const img = this.add.image(0, 20 + artH, e.poses[0].key).setOrigin(0.5, 1);
    const fit = () => {
      img.setTexture(e.poses[poseIndex].key);
      img.setScale(Math.min((w - 40) / img.width, artH / img.height));
      if (!met) img.setTintFill(COLORS.darkHex);
    };
    fit();
    const name = this.add.text(0, 32 + artH, met ? bio?.name ?? '' : '???', {
      fontFamily: FONTS.slab, fontSize: '24px', color: COLORS.red, align: 'center', wordWrap: { width: w - 32 },
    }).setOrigin(0.5, 0);
    const text = this.add.text(0, name.y + name.height + 8, met ? bio?.bio ?? '' : 'Not met yet. Serve them at Mel\'s to paste them in.', {
      fontFamily: FONTS.mono, fontSize: '16px', color: COLORS.dark, align: 'center', lineSpacing: 4, wordWrap: { width: w - 36 },
    }).setOrigin(0.5, 0);
    const footY = text.y + text.height + 14;
    const served = this.add.text(0, footY, met ? `served ${e.met} time${e.met === 1 ? '' : 's'}` : '', {
      fontFamily: FONTS.sans, fontSize: '14px', color: COLORS.dark,
    }).setOrigin(0.5, 0);
    const parts: Phaser.GameObjects.GameObject[] = [page, img, name, text, served];
    // Flip through the character's poses.
    if (e.poses.length > 1) {
      const counter = this.add.text(0, footY + 24, '', { fontFamily: FONTS.mono, fontSize: '16px', color: COLORS.dark }).setOrigin(0.5, 0);
      const show = () => counter.setText(`pose ${poseIndex + 1} of ${e.poses.length}`);
      const arrow = (dx: number, label: string, step: number) =>
        this.add.text(dx, footY + 20, label, { fontFamily: FONTS.slab, fontSize: '26px', color: COLORS.red })
          .setOrigin(0.5, 0).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
            poseIndex = (poseIndex + step + e.poses.length) % e.poses.length;
            fit();
            show();
          });
      show();
      parts.push(counter, arrow(-w / 2 + 34, '‹', -1), arrow(w / 2 - 34, '›', 1));
    }
    const closeY = footY + (e.poses.length > 1 ? 70 : 40);
    const closeBtn = makeButton(this, 0, closeY, 'CLOSE', () => dismiss(), true, { fontSize: 18 });
    parts.push(closeBtn);
    const pageH = closeY + 40;
    page.setSize(w, pageH);
    page.setDisplaySize(w, pageH);
    const close = this.add.text(w / 2 - 8, 4, '✕', {
      fontFamily: FONTS.sans, fontSize: '26px', color: COLORS.dark, padding: { x: 14, y: 8 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    // Taps on the page itself must not fall through to the shade and close it.
    page.setInteractive();
    parts.push(close);
    const top = Math.max(12, (height - pageH) / 2);
    this.detail = this.add.container(width / 2, top, parts).setScale(0.9).setAlpha(0);
    this.tweens.add({ targets: this.detail, scale: 1, alpha: 1, duration: 160, ease: 'Back.Out' });
    const dismiss = () => {
      shade.destroy();
      this.detail?.destroy();
      this.detail = undefined;
    };
    shade.on('pointerdown', dismiss);
    close.on('pointerdown', dismiss);
  }
}
