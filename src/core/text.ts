/** Lowercase + strip combining accents. Length-preserving for our vocabulary. */
export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
