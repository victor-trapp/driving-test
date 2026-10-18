import { and, desc, eq, sql } from "drizzle-orm";
import type { Nation } from "@shared/types";
import { SIGNS, TOPICS, lessonById, topicById } from "@content/index";
import type { Db } from "../db/client";
import { bookmarks, flashcardReviews, lessonProgress, profiles, questions, topicQuizResults } from "../db/schema";
import { HttpError, notFound } from "../http";
import { loadQuestions, toReview } from "./questions";
import { mistakeQuestions } from "./practice";

// ---- Profile -------------------------------------------------------------------------

export function getProfile(db: Db, profileId: number) {
  const p = db.select().from(profiles).where(eq(profiles.id, profileId)).get();
  if (!p) throw notFound("Profile");
  return p;
}

export function updateProfile(
  db: Db,
  profileId: number,
  patch: Partial<{ name: string; nation: Nation; theme: "system" | "light" | "dark"; dailyGoal: number; testDate: string | null; onboarded: boolean }>,
) {
  db.update(profiles).set({ ...patch, updatedAt: Date.now() }).where(eq(profiles.id, profileId)).run();
  return getProfile(db, profileId);
}

// ---- Topics and lessons ----------------------------------------------------------------

export function topicStats(db: Db, profileId: number) {
  const bank = db
    .select({ topic: questions.topic, n: sql<number>`count(*)` })
    .from(questions)
    .where(eq(questions.active, true))
    .groupBy(questions.topic)
    .all();
  const answered = db.all<{ topic: string; answered: number; correct: number; distinct_q: number }>(sql`
    SELECT q.topic AS topic, count(*) AS answered, sum(a.correct) AS correct, count(DISTINCT a.question_id) AS distinct_q
    FROM question_attempts a JOIN questions q ON q.id = a.question_id
    WHERE a.profile_id = ${profileId}
    GROUP BY q.topic
  `);
  const lessons = db.select().from(lessonProgress).where(eq(lessonProgress.profileId, profileId)).all();
  const quiz = db
    .select({ topic: topicQuizResults.topicId, best: sql<number>`max(${topicQuizResults.score})`, total: sql<number>`max(${topicQuizResults.total})`, passed: sql<number>`max(${topicQuizResults.passed})` })
    .from(topicQuizResults)
    .where(eq(topicQuizResults.profileId, profileId))
    .groupBy(topicQuizResults.topicId)
    .all();

  return TOPICS.map((t) => {
    const a = answered.find((r) => r.topic === t.id);
    const q = quiz.find((r) => r.topic === t.id);
    const done = lessons.filter((l) => l.topicId === t.id).map((l) => l.lessonId);
    const lessonsDone = t.lessons.filter((l) => done.includes(l.id)).length;
    const quizPassed = Boolean(q?.passed);
    const next = t.lessons.find((l) => !done.includes(l.id));
    return {
      id: t.id,
      number: t.number,
      title: t.title,
      blurb: t.blurb,
      icon: t.icon,
      lessonsTotal: t.lessons.length,
      lessonsDone,
      completedLessons: done,
      nextLesson: next ? { id: next.id, title: next.title } : null,
      bankSize: bank.find((b) => b.topic === t.id)?.n ?? 0,
      answered: a?.answered ?? 0,
      correct: a?.correct ?? 0,
      distinctAnswered: a?.distinct_q ?? 0,
      accuracy: a && a.answered > 0 ? Math.round((a.correct / a.answered) * 100) : null,
      quizBest: q ? { score: q.best, total: q.total } : null,
      quizPassed,
      // A topic is complete when every lesson is done and its end-of-topic quiz is passed.
      completed: lessonsDone === t.lessons.length && quizPassed,
    };
  });
}

export type TopicStats = ReturnType<typeof topicStats>[number];

export function listTopics(db: Db, profileId: number) {
  return topicStats(db, profileId);
}

export function getTopic(db: Db, profileId: number, id: string) {
  const topic = topicById(id);
  if (!topic) throw notFound("Topic");
  const stats = topicStats(db, profileId).find((s) => s.id === id)!;
  return { topic, stats };
}

export function completeLesson(db: Db, profileId: number, lessonId: string, now = Date.now()) {
  const found = lessonById(lessonId);
  if (!found) throw notFound("Lesson");
  db.insert(lessonProgress).values({ profileId, lessonId, topicId: found.topic.id, completedAt: now }).onConflictDoNothing().run();
  return { lessonId, topicId: found.topic.id, completedAt: now };
}

export function uncompleteLesson(db: Db, profileId: number, lessonId: string) {
  db.delete(lessonProgress).where(and(eq(lessonProgress.profileId, profileId), eq(lessonProgress.lessonId, lessonId))).run();
}

// ---- Flashcards ------------------------------------------------------------------------

export function flashcardState(db: Db, profileId: number) {
  const rows = db.select().from(flashcardReviews).where(eq(flashcardReviews.profileId, profileId)).orderBy(flashcardReviews.id).all();
  const state: Record<string, { knew: boolean; at: number; reviews: number; knownCount: number }> = {};
  for (const r of rows) {
    const s = state[r.signId] ?? { knew: r.knew, at: r.createdAt, reviews: 0, knownCount: 0 };
    s.knew = r.knew;
    s.at = r.createdAt;
    s.reviews++;
    if (r.knew) s.knownCount++;
    state[r.signId] = s;
  }
  return state;
}

export function reviewFlashcard(db: Db, profileId: number, signId: string, knew: boolean, now = Date.now()) {
  if (!SIGNS.some((s) => s.id === signId)) throw new HttpError(400, "invalid_sign", "Unknown sign");
  db.insert(flashcardReviews).values({ profileId, signId, knew, createdAt: now }).run();
  return { signId, knew, at: now };
}

// ---- Bookmarks and mistakes --------------------------------------------------------------

export function listBookmarks(db: Db, profileId: number) {
  const rows = db.select().from(bookmarks).where(eq(bookmarks.profileId, profileId)).orderBy(desc(bookmarks.createdAt)).all();
  const qs = loadQuestions(db, rows.map((r) => r.questionId));
  return rows.filter((r) => qs.has(r.questionId)).map((r) => ({ createdAt: r.createdAt, question: toReview(qs.get(r.questionId)!) }));
}

export function setBookmark(db: Db, profileId: number, questionId: string, on: boolean) {
  const q = db.select({ id: questions.id }).from(questions).where(eq(questions.id, questionId)).get();
  if (!q) throw notFound("Question");
  if (on) db.insert(bookmarks).values({ profileId, questionId }).onConflictDoNothing().run();
  else db.delete(bookmarks).where(and(eq(bookmarks.profileId, profileId), eq(bookmarks.questionId, questionId))).run();
  return { questionId, bookmarked: on };
}

export function listMistakes(db: Db, profileId: number) {
  const qs = mistakeQuestions(db, profileId);
  const last = db.all<{ question_id: string; selected: string; created_at: number }>(sql`
    SELECT question_id, selected, created_at FROM question_attempts
    WHERE profile_id = ${profileId} AND id IN (SELECT MAX(id) FROM question_attempts WHERE profile_id = ${profileId} GROUP BY question_id)
  `);
  const byId = new Map(last.map((l) => [l.question_id, l]));
  return qs
    .map((q) => ({ question: toReview(q), lastSelected: JSON.parse(byId.get(q.id)?.selected ?? "[]") as number[], at: byId.get(q.id)?.created_at ?? 0 }))
    .sort((a, b) => b.at - a.at);
}

export function resetProgress(db: Db, profileId: number) {
  db.transaction((tx) => {
    for (const table of ["question_attempts", "practice_sessions", "mock_tests", "bookmarks", "lesson_progress", "topic_quiz_results", "flashcard_reviews", "hazard_attempts"]) {
      tx.run(sql.raw(`DELETE FROM ${table} WHERE profile_id = ${Number(profileId)}`));
    }
  });
}
