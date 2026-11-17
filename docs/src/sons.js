// Position d'une voyelle dans un mot, d'après sa suite de sons (voyelle apprise = a/i/o/u/é, tout autre son = x).
// On juge le son, pas l'orthographe : « chat » finit par le son [a].
export function positions(sons, vowel) {
  const out = [];
  sons.forEach((s, i) => {
    if (s !== vowel) return;
    out.push(i === 0 ? 'debut' : i === sons.length - 1 ? 'fin' : 'milieu');
  });
  return out;
}
