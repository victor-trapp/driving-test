import { HAZARD_TEST } from "./exam";

export interface HazardWindow {
  id: string;
  startMs: number;
  endMs: number;
}

export interface PatternRules {
  /** More clicks than this anywhere in the clip scores zero. */
  maxClicks: number;
  /** Clicks allowed inside any rolling window of `burstWindowMs`. */
  maxBurst: number;
  burstWindowMs: number;
  /** Evenly spaced clicking: at least this many clicks... */
  rhythmMinClicks: number;
  /** ...whose gaps vary by less than this fraction of the mean gap. */
  rhythmMaxVariation: number;
}

// DVSA doesn't publish its exact thresholds. These are deliberately cautious
// approximations of "click continuously or in a pattern" and can be overridden per clip.
export const DEFAULT_PATTERN_RULES: PatternRules = {
  maxClicks: 15,
  maxBurst: 5,
  burstWindowMs: 3000,
  rhythmMinClicks: 6,
  rhythmMaxVariation: 0.15,
};

/**
 * Score for one developing hazard. The window is split into five equal bands;
 * the earliest click inside the window decides the score (5 down to 1).
 */
export function scoreHazard(window: HazardWindow, clicks: readonly number[]): { score: number; clickMs: number | null } {
  const span = window.endMs - window.startMs;
  if (span <= 0) return { score: 0, clickMs: null };
  const bandSize = span / HAZARD_TEST.maxPointsPerHazard;
  const first = clicks
    .filter((t) => t >= window.startMs && t <= window.endMs)
    .sort((a, b) => a - b)[0];
  if (first === undefined) return { score: 0, clickMs: null };
  const band = Math.min(HAZARD_TEST.maxPointsPerHazard - 1, Math.floor((first - window.startMs) / bandSize));
  return { score: HAZARD_TEST.maxPointsPerHazard - band, clickMs: first };
}

export function detectClickPattern(
  clicks: readonly number[],
  rules: PatternRules = DEFAULT_PATTERN_RULES,
): { flagged: boolean; reason: string | null } {
  const sorted = [...clicks].sort((a, b) => a - b);

  if (sorted.length > rules.maxClicks) {
    return { flagged: true, reason: `Too many clicks (${sorted.length}) for one clip.` };
  }

  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] - sorted[i] <= rules.burstWindowMs) j++;
    if (j - i + 1 > rules.maxBurst) {
      return {
        flagged: true,
        reason: `${j - i + 1} clicks within ${rules.burstWindowMs / 1000} seconds looks like continuous clicking.`,
      };
    }
  }

  if (sorted.length >= rules.rhythmMinClicks) {
    const gaps = sorted.slice(1).map((t, i) => t - sorted[i]);
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const sd = Math.sqrt(gaps.reduce((a, g) => a + (g - mean) ** 2, 0) / gaps.length);
    if (mean > 0 && sd / mean < rules.rhythmMaxVariation) {
      return { flagged: true, reason: "Clicks were evenly spaced, which looks like clicking in a pattern." };
    }
  }

  return { flagged: false, reason: null };
}

export interface ClipScore {
  total: number;
  max: number;
  flagged: boolean;
  reason: string | null;
  hazards: { id: string; score: number; clickMs: number | null }[];
}

export function scoreClip(
  hazards: readonly HazardWindow[],
  clicks: readonly number[],
  rules: PatternRules = DEFAULT_PATTERN_RULES,
): ClipScore {
  const pattern = detectClickPattern(clicks, rules);
  const scored = hazards.map((h) => ({ id: h.id, ...scoreHazard(h, clicks) }));
  const max = hazards.length * HAZARD_TEST.maxPointsPerHazard;
  if (pattern.flagged) {
    return { total: 0, max, flagged: true, reason: pattern.reason, hazards: scored.map((h) => ({ ...h, score: 0 })) };
  }
  return { total: scored.reduce((a, h) => a + h.score, 0), max, flagged: false, reason: null, hazards: scored };
}
