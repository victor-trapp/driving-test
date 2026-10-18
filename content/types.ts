import type { HcRef, Nation, TopicId } from "@shared/types";

export type IllustrationId =
  | "roundabout-lanes"
  | "junction-priority"
  | "stopping-distances"
  | "following-distance"
  | "pedestrian-crossings"
  | "overtaking"
  | "motorway-lanes"
  | "blind-spots"
  | "motorway-studs"
  | "box-junction"
  | "parking-hill"
  | "hazard-types";

export type LessonBlock =
  | { t: "p"; text: string }
  | { t: "list"; items: string[] }
  /** Something the law requires (MUST / MUST NOT in the Highway Code). */
  | { t: "rule"; text: string; ref?: HcRef }
  | { t: "tip"; text: string }
  | { t: "nation"; nations: Nation[]; text: string }
  | { t: "figure"; id: IllustrationId; caption: string }
  | { t: "signs"; ids: string[]; caption?: string }
  | { t: "scenario"; title: string; text: string }
  | { t: "table"; head: string[]; rows: string[][]; caption?: string }
  | { t: "check"; q: string; options: string[]; answer: number; explain: string };

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  blocks: LessonBlock[];
  refs: HcRef[];
}

export interface Topic {
  id: TopicId;
  number: number;
  title: string;
  blurb: string;
  icon: string;
  objectives: string[];
  lessons: Lesson[];
}

export type SignCategory =
  | "warning"
  | "regulatory"
  | "mandatory"
  | "information"
  | "motorway"
  | "markings"
  | "parking"
  | "direction";

export interface Sign {
  id: string;
  category: SignCategory;
  name: string;
  meaning: string;
  explanation: string;
  /** Path under /signs for official DfT images, or a marking illustration id. */
  image: { kind: "dft"; file: string } | { kind: "marking"; id: string };
  hc?: HcRef;
}

export type CrossingId = "zebra" | "parallel" | "pelican" | "puffin" | "toucan" | "equestrian" | "school-patrol";

export interface Crossing {
  id: CrossingId;
  name: string;
  /** Where the name comes from, or what else it's called. */
  aka?: string;
  control: "Give way" | "Traffic lights" | "School patrol";
  users: string;
  /** How to recognise it. Supports **bold**. */
  spot: string[];
  /** What you must or should do as a driver. Supports **bold**. */
  driver: string[];
  /** The light sequence drivers see, for signal-controlled crossings. */
  lights?: "pelican" | "standard";
  /** The one thing to remember for the test. */
  remember: string;
  /** Ids of related signs in the sign library. */
  signs: string[];
  refs: HcRef[];
}
