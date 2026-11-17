// Parcours des voyelles : unités, révisions espacées, validation d'une voyelle. Fonctions pures.
import { buildExercise, TYPES } from './exercises.js';

export const UNIT_SESSIONS_NEEDED = 3; // séances réussies (≥ 80 %), toutes différentes…
export const UNIT_DAYS_NEEDED = 3; // …et réparties sur 3 jours différents
export const PASS_RATIO = 0.8;
export const SERIES_LENGTH = 10;
export const MAX_FAILS = 3;
const REVIEW_SLOTS = [2, 5, 8]; // positions des révisions dans une série (voyelle seule : 7 nouveautés + 3 révisions)

// Une voyelle par semaine, puis des mélanges de tout ce qui est déjà vu.
export const UNITS = [
  { id: 'a', vowels: ['a'] },
  { id: 'i', vowels: ['i'] },
  { id: 'a+i', vowels: ['a', 'i'] },
  { id: 'o', vowels: ['o'] },
  { id: 'a+i+o', vowels: ['a', 'i', 'o'] },
  { id: 'u', vowels: ['u'] },
  { id: 'a+i+o+u', vowels: ['a', 'i', 'o', 'u'] },
  { id: 'é', vowels: ['é'] },
  { id: 'a+i+o+u+é', vowels: ['a', 'i', 'o', 'u', 'é'] },
];
const ORDER = ['a', 'i', 'o', 'u', 'é'];

export function newVowelProgress() {
  return { unit: 0, passed: [], boxes: {}, consecutiveFails: 0, flagged: false, done: false };
}

export function ensureVowels(profile) {
  return profile.vowels ? profile : { ...profile, vowels: newVowelProgress() };
}

export function bumpBox(boxes, vowel, ok) {
  const b = boxes[vowel] ?? 1;
  return { ...boxes, [vowel]: ok ? Math.min(5, b + 1) : Math.max(1, b - 1) };
}

function dayKey(at) {
  const d = new Date(at);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Générateur reproductible, indépendant de celui des exercices.
function rand(seed) {
  let a = (seed * 40503 + 12345) >>> 0;
  return () => {
    a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
    return a / 4294967296;
  };
}

// Choix pondéré : plus la boîte est basse (voyelle mal sue), plus la voyelle revient.
function weightedPick(vowels, boxes, r) {
  const weights = vowels.map((v) => 6 - (boxes[v] ?? 1));
  let x = r() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < vowels.length; i++) {
    x -= weights[i];
    if (x < 0) return vowels[i];
  }
  return vowels[vowels.length - 1];
}

// 10 exercices pour la série n°`serie` ; la même série est reconstruite à l'identique.
export function composeSeries(vp, serie) {
  const unit = UNITS[Math.min(vp.unit, UNITS.length - 1)];
  const r = rand(serie * 97 + vp.unit);
  const single = unit.vowels.length === 1;
  const earlier = single ? ORDER.slice(0, ORDER.indexOf(unit.vowels[0])) : [];
  const out = [];
  const seen = new Set();
  for (let i = 0; i < SERIES_LENGTH; i++) {
    let vowel;
    if (single && earlier.length && REVIEW_SLOTS.includes(i)) vowel = weightedPick(earlier, vp.boxes, r);
    else if (single) vowel = unit.vowels[0];
    else vowel = weightedPick(unit.vowels, vp.boxes, r);
    const type = TYPES[(i + serie) % TYPES.length];
    let ex = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const e = buildExercise({ vowel, type, seed: serie * 100 + i + attempt * 1000 });
      const key = `${e.type}|${e.vowel}|${e.answerId}|${e.choices.map((c) => c.id).sort().join()}`;
      const key2 = e.prompt.wordId ? `mot|${e.prompt.wordId}` : key; // un même mot-image ne revient pas dans la série
      if (!seen.has(key) && !seen.has(key2)) { ex = e; seen.add(key); seen.add(key2); break; }
    }
    out.push(ex ?? buildExercise({ vowel, type, seed: serie * 100 + i }));
  }
  return out;
}

export function applyVowelSeries(vp, { correct, total, sessionId, at, results = [] }) {
  // Une seule marche par voyelle et par série : réussie si au moins 80 % de ses exercices sont justes.
  let boxes = vp.boxes;
  const perVowel = {};
  for (const { vowel, ok } of results) {
    perVowel[vowel] ??= { ok: 0, n: 0 };
    perVowel[vowel].n += 1;
    if (ok) perVowel[vowel].ok += 1;
  }
  for (const [vowel, s] of Object.entries(perVowel)) boxes = bumpBox(boxes, vowel, s.ok / s.n >= PASS_RATIO);
  const v = { ...vp, boxes, passed: [...vp.passed] };

  if (!total || correct / total < PASS_RATIO) {
    v.consecutiveFails += 1;
    if (v.consecutiveFails >= MAX_FAILS) { v.flagged = true; v.consecutiveFails = 0; }
    return { vowels: v, outcome: 'variant' };
  }
  v.consecutiveFails = 0;
  if (v.done) return { vowels: v, outcome: 'review' };

  if (!v.passed.some((p) => p.sessionId === sessionId)) v.passed.push({ sessionId, day: dayKey(at) });
  const days = new Set(v.passed.map((p) => p.day));
  if (v.passed.length < UNIT_SESSIONS_NEEDED || days.size < UNIT_DAYS_NEEDED) return { vowels: v, outcome: 'repeat' };

  v.passed = [];
  if (v.unit >= UNITS.length - 1) { v.done = true; return { vowels: v, outcome: 'unit-done' }; }
  v.unit += 1;
  return { vowels: v, outcome: 'unit-done' };
}
