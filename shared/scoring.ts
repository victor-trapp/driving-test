import { MOCK_EXAM, isMockPass } from "./exam";

/** Correct when the selected options match the correct set exactly (order doesn't matter). */
export function isAnswerCorrect(selected: readonly number[] | null | undefined, correct: readonly number[]): boolean {
  if (!selected || selected.length !== correct.length) return false;
  const want = new Set(correct);
  return selected.every((s) => want.has(s)) && new Set(selected).size === selected.length;
}

export interface MockScore {
  score: number;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  percent: number;
  passed: boolean;
}

export function scoreMock(
  questions: readonly { correct: readonly number[] }[],
  answers: readonly (readonly number[] | null | undefined)[],
  passMark: number = MOCK_EXAM.passMark,
): MockScore {
  let correct = 0;
  let unanswered = 0;
  questions.forEach((q, i) => {
    const a = answers[i];
    if (!a || a.length === 0) unanswered++;
    else if (isAnswerCorrect(a, q.correct)) correct++;
  });
  const total = questions.length;
  return {
    score: correct,
    total,
    correct,
    incorrect: total - correct - unanswered,
    unanswered,
    percent: total === 0 ? 0 : Math.round((correct / total) * 1000) / 10,
    passed: isMockPass(correct, passMark),
  };
}

/** Maps option indices from the order shown to the learner back to the stored order. */
export function toOriginalIndices(shown: readonly number[], order: readonly number[]): number[] {
  return shown.map((i) => {
    const original = order[i];
    if (original === undefined) throw new RangeError(`option ${i} out of range`);
    return original;
  });
}

export function toShownIndices(original: readonly number[], order: readonly number[]): number[] {
  return original.map((o) => order.indexOf(o));
}
