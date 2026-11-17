// Lecture d'un son préenregistré. Si le fichier manque, on continue en silence (jamais d'exception).
export function play(id) {
  return new Promise((resolve) => {
    try {
      const a = new Audio(`audio/${encodeURIComponent(id)}.mp3`);
      a.addEventListener('ended', resolve);
      a.addEventListener('error', resolve);
      const p = a.play();
      if (p && p.catch) p.catch(resolve);
    } catch {
      resolve();
    }
  });
}
