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

type BossLine = 'intro' | 'more' | 'seconds' | 'hurry' | 'scramble' | 'sendBackWarn' | 'sentBack' | 'beaten' | 'lost';

/** What each boss says, by language. */
const BOSS_LINES: Readonly<Record<string, Readonly<Record<Lang, Readonly<Record<BossLine, readonly string[]>>>>>> = {
  'boss-lou': {
    en: {
      intro: ["Big Lou's here. Bring everything."],
      more: ['More!', 'Next!', 'Keep it coming!', "What's next?", 'Bring it on!'],
      seconds: ['Seconds!', 'Make it a double!', 'One more of those!'],
      hurry: ['HURRY UP!', "I'M STARVING!"],
      scramble: ['…'],
      sendBackWarn: ['…'],
      sentBack: ['…'],
      beaten: ['Big Lou is stuffed!'],
      lost: ['Big Lou stormed out!'],
    },
    fr: {
      intro: ['Le Gros Lou est là. Apportez tout.'],
      more: ['Encore !', 'Suivant !', 'Ça vient ?', 'Et ensuite ?', 'Allez, allez !'],
      seconds: ['Rab !', 'Double portion !', 'Encore un !'],
      hurry: ['PLUS VITE !', "J'AI FAIM !"],
      scramble: ['…'],
      sendBackWarn: ['…'],
      sentBack: ['…'],
      beaten: ['Le Gros Lou est repu !'],
      lost: ['Le Gros Lou est parti !'],
    },
  },
  'boss-moneybags': {
    en: {
      intro: ['Moneybags wants the best. And fast.'],
      more: ['Next course.', 'Chop chop.', "I haven't got all night.", 'Impress me.'],
      seconds: ['Another!'],
      hurry: ['TIME IS MONEY!', 'CHOP CHOP!'],
      scramble: ['Read it if you can!', 'My handwriting? Your problem.', 'Ha! Try that!'],
      sendBackWarn: ["It had better be hot…", "I'll be checking that one…"],
      sentBack: ['Too cold! Again!', 'Send it back!', 'Unacceptable! Again!'],
      beaten: ['Moneybags tips big!'],
      lost: ['Moneybags walked out!'],
    },
    fr: {
      intro: ['Monsieur Gros-Sous veut le meilleur. Et vite.'],
      more: ['Plat suivant.', 'Et que ça saute.', "Je n'ai pas toute la nuit.", 'Épatez-moi.'],
      seconds: ['Encore !'],
      hurry: ["LE TEMPS, C'EST DE L'ARGENT !", 'ET QUE ÇA SAUTE !'],
      scramble: ['Lisez si vous pouvez !', 'Mon écriture ? Votre problème.', 'Ha ! Essayez donc !'],
      sendBackWarn: ['Ce sera chaud, j’espère…', 'Je vérifierai celui-là…'],
      sentBack: ['Trop froid ! Recommencez !', 'Je le renvoie !', 'Inacceptable ! Encore !'],
      beaten: ['Gros-Sous laisse un gros pourboire !'],
      lost: ['Gros-Sous est parti !'],
    },
  },
};

export function bossLine(bossId: string, kind: BossLine, lang: Lang, rng: () => number = Math.random): string {
  const options = BOSS_LINES[bossId]?.[lang][kind] ?? ['…'];
  return options[Math.floor(rng() * options.length)];
}
