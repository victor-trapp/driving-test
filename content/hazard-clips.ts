import type { HazardClip, Scenery } from "@shared/scenario";

// Original animated practice clips. They're drawn by the app, not filmed, and are not
// DVSA footage. Timings are in milliseconds. Each clip's scoring window starts when the
// hazard begins to develop and ends when you'd have run out of time to react calmly.

const LICENCE = "Original animated practice scenario. Not official DVSA footage.";

const houses = (side: "left" | "right", z: number, length: number, color?: string): Scenery => ({ kind: "house", side, z, length, color });
const shops = (side: "left" | "right", z: number, length: number): Scenery => ({ kind: "shop", side, z, length });
const hedge = (side: "left" | "right", z: number, length: number): Scenery => ({ kind: "hedge", side, z, length });
const lamps = (side: "left" | "right", from: number, to: number, every: number): Scenery[] =>
  Array.from({ length: Math.floor((to - from) / every) + 1 }, (_, i) => ({ kind: "lamp" as const, side, z: from + i * every }));
const trees = (side: "left" | "right", zs: number[], offset = 3): Scenery[] => zs.map((z) => ({ kind: "tree" as const, side, z, offset }));
const parked = (side: "left" | "right", zs: number[], colors: string[] = ["#5b6770", "#8a1c1c", "#d9d6cf", "#1f3b5c", "#2f2f2f", "#6b5a3e"]): Scenery[] =>
  zs.map((z, i) => ({ kind: "parkedCar" as const, side, z, color: colors[i % colors.length] }));

const oncoming = (id: string, x: number, zStart: number, tStart: number, speed: number, color: string, kind: "car" | "van" | "bus" = "car") => ({
  id,
  kind,
  color,
  path: [
    { t: tStart, x, z: zStart },
    { t: tStart + 30000, x, z: zStart - speed * 30 },
  ],
});

export const HAZARD_CLIPS: HazardClip[] = [
  {
    id: "clip-school-run",
    title: "School run",
    description: "A residential street near a primary school, with cars parked along the left.",
    kind: "animated",
    durationMs: 28000,
    licence: LICENCE,
    official: false,
    hazards: [
      { id: "child", startMs: 12000, endMs: 15000, label: "Child runs out after a ball", explanation: "The ball rolling out from between the parked cars was the clue. A child chased it into the road a moment later." },
    ],
    scenario: {
      environment: "residential",
      time: "day",
      weather: "clear",
      road: { lanesWith: 1, lanesAgainst: 1, laneWidth: 3.3, centreLine: "none", pavement: true },
      egoLane: 0,
      // Parked cars fill the left side, so the camera car drives near the middle.
      egoOffset: [{ t: 0, dx: 1.6 }],
      egoSpeed: [
        { t: 0, v: 9 }, { t: 12800, v: 9 }, { t: 15500, v: 0 }, { t: 19500, v: 0 }, { t: 23000, v: 9 }, { t: 28000, v: 9 },
      ],
      actors: [
        { id: "ball", kind: "ball", color: "#e94f1d", path: [{ t: 0, x: -4.6, z: 131 }, { t: 12000, x: -4.6, z: 131 }, { t: 13200, x: -1.2, z: 131.5 }, { t: 14500, x: 1.8, z: 132 }, { t: 16000, x: 4.4, z: 132.5 }] },
        { id: "child", kind: "child", color: "#2c6fbb", path: [{ t: 0, x: -5.3, z: 130 }, { t: 12700, x: -5.3, z: 130 }, { t: 14100, x: -1.5, z: 130.6 }, { t: 17200, x: -1.5, z: 130.6 }, { t: 18800, x: -5.3, z: 130.2 }], facing: "right" },
        { id: "walker", kind: "pedestrian", color: "#7a4b8c", path: [{ t: 0, x: 5.2, z: 95 }, { t: 28000, x: 5.2, z: 60 }], facing: "against" },
        oncoming("on1", 1.65, 260, 2000, 8, "#c9c4b8"),
      ],
      scenery: [
        houses("left", 5, 320, "#b9785a"),
        houses("right", 5, 320, "#c8b49a"),
        ...trees("right", [55, 140, 230], 2.2),
        ...lamps("left", 20, 300, 35),
        { kind: "sign", side: "left", z: 32, signId: "w-children" },
        ...parked("left", [40, 47, 54, 68, 75, 82, 96, 103, 117, 124, 137, 144, 158, 165, 172, 186, 193, 207, 214, 228]),
        ...parked("right", [70, 77, 110, 180, 187]),
      ],
    },
  },
  {
    id: "clip-bus-stop",
    title: "Bus stop on a town road",
    description: "A busy town road with a bus waiting at a stop on the left.",
    kind: "animated",
    durationMs: 30000,
    licence: LICENCE,
    official: false,
    hazards: [
      { id: "pedestrian", startMs: 12000, endMs: 15000, label: "Pedestrian steps out in front of the bus", explanation: "Someone who'd just got off walked out from in front of the bus, where you couldn't see them until the last moment. The bus was also signalling to pull away." },
    ],
    scenario: {
      environment: "town",
      time: "day",
      weather: "clear",
      road: { lanesWith: 1, lanesAgainst: 1, laneWidth: 3.5, centreLine: "broken", pavement: true },
      egoLane: 0,
      egoSpeed: [
        { t: 0, v: 11 }, { t: 11000, v: 11 }, { t: 14500, v: 0 }, { t: 19500, v: 0 }, { t: 23500, v: 9 }, { t: 30000, v: 9 },
      ],
      actors: [
        {
          id: "bus", kind: "bus", color: "#c8102e", facing: "with",
          path: [{ t: 0, x: -2.2, z: 165 }, { t: 17500, x: -2.2, z: 165 }, { t: 20500, x: -1.75, z: 178 }, { t: 30000, x: -1.75, z: 250 }],
          indicator: [{ t: 8000, side: "right" }, { t: 21000, side: null }],
        },
        { id: "ped", kind: "pedestrian", color: "#33475b", path: [{ t: 0, x: -4.7, z: 173 }, { t: 12000, x: -4.7, z: 173 }, { t: 13000, x: -3.0, z: 173 }, { t: 16500, x: 3.0, z: 173.5 }, { t: 18000, x: 5.0, z: 174 }], facing: "right" },
        { id: "shopper", kind: "pedestrian", color: "#a0522d", path: [{ t: 0, x: -5.3, z: 120 }, { t: 30000, x: -5.3, z: 150 }], facing: "with" },
        oncoming("on1", 1.75, 300, 0, 12, "#3d5a80"),
        oncoming("on2", 1.75, 330, 9000, 11, "#e0e0e0", "van"),
        oncoming("on3", 1.75, 340, 17000, 12, "#2b2d42"),
      ],
      scenery: [
        shops("left", 10, 300),
        shops("right", 10, 300),
        { kind: "busStop", side: "left", z: 162 },
        ...lamps("left", 30, 300, 30),
        ...lamps("right", 45, 300, 30),
      ],
    },
  },
  {
    id: "clip-country-horse",
    title: "Horse rider on a country lane",
    description: "A narrow country road between hedges. A horse rider is ahead and there's oncoming traffic.",
    kind: "animated",
    durationMs: 28000,
    licence: LICENCE,
    official: false,
    hazards: [
      { id: "horse", startMs: 4000, endMs: 8000, label: "Closing on a horse rider", explanation: "You were catching up with the horse quickly and a car was coming the other way, so there wasn't room to pass with 2 metres. Slow to 10 mph or less and wait." },
    ],
    scenario: {
      environment: "country",
      time: "day",
      weather: "clear",
      road: { lanesWith: 1, lanesAgainst: 1, laneWidth: 3.0, centreLine: "broken", pavement: false },
      egoLane: 0,
      egoOffset: [{ t: 0, dx: 0 }, { t: 15000, dx: 0 }, { t: 17000, dx: 2.8 }, { t: 23500, dx: 2.8 }, { t: 25500, dx: 0 }],
      egoSpeed: [
        { t: 0, v: 15 }, { t: 5500, v: 15 }, { t: 9000, v: 4 }, { t: 13000, v: 2 }, { t: 14000, v: 4.5 }, { t: 21000, v: 4.5 }, { t: 25000, v: 12 }, { t: 28000, v: 12 },
      ],
      actors: [
        { id: "horse", kind: "horse", color: "#7b4a2a", path: [{ t: 0, x: -2.1, z: 120 }, { t: 28000, x: -2.1, z: 176 }] },
        { id: "on1", kind: "car", color: "#4a6fa5", path: [{ t: 0, x: 1.5, z: 420 }, { t: 14000, x: 1.5, z: 136 }, { t: 18000, x: 1.5, z: 55 }] },
      ],
      scenery: [
        hedge("left", 0, 400),
        hedge("right", 0, 400),
        ...trees("left", [60, 150, 260], 2.5),
        ...trees("right", [30, 110, 200, 330], 2.5),
        { kind: "sign", side: "left", z: 40, signId: "w-horses" },
      ],
    },
  },
  {
    id: "clip-emerging-car",
    title: "Car pulling out of a side road",
    description: "A suburban road with a side road joining from the left.",
    kind: "animated",
    durationMs: 26000,
    licence: LICENCE,
    official: false,
    hazards: [
      { id: "emerging", startMs: 9800, endMs: 12800, label: "Car pulls out from the left", explanation: "The car waiting at the side road started to creep forward and then pulled out in front of you. Watching its front wheels and movement gave you an early warning." },
    ],
    scenario: {
      environment: "residential",
      time: "day",
      weather: "clear",
      road: { lanesWith: 1, lanesAgainst: 1, laneWidth: 3.3, centreLine: "broken", pavement: true },
      egoLane: 0,
      sideRoads: [{ z: 160, side: "left", width: 9 }],
      egoSpeed: [{ t: 0, v: 12 }, { t: 10300, v: 12 }, { t: 13000, v: 4 }, { t: 16000, v: 7 }, { t: 26000, v: 11 }],
      actors: [
        { id: "car", kind: "car", color: "#2d6a4f", facing: "right", path: [{ t: 0, x: -9, z: 169 }, { t: 9800, x: -9, z: 169 }, { t: 11300, x: -5.5, z: 169.5 }, { t: 12800, x: -1.65, z: 173 }, { t: 14500, x: -1.65, z: 183 }, { t: 26000, x: -1.65, z: 285 }] },
        oncoming("on1", 1.65, 250, 0, 11, "#b5b5b5"),
        oncoming("on2", 1.65, 330, 12000, 12, "#7d1d3f"),
      ],
      scenery: [
        houses("left", 10, 300, "#c28b6c"),
        houses("right", 10, 300, "#d6c7ac"),
        ...trees("left", [40, 120, 230], 2),
        ...trees("right", [80, 180, 260], 2),
        ...lamps("right", 20, 300, 40),
      ],
    },
  },
  {
    id: "clip-door-cyclist",
    title: "Cyclist and a car door",
    description: "Following a cyclist along a town street lined with parked cars.",
    kind: "animated",
    durationMs: 28000,
    licence: LICENCE,
    official: false,
    hazards: [
      { id: "door", startMs: 10800, endMs: 14000, label: "Car door opens, cyclist moves out", explanation: "A door opened on a parked car ahead and the cyclist swerved out to avoid it. Hanging back gave them room." },
    ],
    scenario: {
      environment: "town",
      time: "day",
      weather: "clear",
      road: { lanesWith: 1, lanesAgainst: 1, laneWidth: 3.4, centreLine: "broken", pavement: true },
      egoLane: 0,
      egoOffset: [{ t: 0, dx: 1.5 }, { t: 21000, dx: 1.5 }, { t: 23000, dx: 3.4 }, { t: 28000, dx: 3.4 }],
      egoSpeed: [{ t: 0, v: 10 }, { t: 5500, v: 10 }, { t: 8000, v: 5 }, { t: 11000, v: 5 }, { t: 12500, v: 2.5 }, { t: 15500, v: 5 }, { t: 22000, v: 9 }, { t: 28000, v: 9 }],
      actors: [
        { id: "cyclist", kind: "cyclist", color: "#f2b632", path: [{ t: 0, x: -1.0, z: 50 }, { t: 12200, x: -1.0, z: 111 }, { t: 13200, x: -0.1, z: 116 }, { t: 15500, x: -0.1, z: 127.5 }, { t: 16800, x: -1.0, z: 134 }, { t: 28000, x: -1.0, z: 190 }] },
        { id: "doorcar", kind: "car", color: "#6c757d", facing: "with", doorOpenAt: 10800, path: [{ t: 0, x: -2.5, z: 128 }] },
      ],
      scenery: [
        shops("left", 10, 260),
        houses("right", 10, 260, "#bfa58a"),
        ...lamps("left", 25, 260, 30),
        ...parked("left", [62, 69, 82, 89, 96, 109, 116, 135, 142, 156, 163, 170, 184, 191]),
      ],
    },
  },
  {
    id: "clip-motorway-lorry",
    title: "Lorry changing lanes",
    description: "A three-lane motorway. You're in the middle lane, gaining on a lorry in the left lane.",
    kind: "animated",
    durationMs: 25000,
    licence: LICENCE,
    official: false,
    hazards: [
      { id: "lorry", startMs: 7500, endMs: 11500, label: "Lorry signals and moves into your lane", explanation: "The lorry's right indicator came on as it caught up with slower traffic, then it moved out. Easing off early let it in safely." },
    ],
    scenario: {
      environment: "motorway",
      time: "day",
      weather: "clear",
      road: { lanesWith: 3, lanesAgainst: 3, laneWidth: 3.65, reservation: 3, centreLine: "none", hardShoulder: true, pavement: false },
      egoLane: 1,
      egoSpeed: [{ t: 0, v: 31 }, { t: 10500, v: 31 }, { t: 13500, v: 24 }, { t: 20000, v: 24 }, { t: 25000, v: 29 }],
      actors: [
        { id: "lorry", kind: "lorry", color: "#e8e8e8", path: [{ t: 0, x: -10.625, z: 120 }, { t: 10000, x: -10.625, z: 370 }, { t: 13000, x: -6.975, z: 445 }, { t: 25000, x: -6.975, z: 745 }], indicator: [{ t: 7500, side: "right" }, { t: 13500, side: null }] },
        { id: "slow", kind: "van", color: "#f4f1de", path: [{ t: 0, x: -10.625, z: 230 }, { t: 25000, x: -10.625, z: 755 }] },
        { id: "fast", kind: "car", color: "#14213d", path: [{ t: 0, x: -3.325, z: 20 }, { t: 25000, x: -3.325, z: 870 }] },
        { id: "other1", kind: "car", color: "#9b2226", path: [{ t: 0, x: 3.2, z: 900 }, { t: 25000, x: 3.2, z: 150 }] },
        { id: "other2", kind: "lorry", color: "#dad7cd", path: [{ t: 0, x: 6.9, z: 700 }, { t: 25000, x: 6.9, z: 75 }] },
      ],
      scenery: [
        { kind: "barrier", side: "centre", z: 0, length: 1000 },
        ...trees("left", [80, 200, 330, 480, 610, 760, 880], 6),
        ...trees("right", [150, 420, 700], 4),
        { kind: "sign", side: "left", z: 520, signId: "mw-countdown-300", offset: 1.5 },
      ],
    },
  },
  {
    id: "clip-queue-ahead",
    title: "Traffic slowing on a dual carriageway",
    description: "A fast dual carriageway in light traffic.",
    kind: "animated",
    durationMs: 24000,
    licence: LICENCE,
    official: false,
    hazards: [
      { id: "queue", startMs: 7000, endMs: 10500, label: "Brake lights ahead", explanation: "The cars ahead braked hard as they reached a queue. The brake lights were your cue to slow down before the gap closed." },
    ],
    scenario: {
      environment: "dual",
      time: "day",
      weather: "clear",
      road: { lanesWith: 2, lanesAgainst: 2, laneWidth: 3.65, reservation: 2.5, centreLine: "none", pavement: false },
      egoLane: 0,
      egoSpeed: [{ t: 0, v: 27 }, { t: 7800, v: 27 }, { t: 12000, v: 6 }, { t: 16000, v: 4 }, { t: 24000, v: 4 }],
      actors: [
        { id: "a", kind: "car", color: "#3a5a40", path: [{ t: 0, x: -6.725, z: 43 }, { t: 7000, x: -6.725, z: 232 }, { t: 11000, x: -6.725, z: 296 }, { t: 24000, x: -6.725, z: 348 }], brake: [{ t: 7000, on: true }] },
        { id: "b", kind: "van", color: "#e9ecef", path: [{ t: 0, x: -6.725, z: 57 }, { t: 6800, x: -6.725, z: 241 }, { t: 10800, x: -6.725, z: 305 }, { t: 24000, x: -6.725, z: 358 }], brake: [{ t: 6800, on: true }] },
        { id: "c", kind: "car", color: "#6a040f", path: [{ t: 0, x: -3.075, z: 30 }, { t: 7400, x: -3.075, z: 230 }, { t: 11400, x: -3.075, z: 294 }, { t: 24000, x: -3.075, z: 344 }], brake: [{ t: 7400, on: true }] },
        { id: "d", kind: "lorry", color: "#f8f9fa", path: [{ t: 0, x: -6.725, z: 75 }, { t: 6500, x: -6.725, z: 250 }, { t: 10500, x: -6.725, z: 314 }, { t: 24000, x: -6.725, z: 368 }], brake: [{ t: 6500, on: true }] },
        { id: "o1", kind: "car", color: "#adb5bd", path: [{ t: 0, x: 3.0, z: 700 }, { t: 24000, x: 3.0, z: 50 }] },
      ],
      scenery: [
        { kind: "barrier", side: "centre", z: 0, length: 800 },
        hedge("left", 0, 800),
        ...trees("left", [60, 170, 290, 400, 520], 3),
        ...trees("right", [100, 260, 440], 3),
      ],
    },
  },
  {
    id: "clip-night-pedestrian",
    title: "Pedestrian at night",
    description: "A residential street after dark, lit by street lights.",
    kind: "animated",
    durationMs: 26000,
    licence: LICENCE,
    official: false,
    hazards: [
      { id: "pedestrian", startMs: 10800, endMs: 13800, label: "Pedestrian crosses in dark clothing", explanation: "Someone in dark clothes stepped off the kerb on the right between street lights. They're much harder to see at night, so it pays to keep your speed down." },
    ],
    scenario: {
      environment: "residential",
      time: "night",
      weather: "clear",
      road: { lanesWith: 1, lanesAgainst: 1, laneWidth: 3.3, centreLine: "broken", pavement: true },
      egoLane: 0,
      egoSpeed: [{ t: 0, v: 12 }, { t: 11500, v: 12 }, { t: 14500, v: 1 }, { t: 17000, v: 1 }, { t: 20000, v: 10 }, { t: 26000, v: 10 }],
      actors: [
        { id: "ped", kind: "pedestrian", color: "#454b55", path: [{ t: 0, x: 5.2, z: 165 }, { t: 10800, x: 5.2, z: 165 }, { t: 12300, x: 1.5, z: 165.5 }, { t: 15800, x: -4.8, z: 166 }, { t: 17000, x: -5.5, z: 166 }], facing: "left" },
        oncoming("on1", 1.65, 320, 1500, 11, "#cfcfcf"),
      ],
      scenery: [
        houses("left", 10, 300, "#8d6e5a"),
        houses("right", 10, 300, "#9c8f7a"),
        ...lamps("left", 15, 300, 36),
        ...lamps("right", 33, 300, 36),
        ...parked("right", [70, 77, 120, 127, 210]),
      ],
    },
  },
  {
    id: "clip-tractor-gateway",
    title: "Tractor from a field",
    description: "A rural road with hedges and field gateways.",
    kind: "animated",
    durationMs: 26000,
    licence: LICENCE,
    official: false,
    hazards: [
      { id: "tractor", startMs: 9000, endMs: 12500, label: "Tractor pulls out of a gateway", explanation: "A tractor with a flashing amber beacon pulled out of a field on the left. Farm vehicles often appear from gaps in hedges with little warning." },
    ],
    scenario: {
      environment: "country",
      time: "day",
      weather: "clear",
      road: { lanesWith: 1, lanesAgainst: 1, laneWidth: 3.0, centreLine: "broken", pavement: false },
      egoLane: 0,
      sideRoads: [{ z: 184, side: "left", width: 7 }],
      egoSpeed: [{ t: 0, v: 15 }, { t: 9600, v: 15 }, { t: 12600, v: 5 }, { t: 20000, v: 5.5 }, { t: 26000, v: 6 }],
      actors: [
        { id: "tractor", kind: "tractor", color: "#2b7a3d", facing: "right", path: [{ t: 0, x: -8, z: 188 }, { t: 9000, x: -8, z: 188 }, { t: 11500, x: -4, z: 189 }, { t: 13500, x: -1.5, z: 193 }, { t: 16000, x: -1.5, z: 206 }, { t: 26000, x: -1.5, z: 261 }] },
        oncoming("on1", 1.5, 360, 3000, 16, "#495057"),
      ],
      scenery: [
        hedge("left", 0, 400),
        hedge("right", 0, 400),
        ...trees("left", [45, 120, 250, 320], 2.5),
        ...trees("right", [80, 170, 290], 2.5),
      ],
    },
  },
  {
    id: "clip-high-street",
    title: "High street",
    description: "A town centre street with side roads and a zebra crossing. This clip has two developing hazards.",
    kind: "animated",
    durationMs: 33000,
    licence: LICENCE,
    official: false,
    hazards: [
      { id: "emerging", startMs: 5800, endMs: 8800, label: "Car pulls out from a side road", explanation: "A car came out of the side road on the left and pulled into your lane ahead." },
      { id: "zebra", startMs: 19800, endMs: 22800, label: "Pedestrian steps onto the zebra crossing", explanation: "The person waiting at the zebra crossing started to cross. You must give way once they're on the crossing, and should give way to people waiting." },
    ],
    scenario: {
      environment: "town",
      time: "day",
      weather: "clear",
      road: { lanesWith: 1, lanesAgainst: 1, laneWidth: 3.4, centreLine: "broken", pavement: true },
      egoLane: 0,
      sideRoads: [{ z: 96, side: "left", width: 8 }, { z: 148, side: "left", width: 8 }],
      egoSpeed: [{ t: 0, v: 10 }, { t: 6400, v: 10 }, { t: 8400, v: 7 }, { t: 16000, v: 7 }, { t: 18000, v: 10 }, { t: 20800, v: 10 }, { t: 23800, v: 0 }, { t: 27500, v: 0 }, { t: 30500, v: 8 }, { t: 33000, v: 8 }],
      actors: [
        { id: "car", kind: "car", color: "#bc6c25", facing: "right", path: [{ t: 0, x: -8.5, z: 100 }, { t: 5800, x: -8.5, z: 100 }, { t: 7000, x: -5, z: 100.5 }, { t: 8600, x: -1.7, z: 104 }, { t: 9000, x: -1.7, z: 107 }, { t: 14800, x: -1.7, z: 147.6 }, { t: 16200, x: -5, z: 151 }, { t: 17500, x: -10, z: 152 }], indicator: [{ t: 12500, side: "left" }] },
        { id: "zebraped", kind: "pedestrian", color: "#7f5539", facing: "right", path: [{ t: 0, x: -4.8, z: 205 }, { t: 20000, x: -4.8, z: 205 }, { t: 21000, x: -3.4, z: 205 }, { t: 27000, x: 4.8, z: 205.2 }, { t: 28500, x: 5.5, z: 206 }] },
        { id: "w1", kind: "pedestrian", color: "#3d405b", path: [{ t: 0, x: 5.2, z: 60 }, { t: 33000, x: 5.2, z: 95 }], facing: "with" },
        { id: "w2", kind: "pedestrian", color: "#81b29a", path: [{ t: 0, x: -5.3, z: 170 }, { t: 33000, x: -5.3, z: 140 }], facing: "against" },
        oncoming("on1", 1.7, 280, 0, 10, "#264653"),
        oncoming("on2", 1.7, 320, 14000, 9, "#e9c46a", "van"),
      ],
      scenery: [
        shops("left", 5, 300),
        shops("right", 5, 300),
        { kind: "zebra", side: "centre", z: 205 },
        ...lamps("left", 20, 300, 32),
      ],
    },
  },
];

export function clipById(id: string): HazardClip | undefined {
  return HAZARD_CLIPS.find((c) => c.id === id);
}
