// Écran de séance : exercice image + voix, tout cliquable, sans texte d'instruction.
import { h, picture } from '../dom.js';
import { play } from '../audio.js';
import { createSession } from '../session.js';
import { updateProfile } from '../profiles.js';
import { newProgress } from '../mastery.js';
import { ensureVowels, lessonDue } from '../vowels.js';

export function render(root, ctx, { profileId, startedAt = Date.now() }) {
  let profile = ctx.getState().profiles.find((p) => p.id === profileId);
  if (!profile) return ctx.navigate('profiles');
  // Seule l'étape 2 a de vrais contenus pour l'instant (les autres : exercices vides, sans voix) : on n'y envoie aucun enfant.
  if (profile.progress.stage !== 2) {
    profile = { ...profile, progress: newProgress(2) };
    ctx.setState(updateProfile(ctx.getState(), profile));
  }
  // Étape 2 : la leçon du jour (découverte + exercices) passe avant l'entraînement.
  if (profile.progress.stage === 2 && lessonDue(ensureVowels(profile).vowels, Date.now())) return ctx.navigate('lesson', { profileId });

  const session = createSession({
    profile,
    stageCount: ctx.stages.length,
    nextExercise: () => { throw new Error('étape sans contenu'); }, // jamais appelé : seule l'étape 2 existe, en mode voyelles
    vowelMode: true,
    sessionId: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    startedAt,
  });
  let alive = true; // faux dès que l'enfant quitte : les minuteries en attente ne font plus rien
  const later = (fn, ms) => setTimeout(() => { if (alive) fn(); }, ms);

  const home = () => { alive = false; session.abandon(); ctx.navigate('profiles'); };

  function overlay(symbol) {
    const o = root.querySelector('.overlay');
    if (o) { o.textContent = symbol; o.classList.remove('pop'); void o.offsetWidth; o.classList.add('pop'); }
  }

  function show() {
    if (session.timeUp(Date.now())) return goodbye();
    const ex = session.current();
    const sound = h('button', { class: 'sound', 'aria-label': 'écouter', onclick: () => play(ex.prompt.audio) }, '🔊');
    const prompt = h('div', { class: 'prompt' }, picture(ex.prompt, 130), ex.prompt.letter ? h('span', { class: 'letter' }, ex.prompt.letter) : '', sound);
    const choices = ex.choices.map((c) =>
      h('button', { class: c.letter ? 'choice letter' : 'choice', 'data-id': c.id, onclick: () => { if (c.audio) play(c.audio); choose(c.id); } }, c.letter || picture(c, 110) || '🔊'),
    );
    root.replaceChildren(
      h('main', { class: 'screen' },
        h('button', { class: 'corner', 'aria-label': 'retour', onclick: home }, '🏠'),
        prompt,
        h('div', { class: 'choices' }, choices),
        h('div', { class: 'overlay' })),
    );
    play(ex.prompt.audio);
  }

  const pick = (id) => root.querySelector(`[data-id="${CSS.escape(id)}"]`);

  function choose(id) {
    const r = session.answer(id, Date.now());
    if (r.status === 'ignored') return;
    if (r.status === 'retry') {
      const b = pick(id);
      b.classList.add('shake');
      later(() => b.classList.remove('shake'), 500);
      play(session.current().prompt.audio);
      return;
    }
    if (r.status === 'reveal') pick(session.current().answerId).classList.add('glow');
    else { pick(id).classList.add('good'); overlay('⭐'); }

    if (r.seriesDone) ctx.setState(updateProfile(ctx.getState(), session.profile()));
    later(() => {
      if (r.seriesDone && (r.outcome === 'next-stage' || r.outcome === 'finished' || r.outcome === 'unit-done')) {
        overlay(r.outcome === 'finished' ? '🏆' : '🎉');
        later(next, 3000);
      } else next();
    }, 1500);
  }

  function next() { session.advance(); show(); }

  function goodbye() {
    session.abandon();
    root.replaceChildren(h('main', { class: 'screen' }, h('div', { class: 'big' }, '👋🐻')));
    later(() => ctx.navigate('profiles'), 3000);
  }

  show();
}
