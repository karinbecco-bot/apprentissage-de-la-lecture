// Service worker : cache d'abord, réseau en secours. La liste PRECACHE est vérifiée par tests/precache.test.js.
const CACHE = 'lecture-v1';
const PRECACHE = [
  "index.html",
  "styles.css",
  "main.js",
  "manifest.webmanifest",
  "icon.svg",
  "content/stages.json",
  "content/demo.js",
  "content/vowels.js",
  "src/audio.js",
  "src/dom.js",
  "src/exercises.js",
  "src/mastery.js",
  "src/placement.js",
  "src/profiles.js",
  "src/session.js",
  "src/store.js",
  "src/vowels.js",
  "src/screens/placement.js",
  "src/screens/profiles.js",
  "src/screens/session.js",
  "src/screens/teacher.js",
  "images/abeille.png",
  "images/ail.png",
  "images/ananas.png",
  "images/araignee.png",
  "images/arbre.png",
  "images/auto.png",
  "images/avion.png",
  "images/avocat.png",
  "images/bateau.png",
  "images/bebe.png",
  "images/bouche.png",
  "images/bulle.png",
  "images/cafe.png",
  "images/chapeau.png",
  "images/chat.png",
  "images/chateau.png",
  "images/cinema.png",
  "images/cle.png",
  "images/dent.png",
  "images/ecole.png",
  "images/elephant.png",
  "images/epee.png",
  "images/eponge.png",
  "images/ete.png",
  "images/etoile.png",
  "images/fee.png",
  "images/feu.png",
  "images/fleur.png",
  "images/fourmi.png",
  "images/gateau.png",
  "images/iguane.png",
  "images/ile.png",
  "images/jupe.png",
  "images/kiwi.png",
  "images/koala.png",
  "images/lama.png",
  "images/lit.png",
  "images/loup.png",
  "images/lune.png",
  "images/main.png",
  "images/moto.png",
  "images/mouche.png",
  "images/nez.png",
  "images/nuage.png",
  "images/ogre.png",
  "images/olive.png",
  "images/orage.png",
  "images/orange.png",
  "images/oreille.png",
  "images/os.png",
  "images/ours.png",
  "images/pain.png",
  "images/panda.png",
  "images/piano.png",
  "images/pied.png",
  "images/pizza.png",
  "images/plume.png",
  "images/poupee.png",
  "images/radio.png",
  "images/rat.png",
  "images/riz.png",
  "images/rue.png",
  "images/ski.png",
  "images/souris.png",
  "images/statue.png",
  "images/stylo.png",
  "images/taxi.png",
  "images/the.png",
  "images/tortue.png",
  "images/ukulele.png",
  "images/usine.png",
  "images/velo.png"
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Cache d'abord (rapide, marche hors ligne) ET mise à jour en arrière-plan : une correction du code
// arrive sur la tablette au 2e lancement, sans qu'il faille changer le nom du cache.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(event.request, { ignoreSearch: true });
    const refresh = fetch(event.request)
      .then((res) => {
        if (res && res.ok && new URL(event.request.url).origin === self.location.origin) {
          cache.put(event.request, res.clone());
        }
        return res;
      })
      .catch(() => null);
    if (hit) { event.waitUntil(refresh); return hit; }
    const res = await refresh;
    if (res) return res;
    if (event.request.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
    return Response.error();
  })());
});
