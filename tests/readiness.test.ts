import { describe, expect, it } from "vitest";
import { computeReadiness } from "../shared/readiness";

const empty = { lessonsCompleted: 0, lessonsTotal: 40, topics: [{ answered: 0, bankSize: 10 }], recentAnswers: [], recentMocks: [] };

describe("readiness estimate", () => {
  it("is zero for a new learner", () => {
    expect(computeReadiness(empty).score).toBe(0);
  });

  it("is 100 when everything is maxed out", () => {
    const r = computeReadiness({
      lessonsCompleted: 40,
      lessonsTotal: 40,
      topics: [{ answered: 5, bankSize: 10 }],
      recentAnswers: Array(100).fill(true),
      recentMocks: [1, 1, 1],
    });
    expect(r).toEqual({ score: 100, coverage: 100, accuracy: 100, mock: 100 });
  });

  it("scales accuracy down until there are 20 answers", () => {
    const five = computeReadiness({ ...empty, recentAnswers: Array(5).fill(true) });
    expect(five.accuracy).toBe(25);
    const twenty = computeReadiness({ ...empty, recentAnswers: Array(20).fill(true) });
    expect(twenty.accuracy).toBe(100);
  });

  it("only uses the last three mocks", () => {
    const r = computeReadiness({ ...empty, recentMocks: [0.9, 0.9, 0.9, 0, 0] });
    expect(r.mock).toBe(90);
  });

  it("weights mocks highest", () => {
    const onlyMocks = computeReadiness({ ...empty, recentMocks: [1] });
    const onlyPractice = computeReadiness({ ...empty, recentAnswers: Array(50).fill(true) });
    expect(onlyMocks.score).toBe(40);
    expect(onlyPractice.score).toBe(35);
  });
});
