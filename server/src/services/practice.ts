import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { shuffle, shuffledOrder, type Rng } from "@shared/random";
import { isAnswerCorrect } from "@shared/scoring";
import { selectPracticeQuestions } from "@shared/selection";
import type { PracticeMode } from "@shared/types";
import { topicById } from "@content/index";
import type { Db } from "../db/client";
import { bookmarks, practiceSessions, questionAttempts, topicQuizResults } from "../db/schema";
import { HttpError, notFound } from "../http";
import { activeQuestions, feedback, loadQuestions, toPublic, validateSelection, type QuestionRow } from "./questions";

export const PRACTICE_SIZES = [10, 20, 30, 50] as const;
export const QUIZ_SIZE = 10;
export const QUIZ_PASS_RATIO = 0.8;

export interface CreatePracticeInput {
  mode: PracticeMode;
  topic?: string | null;
  size: number;
}

export function createPractice(db: Db, profileId: number, input: CreatePracticeInput, rng: Rng = Math.random, now = Date.now()) {
  const { mode } = input;
  let size = input.size;
  let pool: QuestionRow[];

  if (mode === "topic" || mode === "quiz") {
    if (!input.topic || !topicById(input.topic)) throw new HttpError(400, "invalid_topic", "Choose a valid topic");
    pool = activeQuestions(db, input.topic);
    // End-of-topic quizzes skip the clip-based questions; those are for practice and mocks.
    if (mode === "quiz") {
      pool = pool.filter((q) => !q.scenarioId);
      size = QUIZ_SIZE;
    }
  } else if (mode === "mixed") {
    pool = activeQuestions(db);
  } else if (mode === "mistakes") {
    pool = mistakeQuestions(db, profileId);
  } else {
    pool = bookmarkedQuestions(db, profileId);
  }

  if (pool.length === 0) {
    const why = mode === "mistakes" ? "You have no mistakes to review yet." : mode === "bookmarks" ? "You haven't bookmarked any questions yet." : "No questions available.";
    throw new HttpError(400, "no_questions", why);
  }

  let ids: string[];
  if (mode === "mistakes" || mode === "bookmarks") {
    ids = shuffle(pool, rng).slice(0, size).map((q) => q.id);
  } else {
    ids = selectPracticeQuestions(
      pool.map((q) => ({ id: q.id, topicId: q.topic, scenarioId: q.scenarioId })),
      size,
      rng,
      seenCounts(db, profileId),
    );
  }

  const byId = new Map(pool.map((q) => [q.id, q]));
  const session = {
    id: randomUUID(),
    profileId,
    mode,
    topic: mode === "topic" || mode === "quiz" ? input.topic! : null,
    questionIds: ids,
    optionOrders: ids.map((id) => shuffledOrder(byId.get(id)!.options.length, rng)),
    answers: ids.map(() => null),
    results: ids.map(() => null),
    currentIndex: 0,
    startedAt: now,
    updatedAt: now,
    completedAt: null,
  };
  db.insert(practiceSessions).values(session).run();
  return session;
}

function seenCounts(db: Db, profileId: number): Map<string, number> {
  const rows = db
    .select({ questionId: questionAttempts.questionId, n: sql<number>`count(*)` })
    .from(questionAttempts)
    .where(eq(questionAttempts.profileId, profileId))
    .groupBy(questionAttempts.questionId)
    .all();
  return new Map(rows.map((r) => [r.questionId, r.n]));
}

/** Questions whose most recent attempt was wrong. Answering them correctly takes them off the list. */
export function mistakeQuestions(db: Db, profileId: number): QuestionRow[] {
  const latest = db.all<{ question_id: string; correct: number }>(sql`
    SELECT a.question_id, a.correct FROM question_attempts a
    WHERE a.profile_id = ${profileId}
      AND a.id = (SELECT MAX(b.id) FROM question_attempts b WHERE b.profile_id = a.profile_id AND b.question_id = a.question_id)
  `);
  const wrong = latest.filter((r) => !r.correct).map((r) => r.question_id);
  return [...loadQuestions(db, wrong).values()].filter((q) => q.active);
}

function bookmarkedQuestions(db: Db, profileId: number): QuestionRow[] {
  const ids = db.select({ id: bookmarks.questionId }).from(bookmarks).where(eq(bookmarks.profileId, profileId)).all().map((r) => r.id);
  return [...loadQuestions(db, ids).values()].filter((q) => q.active);
}

function getOwned(db: Db, profileId: number, id: string) {
  const s = db.select().from(practiceSessions).where(and(eq(practiceSessions.id, id), eq(practiceSessions.profileId, profileId))).get();
  if (!s) throw notFound("Practice session");
  return s;
}

export function getPractice(db: Db, profileId: number, id: string) {
  const s = getOwned(db, profileId, id);
  const qs = loadQuestions(db, s.questionIds);
  const bookmarked = new Set(
    db.select({ id: bookmarks.questionId }).from(bookmarks).where(eq(bookmarks.profileId, profileId)).all().map((r) => r.id),
  );
  return {
    id: s.id,
    mode: s.mode,
    topic: s.topic,
    currentIndex: s.currentIndex,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    items: s.questionIds.map((qid, i) => {
      const q = qs.get(qid)!;
      const answer = s.answers[i];
      return {
        question: toPublic(q, s.optionOrders[i]),
        bookmarked: bookmarked.has(qid),
        selected: answer,
        feedback: answer ? feedback(q, s.results[i] === true) : null,
      };
    }),
  };
}

export function answerPractice(db: Db, profileId: number, id: string, index: number, selected: number[], timeMs: number | null, now = Date.now()) {
  return db.transaction((tx) => {
    const s = getOwned(tx as unknown as Db, profileId, id);
    if (s.completedAt) throw new HttpError(409, "session_finished", "This session has finished");
    if (index < 0 || index >= s.questionIds.length) throw new HttpError(400, "invalid_index", "No such question in this session");

    const q = loadQuestions(tx as unknown as Db, [s.questionIds[index]]).get(s.questionIds[index])!;
    if (s.answers[index]) {
      // Already answered (e.g. a double submit after a slow network). Return the original result.
      return { feedback: feedback(q, s.results[index] === true), completed: false, alreadyAnswered: true };
    }
    const chosen = validateSelection(q, selected);
    const correct = isAnswerCorrect(chosen, q.correct);

    tx.insert(questionAttempts)
      .values({
        profileId,
        questionId: q.id,
        selected: chosen,
        correct,
        timeMs: timeMs === null ? null : Math.max(0, Math.min(timeMs, 30 * 60 * 1000)),
        mode: s.mode === "topic" || s.mode === "mixed" ? "practice" : s.mode,
        sessionId: s.id,
        createdAt: now,
      })
      .run();

    const answers = s.answers.slice();
    const results = s.results.slice();
    answers[index] = chosen;
    results[index] = correct;
    const done = answers.every((a) => a !== null);
    tx.update(practiceSessions)
      .set({
        answers,
        results,
        currentIndex: Math.min(index + 1, s.questionIds.length - 1),
        updatedAt: now,
        completedAt: done ? now : null,
      })
      .where(eq(practiceSessions.id, s.id))
      .run();

    if (done && s.mode === "quiz" && s.topic) recordQuiz(tx as unknown as Db, profileId, s.id, s.topic, results, now);
    return { feedback: feedback(q, correct), completed: done, alreadyAnswered: false };
  });
}

function recordQuiz(db: Db, profileId: number, sessionId: string, topicId: string, results: (boolean | null)[], now: number) {
  const score = results.filter((r) => r === true).length;
  const total = results.length;
  db.insert(topicQuizResults)
    .values({ profileId, topicId, sessionId, score, total, passed: score / total >= QUIZ_PASS_RATIO, createdAt: now })
    .run();
}

export function setPracticePosition(db: Db, profileId: number, id: string, index: number) {
  const s = getOwned(db, profileId, id);
  if (index < 0 || index >= s.questionIds.length) throw new HttpError(400, "invalid_index", "No such question in this session");
  db.update(practiceSessions).set({ currentIndex: index, updatedAt: Date.now() }).where(eq(practiceSessions.id, id)).run();
}

export function finishPractice(db: Db, profileId: number, id: string, now = Date.now()) {
  const s = getOwned(db, profileId, id);
  if (!s.completedAt) {
    db.update(practiceSessions).set({ completedAt: now, updatedAt: now }).where(eq(practiceSessions.id, id)).run();
  }
  return summarise({ ...s, completedAt: s.completedAt ?? now });
}

function summarise(s: typeof practiceSessions.$inferSelect) {
  const answered = s.results.filter((r) => r !== null).length;
  const correct = s.results.filter((r) => r === true).length;
  return {
    id: s.id,
    mode: s.mode,
    topic: s.topic,
    total: s.questionIds.length,
    answered,
    correct,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    passedQuiz: s.mode === "quiz" && answered === s.questionIds.length ? correct / answered >= QUIZ_PASS_RATIO : null,
  };
}

export function listPractice(db: Db, profileId: number, opts: { active?: boolean; limit?: number } = {}) {
  const where = opts.active
    ? and(eq(practiceSessions.profileId, profileId), isNull(practiceSessions.completedAt))
    : eq(practiceSessions.profileId, profileId);
  return db
    .select()
    .from(practiceSessions)
    .where(where)
    .orderBy(desc(practiceSessions.updatedAt))
    .limit(opts.limit ?? 20)
    .all()
    .map(summarise);
}
