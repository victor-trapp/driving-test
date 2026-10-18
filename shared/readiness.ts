/**
 * Estimated readiness, 0-100. This is a study aid, not a DVSA assessment.
 *
 *   readiness = 25% coverage + 35% recent accuracy + 40% mock performance
 *
 *   coverage  = half lesson completion, half question coverage (mean over topics of
 *               min(1, distinct questions answered / half the topic's bank))
 *   accuracy  = correct rate over the last 100 practice answers, scaled down
 *               while there are fewer than 20 answers so a lucky 5/5 doesn't count as 100%
 *   mock      = average percentage of the last 3 mock tests (0 if none taken)
 */
export const READINESS_WEIGHTS = { coverage: 0.25, accuracy: 0.35, mock: 0.4 } as const;
export const READINESS_RECENT_ANSWERS = 100;
export const READINESS_MIN_ANSWERS = 20;
export const READINESS_RECENT_MOCKS = 3;

export interface ReadinessInput {
  lessonsCompleted: number;
  lessonsTotal: number;
  /** Per topic: distinct questions answered and the topic's bank size. */
  topics: { answered: number; bankSize: number }[];
  /** Most recent first; only the first READINESS_RECENT_ANSWERS are used. */
  recentAnswers: boolean[];
  /** Most recent first, as fractions 0-1. */
  recentMocks: number[];
}

export interface Readiness {
  score: number;
  coverage: number;
  accuracy: number;
  mock: number;
}

export function computeReadiness(input: ReadinessInput): Readiness {
  const lessonPart = input.lessonsTotal > 0 ? input.lessonsCompleted / input.lessonsTotal : 0;
  const topicCover =
    input.topics.length > 0
      ? input.topics.reduce((sum, t) => {
          const target = Math.max(1, Math.ceil(t.bankSize / 2));
          return sum + Math.min(1, t.answered / target);
        }, 0) / input.topics.length
      : 0;
  const coverage = 0.5 * lessonPart + 0.5 * topicCover;

  const recent = input.recentAnswers.slice(0, READINESS_RECENT_ANSWERS);
  const rawAccuracy = recent.length > 0 ? recent.filter(Boolean).length / recent.length : 0;
  const confidence = Math.min(1, recent.length / READINESS_MIN_ANSWERS);
  const accuracy = rawAccuracy * confidence;

  const mocks = input.recentMocks.slice(0, READINESS_RECENT_MOCKS);
  const mock = mocks.length > 0 ? mocks.reduce((a, b) => a + b, 0) / mocks.length : 0;

  const score =
    READINESS_WEIGHTS.coverage * coverage + READINESS_WEIGHTS.accuracy * accuracy + READINESS_WEIGHTS.mock * mock;

  return {
    score: Math.round(score * 100),
    coverage: Math.round(coverage * 100),
    accuracy: Math.round(accuracy * 100),
    mock: Math.round(mock * 100),
  };
}
