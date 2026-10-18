import { describe, expect, it } from "vitest";
import { DEFAULT_PATTERN_RULES, detectClickPattern, scoreClip, scoreHazard } from "../shared/hazard";
import { HAZARD_TEST } from "../shared/exam";
import { HAZARD_CLIPS } from "../content/index";

const window = { id: "h", startMs: 10_000, endMs: 15_000 }; // 1 second per band

describe("hazard scoring", () => {
  it("matches the real test format", () => {
    expect(HAZARD_TEST).toMatchObject({ clips: 14, developingHazards: 15, maxPointsPerHazard: 5, maxScore: 75, passMark: 44 });
  });

  it("scores 5 down to 1 across five equal bands", () => {
    expect(scoreHazard(window, [10_000]).score).toBe(5);
    expect(scoreHazard(window, [10_999]).score).toBe(5);
    expect(scoreHazard(window, [11_000]).score).toBe(4);
    expect(scoreHazard(window, [12_500]).score).toBe(3);
    expect(scoreHazard(window, [13_500]).score).toBe(2);
    expect(scoreHazard(window, [14_999]).score).toBe(1);
    expect(scoreHazard(window, [15_000]).score).toBe(1);
  });

  it("scores zero outside the window", () => {
    expect(scoreHazard(window, [9_999]).score).toBe(0);
    expect(scoreHazard(window, [15_001]).score).toBe(0);
    expect(scoreHazard(window, []).score).toBe(0);
  });

  it("uses the earliest click inside the window", () => {
    expect(scoreHazard(window, [14_000, 11_200, 5_000])).toEqual({ score: 4, clickMs: 11_200 });
  });

  it("scores each hazard in a two-hazard clip separately", () => {
    const r = scoreClip([{ id: "a", startMs: 1000, endMs: 6000 }, { id: "b", startMs: 20_000, endMs: 25_000 }], [1500, 23_100]);
    expect(r.hazards.map((h) => h.score)).toEqual([5, 2]);
    expect(r.total).toBe(7);
    expect(r.max).toBe(10);
  });
});

describe("click pattern detection", () => {
  it("allows a few clicks around a hazard", () => {
    expect(detectClickPattern([10_200, 11_000, 12_400]).flagged).toBe(false);
  });

  it("flags too many clicks in one clip", () => {
    const clicks = Array.from({ length: DEFAULT_PATTERN_RULES.maxClicks + 1 }, (_, i) => i * 1700 + (i % 3) * 211);
    expect(detectClickPattern(clicks).flagged).toBe(true);
  });

  it("flags rapid bursts of clicking", () => {
    expect(detectClickPattern([10_000, 10_300, 10_500, 10_900, 11_200, 11_600]).flagged).toBe(true);
  });

  it("flags evenly spaced clicking", () => {
    const clicks = [2000, 6000, 10_000, 14_000, 18_000, 22_000];
    expect(detectClickPattern(clicks)).toMatchObject({ flagged: true });
  });

  it("scores the whole clip as zero when flagged, even if a click was in the window", () => {
    const clicks = [10_000, 10_200, 10_400, 10_600, 10_800, 11_000];
    const r = scoreClip([window], clicks);
    expect(r.flagged).toBe(true);
    expect(r.total).toBe(0);
    expect(r.hazards[0].score).toBe(0);
  });
});

describe("bundled clips", () => {
  it("have valid windows inside the clip, and one clip has two hazards", () => {
    for (const c of HAZARD_CLIPS) {
      expect(c.official).toBe(false);
      for (const h of c.hazards) {
        expect(h.startMs).toBeLessThan(h.endMs);
        expect(h.endMs).toBeLessThanOrEqual(c.durationMs);
      }
    }
    expect(HAZARD_CLIPS.filter((c) => c.hazards.length === 2)).toHaveLength(1);
  });
});
