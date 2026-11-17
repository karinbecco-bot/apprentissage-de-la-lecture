// Lecture d'un son préenregistré (audio/<id>.mp3). Si le fichier manque, on essaie la voix française
// du navigateur (provisoire, en attendant les voix Azure), sinon on reste en silence : jamais d'exception.
import vowels from '../content/vowels.js';

export function speechText(id) {
  if (id.startsWith('word-')) return vowels.words.find((w) => w.audio === id)?.text ?? null;
  if (id.startsWith('snd-')) return vowels.vowels.find((v) => v.sound === id)?.letter ?? null;
  return null;
}

function speak(id) {
  try {
    const text = speechText(id);
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    u.rate = 0.8;
    window.speechSynthesis.speak(u);
  } catch { /* silence */ }
}

export function play(id) {
  return new Promise((resolve) => {
    try {
      const a = new Audio(`audio/${encodeURIComponent(id)}.mp3`);
      const fallback = () => { speak(id); resolve(); };
      a.addEventListener('ended', resolve);
      a.addEventListener('error', fallback);
      const p = a.play();
      if (p && p.catch) p.catch(fallback);
    } catch {
      speak(id);
      resolve();
    }
  });
}
