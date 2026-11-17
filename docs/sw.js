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
  "src/screens/teacher.js"
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
