// Petits utilitaires DOM partagés par les écrans.
export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const kid of kids.flat()) e.append(kid);
  return e;
}

// Appui long caché (vue enseignante) : déclenche fn après ms millisecondes d'appui continu.
export function onLongPress(el, ms, fn) {
  let timer = null;
  const cancel = () => { clearTimeout(timer); timer = null; };
  el.addEventListener('pointerdown', () => { cancel(); timer = setTimeout(() => { timer = null; fn(); }, ms); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, cancel);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

export const AVATARS = ['🐻', '🦊', '🐼', '🐯', '🐸', '🦁', '🐵', '🐰', '🐨', '🦉', '🐙', '🦄'];

// Image d'un mot : pictogramme ARASAAC (images/<picto>.png) ; si le fichier manque, l'émoji de secours.
export function picture({ picto, image }, size = 100) {
  if (!picto) return image || '';
  const img = h('img', { class: 'pic', src: `images/${picto}.png`, alt: '', draggable: 'false' });
  img.style.width = img.style.height = `${size}px`;
  img.addEventListener('error', () => img.replaceWith(document.createTextNode(image || '')));
  return img;
}
