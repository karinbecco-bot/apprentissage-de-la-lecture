// Lecture des sons sur UN SEUL canal : un nouveau son coupe toujours le précédent, jamais deux voix à la fois.
// Fichier audio/<id>.mp3 ; s'il manque, voix française du navigateur (secours) ; sinon silence. Jamais d'exception.
import vowels from '../content/vowels.js';
import consignes from '../content/consignes.js';
import phrases from '../content/phrases.js';

export function speechText(id) {
  if (id.startsWith('word-')) return vowels.words.find((w) => w.audio === id)?.text ?? null;
  if (id.startsWith('snd-')) return vowels.vowels.find((v) => v.sound === id)?.letter ?? null;
  return consignes.find((c) => c.id === id)?.text ?? phrases.find((p) => p.id === id)?.text ?? null;
}

// Cœur testable : make(id) crée un élément audio, speak(id) lit la voix de secours, stopSpeak() la coupe.
export function createPlayer({ make, speak, stopSpeak }) {
  let current = null; // { el, finish }
  let owner = 0; // propriétaire du canal : une suite s'arrête si quelqu'un d'autre prend la parole

  function halt() {
    if (!current) return;
    const { el, finish } = current;
    current = null;
    try { el.pause(); } catch { /* rien */ }
    stopSpeak();
    finish();
  }

  function start(id) {
    halt();
    return new Promise((resolve) => {
      let over = false;
      const entry = { el: { pause() {} }, finish: null };
      entry.finish = () => { if (!over) { over = true; if (current === entry) current = null; resolve(); } };
      const end = () => entry.finish(); // lu à chaque appel : whenIdle() peut remplacer entry.finish
      current = entry;
      try {
        const el = make(id);
        entry.el = el;
        el.addEventListener('ended', end);
        const fallback = () => { if (!over) speak(id).then(end, end); };
        el.addEventListener('error', fallback);
        const p = el.play();
        if (p && p.catch) p.catch(fallback);
      } catch {
        speak(id).then(end, end);
      }
    });
  }

  return {
    play(id) { owner += 1; return start(id); },
    async playSeq(ids) {
      const mine = ++owner;
      for (const id of ids) {
        if (owner !== mine) return;
        await start(id);
      }
    },
    whenIdle() {
      if (!current) return Promise.resolve();
      return new Promise((resolve) => { const f = current.finish; current.finish = () => { f(); resolve(); }; });
    },
    stop() { owner += 1; halt(); },
  };
}

function browserSpeak(id) {
  return new Promise((resolve) => {
    try {
      const text = speechText(id);
      if (!text || !('speechSynthesis' in window)) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      u.rate = 0.8;
      u.onend = resolve;
      u.onerror = resolve;
      window.speechSynthesis.speak(u);
    } catch { resolve(); }
  });
}

const player = createPlayer({
  make: (id) => new Audio(`audio/${encodeURIComponent(id)}.mp3`),
  speak: browserSpeak,
  stopSpeak: () => { try { window.speechSynthesis.cancel(); } catch { /* rien */ } },
});

export const play = (id) => player.play(id);
export const playSeq = (ids) => player.playSeq(ids);
export const whenIdle = () => player.whenIdle();
export const stopAudio = () => player.stop();
