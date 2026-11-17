// Stockage de l'état de l'application, avec repli en mémoire si le navigateur bloque l'accès.
const KEY = 'lecture.v1';
const emptyState = () => ({ version: 1, profiles: [], recovered: false });

function isProfile(p) {
  return Boolean(
    p && typeof p === 'object' &&
    typeof p.id === 'string' && typeof p.avatar === 'string' &&
    p.progress && Number.isInteger(p.progress.stage) && p.progress.stage >= 0 &&
    Array.isArray(p.progress.passedSessions) && Array.isArray(p.history),
  );
}

export function createStore(storage) {
  let memory = null; // dernière copie sauvegardée, utilisée si le stockage est inutilisable
  let persistent = Boolean(storage); // faux dès qu'un accès échoue : les données ne survivront pas au rechargement

  return {
    load() {
      let raw = null;
      try {
        raw = storage ? storage.getItem(KEY) : null;
      } catch {
        persistent = false;
        return memory ? structuredClone(memory) : emptyState();
      }
      if (raw === null || raw === undefined) return memory ? structuredClone(memory) : emptyState();
      try {
        const state = JSON.parse(raw);
        if (!state || !Array.isArray(state.profiles) || !state.profiles.every(isProfile)) {
          throw new Error('forme inattendue');
        }
        return { ...state, recovered: false };
      } catch {
        try {
          storage.setItem(`lecture.backup.${Date.now()}`, raw);
        } catch { /* la sauvegarde de secours est faite au mieux */ }
        return { ...emptyState(), recovered: true };
      }
    },
    save(state) {
      memory = structuredClone(state);
      try {
        if (!storage) return;
        storage.setItem(KEY, JSON.stringify(state));
        persistent = true;
      } catch {
        persistent = false; // on continue en mémoire
      }
    },
    status: () => ({ persistent }),
  };
}
