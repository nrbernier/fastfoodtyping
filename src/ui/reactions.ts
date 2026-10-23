// What customers say when their order lands, by how long they waited.
import type { Lang } from '../core/lang';

type Mood = 'delighted' | 'pleased' | 'grumpy';

const REACTIONS: Readonly<Record<Lang, Readonly<Record<Mood, readonly string[]>>>> = {
  en: {
    delighted: ['Swell!', 'Peachy!', 'Gee whiz!', 'Top notch!', 'Delish!', 'Aces!', 'Bully!', 'Hot dog!', 'Keen!', 'Out of sight!'],
    pleased: ['Thanks.', 'Much obliged.', 'Not bad.', 'Fine, fine.', 'Obliged!', 'Ta.'],
    grumpy: ['About time!', 'Finally…', 'Hmph.', 'Took you long enough!', 'Cold already!'],
  },
  fr: {
    delighted: ['Super !', 'Miam !', 'Parfait !', 'Délicieux !', 'Formidable !', 'Chapeau !', 'Génial !', 'Merci mille fois !', 'Épatant !'],
    pleased: ['Merci.', 'Pas mal.', 'Bon, bon.', 'Ça ira.', "C'est gentil."],
    grumpy: ['Enfin !', 'Pas trop tôt !', 'Bof.', "C'est froid !", 'Quelle attente !'],
  },
};

export function reaction(mood: Mood, lang: Lang, rng: () => number = Math.random): string {
  const options = REACTIONS[lang][mood];
  return options[Math.floor(rng() * options.length)];
}
