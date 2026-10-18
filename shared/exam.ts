// Test format for the GB car theory test, checked against GOV.UK on 2026-10-18:
//   https://www.gov.uk/theory-test/multiple-choice-questions
//   https://www.gov.uk/theory-test/hazard-perception-test
//   https://www.gov.uk/theory-test/pass-mark-and-result

export const MOCK_EXAM = {
  questionCount: 50,
  durationMs: 57 * 60 * 1000,
  passMark: 43,
  // Three of the 50 questions are about one short silent video.
  scenarioQuestions: 3,
} as const;

export const HAZARD_TEST = {
  clips: 14,
  developingHazards: 15,
  maxPointsPerHazard: 5,
  maxScore: 75,
  passMark: 44,
} as const;

export const FORMAT_VERIFIED_ON = "2026-10-18";

export function isMockPass(score: number, passMark: number = MOCK_EXAM.passMark): boolean {
  return score >= passMark;
}

export function isHazardPass(score: number): boolean {
  return score >= HAZARD_TEST.passMark;
}

export function mockDeadline(startedAt: number, durationMs: number = MOCK_EXAM.durationMs): number {
  return startedAt + durationMs;
}

export function remainingMs(deadlineAt: number, now: number): number {
  return Math.max(0, deadlineAt - now);
}

export function isExpired(deadlineAt: number, now: number): boolean {
  return now >= deadlineAt;
}

/** "mm:ss", or "h:mm:ss" for anything over an hour. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
