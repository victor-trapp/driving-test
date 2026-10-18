import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_PATTERN_RULES, scoreClip } from "@shared/hazard";
import type { Db } from "../db/client";
import { hazardAttempts, hazardClips } from "../db/schema";
import { HttpError, notFound } from "../http";

type ClipRow = typeof hazardClips.$inferSelect;

/** Clip without its scoring windows, so they can't be read before the attempt. */
function publicClip(c: ClipRow) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    kind: c.kind,
    durationMs: c.durationMs,
    scenario: c.scenario,
    src: c.src,
    hazardCount: c.hazards.length,
    licence: c.licence,
    official: false as const,
  };
}

export function listClips(db: Db, profileId: number) {
  const clips = db.select().from(hazardClips).where(eq(hazardClips.active, true)).all();
  const attempts = db.select().from(hazardAttempts).where(eq(hazardAttempts.profileId, profileId)).orderBy(desc(hazardAttempts.createdAt)).all();
  return clips.map((c) => {
    const mine = attempts.filter((a) => a.clipId === c.id);
    return {
      ...publicClip(c),
      attempts: mine.length,
      best: mine.length ? Math.max(...mine.map((a) => a.total)) : null,
      last: mine[0] ? { total: mine[0].total, max: mine[0].max, at: mine[0].createdAt, flagged: mine[0].flagged } : null,
      max: c.hazards.length * 5,
    };
  });
}

export function getClip(db: Db, id: string) {
  const c = db.select().from(hazardClips).where(and(eq(hazardClips.id, id), eq(hazardClips.active, true))).get();
  if (!c) throw notFound("Clip");
  return publicClip(c);
}

export function submitClipAttempt(db: Db, profileId: number, clipId: string, clicks: number[], runId: string | null, now = Date.now()) {
  const c = db.select().from(hazardClips).where(and(eq(hazardClips.id, clipId), eq(hazardClips.active, true))).get();
  if (!c) throw notFound("Clip");
  if (clicks.some((t) => !Number.isFinite(t) || t < 0 || t > c.durationMs + 1000)) {
    throw new HttpError(400, "invalid_clicks", "Click times must be within the clip");
  }
  const rules = { ...DEFAULT_PATTERN_RULES, ...(c.pattern ?? {}) };
  const result = scoreClip(c.hazards, clicks, rules);
  db.insert(hazardAttempts)
    .values({ profileId, clipId, runId, clicks, result, total: result.total, max: result.max, flagged: result.flagged, createdAt: now })
    .run();
  return {
    clipId,
    result,
    hazards: c.hazards.map((h) => ({ ...h, ...result.hazards.find((s) => s.id === h.id)! })),
  };
}

export function listHazardAttempts(db: Db, profileId: number, limit = 100) {
  return db
    .select({ id: hazardAttempts.id, clipId: hazardAttempts.clipId, runId: hazardAttempts.runId, total: hazardAttempts.total, max: hazardAttempts.max, flagged: hazardAttempts.flagged, createdAt: hazardAttempts.createdAt })
    .from(hazardAttempts)
    .where(eq(hazardAttempts.profileId, profileId))
    .orderBy(desc(hazardAttempts.createdAt))
    .limit(limit)
    .all();
}
