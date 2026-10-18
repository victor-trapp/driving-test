import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { MOCK_EXAM, isExpired, mockDeadline } from "@shared/exam";
import { shuffledOrder, type Rng } from "@shared/random";
import { isAnswerCorrect, scoreMock } from "@shared/scoring";
import { selectMockQuestions } from "@shared/selection";
import { TOPICS } from "@content/index";
import type { Db } from "../db/client";
import { hazardClips, mockTests, questionAttempts } from "../db/schema";
import { HttpError, notFound } from "../http";
import { activeQuestions, loadQuestions, toPublic, toReview, validateSelection } from "./questions";

type MockRow = typeof mockTests.$inferSelect;

export function createMock(db: Db, profileId: number, rng: Rng = Math.random, now = Date.now()) {
  const open = activeMock(db, profileId, now);
  if (open) throw new HttpError(409, "mock_in_progress", "You already have a mock test in progress", { id: open.id });

  const clips = new Set(db.select({ id: hazardClips.id }).from(hazardClips).where(eq(hazardClips.active, true)).all().map((c) => c.id));
  const pool = activeQuestions(db).filter((q) => !q.scenarioId || clips.has(q.scenarioId));
  if (pool.length < MOCK_EXAM.questionCount) {
    throw new HttpError(400, "not_enough_questions", `A mock test needs at least ${MOCK_EXAM.questionCount} questions`);
  }

  const ids = selectMockQuestions(
    pool.map((q) => ({ id: q.id, topicId: q.topic, scenarioId: q.scenarioId })),
    { count: MOCK_EXAM.questionCount, rng, includeScenario: true, scenarioSize: MOCK_EXAM.scenarioQuestions },
  );
  const byId = new Map(pool.map((q) => [q.id, q]));
  const row = {
    id: randomUUID(),
    profileId,
    questionIds: ids,
    optionOrders: ids.map((id) => shuffledOrder(byId.get(id)!.options.length, rng)),
    answers: ids.map(() => null),
    flags: ids.map(() => false),
    currentIndex: 0,
    startedAt: now,
    deadlineAt: mockDeadline(now),
    submittedAt: null,
    status: "in_progress" as const,
    score: null,
    passed: null,
    timeUsedMs: null,
    hasScenario: ids.some((id) => byId.get(id)!.scenarioId),
  };
  db.insert(mockTests).values(row).run();
  return row;
}

/** The in-progress mock, if any. A mock past its deadline is finalised on the way. */
export function activeMock(db: Db, profileId: number, now = Date.now()): MockRow | null {
  const rows = db
    .select()
    .from(mockTests)
    .where(and(eq(mockTests.profileId, profileId), eq(mockTests.status, "in_progress")))
    .all();
  let open: MockRow | null = null;
  for (const r of rows) {
    if (isExpired(r.deadlineAt, now)) finalise(db, r, now, "expired");
    else open = r;
  }
  return open;
}

function getOwned(db: Db, profileId: number, id: string, now: number): MockRow {
  const r = db.select().from(mockTests).where(and(eq(mockTests.id, id), eq(mockTests.profileId, profileId))).get();
  if (!r) throw notFound("Mock test");
  if (r.status === "in_progress" && isExpired(r.deadlineAt, now)) return finalise(db, r, now, "expired");
  return r;
}

function requireOpen(r: MockRow) {
  if (r.status !== "in_progress") throw new HttpError(409, r.status === "expired" ? "time_up" : "mock_submitted", r.status === "expired" ? "Time is up. Your test has been submitted." : "This test has already been submitted");
}

export function getMock(db: Db, profileId: number, id: string, now = Date.now()) {
  const r = getOwned(db, profileId, id, now);
  const qs = loadQuestions(db, r.questionIds);
  return {
    id: r.id,
    status: r.status,
    startedAt: r.startedAt,
    deadlineAt: r.deadlineAt,
    serverNow: now,
    currentIndex: r.currentIndex,
    hasScenario: r.hasScenario,
    questions: r.questionIds.map((qid, i) => toPublic(qs.get(qid)!, r.optionOrders[i])),
    answers: r.answers,
    flags: r.flags,
  };
}

export function answerMock(db: Db, profileId: number, id: string, index: number, selected: number[] | null, now = Date.now()) {
  return db.transaction((tx) => {
    const r = getOwned(tx as unknown as Db, profileId, id, now);
    requireOpen(r);
    if (index < 0 || index >= r.questionIds.length) throw new HttpError(400, "invalid_index", "No such question in this test");
    const q = loadQuestions(tx as unknown as Db, [r.questionIds[index]]).get(r.questionIds[index])!;
    const answers = r.answers.slice();
    // null or [] clears the answer; you can change answers freely until you submit.
    answers[index] = selected && selected.length > 0 ? validateSelection(q, selected) : null;
    tx.update(mockTests).set({ answers, currentIndex: index }).where(eq(mockTests.id, id)).run();
    return { answers, deadlineAt: r.deadlineAt, serverNow: now };
  });
}

export function flagMock(db: Db, profileId: number, id: string, index: number, flagged: boolean, now = Date.now()) {
  const r = getOwned(db, profileId, id, now);
  requireOpen(r);
  if (index < 0 || index >= r.questionIds.length) throw new HttpError(400, "invalid_index", "No such question in this test");
  const flags = r.flags.slice();
  flags[index] = flagged;
  db.update(mockTests).set({ flags }).where(eq(mockTests.id, id)).run();
  return { flags };
}

export function moveMock(db: Db, profileId: number, id: string, index: number, now = Date.now()) {
  const r = getOwned(db, profileId, id, now);
  requireOpen(r);
  if (index < 0 || index >= r.questionIds.length) throw new HttpError(400, "invalid_index", "No such question in this test");
  db.update(mockTests).set({ currentIndex: index }).where(eq(mockTests.id, id)).run();
}

export function submitMock(db: Db, profileId: number, id: string, now = Date.now()) {
  const r = getOwned(db, profileId, id, now);
  if (r.status !== "in_progress") return r; // already submitted or timed out: idempotent
  return finalise(db, r, now, "submitted");
}

export function discardMock(db: Db, profileId: number, id: string) {
  const r = db.select().from(mockTests).where(and(eq(mockTests.id, id), eq(mockTests.profileId, profileId))).get();
  if (!r) throw notFound("Mock test");
  if (r.status !== "in_progress") throw new HttpError(409, "mock_submitted", "Only an unfinished test can be discarded");
  db.delete(mockTests).where(eq(mockTests.id, id)).run();
}

function finalise(db: Db, r: MockRow, now: number, status: "submitted" | "expired"): MockRow {
  const qs = loadQuestions(db, r.questionIds);
  const ordered = r.questionIds.map((qid) => qs.get(qid)!);
  const score = scoreMock(ordered, r.answers);
  const endedAt = Math.min(now, r.deadlineAt);
  const update = {
    status,
    submittedAt: endedAt,
    score: score.score,
    passed: score.passed,
    timeUsedMs: endedAt - r.startedAt,
  };
  db.transaction((tx) => {
    tx.update(mockTests).set(update).where(eq(mockTests.id, r.id)).run();
    r.answers.forEach((a, i) => {
      if (!a || a.length === 0) return;
      tx.insert(questionAttempts)
        .values({ profileId: r.profileId, questionId: r.questionIds[i], selected: a, correct: isAnswerCorrect(a, ordered[i].correct), timeMs: null, mode: "mock", sessionId: r.id, createdAt: endedAt })
        .run();
    });
  });
  return { ...r, ...update };
}

export function mockResults(db: Db, profileId: number, id: string, now = Date.now()) {
  const r = getOwned(db, profileId, id, now);
  if (r.status === "in_progress") throw new HttpError(409, "mock_in_progress", "Submit the test to see your results");
  const qs = loadQuestions(db, r.questionIds);
  const ordered = r.questionIds.map((qid) => qs.get(qid)!);
  const score = scoreMock(ordered, r.answers);

  const byTopic = new Map<string, { correct: number; total: number }>();
  const items = ordered.map((q, i) => {
    const answer = r.answers[i];
    const correct = isAnswerCorrect(answer, q.correct);
    const t = byTopic.get(q.topic) ?? { correct: 0, total: 0 };
    t.total++;
    if (correct) t.correct++;
    byTopic.set(q.topic, t);
    return { ...toReview(q, r.optionOrders[i]), selected: answer, isCorrect: correct, flagged: r.flags[i] };
  });

  const topics = TOPICS.filter((t) => byTopic.has(t.id)).map((t) => {
    const s = byTopic.get(t.id)!;
    return { id: t.id, title: t.title, correct: s.correct, total: s.total, percent: Math.round((s.correct / s.total) * 100) };
  });
  const passRatio = MOCK_EXAM.passMark / MOCK_EXAM.questionCount;
  const revise = topics
    .filter((t) => t.correct < t.total && t.correct / t.total < passRatio)
    .sort((a, b) => a.correct / a.total - b.correct / b.total)
    .map((t) => t.id);

  return {
    id: r.id,
    status: r.status,
    startedAt: r.startedAt,
    submittedAt: r.submittedAt,
    timeUsedMs: r.timeUsedMs,
    timedOut: r.status === "expired",
    passMark: MOCK_EXAM.passMark,
    ...score,
    topics,
    revise,
    items,
  };
}

export function listMocks(db: Db, profileId: number, limit = 50, now = Date.now()) {
  activeMock(db, profileId, now); // finalise anything that has timed out
  return db
    .select({
      id: mockTests.id,
      status: mockTests.status,
      startedAt: mockTests.startedAt,
      deadlineAt: mockTests.deadlineAt,
      submittedAt: mockTests.submittedAt,
      score: mockTests.score,
      passed: mockTests.passed,
      timeUsedMs: mockTests.timeUsedMs,
    })
    .from(mockTests)
    .where(eq(mockTests.profileId, profileId))
    .orderBy(desc(mockTests.startedAt))
    .limit(limit)
    .all();
}
