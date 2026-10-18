export type Nation = "england" | "scotland" | "wales";

export const TOPIC_IDS = [
  "alertness",
  "attitude",
  "safety-and-your-vehicle",
  "safety-margins",
  "hazard-awareness",
  "vulnerable-road-users",
  "other-types-of-vehicle",
  "vehicle-handling",
  "motorway-rules",
  "rules-of-the-road",
  "road-and-traffic-signs",
  "essential-documents",
  "incidents-accidents-emergencies",
  "vehicle-loading",
] as const;

export type TopicId = (typeof TOPIC_IDS)[number];

export interface HcRef {
  label: string;
  url: string;
}

export type ImageRef =
  | { kind: "sign"; ref: string; alt: string }
  | { kind: "illustration"; ref: string; alt: string };

/** A question as stored in the bank (seed files and imports use this shape). */
export interface QuestionSeed {
  id: string;
  topic: TopicId;
  difficulty: 1 | 2 | 3;
  text: string;
  options: string[];
  /** Indexes into `options`. More than one means "mark N answers". */
  correct: number[];
  explanation: string;
  hc: HcRef[];
  image?: ImageRef;
  /** Groups the question with an animated scenario clip (mock "video" questions). */
  scenarioId?: string;
  sourceUrl: string;
  lastVerified: string;
  contentVersion: number;
}

/** What the client sees before answering: no correct answers, options already shuffled. */
export interface PublicQuestion {
  id: string;
  topic: TopicId;
  text: string;
  options: { key: number; text: string }[];
  selectCount: number;
  image: ImageRef | null;
  scenarioId: string | null;
}

export interface AnswerFeedback {
  correct: boolean;
  correctKeys: number[];
  explanation: string;
  hc: HcRef[];
}

export type PracticeMode = "topic" | "mixed" | "mistakes" | "bookmarks" | "quiz";
