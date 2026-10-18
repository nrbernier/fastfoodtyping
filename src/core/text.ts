/** Lowercase + strip combining accents. Length-preserving for our vocabulary. */
export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Strip combining accents but keep case and punctuation (house orders are typed exactly). */
export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Map phone "smart" punctuation back to the plain keys the orders use. */
export function plainPunctuation(c: string): string {
  return c.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, '-');
}
