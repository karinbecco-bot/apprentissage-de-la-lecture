// Test de départ : calcule l'étape de départ d'un nouvel élève.
const DOMAINS = ['soundAwareness', 'letters', 'syllables', 'words'];

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// Un domaine ne compte que si tous les domaines inférieurs sont aussi réussis (≥ 0,8) :
// réussir les mots par hasard sans savoir le reste ne place pas haut.
export function placeStart(scores) {
  const s = scores || {};
  const sound = num(s.soundAwareness) >= 0.8;
  const letters = sound && num(s.letters) >= 0.8;
  const syllables = letters && num(s.syllables) >= 0.8;
  const words = syllables && num(s.words) >= 0.8;
  if (words) return 5;
  if (syllables) return 4;
  if (letters) return 3;
  if (sound) return 2;
  if (num(s.soundAwareness) >= 0.4) return 1;
  return 0;
}

export function createPlacement(items) {
  let index = 0;
  const right = Object.fromEntries(DOMAINS.map((d) => [d, 0]));
  const total = Object.fromEntries(DOMAINS.map((d) => [d, 0]));
  for (const item of items) total[item.domain] += 1;

  const scores = () =>
    Object.fromEntries(DOMAINS.map((d) => [d, total[d] ? right[d] / total[d] : 0]));

  return {
    current: () => (index < items.length ? items[index] : null),
    answer(choiceId) {
      const item = items[index];
      if (!item) return { done: true };
      if (choiceId === item.answerId) right[item.domain] += 1;
      index += 1;
      return { done: index >= items.length };
    },
    scores,
    result: () => placeStart(scores()),
  };
}
