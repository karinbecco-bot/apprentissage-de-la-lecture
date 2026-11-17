// Test de départ en jeux : même présentation que l'exercice, sans 2e essai et sans retour d'échec.
import { h } from '../dom.js';
import { play } from '../audio.js';
import { createPlacement } from '../placement.js';
import { addProfile } from '../profiles.js';
import { placementItems } from '../../content/demo.js';

export function render(root, ctx, { avatar }) {
  const placement = createPlacement(placementItems);
  let alive = true;
  let busy = false;

  // Un enfant qui touche 🏠 ou finit le test retombe sur l'écran des profils, jamais dans la vue enseignante.
  const cancel = () => { alive = false; ctx.navigate('profiles'); };

  function show() {
    const item = placement.current();
    if (!item) return finish();
    busy = false;
    const sound = h('button', { class: 'sound', 'aria-label': 'écouter', onclick: () => play(item.prompt.audio) }, '🔊');
    const choices = item.choices.map((c) =>
      h('button', { class: 'choice', onclick: (e) => choose(c.id, e.currentTarget) }, c.image),
    );
    root.replaceChildren(
      h('main', { class: 'screen' },
        h('button', { class: 'corner', 'aria-label': 'retour', onclick: cancel }, '🏠'),
        h('div', { class: 'prompt' }, item.prompt.image || '', sound),
        h('div', { class: 'choices' }, choices)),
    );
    play(item.prompt.audio);
  }

  function choose(id, button) {
    if (busy) return; // double toucher
    busy = true;
    button.classList.add('good'); // même retour neutre quelle que soit la réponse
    placement.answer(id);
    setTimeout(() => { if (alive) show(); }, 600);
  }

  function finish() {
    const { state } = addProfile(ctx.getState(), avatar, placement.result(), Date.now());
    ctx.setState(state);
    ctx.navigate('profiles');
  }

  show();
}
