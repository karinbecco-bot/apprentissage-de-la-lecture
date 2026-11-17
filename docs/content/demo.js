// Exercices de démonstration (émojis comme images provisoires).
// Les vrais contenus (sons, mots, images ARASAAC, voix Azure) viennent dans les plans suivants.
const POOL = ['🐱', '🐶', '🌞', '🌙', '🍎', '🚗', '🏠', '🐟', '🌳', '⭐'];

function matching(key, n) {
  const target = POOL[n % POOL.length];
  const others = [POOL[(n + 3) % POOL.length], POOL[(n + 7) % POOL.length]];
  const ids = [target, ...others];
  const shift = n % 3;
  const choices = ids.map((e) => ({ id: e, image: e }));
  const rotated = [...choices.slice(shift), ...choices.slice(0, shift)];
  return { id: `${key}-${n}`, prompt: { audio: `demo-${target}`, image: target }, choices: rotated, answerId: target };
}

export function nextExercise(stage, index, variant = 0) {
  return matching(`demo-${stage}`, stage + index + variant * 3);
}

const DOMAINS = ['soundAwareness', 'letters', 'syllables', 'words'];
export const placementItems = DOMAINS.flatMap((domain, d) =>
  [0, 1, 2].map((i) => ({ ...matching(`placement-${domain}`, d * 3 + i), domain })),
);
