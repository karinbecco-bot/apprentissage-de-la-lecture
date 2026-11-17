import { createStore } from './src/store.js';
import * as profilesScreen from './src/screens/profiles.js';
import * as sessionScreen from './src/screens/session.js';
import * as placementScreen from './src/screens/placement.js';
import * as teacherScreen from './src/screens/teacher.js';

const stages = await (await fetch('content/stages.json')).json();

let storage = null;
try {
  storage = window.localStorage;
  storage.getItem('lecture.test');
} catch {
  storage = null; // navigation privée ou stockage bloqué : repli en mémoire
}
const store = createStore(storage);
let state = store.load();

const root = document.getElementById('app');
const screens = { profiles: profilesScreen, session: sessionScreen, placement: placementScreen, teacher: teacherScreen };

const ctx = {
  stages,
  getState: () => state,
  storageOk: () => store.status().persistent,
  setState(next) { state = next; store.save(state); },
  navigate(name, params = {}) { screens[name].render(root, ctx, params); },
};

ctx.navigate('profiles');

// Demande au navigateur de ne pas effacer les données de l'application (au mieux, sans bloquer).
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* hors ligne indisponible, l'application marche quand même */ });
}
