// Fabrique d'exercices sur les voyelles : fonctions pures et déterministes (même graine = même exercice).
// Aucune consigne parlée : chaque type garde toujours la même forme pour que l'enfant la reconnaisse.
import data from '../content/vowels.js';

export const TYPES = ['image-sound', 'sound-letter', 'letter-sound', 'word-letter', 'case-match', 'letter-image'];

const VOWELS = data.vowels;
const WORDS = data.words;

// Petit générateur pseudo-aléatoire reproductible (mulberry32).
export function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rand) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pickOne = (list, rand) => list[Math.floor(rand() * list.length)];
const pickMany = (list, n, rand) => shuffle(list, rand).slice(0, n);

const letterChoice = (v) => ({ id: v.id, letter: v.letter });
const imageChoice = (w) => ({ id: w.id, image: w.image, picto: w.picto, audio: w.audio });

// Une bonne image + deux images sans la voyelle ; le placement de la bonne réponse change selon la graine.
function imageSet(vowel, rand) {
  const withIt = WORDS.filter((w) => w.vowels.includes(vowel));
  const without = WORDS.filter((w) => !w.vowels.includes(vowel));
  const answer = pickOne(withIt, rand);
  const others = pickMany(without, 2, rand);
  return { answer, choices: shuffle([answer, ...others], rand).map(imageChoice) };
}

export function buildExercise({ vowel, type, seed }) {
  const rand = rng(seed * 31 + TYPES.indexOf(type) * 7 + vowel.codePointAt(0));
  const v = VOWELS.find((x) => x.id === vowel);
  const base = { id: `${type}-${vowel}-${seed}`, type, vowel };

  if (type === 'image-sound') {
    const { answer, choices } = imageSet(vowel, rand);
    return { ...base, prompt: { audio: v.sound }, choices, answerId: answer.id };
  }
  if (type === 'letter-image') {
    const { answer, choices } = imageSet(vowel, rand);
    return { ...base, prompt: { letter: v.letter, audio: v.sound }, choices, answerId: answer.id };
  }
  if (type === 'sound-letter' || type === 'word-letter' || type === 'case-match') {
    const others = pickMany(VOWELS.filter((x) => x.id !== vowel), 2, rand);
    const choices = shuffle([v, ...others], rand).map(letterChoice);
    if (type === 'sound-letter') return { ...base, prompt: { audio: v.sound }, choices, answerId: vowel };
    if (type === 'case-match') return { ...base, prompt: { letter: v.upper, audio: v.sound }, choices, answerId: vowel };
    const alone = WORDS.filter((w) => w.vowels.length === 1 && w.vowels[0] === vowel);
    const w = pickOne(alone, rand);
    return { ...base, prompt: { image: w.image, picto: w.picto, audio: w.audio, wordId: w.id }, choices, answerId: vowel };
  }
  if (type === 'letter-sound') {
    const others = pickMany(VOWELS.filter((x) => x.id !== vowel), 2, rand);
    const choices = shuffle([v, ...others], rand).map((x) => ({ id: x.sound, audio: x.sound }));
    return { ...base, prompt: { letter: v.letter }, choices, answerId: v.sound };
  }
  throw new Error(`type d'exercice inconnu : ${type}`);
}
