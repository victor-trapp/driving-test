import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { HcRef, ImageRef, Nation } from "@shared/types";
import type { ClipHazard, Scenario } from "@shared/scenario";
import type { ClipScore, PatternRules } from "@shared/hazard";

const now = sql`(CAST(unixepoch('subsec') * 1000 AS INTEGER))`;
const json = <T>(name: string) => text(name, { mode: "json" }).$type<T>();

// Everything user-specific hangs off a profile. There's one local profile for now,
// but the foreign keys mean proper multi-user auth can be added later.
export const profiles = sqliteTable("profiles", {
  id: integer("id").primaryKey(),
  name: text("name").notNull().default(""),
  nation: text("nation").$type<Nation>().notNull().default("england"),
  theme: text("theme").$type<"system" | "light" | "dark">().notNull().default("system"),
  dailyGoal: integer("daily_goal").notNull().default(20),
  testDate: text("test_date"),
  onboarded: integer("onboarded", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().default(now),
  updatedAt: integer("updated_at").notNull().default(now),
});

export const questions = sqliteTable(
  "questions",
  {
    id: text("id").primaryKey(),
    topic: text("topic").notNull(),
    difficulty: integer("difficulty").notNull(),
    text: text("text").notNull(),
    options: json<string[]>("options").notNull(),
    correct: json<number[]>("correct").notNull(),
    explanation: text("explanation").notNull(),
    hc: json<HcRef[]>("hc").notNull(),
    image: json<ImageRef | null>("image"),
    scenarioId: text("scenario_id"),
    sourceUrl: text("source_url").notNull(),
    lastVerified: text("last_verified").notNull(),
    contentVersion: integer("content_version").notNull(),
    /** "bundled" ships with the app; "import" came from a question pack. */
    origin: text("origin").$type<"bundled" | "import">().notNull(),
    importBatch: text("import_batch"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [index("questions_topic_idx").on(t.topic, t.active)],
);

export const questionAttempts = sqliteTable(
  "question_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    selected: json<number[]>("selected").notNull(),
    correct: integer("correct", { mode: "boolean" }).notNull(),
    timeMs: integer("time_ms"),
    mode: text("mode").$type<"practice" | "mistakes" | "bookmarks" | "quiz" | "mock">().notNull(),
    sessionId: text("session_id"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("attempts_profile_time_idx").on(t.profileId, t.createdAt), index("attempts_profile_question_idx").on(t.profileId, t.questionId)],
);

export const practiceSessions = sqliteTable(
  "practice_sessions",
  {
    id: text("id").primaryKey(),
    profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    mode: text("mode").$type<"topic" | "mixed" | "mistakes" | "bookmarks" | "quiz">().notNull(),
    topic: text("topic"),
    questionIds: json<string[]>("question_ids").notNull(),
    optionOrders: json<number[][]>("option_orders").notNull(),
    answers: json<(number[] | null)[]>("answers").notNull(),
    results: json<(boolean | null)[]>("results").notNull(),
    currentIndex: integer("current_index").notNull().default(0),
    startedAt: integer("started_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    completedAt: integer("completed_at"),
  },
  (t) => [index("practice_profile_idx").on(t.profileId, t.startedAt)],
);

export const mockTests = sqliteTable(
  "mock_tests",
  {
    id: text("id").primaryKey(),
    profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    questionIds: json<string[]>("question_ids").notNull(),
    optionOrders: json<number[][]>("option_orders").notNull(),
    answers: json<(number[] | null)[]>("answers").notNull(),
    flags: json<boolean[]>("flags").notNull(),
    currentIndex: integer("current_index").notNull().default(0),
    startedAt: integer("started_at").notNull(),
    deadlineAt: integer("deadline_at").notNull(),
    submittedAt: integer("submitted_at"),
    status: text("status").$type<"in_progress" | "submitted" | "expired">().notNull(),
    score: integer("score"),
    passed: integer("passed", { mode: "boolean" }),
    timeUsedMs: integer("time_used_ms"),
    hasScenario: integer("has_scenario", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("mock_profile_idx").on(t.profileId, t.startedAt)],
);

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.questionId] })],
);

export const lessonProgress = sqliteTable(
  "lesson_progress",
  {
    profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(),
    topicId: text("topic_id").notNull(),
    completedAt: integer("completed_at").notNull().default(now),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.lessonId] })],
);

export const topicQuizResults = sqliteTable("topic_quiz_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  topicId: text("topic_id").notNull(),
  sessionId: text("session_id").notNull(),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  passed: integer("passed", { mode: "boolean" }).notNull(),
  createdAt: integer("created_at").notNull().default(now),
});

export const flashcardReviews = sqliteTable(
  "flashcard_reviews",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    signId: text("sign_id").notNull(),
    knew: integer("knew", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("flashcards_profile_idx").on(t.profileId, t.signId)],
);

export const hazardClips = sqliteTable("hazard_clips", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  kind: text("kind").$type<"animated" | "video">().notNull(),
  durationMs: integer("duration_ms").notNull(),
  scenario: json<Scenario | null>("scenario"),
  src: text("src"),
  hazards: json<ClipHazard[]>("hazards").notNull(),
  pattern: json<Partial<PatternRules> | null>("pattern"),
  licence: text("licence").notNull(),
  origin: text("origin").$type<"bundled" | "import">().notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updated_at").notNull().default(now),
});

export const hazardAttempts = sqliteTable(
  "hazard_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: integer("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    clipId: text("clip_id").notNull().references(() => hazardClips.id, { onDelete: "cascade" }),
    runId: text("run_id"),
    clicks: json<number[]>("clicks").notNull(),
    result: json<ClipScore>("result").notNull(),
    total: integer("total").notNull(),
    max: integer("max").notNull(),
    flagged: integer("flagged", { mode: "boolean" }).notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("hazard_attempts_profile_idx").on(t.profileId, t.createdAt)],
);
