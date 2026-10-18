import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { SEED_QUESTIONS, HAZARD_CLIPS } from "../content/index";
import { backupTo, openDatabase } from "../server/src/db/client";
import { importQuestions, seedContent } from "../server/src/db/seed";
import { profiles, questions } from "../server/src/db/schema";
import { openTestDb, tempDir } from "./helpers";
import type { DbHandle } from "../server/src/db/client";

const open: DbHandle[] = [];
const track = (h: DbHandle) => (open.push(h), h);
afterEach(() => open.splice(0).forEach((h) => h.close()));

const validImport = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  topic: "motorway-rules",
  text: "A licensed test question?",
  options: ["Yes", "No", "Maybe"],
  correct: [0],
  explanation: "Because.",
  hc: [{ label: "Highway Code rule 253", url: "https://www.gov.uk/guidance/the-highway-code/motorways-253-to-273#rule253" }],
  sourceUrl: "https://example.org/licensed-pack",
  lastVerified: "2026-10-01",
  ...extra,
});

describe("migrations and seeding", () => {
  it("creates the schema and loads bundled content", () => {
    const h = track(openTestDb(path.join(tempDir(), "t.db")));
    const n = h.db.select({ n: sql<number>`count(*)` }).from(questions).get()!.n;
    expect(n).toBe(SEED_QUESTIONS.length);
    expect(h.db.select().from(profiles).all()).toHaveLength(1);
    const clips = h.db.all<{ n: number }>(sql`SELECT count(*) AS n FROM hazard_clips`)[0].n;
    expect(clips).toBe(HAZARD_CLIPS.length);
  });

  it("is idempotent across restarts", () => {
    const file = path.join(tempDir(), "t.db");
    track(openTestDb(file)).close();
    const h = track(openTestDb(file));
    seedContent(h.db);
    expect(h.db.select({ n: sql<number>`count(*)` }).from(questions).get()!.n).toBe(SEED_QUESTIONS.length);
  });

  it("deactivates bundled questions that were removed, instead of deleting them", () => {
    const h = track(openTestDb(path.join(tempDir(), "t.db")));
    h.db.insert(questions).values({ ...h.db.select().from(questions).where(eq(questions.id, "MW-01")).get()!, id: "OLD-01" }).run();
    seedContent(h.db);
    const old = h.db.select().from(questions).where(eq(questions.id, "OLD-01")).get()!;
    expect(old.active).toBe(false);
  });
});

describe("question import", () => {
  it("imports valid questions and reports invalid ones", () => {
    const h = track(openTestDb(path.join(tempDir(), "t.db")));
    const r = importQuestions(h.db, {
      source: "Test pack",
      questions: [validImport("PACK-1"), validImport("PACK-2", { correct: [5] }), validImport("MW-01"), { nonsense: true }],
    });
    expect(r.inserted).toBe(1);
    expect(r.errors.map((e) => e.index)).toEqual([1, 2, 3]);
    expect(r.errors[1].message).toMatch(/bundled/);
    const row = h.db.select().from(questions).where(eq(questions.id, "PACK-1")).get()!;
    expect(row.origin).toBe("import");
    expect(row.importBatch).toBe("Test pack");
  });

  it("updates an imported question on re-import and keeps it through a re-seed", () => {
    const h = track(openTestDb(path.join(tempDir(), "t.db")));
    importQuestions(h.db, { source: "v1", questions: [validImport("PACK-1")] });
    const r = importQuestions(h.db, { source: "v2", questions: [validImport("PACK-1", { text: "Updated question text?" })] });
    expect(r.updated).toBe(1);
    seedContent(h.db);
    const row = h.db.select().from(questions).where(eq(questions.id, "PACK-1")).get()!;
    expect(row.text).toBe("Updated question text?");
    expect(row.active).toBe(true);
  });

  it("rejects a file without the wrapper", () => {
    const h = track(openTestDb(path.join(tempDir(), "t.db")));
    expect(() => importQuestions(h.db, [validImport("X-1")])).toThrow();
  });
});

describe("backup", () => {
  it("writes a usable copy while the database is open", async () => {
    const dir = tempDir();
    const h = track(openTestDb(path.join(dir, "t.db")));
    await backupTo(h, path.join(dir, "backup.db"));
    const copy = track(openDatabase(path.join(dir, "backup.db")));
    expect(copy.db.select({ n: sql<number>`count(*)` }).from(questions).get()!.n).toBe(SEED_QUESTIONS.length);
  });
});
