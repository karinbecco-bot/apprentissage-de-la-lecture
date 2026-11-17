// Vue enseignante (ouverte par un appui long de 2 s sur la mascotte). Le texte est permis ici.
import { h, AVATARS } from '../dom.js';
import { UNITS, UNIT_SESSIONS_NEEDED, UNIT_DAYS_NEEDED, LESSON_UNITS } from '../vowels.js';
import { removeProfile, updateProfile, exportAll } from '../profiles.js';
import { newProgress } from '../mastery.js';

export function render(root, ctx, params = {}) {
  const state = ctx.getState();
  const refresh = () => render(root, ctx);

  if (params.picking) return renderPicker(root, ctx);
  if (params.credits) return renderCredits(root, ctx);

  const rows = state.profiles.map((p) => {
    const stage = ctx.stages[p.progress.stage] || { icon: '❓', title: 'Étape inconnue' };
    const last = p.history[p.history.length - 1];
    const select = h('select', {
      'aria-label': 'Changer l\'étape',
      onchange: (e) => {
        if (confirm('Changer l\'étape remet à zéro la progression de cet élève sur cette étape. Continuer ?')) {
          ctx.setState(updateProfile(ctx.getState(), { ...p, vowels: undefined, progress: newProgress(Number(e.target.value)) }));
        }
        refresh();
      },
    }, ctx.stages.map((s) => h('option', { value: s.id, selected: s.id === p.progress.stage ? 'selected' : false }, `${s.id} · ${s.title}`)));
    return h('div', { class: 'row' },
      h('span', { class: 'av' }, p.avatar),
      h('span', {}, `${stage.icon} ${stage.title}${p.progress.finished ? ' · 🏆 parcours terminé' : ''}`),
      p.progress.stage === 2 && p.vowels
        ? h('span', {}, `Voyelles : ${UNITS[Math.min(p.vowels.unit, UNITS.length - 1)].id.replaceAll('+', ' ')}${p.vowels.done ? ' · ✅ terminées' : LESSON_UNITS.includes(p.vowels.unit) ? ` · jour ${p.vowels.day ?? 1}/5` : ` · séances ${p.vowels.passed.length}/${UNIT_SESSIONS_NEEDED} · jours ${new Set(p.vowels.passed.map((x) => x.day)).size}/${UNIT_DAYS_NEEDED}`}`)
        : h('span', {}, `Séances réussies : ${p.progress.passedSessions.length}/2`),
      p.progress.flagged || (p.vowels && p.vowels.flagged) ? h('span', { class: 'flag' }, '🚩 en difficulté') : '',
      h('span', {}, `${p.history.length} séries · dernière : ${last ? new Date(last.at).toLocaleDateString('fr-BE') : '—'}`),
      select,
      h('button', {
        class: 'btn danger',
        onclick: () => {
          if (confirm('Supprimer cet élève et sa progression ?')) {
            ctx.setState(removeProfile(ctx.getState(), p.id));
            refresh();
          }
        },
      }, 'Supprimer'),
    );
  });

  root.replaceChildren(
    h('main', { class: 'screen teacher' },
      h('h1', {}, '🧑‍🏫 Vue enseignante'),
      ctx.storageOk() ? '' : h('div', { class: 'banner' }, '⚠️ Ce navigateur ne permet pas d\'enregistrer les données : les élèves et leur progression seront perdus à la fermeture de la page. Sortez de la navigation privée ou autorisez le stockage du site.'),
      state.recovered ? h('div', { class: 'banner' }, '⚠️ Les données enregistrées étaient illisibles : une copie de secours a été gardée dans le navigateur et la liste a été remise à zéro.') : '',
      h('div', { class: 'toolbar' },
        h('button', { class: 'btn', onclick: () => render(root, ctx, { picking: true }) }, '➕ Nouvel élève'),
        h('button', { class: 'btn', onclick: () => download(exportAll(ctx.getState())) }, '⬇️ Exporter'),
        h('button', { class: 'btn', onclick: () => render(root, ctx, { credits: true }) }, 'ℹ️ Crédits'),
        h('button', { class: 'btn', onclick: () => ctx.navigate('profiles') }, '↩️ Retour')),
      rows.length ? rows : h('p', {}, 'Aucun élève pour le moment.')),
  );
}

function renderCredits(root, ctx) {
  root.replaceChildren(
    h('main', { class: 'screen teacher' },
      h('h1', {}, 'ℹ️ Crédits'),
      h('p', {}, 'Pictogrammes : ARASAAC (https://arasaac.org), propriété du Gouvernement d’Aragon, créés par Sergio Palao. Licence Creative Commons BY-NC-SA : usage non commercial, mention de la source, partage dans les mêmes conditions.'),
      h('p', {}, 'Cette application est gratuite et destinée à la classe.'),
      h('button', { class: 'btn', onclick: () => render(root, ctx) }, '↩️ Retour')),
  );
}

function renderPicker(root, ctx) {
  root.replaceChildren(
    h('main', { class: 'screen teacher' },
      h('h1', {}, 'Choisir l\'image de l\'élève'),
      h('div', { class: 'grid' }, AVATARS.map((a) =>
        h('button', { class: 'tile avatar-pick', onclick: () => ctx.navigate('placement', { avatar: a }) }, a))),
      h('button', { class: 'btn', onclick: () => render(root, ctx) }, '↩️ Annuler')),
  );
}

function download(text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = h('a', { href: url, download: 'lecture-export.json' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
