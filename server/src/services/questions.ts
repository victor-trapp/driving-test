import { and, eq, inArray } from "drizzle-orm";
import type { AnswerFeedback, PublicQuestion, TopicId } from "@shared/types";
import type { Db } from "../db/client";
import { questions } from "../db/schema";
import { HttpError } from "../http";

export type QuestionRow = typeof questions.$inferSelect;

export function loadQuestions(db: Db, ids: readonly string[]): Map<string, QuestionRow> {
  if (ids.length === 0) return new Map();
  const rows = db.select().from(questions).where(inArray(questions.id, [...new Set(ids)])).all();
  return new Map(rows.map((r) => [r.id, r]));
}

export function activeQuestions(db: Db, topic?: string): QuestionRow[] {
  return db
    .select()
    .from(questions)
    .where(topic ? and(eq(questions.active, true), eq(questions.topic, topic)) : eq(questions.active, true))
    .all();
}

/** Strip the answer and present options in the session's stored order. Keys are the original option indexes. */
export function toPublic(q: QuestionRow, order: readonly number[]): PublicQuestion {
  return {
    id: q.id,
    topic: q.topic as TopicId,
    text: q.text,
    options: order.map((key) => ({ key, text: q.options[key] })),
    selectCount: q.correct.length,
    image: q.image ?? null,
    scenarioId: q.scenarioId,
  };
}

export function feedback(q: QuestionRow, correct: boolean): AnswerFeedback {
  return { correct, correctKeys: q.correct, explanation: q.explanation, hc: q.hc };
}

/** Full question including the answer, for review screens. */
export function toReview(q: QuestionRow, order?: readonly number[]) {
  const keys = order ?? q.options.map((_, i) => i);
  return {
    ...toPublic(q, keys),
    correctKeys: q.correct,
    explanation: q.explanation,
    hc: q.hc,
    sourceUrl: q.sourceUrl,
    lastVerified: q.lastVerified,
    origin: q.origin,
  };
}

export function validateSelection(q: QuestionRow, selected: readonly number[]): number[] {
  const unique = [...new Set(selected)];
  if (unique.length === 0 || unique.length !== selected.length) {
    throw new HttpError(400, "invalid_answer", "Select at least one answer, without duplicates");
  }
  if (unique.some((k) => !Number.isInteger(k) || k < 0 || k >= q.options.length)) {
    throw new HttpError(400, "invalid_answer", "Answer is not one of the options");
  }
  if (unique.length > q.correct.length) {
    throw new HttpError(400, "invalid_answer", `This question takes ${q.correct.length} answer(s)`);
  }
  return unique.sort((a, b) => a - b);
}
