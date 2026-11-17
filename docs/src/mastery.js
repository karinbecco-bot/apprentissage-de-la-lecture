// Règles de maîtrise : fonctions pures, aucune dépendance au navigateur.
export const SERIES_LENGTH = 10;
export const PASS_RATIO = 0.8;
export const SESSIONS_NEEDED = 2;
export const MAX_CONSECUTIVE_FAILS = 3;
// Deux réussites ne comptent comme deux séances que si au moins 1 h les sépare (consolidation dans le temps).
export const MIN_SESSION_GAP_MS = 60 * 60 * 1000;

export function newProgress(stage) {
  return { stage, passedSessions: [], lastPassedAt: null, consecutiveFails: 0, flagged: false, finished: false };
}

export function evaluateSeries(correct, total) {
  if (!total) return 'fail';
  return correct / total >= PASS_RATIO ? 'pass' : 'fail';
}

export function applySeries(progress, { correct, total, sessionId, at }, stageCount) {
  const p = { ...progress, passedSessions: [...progress.passedSessions] };

  if (evaluateSeries(correct, total) === 'pass') {
    p.consecutiveFails = 0;
    // Parcours déjà terminé : on peut réviser, sans refaire « terminé » à chaque fois.
    if (p.finished) return { progress: p, outcome: 'repeat-new-session' };

    const last = p.lastPassedAt ?? null;
    const farEnough = last === null || at === undefined || at - last >= MIN_SESSION_GAP_MS;
    if (!p.passedSessions.includes(sessionId) && farEnough) {
      p.passedSessions.push(sessionId);
      if (at !== undefined) p.lastPassedAt = at;
    }
    if (p.passedSessions.length < SESSIONS_NEEDED) {
      return { progress: p, outcome: 'repeat-new-session' };
    }
    p.passedSessions = [];
    p.lastPassedAt = null;
    if (p.stage >= stageCount - 1) {
      p.finished = true;
      return { progress: p, outcome: 'finished' };
    }
    p.stage += 1;
    return { progress: p, outcome: 'next-stage' };
  }

  p.consecutiveFails += 1;
  if (p.consecutiveFails >= MAX_CONSECUTIVE_FAILS) {
    p.stage = Math.max(0, p.stage - 1);
    p.passedSessions = [];
    p.lastPassedAt = null;
    p.consecutiveFails = 0;
    p.flagged = true;
    p.finished = false;
    return { progress: p, outcome: 'regress' };
  }
  return { progress: p, outcome: 'variant' };
}
