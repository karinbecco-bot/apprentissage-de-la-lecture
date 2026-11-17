// Écran de leçon : découverte du son, puis les exercices du jour. Chaque nouveau type d'exercice est d'abord
// montré par la mascotte (démonstration), puis l'enfant le fait à son tour. Consignes dites par la voix Charline.
import { h, picture } from '../dom.js';
import { play, playSeq, whenIdle, stopAudio } from '../audio.js';
import { buildLesson, DAYS, isTarget } from '../lesson.js';
import { ensureVowels, completeLesson, UNITS } from '../vowels.js';
import { updateProfile, recordSeries } from '../profiles.js';
import data from '../../content/vowels.js';
import { rng, shuffle } from '../exercises.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function render(root, ctx, { profileId }) {
  const found = ctx.getState().profiles.find((p) => p.id === profileId);
  if (!found) return ctx.navigate('profiles');
  let profile = ensureVowels(found);
  const unit = UNITS[Math.min(profile.vowels.unit, UNITS.length - 1)];
  const vowel = unit.vowels[0];
  const startedAt = Date.now();
  const sessionId = 's' + startedAt.toString(36) + Math.random().toString(36).slice(2, 6);
  let alive = true;
  const guard = (p) => p.then((v) => { if (!alive) throw new Error('quitté'); return v; });
  const say = (...ids) => guard(Promise.race([playSeq(ids), sleep(10000)])); // une seule voix à la fois (canal unique)
  const wait = (ms) => guard(sleep(ms));

  const home = () => { alive = false; stopAudio(); ctx.navigate('profiles'); };
  const screen = (...kids) => root.replaceChildren(h('main', { class: 'screen lesson' }, h('button', { class: 'corner', 'aria-label': 'retour', onclick: home }, '🏠'), ...kids));

  const steps = buildLesson(vowel, profile.vowels.day);
  const results = [];

  // ---------- découverte ----------
  async function intro(step) {
    const forms = [[step.upper, false], [step.letter, false], [step.upper, true], [step.letter, true]];
    const letters = h('div', { class: 'forms' }, forms.map(([l, c]) =>
      h('button', { class: 'form' + (c ? ' cursive' : ''), onclick: () => play(step.sound) }, l)));
    const cards = h('div', { class: 'cards' }, step.words.map((w) => {
      const parts = [...w.text].map((ch) => (isTarget(ch, vowel) ? h('b', { class: 'hl' }, ch) : ch));
      return h('button', { class: 'card', onclick: () => play(w.audio) }, picture(w, 110), h('div', { class: 'word' }, parts));
    }));
    let next;
    const go = h('button', { class: 'next', 'aria-label': 'suivant', onclick: () => next && next() }, '➡️');
    screen(letters, cards, go);
    const finished = new Promise((r) => { next = r; });
    (async () => { await say('c-aujourdhui', step.sound); await wait(500); await say(step.sound); })().catch(() => {});
    await guard(finished);
  }

  // ---------- exercices ----------
  const hand = () => h('div', { class: 'hand' }, '👆');
  async function pointAt(el, handEl) {
    const r = el.getBoundingClientRect();
    handEl.style.left = `${r.left + r.width / 2 - 20}px`;
    handEl.style.top = `${r.top + r.height / 2}px`;
    await wait(750);
    el.click();
    await wait(700);
  }

  function mount(step, demo) {
    const state = { errors: 0, left: 0 };
    let finish;
    const done = new Promise((r) => { finish = r; });
    const api = {
      ok(el, audio) { el.classList.add('good'); if (audio) play(audio); },
      bad(el, audio) { if (!demo) state.errors += 1; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 450); if (audio) play(audio); },
      complete() { if (!demo) finish({ errors: state.errors }); },
    };
    const sound = h('button', { class: 'sound', 'aria-label': 'écouter', onclick: () => say(step.audio, step.sound).catch(() => {}) }, '🔊');
    let body; let targets = [];
    const t = step.type;

    if (t === 'images') {
      state.left = step.items.filter((i) => i.target).length;
      const buttons = step.items.map((i) => {
        const b = h('button', { class: 'choice', onclick: () => {
          if (b.classList.contains('good')) return;
          if (i.target) { api.ok(b, i.audio); state.left -= 1; if (!state.left) api.complete(); } else api.bad(b, i.audio);
        } }, picture(i, 110));
        if (i.target) targets.push(b);
        return b;
      });
      body = h('div', { class: 'choices' }, buttons);
    } else if (t === 'grid' || t === 'sentence') {
      const letters = t === 'grid' ? step.cells : [...step.text].map((c) => ({ letter: c, cursive: false, target: isTarget(c, vowel), plain: !/\p{L}/u.test(c) }));
      state.left = letters.filter((c) => c.target).length;
      const buttons = letters.map((c) => {
        if (c.plain) return h('span', { class: 'gap' }, c.letter === ' ' ? ' ' : c.letter);
        const b = h('button', { class: 'cell' + (c.cursive ? ' cursive' : ''), onclick: () => {
          if (b.classList.contains('good')) return;
          if (c.target) { api.ok(b); state.left -= 1; if (!state.left) api.complete(); } else api.bad(b);
        } }, c.letter);
        if (c.target) targets.push(b);
        return b;
      });
      body = h('div', { class: t === 'grid' ? 'grid-letters' : 'sentence' }, buttons);
    } else if (t === 'complete') {
      const slot = h('span', { class: 'slot' }, '＿');
      const shown = step.shown.split('_');
      const wordEl = h('div', { class: 'bigword' }, shown[0], slot, shown[1] ?? '');
      const buttons = step.choices.map((c) => {
        const b = h('button', { class: 'choice letter', onclick: () => {
          if (c === step.answer) { slot.textContent = c; api.ok(b, step.word.audio); api.complete(); } else api.bad(b);
        } }, c);
        if (c === step.answer) targets.push(b);
        return b;
      });
      body = h('div', {}, h('div', { class: 'prompt' }, picture(step.word, 130)), wordEl, h('div', { class: 'choices' }, buttons));
    } else if (t === 'position') {
      const names = ['debut', 'milieu', 'fin'];
      const boxes = names.map((n) => {
        const b = h('button', { class: 'choice posbox', onclick: () => {
          if (n === step.answer) { b.textContent = data.vowels.find((v) => v.id === vowel).letter; api.ok(b, step.word.audio); api.complete(); } else api.bad(b);
        } }, '');
        if (n === step.answer) targets.push(b);
        return b;
      });
      body = h('div', {}, h('div', { class: 'prompt' }, picture(step.word, 130), h('button', { class: 'sound', onclick: () => play(step.word.audio) }, '🔊')), h('div', { class: 'choices' }, boxes));
    } else if (t === 'memory') {
      const deck = shuffle([...step.words, ...step.words].map((w) => ({ w })), rng(step.id.length * 31 + step.words[0].id.length));
      let open = null; let matched = 0; let locked = false; let mistakes = 0;
      const buttons = deck.map((c) => {
        const b = h('button', { class: 'choice', onclick: async () => {
          if (locked || b.classList.contains('good') || b === open?.b) return;
          b.replaceChildren(picture(c.w, 110)); play(c.w.audio);
          if (!open) { open = { b, c }; return; }
          const first = open; open = null;
          if (first.c.w.id === c.w.id) { first.b.classList.add('good'); b.classList.add('good'); matched += 1; if (matched === step.words.length) api.complete(); return; }
          locked = true; mistakes += 1; if (mistakes > 2 && !demo) state.errors += 1;
          await sleep(1100); first.b.replaceChildren('❓'); b.replaceChildren('❓'); locked = false;
        } }, '❓');
        c.b = b;
        return b;
      });
      const first = deck[0];
      const mate = deck.find((c) => c !== first && c.w.id === first.w.id);
      targets = [first.b, mate.b];
      body = h('div', { class: 'choices' }, buttons);
    }

    const showSound = ['images', 'grid', 'sentence'].includes(t);
    const top = t === 'sentence'
      ? h('div', { class: 'prompt' }, h('button', { class: 'sound', onclick: () => play(step.audio) }, '🔊'))
      : (showSound ? h('div', { class: 'prompt' }, sound) : '');
    const handEl = hand();
    const container = h('div', { class: 'exo' + (demo ? ' locked' : '') }, t === 'images' || t === 'grid' || t === 'sentence' ? top : '', body, handEl);
    return { container, done, targets, handEl, state };
  }

  async function exercise(step) {
    const count = (profile.vowels.demos ?? {})[step.type] ?? 0;
    const consigne = step.type === 'sentence' ? ['c-lettres', step.sound] : step.type === 'complete' || step.type === 'memory'
      ? [step.audio] : [step.audio, step.sound];
    if (count === 0) { // première fois que l'enfant rencontre ce type d'exercice : la mascotte montre
      const d = mount(step, true);
      screen(d.container);
      await say('c-regarde');
      await say(...consigne);
      for (const el of d.targets.slice(0, step.type === 'memory' ? 2 : 3)) await pointAt(el, d.handEl);
      d.handEl.remove();
      await say('c-a-toi');
    }
    const real = mount(step, false);
    screen(real.container);
    (async () => { await say(...consigne); })().catch(() => {});
    const { errors } = await guard(real.done);
    const demos = { ...(profile.vowels.demos ?? {}), [step.type]: count + 1 };
    profile = { ...profile, vowels: { ...profile.vowels, demos } };
    root.querySelector('.exo')?.append(h('div', { class: 'overlay pop' }, errors ? '👍' : '⭐'));
    await guard(Promise.race([whenIdle(), sleep(3000)])); // le mot touché finit d'être dit avant « Bravo »
    await say(errors ? 'f-tresbien' : 'f-bravo');
    await wait(500);
    return { errors };
  }

  // ---------- déroulement ----------
  (async () => {
    for (const step of steps) {
      if (step.kind === 'intro') await intro(step);
      else results.push(await exercise(step));
    }
    const at = Date.now();
    const { vowels, outcome } = completeLesson(profile.vowels, { results, at });
    const ok = results.filter((r) => r.errors === 0).length;
    const record = { sessionId, stage: profile.progress.stage, unit: profile.vowels.unit, day: profile.vowels.day, kind: 'lesson', correct: ok, total: results.length, outcome, at };
    profile = { ...recordSeries(profile, record, profile.progress), vowels: { ...vowels, demos: profile.vowels.demos } };
    ctx.setState(updateProfile(ctx.getState(), profile));
    root.replaceChildren(h('main', { class: 'screen' }, h('div', { class: 'big' }, outcome === 'day-repeat' ? '💪' : '🎉')));
    await say('f-bravo');
    await wait(1200);
    ctx.navigate('session', { profileId, startedAt });
  })().catch(() => { /* quitté */ });
}
