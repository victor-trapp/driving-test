import type { AnswerFeedback, HcRef, ImageRef, Nation, PracticeMode, PublicQuestion, TopicId } from "@shared/types";
import type { Scenario } from "@shared/scenario";
import type { Readiness } from "@shared/readiness";
import type { ClipScore } from "@shared/hazard";
import type { Lesson, Sign, SignCategory, Topic } from "@content/types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network", "Can't reach the server. Check it's running and you're on the same network.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error;
    throw new ApiError(res.status, e?.code ?? "error", e?.message ?? `Request failed (${res.status})`, e?.details);
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, b: unknown = {}) => request<T>("POST", p, b),
  put: <T>(p: string, b: unknown = {}) => request<T>("PUT", p, b),
  patch: <T>(p: string, b: unknown) => request<T>("PATCH", p, b),
  del: <T>(p: string) => request<T>("DELETE", p),
};

// ---- Response types -------------------------------------------------------------------

export interface Profile {
  id: number;
  name: string;
  nation: Nation;
  theme: "system" | "light" | "dark";
  dailyGoal: number;
  testDate: string | null;
  onboarded: boolean;
}

export interface Meta {
  appVersion: string;
  contentVersion: number;
  formatVerifiedOn: string;
  mockExam: { questionCount: number; durationMs: number; passMark: number; scenarioQuestions: number };
  hazardTest: { clips: number; developingHazards: number; maxPointsPerHazard: number; maxScore: number; passMark: number };
  readinessWeights: { coverage: number; accuracy: number; mock: number };
  sources: Record<string, string>;
  signAttribution: string;
  adminProtected: boolean;
}

export interface TopicStats {
  id: TopicId;
  number: number;
  title: string;
  blurb: string;
  icon: string;
  lessonsTotal: number;
  lessonsDone: number;
  completedLessons: string[];
  nextLesson: { id: string; title: string } | null;
  bankSize: number;
  answered: number;
  correct: number;
  distinctAnswered: number;
  accuracy: number | null;
  quizBest: { score: number; total: number } | null;
  quizPassed: boolean;
  completed: boolean;
}

export interface TopicDetail {
  topic: Topic;
  stats: TopicStats;
}

export type { Lesson, Sign, SignCategory, Topic, PublicQuestion, AnswerFeedback, HcRef, ImageRef, PracticeMode };

export interface SignsResponse {
  categories: { id: SignCategory; title: string; blurb: string }[];
  signs: Sign[];
  attribution: string;
}

export type FlashcardState = Record<string, { knew: boolean; at: number; reviews: number; knownCount: number }>;

export interface PracticeItem {
  question: PublicQuestion;
  bookmarked: boolean;
  selected: number[] | null;
  feedback: AnswerFeedback | null;
}

export interface PracticeSession {
  id: string;
  mode: PracticeMode;
  topic: TopicId | null;
  currentIndex: number;
  startedAt: number;
  completedAt: number | null;
  items: PracticeItem[];
}

export interface PracticeSummary {
  id: string;
  mode: PracticeMode;
  topic: TopicId | null;
  total: number;
  answered: number;
  correct: number;
  startedAt: number;
  completedAt: number | null;
  passedQuiz: boolean | null;
}

export interface ReviewQuestion extends PublicQuestion {
  correctKeys: number[];
  explanation: string;
  hc: HcRef[];
  sourceUrl: string;
  lastVerified: string;
  origin: "bundled" | "import";
}

export interface MockState {
  id: string;
  status: "in_progress" | "submitted" | "expired";
  startedAt: number;
  deadlineAt: number;
  serverNow: number;
  currentIndex: number;
  hasScenario: boolean;
  questions: PublicQuestion[];
  answers: (number[] | null)[];
  flags: boolean[];
}

export interface MockListItem {
  id: string;
  status: "in_progress" | "submitted" | "expired";
  startedAt: number;
  deadlineAt: number;
  submittedAt: number | null;
  score: number | null;
  passed: boolean | null;
  timeUsedMs: number | null;
}

export interface MockResults {
  id: string;
  status: "submitted" | "expired";
  startedAt: number;
  submittedAt: number;
  timeUsedMs: number;
  timedOut: boolean;
  passMark: number;
  score: number;
  total: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  percent: number;
  passed: boolean;
  topics: { id: TopicId; title: string; correct: number; total: number; percent: number }[];
  revise: TopicId[];
  items: (ReviewQuestion & { selected: number[] | null; isCorrect: boolean; flagged: boolean })[];
}

export interface ClipSummary {
  id: string;
  title: string;
  description: string;
  kind: "animated" | "video";
  durationMs: number;
  scenario: Scenario | null;
  src: string | null;
  hazardCount: number;
  licence: string;
  official: false;
  attempts?: number;
  best?: number | null;
  last?: { total: number; max: number; at: number; flagged: boolean } | null;
  max?: number;
}

export interface ClipAttemptResult {
  clipId: string;
  result: ClipScore;
  hazards: { id: string; startMs: number; endMs: number; label: string; explanation: string; score: number; clickMs: number | null }[];
}

export interface Suggestion {
  kind: "lesson" | "practice" | "mistakes" | "mock" | "hazard";
  title: string;
  reason: string;
  href: string;
}

export interface ProgressSummary {
  profile: { name: string; nation: Nation; dailyGoal: number; testDate: string | null };
  readiness: Readiness;
  totals: { answered: number; correct: number; accuracy: number | null; todayAnswered: number; avgTimeMs: number | null; bookmarks: number; mistakes: number; flashcardsReviewed: number };
  lessons: { completed: number; total: number };
  topicsCompleted: number;
  topicsTotal: number;
  streak: number;
  activeToday: boolean;
  mocks: {
    taken: number;
    passed: number;
    passRate: number | null;
    averageScore: number | null;
    last: { id: string; score: number; passed: boolean; at: number } | null;
    history: { id: string; at: number; score: number; passed: boolean }[];
  };
  hazard: { attempts: number; averagePercent: number | null };
  activity: { day: string; answered: number; correct: number; other: number }[];
  topics: TopicStats[];
  strongest: { id: TopicId; title: string; accuracy: number | null; answered: number }[];
  weakest: { id: TopicId; title: string; accuracy: number | null; answered: number }[];
  suggestion: Suggestion;
}
