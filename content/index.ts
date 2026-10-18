import type { QuestionSeed, TopicId } from "@shared/types";
import type { Topic } from "./types";
import type { TopicModule } from "./define";

import alertness from "./topics/alertness";
import attitude from "./topics/attitude";
import safetyVehicle from "./topics/safety-and-your-vehicle";
import safetyMargins from "./topics/safety-margins";
import hazardAwareness from "./topics/hazard-awareness";
import vulnerable from "./topics/vulnerable-road-users";
import otherVehicles from "./topics/other-types-of-vehicle";
import handling from "./topics/vehicle-handling";
import motorway from "./topics/motorway-rules";
import rulesOfRoad from "./topics/rules-of-the-road";
import signs from "./topics/road-and-traffic-signs";
import documents from "./topics/essential-documents";
import incidents from "./topics/incidents-accidents-emergencies";
import loading from "./topics/vehicle-loading";

const MODULES: TopicModule[] = [
  alertness,
  attitude,
  safetyVehicle,
  safetyMargins,
  hazardAwareness,
  vulnerable,
  otherVehicles,
  handling,
  motorway,
  rulesOfRoad,
  signs,
  documents,
  incidents,
  loading,
];

export const TOPICS: Topic[] = MODULES.map((m) => m.topic).sort((a, b) => a.number - b.number);
export const SEED_QUESTIONS: QuestionSeed[] = MODULES.flatMap((m) => m.questions);

export function topicById(id: string): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}

export function lessonById(id: string) {
  for (const topic of TOPICS) {
    const lesson = topic.lessons.find((l) => l.id === id);
    if (lesson) return { topic, lesson };
  }
  return undefined;
}

export const TOTAL_LESSONS = TOPICS.reduce((n, t) => n + t.lessons.length, 0);

export type { TopicId };
export { SIGNS, SIGN_CATEGORIES, SIGN_ATTRIBUTION, signById } from "./signs";
export { HAZARD_CLIPS, clipById } from "./hazard-clips";
