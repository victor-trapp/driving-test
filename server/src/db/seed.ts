import { and, eq, notInArray } from "drizzle-orm";
import { z } from "zod";
import { TOPIC_IDS, type QuestionSeed } from "@shared/types";
import type { HazardClip } from "@shared/scenario";
import { HAZARD_CLIPS, SEED_QUESTIONS } from "@content/index";
import type { Db } from "./client";
import { hazardClips, profiles, questions } from "./schema";

/**
 * Brings bundled content in the database up to date with the code. Safe to run on
 * every start: rows are upserted by id, and bundled questions that were removed from
 * the code are deactivated rather than deleted so attempt history stays intact.
 */
export function seedContent(db: Db): { questions: number; clips: number } {
  const now = Date.now();
  db.transaction((tx) => {
    for (const q of SEED_QUESTIONS) {
      const row = toRow(q, "bundled", null, now);
      tx.insert(questions).values(row).onConflictDoUpdate({ target: questions.id, set: { ...row, createdAt: undefined } }).run();
    }
    const ids = SEED_QUESTIONS.map((q) => q.id);
    tx.update(questions)
      .set({ active: false, updatedAt: now })
      .where(and(eq(questions.origin, "bundled"), notInArray(questions.id, ids)))
      .run();

    for (const c of HAZARD_CLIPS) {
      const row = clipRow(c, "bundled", now);
      tx.insert(hazardClips).values(row).onConflictDoUpdate({ target: hazardClips.id, set: row }).run();
    }
    tx.update(hazardClips)
      .set({ active: false })
      .where(and(eq(hazardClips.origin, "bundled"), notInArray(hazardClips.id, HAZARD_CLIPS.map((c) => c.id))))
      .run();

    // The single local profile. Multi-user auth can replace this later.
    tx.insert(profiles).values({ id: 1 }).onConflictDoNothing().run();
  });
  return { questions: SEED_QUESTIONS.length, clips: HAZARD_CLIPS.length };
}

function toRow(q: QuestionSeed, origin: "bundled" | "import", batch: string | null, now: number) {
  return {
    id: q.id,
    topic: q.topic,
    difficulty: q.difficulty,
    text: q.text,
    options: q.options,
    correct: q.correct,
    explanation: q.explanation,
    hc: q.hc,
    image: q.image ?? null,
    scenarioId: q.scenarioId ?? null,
    sourceUrl: q.sourceUrl,
    lastVerified: q.lastVerified,
    contentVersion: q.contentVersion,
    origin,
    importBatch: batch,
    active: true,
    updatedAt: now,
  };
}

function clipRow(c: HazardClip, origin: "bundled" | "import", now: number) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    kind: c.kind,
    durationMs: c.durationMs,
    scenario: c.scenario ?? null,
    src: c.src ?? null,
    hazards: c.hazards,
    pattern: c.pattern ?? null,
    licence: c.licence,
    origin,
    active: true,
    updatedAt: now,
  };
}

// ---- Imports -------------------------------------------------------------------------

const hcRef = z.object({ label: z.string().min(1).max(200), url: z.string().url().startsWith("https://") });
// Packs come from outside, so keep anything that ends up in a URL to plain, safe forms.
const webUrl = z.string().url().regex(/^https?:\/\//i, "must be an http(s) link");
const contentRef = z.string().regex(/^[A-Za-z0-9._-]{1,100}$/, "letters, numbers, '.', '-' and '_' only");

export const importedQuestionSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{2,64}$/, "id: letters, numbers, - and _ only"),
    topic: z.enum(TOPIC_IDS),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
    text: z.string().min(5).max(1000),
    options: z.array(z.string().min(1).max(300)).min(2).max(6),
    correct: z.array(z.number().int().min(0)).min(1),
    explanation: z.string().min(1).max(2000),
    hc: z.array(hcRef).default([]),
    image: z
      .object({ kind: z.enum(["sign", "illustration"]), ref: contentRef, alt: z.string().max(200) })
      .optional(),
    sourceUrl: webUrl,
    lastVerified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    contentVersion: z.number().int().min(1).default(1),
  })
  .refine((q) => q.correct.every((c) => c < q.options.length), { message: "correct index out of range" })
  .refine((q) => new Set(q.correct).size === q.correct.length, { message: "duplicate correct index" });

export const importFileSchema = z.object({
  /** Free text, e.g. who licensed the pack to you. Stored as the import batch name. */
  source: z.string().min(1).max(200),
  questions: z.array(z.unknown()).min(1).max(5000),
});

export interface ImportResult {
  batch: string;
  inserted: number;
  updated: number;
  errors: { index: number; id?: string; message: string }[];
}

export function importQuestions(db: Db, input: unknown): ImportResult {
  const file = importFileSchema.parse(input);
  const bundledIds = new Set(SEED_QUESTIONS.map((q) => q.id));
  const result: ImportResult = { batch: file.source, inserted: 0, updated: 0, errors: [] };
  const now = Date.now();

  db.transaction((tx) => {
    file.questions.forEach((raw, index) => {
      const parsed = importedQuestionSchema.safeParse(raw);
      if (!parsed.success) {
        const id = typeof raw === "object" && raw && "id" in raw ? String((raw as { id: unknown }).id) : undefined;
        result.errors.push({ index, id, message: parsed.error.issues.map((i) => `${i.path.join(".") || "question"}: ${i.message}`).join("; ") });
        return;
      }
      const q = parsed.data;
      if (bundledIds.has(q.id)) {
        result.errors.push({ index, id: q.id, message: "id clashes with a bundled question" });
        return;
      }
      const existing = tx.select({ id: questions.id }).from(questions).where(eq(questions.id, q.id)).get();
      const row = toRow({ ...q, hc: q.hc, image: q.image as QuestionSeed["image"] }, "import", file.source, now);
      if (existing) {
        tx.update(questions).set(row).where(eq(questions.id, q.id)).run();
        result.updated++;
      } else {
        tx.insert(questions).values(row).run();
        result.inserted++;
      }
    });
  });
  return result;
}

const clipImportSchema = z.object({
  clips: z
    .array(
      z.object({
        id: z.string().regex(/^[A-Za-z0-9_-]{2,64}$/),
        title: z.string().min(1).max(200),
        description: z.string().max(1000).default(""),
        src: z.string().regex(/^\/media\/(?!.*\.\.)[A-Za-z0-9_./-]+\.(mp4|webm)$/, "src must be a /media/... .mp4 or .webm path"),
        durationMs: z.number().int().positive(),
        hazards: z
          .array(z.object({ id: z.string().min(1), startMs: z.number().int().min(0), endMs: z.number().int().positive(), label: z.string().min(1), explanation: z.string().default("") }))
          .min(1)
          .refine((hs) => hs.every((h) => h.endMs > h.startMs), { message: "each hazard window must end after it starts" }),
        licence: z.string().min(1).max(300),
      }),
    )
    .min(1),
});

/** Registers licensed MP4 clips that have been copied into the media directory. */
export function importClips(db: Db, input: unknown): { imported: number } {
  const { clips } = clipImportSchema.parse(input);
  const bundled = new Set(HAZARD_CLIPS.map((c) => c.id));
  const now = Date.now();
  db.transaction((tx) => {
    for (const c of clips) {
      if (bundled.has(c.id)) throw new Error(`clip id ${c.id} clashes with a bundled clip`);
      const row = clipRow({ ...c, kind: "video", official: false }, "import", now);
      tx.insert(hazardClips).values(row).onConflictDoUpdate({ target: hazardClips.id, set: row }).run();
    }
  });
  return { imported: clips.length };
}
