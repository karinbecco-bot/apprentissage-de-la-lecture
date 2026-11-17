// Gestion des profils : fonctions pures (renvoient de nouveaux objets).
import { newProgress } from './mastery.js';

function newId() {
  // crypto.randomUUID n'existe pas hors contexte sécurisé (http sur le réseau local) : repli.
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function addProfile(state, avatar, startStage, now) {
  const profile = {
    id: newId(),
    avatar,
    createdAt: now,
    progress: newProgress(startStage),
    history: [],
  };
  return { state: { ...state, profiles: [...state.profiles, profile] }, profile };
}

export function removeProfile(state, id) {
  return { ...state, profiles: state.profiles.filter((p) => p.id !== id) };
}

export function updateProfile(state, profile) {
  return { ...state, profiles: state.profiles.map((p) => (p.id === profile.id ? profile : p)) };
}

export function recordSeries(profile, record, progress) {
  return { ...profile, progress, history: [...profile.history, record] };
}

export function exportAll(state) {
  return JSON.stringify(state, null, 2);
}
