import path from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../server/src/app";
import type { DbHandle } from "../server/src/db/client";
import * as mock from "../server/src/services/mock";
import { SEED_QUESTIONS } from "../content/index";
import { openTestDb, tempDir, testConfig } from "./helpers";

const open: DbHandle[] = [];
afterEach(() => open.splice(0).forEach((h) => h.close()));

function setup(file = path.join(tempDir(), "t.db")) {
  const handle = openTestDb(file);
  open.push(handle);
  const app = createApp(handle, testConfig(path.dirname(file)));
  return { handle, app, file };
}

const correctFor = (id: string) => SEED_QUESTIONS.find((q) => q.id === id)!.correct;
const wrongFor = (id: string) => {
  const q = SEED_QUESTIONS.find((x) => x.id === id)!;
  return [q.options.findIndex((_, i) => !q.correct.includes(i))];
};

describe("health", () => {
  it("answers liveness and readiness probes", async () => {
    const { app } = setup();
    await request(app).get("/healthz").expect(200, { ok: true });
    await request(app).get("/readyz").expect(200, { ok: true });
    await request(app).get("/api/nope").expect(404);
  });
});

describe("practice sessions", () => {
  it("never sends correct answers before you answer", async () => {
    const { app } = setup();
    const { body } = await request(app).post("/api/practice").send({ mode: "mixed", size: 20 }).expect(201);
    const s = await request(app).get(`/api/practice/${body.id}`).expect(200);
    for (const item of s.body.items) {
      expect(Object.keys(item.question).sort()).toEqual(["id", "image", "options", "scenarioId", "selectCount", "text", "topic"]);
      expect(item.feedback).toBeNull();
    }
  });

  it("saves every answer and survives an app restart", async () => {
    const first = setup();
    const { body } = await request(first.app).post("/api/practice").send({ mode: "topic", topic: "safety-margins", size: 10 }).expect(201);
    const s = await request(first.app).get(`/api/practice/${body.id}`);
    const q0 = s.body.items[0].question.id;
    const q1 = s.body.items[1].question.id;

    const a0 = await request(first.app).post(`/api/practice/${body.id}/answers/0`).send({ selected: correctFor(q0), timeMs: 4200 }).expect(200);
    expect(a0.body.feedback.correct).toBe(true);
    expect(a0.body.feedback.explanation).toBeTruthy();
    const a1 = await request(first.app).post(`/api/practice/${body.id}/answers/1`).send({ selected: wrongFor(q1) }).expect(200);
    expect(a1.body.feedback.correct).toBe(false);

    // Simulate a pod restart: close the database and open the same file again.
    first.handle.close();
    const second = setup(first.file);
    const after = await request(second.app).get(`/api/practice/${body.id}`).expect(200);
    expect(after.body.currentIndex).toBe(2);
    expect(after.body.items[0].feedback.correct).toBe(true);
    expect(after.body.items[1].feedback.correct).toBe(false);
    expect(after.body.items[1].selected).toEqual(wrongFor(q1));
    // Option order is stable across reloads.
    expect(after.body.items.map((i: { question: { options: unknown } }) => i.question.options)).toEqual(s.body.items.map((i: { question: { options: unknown } }) => i.question.options));

    const mistakes = await request(second.app).get("/api/mistakes").expect(200);
    expect(mistakes.body.map((m: { question: { id: string } }) => m.question.id)).toEqual([q1]);
  });

  it("doesn't double-count a repeated submit", async () => {
    const { app } = setup();
    const { body } = await request(app).post("/api/practice").send({ mode: "topic", topic: "attitude", size: 10 }).expect(201);
    const s = await request(app).get(`/api/practice/${body.id}`);
    const q0 = s.body.items[0].question.id;
    await request(app).post(`/api/practice/${body.id}/answers/0`).send({ selected: correctFor(q0) }).expect(200);
    const again = await request(app).post(`/api/practice/${body.id}/answers/0`).send({ selected: wrongFor(q0) }).expect(200);
    expect(again.body.alreadyAnswered).toBe(true);
    expect(again.body.feedback.correct).toBe(true);
    const progress = await request(app).get("/api/progress");
    expect(progress.body.totals.answered).toBe(1);
  });

  it("rejects bad input", async () => {
    const { app } = setup();
    await request(app).post("/api/practice").send({ mode: "topic", topic: "not-a-topic", size: 10 }).expect(400);
    await request(app).post("/api/practice").send({ mode: "mixed", size: 7 }).expect(400);
    await request(app).post("/api/practice").send({ mode: "mistakes", size: 10 }).expect(400);
    const { body } = await request(app).post("/api/practice").send({ mode: "mixed", size: 10 }).expect(201);
    await request(app).post(`/api/practice/${body.id}/answers/0`).send({ selected: [9] }).expect(400);
    await request(app).post(`/api/practice/${body.id}/answers/99`).send({ selected: [0] }).expect(400);
  });

  it("records a topic quiz result and completes the topic", async () => {
    const { app } = setup();
    const topic = await request(app).get("/api/topics/vehicle-loading");
    for (const l of topic.body.topic.lessons) await request(app).post(`/api/lessons/${l.id}/complete`).expect(200);

    const { body } = await request(app).post("/api/practice").send({ mode: "quiz", topic: "vehicle-loading", size: 10 }).expect(201);
    const s = await request(app).get(`/api/practice/${body.id}`);
    expect(s.body.items).toHaveLength(10);
    for (let i = 0; i < s.body.items.length; i++) {
      const id = s.body.items[i].question.id;
      await request(app).post(`/api/practice/${body.id}/answers/${i}`).send({ selected: i === 0 ? wrongFor(id) : correctFor(id) }).expect(200);
    }
    const t = await request(app).get("/api/topics/vehicle-loading");
    expect(t.body.stats.quizBest).toEqual({ score: 9, total: 10 });
    expect(t.body.stats.completed).toBe(true);
  });
});

describe("mock tests", () => {
  it("runs a full mock: answer, change, flag, submit, review", async () => {
    const { app } = setup();
    const created = await request(app).post("/api/mock-tests").send({}).expect(201);
    const id = created.body.id;
    // Only one mock at a time.
    const dup = await request(app).post("/api/mock-tests").send({}).expect(409);
    expect(dup.body.error.details.id).toBe(id);

    const m = await request(app).get(`/api/mock-tests/${id}`).expect(200);
    expect(m.body.questions).toHaveLength(50);
    expect(m.body.deadlineAt - m.body.startedAt).toBe(57 * 60 * 1000);
    expect(JSON.stringify(m.body.questions)).not.toMatch(/correctKeys|explanation/);

    const ids: string[] = m.body.questions.map((q: { id: string }) => q.id);
    // Answer the first 44 correctly, then change one to wrong: 43 correct is still a pass.
    for (let i = 0; i < 44; i++) await request(app).put(`/api/mock-tests/${id}/answers/${i}`).send({ selected: correctFor(ids[i]) }).expect(200);
    await request(app).put(`/api/mock-tests/${id}/answers/3`).send({ selected: wrongFor(ids[3]) }).expect(200);
    await request(app).put(`/api/mock-tests/${id}/answers/44`).send({ selected: wrongFor(ids[44]) }).expect(200);
    await request(app).put(`/api/mock-tests/${id}/answers/44`).send({ selected: null }).expect(200); // cleared again
    await request(app).put(`/api/mock-tests/${id}/flags/10`).send({ flagged: true }).expect(200);

    await request(app).get(`/api/mock-tests/${id}/results`).expect(409);
    const sub = await request(app).post(`/api/mock-tests/${id}/submit`).expect(200);
    expect(sub.body).toMatchObject({ status: "submitted", score: 43, passed: true });

    const res = await request(app).get(`/api/mock-tests/${id}/results`).expect(200);
    expect(res.body).toMatchObject({ score: 43, correct: 43, incorrect: 1, unanswered: 6, passed: true, passMark: 43 });
    expect(res.body.items[10].flagged).toBe(true);
    expect(res.body.items[3].isCorrect).toBe(false);
    expect(res.body.items[3].correctKeys).toEqual(correctFor(ids[3]));
    expect(res.body.topics.reduce((a: number, t: { total: number }) => a + t.total, 0)).toBe(50);

    // Locked after submit.
    await request(app).put(`/api/mock-tests/${id}/answers/45`).send({ selected: [0] }).expect(409);

    const list = await request(app).get("/api/mock-tests");
    expect(list.body.active).toBeNull();
    expect(list.body.tests[0]).toMatchObject({ id, score: 43, passed: true });
    const progress = await request(app).get("/api/progress");
    expect(progress.body.mocks).toMatchObject({ taken: 1, passed: 1, passRate: 100 });
  });

  it("auto-submits when the timer runs out, and refuses late answers", () => {
    const { handle } = setup();
    const t0 = Date.UTC(2026, 9, 18, 10, 0, 0);
    const m = mock.createMock(handle.db, 1, Math.random, t0);
    const q0 = m.questionIds[0];

    mock.answerMock(handle.db, 1, m.id, 0, correctFor(q0), t0 + 56 * 60 * 1000);
    const late = t0 + 57 * 60 * 1000 + 1;
    expect(() => mock.answerMock(handle.db, 1, m.id, 1, [0], late)).toThrow(/Time is up/);

    const state = mock.getMock(handle.db, 1, m.id, late);
    expect(state.status).toBe("expired");
    const r = mock.mockResults(handle.db, 1, m.id, late);
    expect(r.timedOut).toBe(true);
    expect(r.score).toBe(1);
    expect(r.unanswered).toBe(49);
    expect(r.passed).toBe(false);
    // Time used is capped at the 57 minutes, not however long the tab stayed open.
    expect(r.timeUsedMs).toBe(57 * 60 * 1000);
  });

  it("can discard an unfinished mock", async () => {
    const { app } = setup();
    const { body } = await request(app).post("/api/mock-tests").send({}).expect(201);
    await request(app).delete(`/api/mock-tests/${body.id}`).expect(204);
    await request(app).post("/api/mock-tests").send({}).expect(201);
  });
});

describe("hazard perception", () => {
  it("hides scoring windows until you've attempted the clip", async () => {
    const { app } = setup();
    const list = await request(app).get("/api/hazard/clips").expect(200);
    expect(list.body.length).toBeGreaterThan(0);
    expect(JSON.stringify(list.body)).not.toMatch(/startMs|endMs/);

    const res = await request(app).post("/api/hazard/clips/clip-school-run/attempts").send({ clicks: [12_100, 12_900] }).expect(201);
    expect(res.body.result.total).toBe(5);
    expect(res.body.hazards[0]).toMatchObject({ startMs: 12_000, endMs: 15_000, score: 5 });

    const spam = await request(app).post("/api/hazard/clips/clip-school-run/attempts").send({ clicks: [12_000, 12_200, 12_400, 12_600, 12_800, 13_000] }).expect(201);
    expect(spam.body.result.flagged).toBe(true);
    expect(spam.body.result.total).toBe(0);

    await request(app).post("/api/hazard/clips/clip-school-run/attempts").send({ clicks: [999_999] }).expect(400);
    const after = await request(app).get("/api/hazard/clips");
    expect(after.body.find((c: { id: string }) => c.id === "clip-school-run")).toMatchObject({ attempts: 2, best: 5 });
  });
});

describe("bookmarks, flashcards, profile and admin", () => {
  it("bookmarks a question and practises bookmarks", async () => {
    const { app } = setup();
    await request(app).put("/api/bookmarks/MW-06").expect(200);
    await request(app).put("/api/bookmarks/MW-06").expect(200);
    const list = await request(app).get("/api/bookmarks").expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].question.correctKeys).toEqual(correctFor("MW-06"));
    await request(app).post("/api/practice").send({ mode: "bookmarks", size: 10 }).expect(201);
    await request(app).delete("/api/bookmarks/MW-06").expect(200);
    await request(app).put("/api/bookmarks/NOPE").expect(404);
  });

  it("tracks flashcards and the profile", async () => {
    const { app } = setup();
    await request(app).post("/api/flashcards").send({ signId: "r-no-entry", knew: false }).expect(200);
    await request(app).post("/api/flashcards").send({ signId: "r-no-entry", knew: true }).expect(200);
    await request(app).post("/api/flashcards").send({ signId: "fake", knew: true }).expect(400);
    const state = await request(app).get("/api/flashcards");
    expect(state.body["r-no-entry"]).toMatchObject({ knew: true, reviews: 2, knownCount: 1 });

    const p = await request(app).patch("/api/profile").send({ name: "Victor", nation: "wales", onboarded: true }).expect(200);
    expect(p.body).toMatchObject({ name: "Victor", nation: "wales", onboarded: true });
    await request(app).patch("/api/profile").send({ nation: "france" }).expect(400);
    await request(app).patch("/api/profile").send({ testDate: "2026-02-31" }).expect(400);
    const dated = await request(app).patch("/api/profile").send({ testDate: "2026-11-30" }).expect(200);
    expect(dated.body.testDate).toBe("2026-11-30");
  });

  it("only accepts plain links and file names in imported questions", async () => {
    const { app } = setup();
    const base = { topic: "motorway-rules", text: "What does a red X mean?", options: ["Closed", "Open"], correct: [0], explanation: "Closed.", lastVerified: "2026-10-01" };
    const res = await request(app)
      .post("/api/admin/import/questions")
      .send({
        source: "test pack",
        questions: [
          { ...base, id: "OK-1", sourceUrl: "https://example.org/pack" },
          { ...base, id: "BAD-1", sourceUrl: "javascript:alert(1)" },
          { ...base, id: "BAD-2", sourceUrl: "https://example.org", image: { kind: "sign", ref: "../../api/admin/backup", alt: "x" } },
        ],
      })
      .expect(200);
    expect(res.body.inserted).toBe(1);
    expect(res.body.errors.map((e: { id: string }) => e.id)).toEqual(["BAD-1", "BAD-2"]);
  });

  it("protects admin routes when a token is configured", async () => {
    const dir = tempDir();
    const handle = openTestDb(path.join(dir, "t.db"));
    open.push(handle);
    const app = createApp(handle, { ...testConfig(dir), adminToken: "s3cret" });
    await request(app).post("/api/admin/reset").send({ confirm: "RESET" }).expect(401);
    await request(app).post("/api/admin/reset").set("Authorization", "Bearer s3cret").send({ confirm: "nope" }).expect(400);
    await request(app).post("/api/admin/reset").set("Authorization", "Bearer s3cret").send({ confirm: "RESET" }).expect(200);
  });

  it("downloads a backup", async () => {
    const { app } = setup();
    const res = await request(app).get("/api/admin/backup").buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on("data", (c: Buffer) => chunks.push(c));
      r.on("end", () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect((res.body as Buffer).subarray(0, 15).toString()).toBe("SQLite format 3");
  });
});
