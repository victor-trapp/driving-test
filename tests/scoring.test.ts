import { describe, expect, it } from "vitest";
import { MOCK_EXAM, isMockPass } from "../shared/exam";
import { isAnswerCorrect, scoreMock, toOriginalIndices, toShownIndices } from "../shared/scoring";

describe("answer scoring", () => {
  it("accepts the exact correct set in any order", () => {
    expect(isAnswerCorrect([0], [0])).toBe(true);
    expect(isAnswerCorrect([2, 0], [0, 2])).toBe(true);
  });

  it("rejects partial, extra, duplicate or missing answers", () => {
    expect(isAnswerCorrect([0], [0, 2])).toBe(false);
    expect(isAnswerCorrect([0, 1, 2], [0, 2])).toBe(false);
    expect(isAnswerCorrect([0, 0], [0, 2])).toBe(false);
    expect(isAnswerCorrect([1], [0])).toBe(false);
    expect(isAnswerCorrect(null, [0])).toBe(false);
    expect(isAnswerCorrect([], [0])).toBe(false);
  });

  it("maps between shown and stored option order", () => {
    const order = [2, 0, 3, 1];
    expect(toOriginalIndices([0, 3], order)).toEqual([2, 1]);
    expect(toShownIndices([2, 1], order)).toEqual([0, 3]);
    expect(() => toOriginalIndices([7], order)).toThrow(RangeError);
  });
});

describe("mock test pass mark", () => {
  it("uses the GB car test format", () => {
    expect(MOCK_EXAM.questionCount).toBe(50);
    expect(MOCK_EXAM.durationMs).toBe(57 * 60 * 1000);
    expect(MOCK_EXAM.passMark).toBe(43);
  });

  it("passes at 43 and fails at 42", () => {
    expect(isMockPass(43)).toBe(true);
    expect(isMockPass(50)).toBe(true);
    expect(isMockPass(42)).toBe(false);
  });

  it("scores correct, incorrect and unanswered separately", () => {
    const questions = Array.from({ length: 50 }, () => ({ correct: [1] }));
    const answers = questions.map((_, i) => (i < 43 ? [1] : i < 48 ? [0] : null));
    const s = scoreMock(questions, answers);
    expect(s).toMatchObject({ score: 43, correct: 43, incorrect: 5, unanswered: 2, total: 50, passed: true, percent: 86 });

    answers[0] = [3];
    const fail = scoreMock(questions, answers);
    expect(fail.score).toBe(42);
    expect(fail.passed).toBe(false);
  });

  it("treats an empty selection as unanswered", () => {
    const s = scoreMock([{ correct: [0] }, { correct: [0] }], [[], [0]]);
    expect(s.unanswered).toBe(1);
    expect(s.correct).toBe(1);
  });
});
