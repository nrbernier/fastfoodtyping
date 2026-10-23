import type { Pace } from '../core/difficulty';
import type { Lang } from '../core/lang';
import { emptyTally, mergeTally, type KeyTally } from '../core/typingStats';

export interface Settings {
  /** Capitals and punctuation orders later in the week */
  fancyOrders: boolean;
  /** How patient customers are and how quickly they arrive */
  pace: Pace;
  /** Language of the orders */
  lang: Lang;
}

export interface SaveData {
  version: 1;
  /** Highest unlocked shift index (0-based). >= SHIFTS.length unlocks Overtime. */
  unlockedShift: number;
  highScores: Record<string, number>;
  /** Running keystroke tally across shifts (older shifts fade); absent in older saves. */
  typing?: KeyTally;
  settings?: Settings;
}

export const DEFAULT_SETTINGS: Settings = { fancyOrders: true, pace: 'steady', lang: 'en' };

export type StorageBacking = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'short-order-hero-save';
const DEFAULTS: SaveData = { version: 1, unlockedShift: 0, highScores: {} };

/** Type guard that verifies parsed JSON actually has the shape of SaveData. */
export function isValidSaveData(x: unknown): x is SaveData {
  if (typeof x !== 'object' || x === null) return false;
  const obj = x as Record<string, unknown>;
  if (obj.version !== 1) return false;
  if (typeof obj.unlockedShift !== 'number') return false;
  if (typeof obj.highScores !== 'object' || obj.highScores === null || Array.isArray(obj.highScores)) {
    return false;
  }
  return true;
}

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
          const parsed = JSON.parse(raw) as unknown;
          if (isValidSaveData(parsed)) this.memory = parsed;
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

  /** The running keystroke tally, used to aim the next shift at weak keys. */
  typingTally(): KeyTally {
    return this.load().typing ?? emptyTally();
  }

  recordTally(shift: KeyTally): void {
    const d = this.load();
    d.typing = mergeTally(d.typing ?? emptyTally(), shift);
    this.save(d);
  }

  settings(): Settings {
    return { ...DEFAULT_SETTINGS, ...this.load().settings };
  }

  updateSettings(patch: Partial<Settings>): Settings {
    const d = this.load();
    d.settings = { ...DEFAULT_SETTINGS, ...d.settings, ...patch };
    this.save(d);
    return d.settings;
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
