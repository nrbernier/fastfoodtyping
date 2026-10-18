// Dish, drink, pot and cover drawings as SVG markup. BootScene rasterizes
// each into a texture. Dishes are drawn centred on (0,0) in a -40 -36 80 56
// box, with the plate or base around y = 12.

const INK = '#26221e';
const SW = 'stroke="#26221e" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"';
const sw = (w: number) => `stroke="#26221e" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const PLATE = `<ellipse cx="2" cy="14" rx="32" ry="8" fill="#26221e" opacity=".18"/>
  <ellipse cx="0" cy="12" rx="32" ry="8.5" fill="#fffdf6" ${SW}/>
  <ellipse cx="0" cy="11.4" rx="26.5" ry="6.4" fill="none" stroke="#3fa8a1" stroke-width="1.3"/>
  <ellipse cx="0" cy="11" rx="20" ry="4.4" fill="#f5efe2" stroke="#d9d1c2" stroke-width="1"/>`;
const SAUCER = `<ellipse cx="2" cy="15" rx="22" ry="5" fill="#26221e" opacity=".18"/><ellipse cx="0" cy="13" rx="22" ry="5.5" fill="#fffdf6" ${SW}/><ellipse cx="0" cy="12.5" rx="13" ry="2.8" fill="none" stroke="#d9d1c2" stroke-width="1"/>`;
const CIRCLE_SHADOW = (rx: number) => `<ellipse cx="2" cy="15" rx="${rx}" ry="3.5" fill="#26221e" opacity=".18"/>`;

/** The everyday dishes and drinks; weird tier-3 dishes use the cloche instead. */
export const DISH_KINDS = ['burger', 'fries', 'eggs', 'stack', 'pie', 'bowl', 'sandwich', 'dinner', 'sundae', 'shake', 'soda', 'coffee'] as const;
export type DishKind = (typeof DISH_KINDS)[number];

/** Drinks stand in glasses or cups; they slide faster and slosh to a stop. */
export const DRINKS: ReadonlySet<DishKind> = new Set<DishKind>(['shake', 'soda', 'coffee']);

export const DISH_SVG: Record<DishKind, string> = {
  // Burger
  burger: `${PLATE}
    <path d="M-17 9 q0 -5 5 -5 h24 q5 0 5 5 q-17 4 -34 0z" fill="#e2a656" ${SW}/>
    <rect x="-19" y="-2" width="38" height="7" rx="3.5" fill="#6b3519" ${SW}/>
    <path d="M-20 -3 h40 l-2 4 l-3 -1 l-2 5 l-3 -4 l-4 1 l-3 4 l-2 -4 l-5 1 l-2 3 l-3 -4 l-4 1 l-2 3 l-2 -5 z" fill="#f4c430" ${sw(1.4)}/>
    <rect x="-17" y="-7" width="34" height="4" rx="1.5" fill="#d8402f" ${sw(1.4)}/>
    <path d="M-20 -6 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0" fill="#7cc35a" ${sw(1.4)}/>
    <path d="M-19 -7 q0 -18 19 -18 q19 0 19 18 z" fill="#e3a352" ${SW}/>
    <path d="M-11 -17 q5 -4 12 -4" fill="none" stroke="#fff6dc" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>
    <g fill="#fff6dc" stroke="#9a6a2a" stroke-width=".6"><ellipse cx="-6" cy="-14" rx="1.6" ry="1" transform="rotate(-20 -6 -14)"/><ellipse cx="3" cy="-19" rx="1.6" ry="1" transform="rotate(15 3 -19)"/><ellipse cx="9" cy="-12" rx="1.6" ry="1" transform="rotate(30 9 -12)"/><ellipse cx="-1" cy="-10" rx="1.6" ry="1"/><ellipse cx="-11" cy="-10" rx="1.6" ry="1" transform="rotate(-35 -11 -10)"/></g>`,
  // Fries
  fries: `${PLATE}
    <g fill="#f2c14e" ${sw(1.3)}>
      <rect x="-11" y="-25" width="4.5" height="24" rx="1.5" transform="rotate(-14 -9 -13)"/>
      <rect x="-5" y="-29" width="4.5" height="26" rx="1.5" transform="rotate(-4 -3 -16)"/>
      <rect x="1" y="-27" width="4.5" height="24" rx="1.5" transform="rotate(6 3 -15)"/>
      <rect x="6" y="-23" width="4.5" height="22" rx="1.5" transform="rotate(16 8 -12)"/>
      <rect x="-2" y="-22" width="4.5" height="20" rx="1.5" transform="rotate(-22 0 -12)"/>
    </g>
    <path d="M-14 11 L-12 -8 L12 -8 L14 11 q-14 3 -28 0z" fill="#fffdf6" ${SW}/>
    <path d="M-12 -8 L-10.5 -12 L10.5 -12 L12 -8 z" fill="#efe9dc" ${SW}/>
    <path d="M-4 -8 L-3.5 10 M5 -8 L5.5 10" stroke="#d9d1c2" stroke-width="1"/>
    <ellipse cx="6" cy="2" rx="3.2" ry="2.4" fill="#e9c98a" opacity=".55"/>
    <path d="M-10 -5 L-9 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  // Eggs and bacon
  eggs: `${PLATE}
    <path d="M-6 6 q0 -4 6 -4 q5 -2 9 1 q4 2 0 5 q-4 3 -9 2 q-6 0 -6 -4z" fill="#fffdf6" ${sw(1.3)}/>
    <ellipse cx="2" cy="4.6" rx="3.6" ry="2.4" fill="#f5b21b" ${sw(1.2)}/><ellipse cx="1" cy="3.9" rx="1.2" ry=".7" fill="#fff6c9"/>
    <path d="M-21 10 q-1 -4 5 -5 q5 -3 10 0 q6 0 4 4 q1 4 -6 4 q-6 2 -10 0 q-4 0 -3 -3z" fill="#fffdf6" ${sw(1.3)}/>
    <ellipse cx="-10" cy="8.6" rx="4" ry="2.7" fill="#f5b21b" ${sw(1.2)}/><ellipse cx="-11.2" cy="7.8" rx="1.3" ry=".8" fill="#fff6c9"/>
    ${[[8, 9], [10, 13.5]].map(([x, y]) => `<path d="M${x} ${y} q2.5 -2 5 0 t5 0 t5 0" fill="none" stroke="#26221e" stroke-width="5.6" stroke-linecap="round"/><path d="M${x} ${y} q2.5 -2 5 0 t5 0 t5 0" fill="none" stroke="#b5432f" stroke-width="3.4" stroke-linecap="round"/><path d="M${x} ${y} q2.5 -2 5 0 t5 0 t5 0" fill="none" stroke="#f3d1b0" stroke-width="1" stroke-linecap="round"/>`).join("")}`,
  // Pancakes
  stack: `${PLATE}
    ${[0, 1, 2].map((i) => { const y = 7 - i * 6; return `<path d="M-20 ${y - 4} v4 q20 6 40 0 v-4z" fill="#c4813a" ${sw(1.4)}/><ellipse cx="0" cy="${y - 4}" rx="20" ry="4.6" fill="#e2a95e" ${sw(1.4)}/>`; }).join("")}
    <path d="M-12 -12 q4 3 3 9 q-1 4 1 7 q1 3 -1 4 q-3 0 -2 -4 q0 -6 -3 -10z" fill="#9a5a1a" ${sw(1.2)}/>
    <path d="M10 -12 q3 5 1 10 q-1 3 1 5 q0 2 -2 2 q-2 -1 -1 -4 q1 -6 -1 -10z" fill="#9a5a1a" ${sw(1.2)}/>
    <ellipse cx="0" cy="-13" rx="14" ry="3.2" fill="#a8641f" opacity=".75"/>
    <path d="M-5 -16 l9 -1 l2 3 l-9 1z" fill="#f7e27a" ${sw(1.2)}/>
    <path d="M-3 -16 l4 -0.5" stroke="#fffbe0" stroke-width="1"/>`,
  // Pie slice
  pie: `${PLATE}
    <path d="M-20 4 L22 -3 L22 6 L-20 13z" fill="#e0a95a" ${SW}/>
    <path d="M-20 6 L22 -1 L22 4 L-20 11z" fill="#b3263a"/>
    <circle cx="-8" cy="8" r="1.5" fill="#7e1626"/><circle cx="4" cy="6" r="1.5" fill="#7e1626"/><circle cx="15" cy="3.5" r="1.3" fill="#7e1626"/>
    <path d="M-20 4 L22 -3 L22 6 L-20 13z" fill="none" ${SW}/>
    <path d="M15 -13 L22 -3 L22 6 L15 -4z" fill="#d18f45" ${SW}/>
    <path d="M-20 4 L15 -13 L22 -3 z" fill="#ecbc6c" ${SW}/>
    <path d="M-10 0 L18 -8 M0 -3 L20 -5 M-12 2 L6 -8 M-3 1 L11 -10 M7 -1 L16 -11" stroke="#c8873f" stroke-width="1.3"/>
    <path d="M15 -13 q3 1 3 3 q3 1 2 4 q2 2 2 3" fill="none" stroke="#b8732f" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M-2 -6 q-3 -3 1 -5 q1 -4 5 -2 q4 -1 3 3 q2 3 -2 4 q-4 2 -7 0z" fill="#fffdf6" ${sw(1.2)}/>
    <path d="M2 -9 q1 1 2 0" stroke="#d9d1c2" stroke-width=".9" fill="none"/>`,
  // Soup bowl
  bowl: `${SAUCER}
    <path d="M-20 -3 q0 17 20 17 q20 0 20 -17 z" fill="#fffdf6" ${SW}/>
    <path d="M-17 4 q17 6 34 0" stroke="#3fa8a1" stroke-width="1.3" fill="none"/>
    <ellipse cx="0" cy="-3" rx="20" ry="5.5" fill="#d9572e" ${SW}/>
    <path d="M-9 -4 q5 -3 9 0 q4 3 8 0" stroke="#fbe3c8" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <circle cx="-12" cy="-2.6" r="1" fill="#4f8a32"/><circle cx="6" cy="-1.6" r="1" fill="#4f8a32"/><circle cx="12" cy="-4.4" r="1" fill="#4f8a32"/>
    <path d="M-6 -12 q-3 -4 0 -8 q3 -4 0 -8 M5 -12 q3 -4 0 -7" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/>
    <g fill="#ecc27a" ${sw(1)}><circle cx="22" cy="10" r="3.2"/><circle cx="18" cy="12.5" r="3.2"/></g>`,
  // Sandwich
  sandwich: `${PLATE}
    <rect x="-20" y="3" width="40" height="7" rx="2.5" fill="#f3dcae" ${SW}/>
    <path d="M-21 3 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 q3 -3 6 0 v-2 h-42z" fill="#f0a7a0" ${sw(1.3)}/>
    <path d="M-20 -1 h40 l-3 4 l-3 -2 l-3 4 l-4 -3 l-3 3 l-4 -3 l-3 4 l-3 -4 l-4 2 l-3 -3 l-3 3 l-3 -3z" fill="#f4c430" ${sw(1.2)}/>
    <path d="M-22 -1 q3 -3 5.5 0 q3 -3 5.5 0 q3 -3 5.5 0 q3 -3 5.5 0 q3 -3 5.5 0 q3 -3 5.5 0 q3 -3 5.5 0 q3 -3 5.5 0" fill="#7cc35a" ${sw(1.3)}/>
    <path d="M-20 -2 v-6 q0 -4 4 -4 h32 q4 0 4 4 v6z" fill="#f3dcae" ${SW}/>
    <path d="M-20 -6 q0 -6 4 -6 h32 q4 0 4 6" fill="none" stroke="#c4813a" stroke-width="2.4"/>
    <path d="M-12 -8 h10" stroke="#fff6dc" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="4" y1="-24" x2="4" y2="-6" stroke="#c9a46a" stroke-width="1.4"/>
    <circle cx="4" cy="-21" r="3.2" fill="#6b8f2a" ${sw(1.1)}/><circle cx="4" cy="-21" r="1.2" fill="#d63b2a"/>
    <path d="M4 -25 l-2.5 -3 M4 -25 l2.5 -3" stroke="#d63b2a" stroke-width="1.6" stroke-linecap="round"/>`,
  // Blue plate dinner: meat loaf with gravy, mashed potatoes and peas
  dinner: `${PLATE}
    <path d="M-22 8 q-2 -6 2 -9 h16 q4 3 2 9 q-10 3 -20 0z" fill="#8a4524" ${SW}/>
    <path d="M-20 -1 h16 q1 4 -1 6 q-3 -2 -5 1 q-3 -3 -6 0 q-3 -2 -4 -7z" fill="#6b3519" ${sw(1.2)}/>
    <path d="M2 9 q-4 -2 -2 -7 q1 -6 8 -7 q7 0 9 6 q2 5 -2 8 q-6 2 -13 0z" fill="#fbf3dc" ${SW}/>
    <path d="M6 -3 q3 -2 6 0" stroke="#d9cba6" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M4 -1 q4 -3 8 1 q1 3 -2 4 q-4 0 -6 -5z" fill="#f4c430" ${sw(1)}/>
    <g fill="#6dbb4f" ${sw(.9)}><circle cx="18" cy="9" r="2"/><circle cx="21" cy="7" r="2"/><circle cx="22" cy="10.5" r="2"/><circle cx="25" cy="8" r="2"/><circle cx="18.5" cy="12" r="2"/></g>`,
  // Sundae
  sundae: `${CIRCLE_SHADOW(12)}
    <path d="M-10 15 h20 q0 -3 -6 -4 h-8 q-6 1 -6 4z" fill="#e3f0f2" ${SW}/>
    <rect x="-2" y="2" width="4" height="9" fill="#e3f0f2" ${sw(1.4)}/>
    <ellipse cx="0" cy="-5" rx="18" ry="3.6" fill="#c7dde0" ${sw(1.4)}/>
    <circle cx="-8" cy="-9" r="7.5" fill="#fff4dc" ${sw(1.5)}/><circle cx="8" cy="-9" r="7.5" fill="#f2a6b6" ${sw(1.5)}/><circle cx="0" cy="-16" r="7" fill="#7a4a2a" ${sw(1.5)}/>
    <path d="M-6 -13 q2 4 0 6 M5 -12 q-1 3 1 6 M-1 -10 q1 3 0 4" stroke="#5a2f17" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M-18 -5 q2 10 18 10 q16 0 18 -10 a18 3.6 0 0 1 -36 0z" fill="#e3f0f2" fill-opacity=".92" ${SW}/>
    <path d="M-13 -1 q1 3 5 4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M-6 -23 q-3 -4 2 -5 q2 -4 5 -1 q4 -1 4 3 q2 3 -2 4 q-5 1 -9 -1z" fill="#fffdf6" ${sw(1.3)}/>
    <circle cx="1" cy="-30" r="3.2" fill="#d63b2a" ${sw(1.2)}/><path d="M1 -33 q2 -4 6 -5" stroke="#4f8a32" stroke-width="1.2" fill="none"/>
    <path d="M10 -15 l8 -14 l3 1.5 l-8 14z" fill="#e9c27e" ${sw(1.1)}/>`,
  // Malt or shake
  shake: `${CIRCLE_SHADOW(14)}
    <path d="M10 14 L12 -10 h14 L28 14z" fill="#c8ced3" ${SW}/><path d="M14 -6 L13 11" stroke="#f2f4f5" stroke-width="2" stroke-linecap="round"/>
    <path d="M-9 15 h18 q0 -3 -5 -4 h-8 q-5 1 -5 4z" fill="#e3f0f2" ${SW}/>
    <path d="M-12 -14 L-6 7 q6 3 12 0 L12 -14z" fill="#f7c5d3" ${SW}/>
    <path d="M-8 -12 L-4 4 M-2 -12 L-1 6 M4 -12 L2 6 M9 -12 L5 4" stroke="#e79bb1" stroke-width="1"/>
    <rect x="-1.5" y="7" width="3" height="5" fill="#e3f0f2" ${sw(1.2)}/>
    <path d="M-13 -14 q-2 -6 4 -7 q2 -5 7 -3 q5 -3 8 1 q6 0 5 5 q1 4 -3 4 h-18 q-4 0 -3 0z" fill="#fffdf6" ${sw(1.4)}/>
    <circle cx="2" cy="-25" r="3.3" fill="#d63b2a" ${sw(1.2)}/>
    <path d="M6 -34 L3 -14" stroke="#26221e" stroke-width="4.4" stroke-linecap="round"/><path d="M6 -34 L3 -14" stroke="#fffdf6" stroke-width="2.6" stroke-linecap="round"/><path d="M6 -34 L3 -14" stroke="#d63b2a" stroke-width="2.6" stroke-dasharray="2.5 2.5"/>`,
  // Soda glass
  soda: `${CIRCLE_SHADOW(11)}
    <path d="M-10 -16 L-7 14 h14 L10 -16z" fill="#e7f3f4" ${SW}/>
    <path d="M-9.4 -10 L-7 13 h14 L9.4 -10z" fill="#8c3b1e"/>
    <path d="M-9.6 -12 q2 -2 4 0 q2 -2 4 0 q2 -2 4 0 q2 -2 4 0 q2 -2 3 0 v2 h-19z" fill="#fff4e0"/>
    <rect x="-5" y="-6" width="6" height="6" rx="1" fill="#d7eef0" opacity=".85" transform="rotate(14 -2 -3)"/>
    <rect x="1" y="-2" width="5" height="5" rx="1" fill="#d7eef0" opacity=".75" transform="rotate(-10 3 0)"/>
    <g fill="#fff" opacity=".75"><circle cx="-3" cy="6" r=".9"/><circle cx="3" cy="9" r=".9"/><circle cx="0" cy="2" r=".8"/><circle cx="4" cy="5" r=".7"/></g>
    <path d="M-7 -12 L-5 10" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>
    <path d="M-10 -16 L-7 14 h14 L10 -16z" fill="none" ${SW}/>
    <path d="M3 -30 L1 -6" stroke="#26221e" stroke-width="4.4" stroke-linecap="round"/><path d="M3 -30 L1 -6" stroke="#fffdf6" stroke-width="2.6" stroke-linecap="round"/><path d="M3 -30 L1 -6" stroke="#3fa8a1" stroke-width="2.6" stroke-dasharray="2.5 2.5"/>
    <path d="M7 -17 a5 5 0 0 1 9 2 z" fill="#f4d23a" ${sw(1.2)}/>`,
  // Coffee cup
  coffee: `${SAUCER}
    <path d="M13 -4 q10 -1 9 7 q-1 6 -11 5" fill="none" stroke="#26221e" stroke-width="5.4"/>
    <path d="M13 -4 q10 -1 9 7 q-1 6 -11 5" fill="none" stroke="#fffdf6" stroke-width="2.6"/>
    <path d="M-15 -7 h30 l-3 17 q-12 4 -24 0z" fill="#fffdf6" ${SW}/>
    <path d="M-14 -2 h28" stroke="#d63b2a" stroke-width="2"/>
    <ellipse cx="0" cy="-7" rx="15" ry="3.6" fill="#fffdf6" ${SW}/>
    <ellipse cx="0" cy="-6.6" rx="12" ry="2.4" fill="#5a3218"/>
    <path d="M-10 0 L-8.5 9" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    <path d="M-4 -12 q-3 -4 0 -8 q3 -4 0 -8 M5 -12 q3 -4 0 -8" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".85"/>`,
};

// Weird tier-3 dishes come out under a silver cloche; when the lid lifts,
// smoke in the dish's colour fills the plate.
const DOME = (rx: number, h: number, y: number) => `M${-rx} ${y} C${-rx} ${y - h} ${rx} ${y - h} ${rx} ${y} A${rx} ${rx / 4} 0 0 1 ${-rx} ${y} z`;
export const CLOCHE_BASE_SVG = PLATE;
export const CLOCHE_LID_SVG = `<path d="${DOME(23, 34, 9)}" fill="#c9cfd4" ${SW}/>
      <path d="M-15 -2 q2 -10 11 -13" stroke="#fff" stroke-width="3.2" fill="none" stroke-linecap="round"/>
      <path d="M-23 9 A23 5.75 0 0 0 23 9" fill="none" stroke="#26221e" stroke-width="5"/><path d="M-23 9 A23 5.75 0 0 0 23 9" fill="none" stroke="#aeb6bc" stroke-width="2.6"/>
      <ellipse cx="0" cy="-17" rx="4" ry="2.4" fill="#aeb6bc" ${sw(1.4)}/>`;

export const SMOKE_COLORS = { green: 0x9be07a, purple: 0xc39be6, orange: 0xf4a259, pink: 0xf5a3c7, blue: 0x9fd3f0 } as const;
export type SmokeColor = keyof typeof SMOKE_COLORS;

/** Red enamel stockpot seen edge-on, so nothing inside shows. Box: 0 0 84 64. */
export const POT_SVG = `<defs><linearGradient id="red" x1="0" x2="1"><stop offset="0" stop-color="#e2513d"/><stop offset=".7" stop-color="#c8392a"/><stop offset="1" stop-color="#9c2a1f"/></linearGradient>
  <linearGradient id="shade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs>
  ${[['M17 13 h-7 q-3 0 -3 3 v3 q0 3 3 3 h7'], ['M67 13 h7 q3 0 3 3 v3 q0 3 -3 3 h-7']].map(([d]) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="5.4" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#1d1b19" stroke-width="2.6" stroke-linecap="round"/>`).join('')}
  <path d="M17 6 h50 v53 q0 3 -3 3 h-44 q-3 0 -3 -3z" fill="url(#red)" ${SW}/>
  <path d="M17 6 h50 v53 q0 3 -3 3 h-44 q-3 0 -3 -3z" fill="url(#shade)"/>
  <rect x="22" y="13" width="3.4" height="42" rx="1.7" fill="#fff" opacity=".55"/>
  <rect x="28" y="13" width="1.4" height="40" rx=".7" fill="#fff" opacity=".35"/>
  <rect x="14.5" y="3" width="55" height="5.5" rx="2.5" fill="${INK}" ${SW}/>`;

/** Burner grate under the pot. Box: 0 0 84 14. */
export const BURNER_SVG = `<rect x="10" y="1" width="64" height="5" rx="1.5" fill="#2b2b2e"/><rect x="16" y="6" width="52" height="7" fill="#3a3a3e"/>`;

/** One blue gas flame. Box: 0 0 8 12. */
export const FLAME_SVG = `<path d="M1 12 q3 -11 3 -11 q0 0 3 11z" fill="#4aa3ff" stroke="#1f5fa8" stroke-width=".8"/>`;

/** Wrap drawing markup as a standalone SVG document at `scale` pixels per unit. */
export function svgDocument(markup: string, viewBox: [number, number, number, number], scale: number): string {
  const [, , w, h] = viewBox;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.join(' ')}" width="${w * scale}" height="${h * scale}">${markup}</svg>`;
}

export const DISH_VIEWBOX: [number, number, number, number] = [-40, -36, 80, 56];

/** Texture key and SVG document for every kitchen drawing, rendered at 3px per unit. */
export function kitchenArt(): Array<{ key: string; svg: string }> {
  const S = ART_SCALE;
  return [
    ...DISH_KINDS.map((k) => ({ key: dishTextureKey(k), svg: svgDocument(DISH_SVG[k], DISH_VIEWBOX, S) })),
    { key: CLOCHE_BASE_KEY, svg: svgDocument(CLOCHE_BASE_SVG, DISH_VIEWBOX, S) },
    { key: CLOCHE_LID_KEY, svg: svgDocument(CLOCHE_LID_SVG, DISH_VIEWBOX, S) },
    { key: POT_KEY, svg: svgDocument(POT_SVG, [0, 0, 84, 64], S) },
    { key: BURNER_KEY, svg: svgDocument(BURNER_SVG, [0, 0, 84, 14], S) },
    { key: FLAME_KEY, svg: svgDocument(FLAME_SVG, [0, 0, 8, 12], S) },
  ];
}

export const dishTextureKey = (k: DishKind) => `dish-${k}`;
export const CLOCHE_BASE_KEY = 'cloche-base';
export const CLOCHE_LID_KEY = 'cloche-lid';
export const POT_KEY = 'stockpot';
export const BURNER_KEY = 'burner';
export const FLAME_KEY = 'flame';
/** Pixels per drawing unit in the kitchen textures. */
export const ART_SCALE = 3;
