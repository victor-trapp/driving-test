import { desc, eq, sql } from "drizzle-orm";
import { dayKey, lastNDays, studyStreak } from "@shared/dates";
import { MOCK_EXAM } from "@shared/exam";
import { computeReadiness, READINESS_RECENT_ANSWERS } from "@shared/readiness";
import { TOPICS, TOTAL_LESSONS } from "@content/index";
import type { Db } from "../db/client";
import { bookmarks, flashcardReviews, hazardAttempts, lessonProgress, mockTests, questionAttempts } from "../db/schema";
import { getProfile, topicStats, type TopicStats } from "./learning";
import { mistakeQuestions } from "./practice";

const MIN_FOR_RANKING = 5;

export function progressSummary(db: Db, profileId: number, timeZone: string, now = Date.now()) {
  const profile = getProfile(db, profileId);
  const topics = topicStats(db, profileId);

  const attempts = db
    .select({ correct: questionAttempts.correct, mode: questionAttempts.mode, timeMs: questionAttempts.timeMs, createdAt: questionAttempts.createdAt })
    .from(questionAttempts)
    .where(eq(questionAttempts.profileId, profileId))
    .orderBy(desc(questionAttempts.id))
    .all();
  const practice = attempts.filter((a) => a.mode !== "mock");

  const mocks = db
    .select()
    .from(mockTests)
    .where(eq(mockTests.profileId, profileId))
    .orderBy(desc(mockTests.startedAt))
    .all()
    .filter((m) => m.status !== "in_progress");

  const lessonsDone = db.select({ at: lessonProgress.completedAt }).from(lessonProgress).where(eq(lessonProgress.profileId, profileId)).all();
  const cards = db.select({ at: flashcardReviews.createdAt, knew: flashcardReviews.knew }).from(flashcardReviews).where(eq(flashcardReviews.profileId, profileId)).all();
  const hazards = db.select({ at: hazardAttempts.createdAt, total: hazardAttempts.total, max: hazardAttempts.max }).from(hazardAttempts).where(eq(hazardAttempts.profileId, profileId)).all();
  const bookmarkCount = db.select({ n: sql<number>`count(*)` }).from(bookmarks).where(eq(bookmarks.profileId, profileId)).get()?.n ?? 0;
  const mistakesCount = mistakeQuestions(db, profileId).length;

  const readiness = computeReadiness({
    lessonsCompleted: lessonsDone.length,
    lessonsTotal: TOTAL_LESSONS,
    topics: topics.map((t) => ({ answered: t.distinctAnswered, bankSize: t.bankSize })),
    recentAnswers: practice.slice(0, READINESS_RECENT_ANSWERS).map((a) => a.correct),
    recentMocks: mocks.map((m) => (m.score ?? 0) / MOCK_EXAM.questionCount),
  });

  // Activity per day, in the configured time zone so "today" matches the learner's clock.
  const today = dayKey(now, timeZone);
  const days = lastNDays(today, 30);
  const activity = new Map(days.map((d) => [d, { day: d, answered: 0, correct: 0, other: 0 }]));
  const activeDays = new Set<string>();
  for (const a of attempts) {
    const d = dayKey(a.createdAt, timeZone);
    activeDays.add(d);
    const slot = activity.get(d);
    if (slot) {
      slot.answered++;
      if (a.correct) slot.correct++;
    }
  }
  for (const at of [...lessonsDone.map((l) => l.at), ...cards.map((c) => c.at), ...hazards.map((h) => h.at)]) {
    const d = dayKey(at, timeZone);
    activeDays.add(d);
    const slot = activity.get(d);
    if (slot) slot.other++;
  }

  const timed = practice.map((a) => a.timeMs).filter((t): t is number => t !== null && t >= 500 && t <= 5 * 60 * 1000);
  const correctTotal = attempts.filter((a) => a.correct).length;
  const passedMocks = mocks.filter((m) => m.passed).length;
  const ranked = topics.filter((t) => t.answered >= MIN_FOR_RANKING && t.accuracy !== null);
  const byAccuracy = [...ranked].sort((a, b) => b.accuracy! - a.accuracy! || b.answered - a.answered);
  // Split ranked topics so a topic never shows as both strong and weak.
  const strongest = byAccuracy.slice(0, Math.min(3, Math.ceil(byAccuracy.length / 2)));
  const weakest = byAccuracy.slice(strongest.length).reverse().slice(0, 3);

  return {
    profile: { name: profile.name, nation: profile.nation, dailyGoal: profile.dailyGoal, testDate: profile.testDate },
    readiness,
    totals: {
      answered: attempts.length,
      correct: correctTotal,
      accuracy: attempts.length ? Math.round((correctTotal / attempts.length) * 100) : null,
      todayAnswered: activity.get(today)?.answered ?? 0,
      avgTimeMs: timed.length ? Math.round(timed.reduce((a, b) => a + b, 0) / timed.length) : null,
      bookmarks: bookmarkCount,
      mistakes: mistakesCount,
      flashcardsReviewed: cards.length,
    },
    lessons: { completed: lessonsDone.length, total: TOTAL_LESSONS },
    topicsCompleted: topics.filter((t) => t.completed).length,
    topicsTotal: TOPICS.length,
    streak: studyStreak(activeDays, today),
    activeToday: activeDays.has(today),
    mocks: {
      taken: mocks.length,
      passed: passedMocks,
      passRate: mocks.length ? Math.round((passedMocks / mocks.length) * 100) : null,
      averageScore: mocks.length ? Math.round((mocks.reduce((a, m) => a + (m.score ?? 0), 0) / mocks.length) * 10) / 10 : null,
      last: mocks[0] ? { id: mocks[0].id, score: mocks[0].score ?? 0, passed: Boolean(mocks[0].passed), at: mocks[0].submittedAt ?? mocks[0].startedAt } : null,
      history: mocks.slice(0, 20).reverse().map((m) => ({ id: m.id, at: m.submittedAt ?? m.startedAt, score: m.score ?? 0, passed: Boolean(m.passed) })),
    },
    hazard: {
      attempts: hazards.length,
      averagePercent: hazards.length ? Math.round((hazards.reduce((a, h) => a + h.total / Math.max(1, h.max), 0) / hazards.length) * 100) : null,
    },
    activity: [...activity.values()],
    topics,
    strongest: strongest.map(pick),
    weakest: weakest.map(pick),
    suggestion: suggest(topics, { answered: attempts.length, mistakes: mistakesCount, mocks: mocks.length, hazards: hazards.length, lessons: lessonsDone.length }),
  };
}

function pick(t: TopicStats) {
  return { id: t.id, title: t.title, accuracy: t.accuracy, answered: t.answered };
}

export interface Suggestion {
  kind: "lesson" | "practice" | "mistakes" | "mock" | "hazard";
  title: string;
  reason: string;
  href: string;
}

function nextLesson(topics: TopicStats[]) {
  for (const t of TOPICS) {
    const s = topics.find((x) => x.id === t.id)!;
    const lesson = t.lessons.find((l) => !s.completedLessons.includes(l.id));
    if (lesson) return { topic: t, lesson };
  }
  return null;
}

function suggest(topics: TopicStats[], n: { answered: number; mistakes: number; mocks: number; hazards: number; lessons: number }): Suggestion {
  const next = nextLesson(topics);
  if (n.lessons === 0 && next) {
    return { kind: "lesson", title: `Start with ${next.topic.title}`, reason: "Work through the lessons first, then practise the questions for each topic.", href: `/learn/${next.topic.id}/${next.lesson.id}` };
  }
  if (n.mistakes >= 10) {
    return { kind: "mistakes", title: "Review your mistakes", reason: `You have ${n.mistakes} questions you last got wrong. Clearing them is the quickest way to improve.`, href: "/practice/mistakes" };
  }
  const weak = topics.filter((t) => t.answered >= MIN_FOR_RANKING && (t.accuracy ?? 100) < 70).sort((a, b) => a.accuracy! - b.accuracy!)[0];
  if (weak) {
    return { kind: "practice", title: `Practise ${weak.title}`, reason: `You're getting ${weak.accuracy}% right in this topic. Aim for at least 86%, which is the pass rate in the real test.`, href: `/practice?topic=${weak.id}` };
  }
  if (next && n.answered < 150) {
    return { kind: "lesson", title: `Continue: ${next.lesson.title}`, reason: `Next lesson in ${next.topic.title}.`, href: `/learn/${next.topic.id}/${next.lesson.id}` };
  }
  if (n.mocks === 0 && n.answered >= 80) {
    return { kind: "mock", title: "Take your first mock test", reason: "You've answered enough practice questions to see how you'd do under test conditions.", href: "/mock-tests" };
  }
  if (n.hazards === 0) {
    return { kind: "hazard", title: "Try hazard perception", reason: "The hazard perception part is half of the theory test. Practise spotting developing hazards.", href: "/hazard-perception" };
  }
  const untouched = topics.find((t) => t.answered === 0);
  if (untouched) {
    return { kind: "practice", title: `Practise ${untouched.title}`, reason: "You haven't answered any questions in this topic yet.", href: `/practice?topic=${untouched.id}` };
  }
  return { kind: "mock", title: "Take a mock test", reason: "Keep testing yourself under exam conditions. Aim to pass several in a row.", href: "/mock-tests" };
}
