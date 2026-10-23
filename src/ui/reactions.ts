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

type Line = 'changed' | 'course' | 'eating' | 'rush' | 'rushCleared' | 'rushMissed';

const LINES: Readonly<Record<Lang, Readonly<Record<Line, readonly string[]>>>> = {
  en: {
    changed: ['Actually…', 'Wait, no!', 'Make that…', 'Scratch that!', 'On second thought…'],
    course: ['Room for dessert!', 'And a cup of joe!', 'One more thing…', 'Now, dessert!', 'Seconds, please!'],
    eating: ['Mmm…', 'Munch munch', 'Yum!', 'Nom nom'],
    rush: ['COFFEE RUSH!', 'DRINKS RUSH!', 'THIRSTY CROWD!'],
    rushCleared: ['Rush cleared!'],
    rushMissed: ['Rush over'],
  },
  fr: {
    changed: ['En fait…', 'Non, attendez !', 'Plutôt…', 'Je change !', 'Finalement…'],
    course: ['Et un dessert !', 'Un petit café ?', 'Encore une chose…', 'Le dessert !', 'Je reprendrais bien…'],
    eating: ['Miam…', 'Crunch crunch', 'Mmm !', 'Slurp'],
    rush: ['RUSH AU COMPTOIR !', 'COUP DE FEU !', 'TOURNÉE GÉNÉRALE !'],
    rushCleared: ['Rush réussi !'],
    rushMissed: ['Rush terminé'],
  },
};

export function line(kind: Line, lang: Lang, rng: () => number = Math.random): string {
  const options = LINES[lang][kind];
  return options[Math.floor(rng() * options.length)];
}
