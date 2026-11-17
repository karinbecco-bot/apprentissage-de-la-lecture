// Leçon du jour pour une voyelle : fonctions pures. Une leçon = découverte du son + une suite fixe d'exercices.
// Les 5 jours suivent le prototype de l'enseignante : découverte, mots, position, révision, révision complète.
import data from '../content/vowels.js';
import phrases from '../content/phrases.js';
import { positions } from './sons.js';
import { rng, shuffle } from './exercises.js';

export const DAYS = [
  { n: 1, title: 'Découverte du son' },
  { n: 2, title: 'Les mots avec le son' },
  { n: 3, title: 'Position du son' },
  { n: 4, title: 'Révision' },
  { n: 5, title: 'Révision complète' },
];
export const LESSON_PASS_RATIO = 0.7;

const RECIPES = {
  1: ['grid', 'images', 'sentence', 'complete', 'images', 'memory'],
  2: ['images', 'complete', 'sentence', 'memory', 'images', 'grid', 'complete'],
  3: ['position', 'images', 'position', 'sentence', 'complete', 'position', 'memory'],
  4: ['images', 'grid', 'position', 'sentence', 'complete', 'images', 'memory'],
  5: ['grid', 'images', 'position', 'complete', 'sentence', 'images', 'memory'],
};

const LETTERS = { a: ['a', 'à', 'â'], i: ['i', 'î', 'ï'], o: ['o', 'ô'], u: ['u', 'ù', 'û', 'ü'], 'é': ['é'] };
export const isTarget = (ch, vowel) => LETTERS[vowel].includes(ch.toLowerCase());
// Une lettre n'est colorée que si toutes les lettres cibles du mot font le son (« eau » ne fait pas [a], « au » fait [o]).
export const hlOk = (w, vowel) => [...w.text].filter((c) => isTarget(c, vowel)).length === w.sons.filter((s) => s === vowel).length;
export const lessonPassed = (results) => results.length > 0 && results.filter((r) => r.errors === 0).length / results.length >= LESSON_PASS_RATIO;

const VOWELS = data.vowels;
const WORDS = data.words;
const wordRef = (w) => ({ id: w.id, text: w.text, image: w.image, picto: w.picto, audio: w.audio });

export function buildLesson(vowel, day) {
  const v = VOWELS.find((x) => x.id === vowel);
  const rand = rng(vowel.codePointAt(0) * 17 + day * 1013);
  const usedTargets = new Set();
  const usedWords = new Set();
  const withIt = WORDS.filter((w) => w.vowels.includes(vowel));

  const take = (list, n) => {
    const fresh = list.filter((w) => !usedWords.has(w.id));
    const pool = shuffle(fresh.length >= n ? fresh : list, rand).slice(0, n);
    pool.forEach((w) => usedWords.add(w.id));
    return pool;
  };

  const steps = [{ kind: 'intro', vowel, sound: v.sound, letter: v.letter, upper: v.upper, words: shuffle(withIt.filter((w) => hlOk(w, vowel)), rand).slice(0, 4).map(wordRef) }];
  const positionOrder = shuffle(['debut', 'milieu', 'fin'], rand);
  let positionCount = 0;

  RECIPES[day].forEach((type, i) => {
    const base = { kind: 'exercise', id: `${vowel}-j${day}-${i}`, type, vowel, sound: v.sound };
    if (type === 'images') {
      const fresh = withIt.filter((w) => !usedTargets.has(w.id));
      const targets = shuffle(fresh, rand).slice(0, 3);
      targets.forEach((w) => usedTargets.add(w.id));
      const others = shuffle(WORDS.filter((w) => !w.vowels.includes(vowel)), rand).slice(0, 3);
      const items = shuffle([...targets.map((w) => ({ ...wordRef(w), target: true })), ...others.map((w) => ({ ...wordRef(w), target: false }))], rand);
      steps.push({ ...base, audio: 'c-images', items });
    } else if (type === 'grid') {
      const forms = [
        (c) => ({ letter: c, cursive: false }),
        (c) => ({ letter: c.toUpperCase(), cursive: false }),
        (c) => ({ letter: c, cursive: true }),
        (c) => ({ letter: c.toUpperCase(), cursive: true }),
      ];
      const targets = Array.from({ length: 9 }, (_, k) => ({ ...forms[k % 4](v.letter), target: true }));
      const pool = [...'aeioulmtjnrspdbfv', ...'AEIOULTJHNMBD', 'é', 'É'].filter((c) => !isTarget(c, vowel));
      const others = Array.from({ length: 21 }, () => ({ letter: pool[Math.floor(rand() * pool.length)], cursive: rand() < 0.4, target: false }));
      steps.push({ ...base, audio: 'c-lettres', cells: shuffle([...targets, ...others], rand) });
    } else if (type === 'sentence') {
      const mine = phrases.filter((p) => p.vowel === vowel);
      const p = mine[(day + i) % mine.length];
      steps.push({ ...base, audio: p.id, prompt: 'c-lettres', text: p.text });
    } else if (type === 'complete') {
      const eligible = withIt.filter((w) => w.text.includes(v.letter) && hlOk(w, vowel));
      const [w] = take(eligible, 1);
      const others = shuffle(VOWELS.filter((x) => x.id !== vowel), rand).slice(0, 2).map((x) => x.letter);
      steps.push({
        ...base, audio: 'c-completer', wordId: w.id, word: wordRef(w),
        shown: w.text.replace(v.letter, '_'), answer: v.letter, choices: shuffle([v.letter, ...others], rand),
      });
    } else if (type === 'position') {
      const eligible = withIt.filter((w) => positions(w.sons, vowel).length === 1);
      const wanted = positionOrder[positionCount++ % 3];
      const matching = eligible.filter((w) => positions(w.sons, vowel)[0] === wanted);
      const [w] = take(matching.length ? matching : eligible, 1);
      steps.push({ ...base, audio: 'c-position', wordId: w.id, word: wordRef(w), answer: positions(w.sons, vowel)[0] });
    } else if (type === 'memory') {
      steps.push({ ...base, audio: 'c-paires', words: take(withIt, 3).map(wordRef) });
    }
  });
  return steps;
}
