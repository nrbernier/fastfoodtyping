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
    return this.add.container(x, y, [paper, img, tape, name]).setAngle((x * 7 + y * 3) % 5 - 2);
  }

  /** Drag (or wheel) to scroll; a press that hardly moves is a tap on a card. */
  private wireScrolling(left: number, bottom: number) {
    let downY = 0;
    let downX = 0;
    let startScroll = 0;
    let dragging = false;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.detail || p.y < TOP || p.y > bottom) return;
      dragging = true;
      downX = p.x;
      downY = p.y;
      startScroll = this.scrollY;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (dragging && p.isDown) this.scrollTo(startScroll - (p.y - downY));
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(p.y - downY) > 8 || Math.abs(p.x - downX) > 8) return;
      const col = Math.floor((p.x - left) / (this.cardW + GAP));
      const row = Math.floor((p.y - TOP + this.scrollY) / (this.cardH + GAP));
      const entry = col >= 0 && col < this.cols ? this.entries[row * this.cols + col] : undefined;
      if (entry) this.showDetail(entry);
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (!this.detail) this.scrollTo(this.scrollY + dy);
    });
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
    const pageH = footY + (e.poses.length > 1 ? 64 : 34);
    page.setSize(w, pageH);
    page.setDisplaySize(w, pageH);
    const close = this.add.text(w / 2 - 16, 10, '✕', { fontFamily: FONTS.sans, fontSize: '22px', color: COLORS.dark })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true });
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
