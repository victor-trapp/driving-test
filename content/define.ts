import type { HcRef, ImageRef, QuestionSeed, TopicId } from "@shared/types";
import type { Topic } from "./types";

export const CONTENT_VERSION = 1;
export const LAST_VERIFIED = "2026-10-18";

type Draft = Omit<QuestionSeed, "topic">;

/**
 * Question helper. Correct options are listed first and wrong ones after; the app
 * shuffles option order every time a question is shown.
 */
export function q(
  id: string,
  difficulty: 1 | 2 | 3,
  text: string,
  right: string[],
  wrong: string[],
  explanation: string,
  hc: HcRef[],
  extra: { image?: ImageRef; scenarioId?: string; sourceUrl?: string } = {},
): Draft {
  if (right.length === 0 || right.length + wrong.length < 2) throw new Error(`${id}: not enough options`);
  if (hc.length === 0 && !extra.sourceUrl) throw new Error(`${id}: needs a source`);
  return {
    id,
    difficulty,
    text,
    options: [...right, ...wrong],
    correct: right.map((_, i) => i),
    explanation,
    hc,
    image: extra.image,
    scenarioId: extra.scenarioId,
    sourceUrl: extra.sourceUrl ?? hc[0].url,
    lastVerified: LAST_VERIFIED,
    contentVersion: CONTENT_VERSION,
  };
}

export const sign = (ref: string, alt: string): ImageRef => ({ kind: "sign", ref, alt });
export const art = (ref: string, alt: string): ImageRef => ({ kind: "illustration", ref, alt });

export interface TopicModule {
  topic: Topic;
  questions: QuestionSeed[];
}

export function defineTopic(topic: Topic, questions: Draft[]): TopicModule {
  const id: TopicId = topic.id;
  return { topic, questions: questions.map((d) => ({ ...d, topic: id })) };
}
