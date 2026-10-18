// Data model for animated driving scenarios (our own educational clips) and for
// hazard perception clips in general. Licensed MP4 clips use the same HazardClip
// shape with kind "video" and a src instead of a scenario.
//
// World coordinates: z is distance along the road in metres (the camera starts at
// z = 0 and drives towards +z). x is metres across the road, positive to the right.
// We drive on the left, so the ego lane centre is negative x on a two-way road.

import type { PatternRules } from "./hazard";

export type ActorKind =
  | "car"
  | "van"
  | "bus"
  | "lorry"
  | "tractor"
  | "cyclist"
  | "pedestrian"
  | "child"
  | "horse"
  | "ball"
  | "dog";

export interface Keyframe {
  t: number; // ms
  x: number;
  z: number;
}

export interface Actor {
  id: string;
  kind: ActorKind;
  color?: string;
  path: Keyframe[];
  /** Indicator state changes over time. */
  indicator?: { t: number; side: "left" | "right" | null }[];
  brake?: { t: number; on: boolean }[];
  /** For parked cars: door opens at this time (ms). */
  doorOpenAt?: number;
  /** Which way the actor faces when not moving: "with" traffic (+z), "against" (-z), "left" or "right". */
  facing?: "with" | "against" | "left" | "right";
}

export type SceneryKind = "house" | "shop" | "tree" | "lamp" | "hedge" | "fence" | "busStop" | "parkedCar" | "sign" | "zebra" | "gantry" | "barrier";

export interface Scenery {
  kind: SceneryKind;
  side: "left" | "right" | "centre";
  z: number;
  /** For runs of houses, hedges and fences: length along the road. */
  length?: number;
  /** Lateral offset from the road edge (metres), default depends on kind. */
  offset?: number;
  color?: string;
  /** For sign scenery: id of a sign in the sign library. */
  signId?: string;
}

export interface Scenario {
  environment: "residential" | "town" | "country" | "motorway" | "dual";
  time: "day" | "dusk" | "night";
  weather: "clear" | "rain";
  road: {
    /** Lanes in our direction. */
    lanesWith: number;
    /** Lanes in the opposite direction (0 on one-way or dual where the other side is hidden). */
    lanesAgainst: number;
    laneWidth: number;
    /** Central reservation between directions (dual/motorway). */
    reservation?: number;
    centreLine: "broken" | "hazard" | "none";
    hardShoulder?: boolean;
    pavement: boolean;
  };
  /** Speed keyframes for the camera car, in metres per second. */
  egoSpeed: { t: number; v: number }[];
  /** Lane the camera sits in, counted from the left starting at 0. */
  egoLane: number;
  /** Optional sideways moves of the camera car (x offset from lane centre). */
  egoOffset?: { t: number; dx: number }[];
  sideRoads?: { z: number; side: "left" | "right"; width: number }[];
  actors: Actor[];
  scenery: Scenery[];
}

export interface ClipHazard {
  id: string;
  startMs: number;
  endMs: number;
  label: string;
  explanation: string;
}

export interface HazardClip {
  id: string;
  title: string;
  description: string;
  kind: "animated" | "video";
  durationMs: number;
  scenario?: Scenario;
  /** For video clips: URL under /media, served from the data volume. */
  src?: string;
  hazards: ClipHazard[];
  pattern?: Partial<PatternRules>;
  /** Short licence note shown with the clip. */
  licence: string;
  official: false;
}

/** Lane centre x for a lane index counted from the left of our carriageway. */
export function laneCentreX(scenario: Scenario, lane: number): number {
  const { lanesWith, lanesAgainst, laneWidth } = scenario.road;
  const res = scenario.road.reservation ?? 0;
  // Our carriageway sits to the left of the centre line (x < 0).
  const ourLeftEdge = -(lanesWith * laneWidth) - (lanesAgainst > 0 ? res / 2 : 0);
  return ourLeftEdge + laneWidth * (lane + 0.5);
}

/** Integrates the camera's speed keyframes to get distance travelled at time t (ms). */
export function egoZ(scenario: Scenario, t: number): number {
  const ks = scenario.egoSpeed;
  if (ks.length === 0) return 0;
  let z = 0;
  let prevT = 0;
  let prevV = ks[0].v;
  for (const k of ks) {
    if (k.t <= prevT) {
      prevV = k.v;
      continue;
    }
    const end = Math.min(t, k.t);
    if (end > prevT) {
      // Linear change in speed between keyframes: average speed over the slice.
      const frac = (end - prevT) / (k.t - prevT);
      const vEnd = prevV + (k.v - prevV) * frac;
      z += ((prevV + vEnd) / 2) * ((end - prevT) / 1000);
    }
    if (t <= k.t) return z;
    prevT = k.t;
    prevV = k.v;
  }
  return z + prevV * ((t - prevT) / 1000);
}

export function sampleKeyframes(path: Keyframe[], t: number): { x: number; z: number; moving: boolean; dx: number; dz: number } {
  if (path.length === 0) return { x: 0, z: 0, moving: false, dx: 0, dz: 0 };
  if (t <= path[0].t) return { x: path[0].x, z: path[0].z, moving: false, dx: 0, dz: 0 };
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    if (t <= b.t) {
      const f = (t - a.t) / Math.max(1, b.t - a.t);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      return { x: a.x + dx * f, z: a.z + dz * f, moving: Math.abs(dx) + Math.abs(dz) > 0.01, dx, dz };
    }
  }
  const last = path[path.length - 1];
  return { x: last.x, z: last.z, moving: false, dx: 0, dz: 0 };
}

export function stateAt<T extends { t: number }>(changes: T[] | undefined, t: number): T | undefined {
  if (!changes) return undefined;
  let current: T | undefined;
  for (const c of changes) {
    if (c.t <= t) current = c;
    else break;
  }
  return current;
}
