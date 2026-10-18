import { describe, expect, it } from "vitest";
import { mulberry32, shuffledOrder } from "../shared/random";
import { selectMockQuestions, selectPracticeQuestions, type PoolQuestion } from "../shared/selection";
import { SEED_QUESTIONS } from "../content/index";

const pool: PoolQuestion[] = SEED_QUESTIONS.map((q) => ({ id: q.id, topicId: q.topic, scenarioId: q.scenarioId ?? null }));
const topics = new Set(pool.map((q) => q.topicId));

describe("mock question selection", () => {
  it("picks 50 unique questions from every topic", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const ids = selectMockQuestions(pool, { count: 50, rng: mulberry32(seed) });
      expect(ids).toHaveLength(50);
      expect(new Set(ids).size).toBe(50);
      const picked = new Set(ids.map((id) => pool.find((q) => q.id === id)!.topicId));
      expect(picked).toEqual(topics);
    }
  });

  it("includes exactly one scenario group as a contiguous block of three", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const ids = selectMockQuestions(pool, { count: 50, rng: mulberry32(seed), includeScenario: true });
      const positions = ids.map((id, i) => [i, pool.find((q) => q.id === id)!.scenarioId] as const).filter(([, s]) => s);
      expect(positions).toHaveLength(3);
      expect(new Set(positions.map(([, s]) => s)).size).toBe(1);
      expect(positions[2][0] - positions[0][0]).toBe(2);
    }
  });

  it("can leave the scenario out", () => {
    const ids = selectMockQuestions(pool, { count: 50, rng: mulberry32(7), includeScenario: false });
    expect(ids.every((id) => !pool.find((q) => q.id === id)!.scenarioId)).toBe(true);
  });

  it("still fills the test when topic sizes are very uneven", () => {
    // 13 topics with a single question and one big one, like a bank padded out by an import.
    const lopsided: PoolQuestion[] = [
      ...Array.from({ length: 13 }, (_, i) => ({ id: `small-${i}`, topicId: `t${i}` })),
      ...Array.from({ length: 60 }, (_, i) => ({ id: `big-${i}`, topicId: "big" })),
    ];
    for (let seed = 1; seed <= 10; seed++) {
      const ids = selectMockQuestions(lopsided, { count: 50, rng: mulberry32(seed) });
      expect(ids).toHaveLength(50);
      expect(new Set(ids).size).toBe(50);
    }
  });

  it("is repeatable for the same seed and differs between seeds", () => {
    const a = selectMockQuestions(pool, { count: 50, rng: mulberry32(42) });
    const b = selectMockQuestions(pool, { count: 50, rng: mulberry32(42) });
    const c = selectMockQuestions(pool, { count: 50, rng: mulberry32(43) });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe("practice question selection", () => {
  const topicPool = pool.filter((q) => q.topicId === "motorway-rules");

  it("returns the requested size without repeats", () => {
    const ids = selectPracticeQuestions(topicPool, 10, mulberry32(1));
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
  });

  it("returns the whole pool when it is smaller than the size", () => {
    expect(selectPracticeQuestions(topicPool, 50, mulberry32(1))).toHaveLength(topicPool.length);
  });

  it("prefers questions seen least often", () => {
    const seen = new Map(topicPool.slice(0, 10).map((q) => [q.id, 3]));
    const ids = selectPracticeQuestions(topicPool, topicPool.length - 10, mulberry32(9), seen);
    expect(ids.some((id) => seen.has(id))).toBe(false);
  });
});

describe("answer shuffling", () => {
  it("produces a permutation of the option indexes", () => {
    for (let seed = 1; seed < 50; seed++) {
      expect([...shuffledOrder(4, mulberry32(seed))].sort()).toEqual([0, 1, 2, 3]);
    }
  });

  it("actually varies the order", () => {
    const orders = new Set(Array.from({ length: 40 }, (_, i) => shuffledOrder(4, mulberry32(i + 1)).join("")));
    expect(orders.size).toBeGreaterThan(10);
  });
});
