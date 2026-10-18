import { describe, expect, it } from "vitest";
import { MOCK_EXAM, formatClock, isExpired, mockDeadline, remainingMs } from "../shared/exam";
import { dayKey, studyStreak } from "../shared/dates";

describe("mock exam timer", () => {
  const start = Date.UTC(2026, 9, 18, 9, 0, 0);

  it("gives 57 minutes from the start", () => {
    const deadline = mockDeadline(start);
    expect(deadline - start).toBe(57 * 60 * 1000);
    expect(remainingMs(deadline, start)).toBe(MOCK_EXAM.durationMs);
  });

  it("expires exactly at the deadline and never goes negative", () => {
    const deadline = mockDeadline(start);
    expect(isExpired(deadline, deadline - 1)).toBe(false);
    expect(isExpired(deadline, deadline)).toBe(true);
    expect(remainingMs(deadline, deadline + 60_000)).toBe(0);
  });

  it("formats the clock", () => {
    expect(formatClock(57 * 60 * 1000)).toBe("57:00");
    expect(formatClock(61_000)).toBe("1:01");
    expect(formatClock(999)).toBe("0:01");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(3_725_000)).toBe("1:02:05");
  });
});

describe("study streak", () => {
  it("counts consecutive days back from today", () => {
    expect(studyStreak(["2026-10-16", "2026-10-17", "2026-10-18"], "2026-10-18")).toBe(3);
  });

  it("stays alive if you studied yesterday but not yet today", () => {
    expect(studyStreak(["2026-10-16", "2026-10-17"], "2026-10-18")).toBe(2);
  });

  it("resets after a missed day", () => {
    expect(studyStreak(["2026-10-15", "2026-10-16"], "2026-10-18")).toBe(0);
  });

  it("uses the configured time zone for day boundaries", () => {
    // 23:30 UTC on 18 Oct is 00:30 on 19 Oct in London (BST).
    const t = Date.UTC(2026, 9, 18, 23, 30);
    expect(dayKey(t, "UTC")).toBe("2026-10-18");
    expect(dayKey(t, "Europe/London")).toBe("2026-10-19");
  });
});
