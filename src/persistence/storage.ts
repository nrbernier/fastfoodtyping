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
