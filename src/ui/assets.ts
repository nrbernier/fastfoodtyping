// Cast manifest. Filled during art curation (see the design spec, "Characters").
// Keys double as Phaser texture keys; files are relative to public/.
export interface CharacterDef {
  key: string;
  file: string;
}

export const CHARACTERS: CharacterDef[] = [
  { key: 'housewife', file: 'characters/housewife.png' },
  { key: 'businessman', file: 'characters/businessman.png' },
  { key: 'kid', file: 'characters/kid.png' },
  { key: 'grandma', file: 'characters/grandma.png' },
  { key: 'cowboy', file: 'characters/cowboy.png' },
  { key: 'teenager', file: 'characters/teenager.png' },
  { key: 'waiter', file: 'characters/waiter.png' },
  { key: 'robot', file: 'characters/robot.png' },
  { key: 'alien', file: 'characters/alien.png' },
  { key: 'beatnik', file: 'characters/beatnik.png' },
];

export const PLACEHOLDER_KEY = 'char-placeholder';

export function characterKeyFor(customerId: number): string {
  if (CHARACTERS.length === 0) return PLACEHOLDER_KEY;
  return CHARACTERS[customerId % CHARACTERS.length].key;
}
