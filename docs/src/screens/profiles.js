// Écran d'accueil : l'enfant touche son image. Aucun texte.
import { h, onLongPress } from '../dom.js';

export function render(root, ctx) {
  const { profiles } = ctx.getState();
  const mascot = h('button', { class: 'corner', 'aria-label': 'mascotte' }, '🐻');
  onLongPress(mascot, 2000, () => ctx.navigate('teacher'));

  const tiles = profiles.map((p) =>
    h('button', { class: 'tile', onclick: () => ctx.navigate('session', { profileId: p.id }) }, p.avatar),
  );
  // Sans profil : aide visuelle pour l'enseignante (la création se fait dans sa vue).
  const empty = profiles.length === 0 ? h('div', { class: 'hint' }, '🧑‍🏫👆') : '';

  root.replaceChildren(h('main', { class: 'screen' }, mascot, h('div', { class: 'grid' }, tiles), empty));
}
