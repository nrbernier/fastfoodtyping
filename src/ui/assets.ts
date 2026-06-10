// Cast manifest. Filled during art curation (see the design spec, "Characters").
// Keys double as Phaser texture keys; files are relative to public/.
export interface CharacterDef {
  key: string;
  file: string;
}

export const CHARACTERS: CharacterDef[] = [];

export const PLACEHOLDER_KEY = 'char-placeholder';

export function characterKeyFor(customerId: number): string {
  if (CHARACTERS.length === 0) return PLACEHOLDER_KEY;
  return CHARACTERS[customerId % CHARACTERS.length].key;
}
