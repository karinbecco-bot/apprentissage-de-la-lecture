// Moteur de séance : enchaîne des séries de 10 exercices et applique les règles de maîtrise.
// Aucune dépendance au DOM : l'interface appelle answer() puis advance().
import { applySeries, SERIES_LENGTH } from './mastery.js';
import { recordSeries } from './profiles.js';

export function createSession({ profile, stageCount, nextExercise, sessionId, startedAt, maxMs = 12 * 60 * 1000 }) {
  let current = profile;
  let index = 0;
  let correctCount = 0;
  let answered = 0;
  let attempt = 0; // 0 = premier essai, 1 = deuxième essai
  let locked = false; // vrai après une réponse juste ou une solution montrée, jusqu'à advance()
  let newSeriesPending = false;
  // 3e argument : numéro de variante = nombre de séries déjà faites, pour ne pas rejouer les mêmes exercices.
  let exercise = nextExercise(current.progress.stage, 0, current.history.length);

  function finishSeries(now) {
    const before = current.progress;
    const { progress, outcome } = applySeries(
      before,
      { correct: correctCount, total: SERIES_LENGTH, sessionId, at: now },
      stageCount,
    );
    const record = { sessionId, stage: before.stage, correct: correctCount, total: SERIES_LENGTH, outcome, at: now };
    current = recordSeries(current, record, progress);
    newSeriesPending = true;
    return outcome;
  }

  function resolve(counted, status, now) {
    locked = true;
    answered += 1;
    if (counted) correctCount += 1;
    if (answered >= SERIES_LENGTH) {
      return { status, seriesDone: true, outcome: finishSeries(now) };
    }
    return { status, seriesDone: false };
  }

  return {
    current: () => exercise,
    profile: () => current,
    timeUp: (now) => now - startedAt >= maxMs,

    answer(choiceId, now) {
      if (locked) return { status: 'ignored', seriesDone: false };
      const isRight = choiceId === exercise.answerId;
      if (attempt === 0) {
        if (isRight) return resolve(true, 'correct', now);
        attempt = 1;
        return { status: 'retry', seriesDone: false };
      }
      // 2e essai : juste = montré comme juste mais compté comme échec (pas de réussite au hasard)
      return resolve(false, isRight ? 'correct' : 'reveal', now);
    },

    advance() {
      if (newSeriesPending) {
        index = 0;
        correctCount = 0;
        answered = 0;
        newSeriesPending = false;
      } else {
        index += 1;
      }
      attempt = 0;
      locked = false;
      exercise = nextExercise(current.progress.stage, index, current.history.length);
    },

    abandon() {
      index = 0;
      correctCount = 0;
      answered = 0;
      attempt = 0;
      locked = false;
      newSeriesPending = false;
    },
  };
}
