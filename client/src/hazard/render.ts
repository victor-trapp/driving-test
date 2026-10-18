// Draws one frame of an animated driving scenario onto a 2D canvas.
//
// It's a deliberately simple pseudo-3D renderer: a straight road, a camera at driver
// eye height, and everything else drawn as flat shapes scaled by distance. Objects are
// painter-sorted by depth. World units are metres; see shared/scenario.ts for axes.
import { egoZ, laneCentreX, sampleKeyframes, stateAt, type Actor, type Scenario, type Scenery } from "@shared/scenario";

interface Cam {
  x: number;
  z: number;
  h: number; // eye height
  f: number; // focal length in px
  hy: number; // horizon y
  w: number;
  hh: number;
}

interface Pt {
  x: number;
  y: number;
  s: number; // px per metre at this depth
}

type Draw = { d: number; fn: () => void };
type Light = { x: number; y: number; r: number; color: string; strength: number };

const NEAR = 0.6;
const FAR = 420;

function proj(c: Cam, x: number, y: number, z: number): Pt | null {
  const dz = z - c.z;
  if (dz < NEAR) return null;
  const s = c.f / dz;
  return { x: c.w / 2 + (x - c.x) * s, y: c.hy + (c.h - y) * s, s };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function egoOffsetAt(s: Scenario, t: number): number {
  const ks = s.egoOffset;
  if (!ks || ks.length === 0) return 0;
  if (t <= ks[0].t) return ks[0].dx;
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i].t) {
      const a = ks[i - 1];
      const b = ks[i];
      const f = (t - a.t) / Math.max(1, b.t - a.t);
      // ease in and out so lateral moves look like steering, not sliding
      const e = f * f * (3 - 2 * f);
      return lerp(a.dx, b.dx, e);
    }
  }
  return ks[ks.length - 1].dx;
}

function geometry(s: Scenario) {
  const lw = s.road.laneWidth;
  const ourLeft = laneCentreX(s, 0) - lw / 2;
  const ourRight = ourLeft + s.road.lanesWith * lw;
  const res = s.road.lanesAgainst > 0 ? (s.road.reservation ?? 0) : 0;
  const oppLeft = ourRight + res;
  const oppRight = oppLeft + s.road.lanesAgainst * lw;
  const hs = s.road.hardShoulder ? 3.3 : 0;
  const roadLeft = ourLeft - hs;
  const roadRight = s.road.lanesAgainst > 0 ? oppRight + hs : ourRight;
  const pave = s.road.pavement ? 2.4 : 0;
  return { lw, ourLeft, ourRight, oppLeft, oppRight, res, hs, roadLeft, roadRight, pave };
}


const PALETTE = {
  day: { skyTop: "#8fb6e0", skyBottom: "#dfe8ef", haze: "rgba(225,232,238,0.55)" },
  dusk: { skyTop: "#5b6a9b", skyBottom: "#efb08a", haze: "rgba(230,180,150,0.45)" },
  night: { skyTop: "#04060c", skyBottom: "#141a28", haze: "rgba(20,26,40,0.4)" },
};

const GROUND: Record<Scenario["environment"], string> = {
  residential: "#7d9a5c",
  town: "#9d998f",
  country: "#6f8f4f",
  motorway: "#6b8a4c",
  dual: "#6f8f4f",
};

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

// Deterministic pseudo-random per scenery item so houses don't flicker between frames.
function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export interface RenderOptions {
  signImages?: Map<string, HTMLImageElement>;
}

export function renderFrame(ctx: CanvasRenderingContext2D, s: Scenario, t: number, w: number, h: number, opts: RenderOptions = {}) {
  const g = geometry(s);
  const night = s.time === "night";
  const cam: Cam = {
    x: laneCentreX(s, s.egoLane) + egoOffsetAt(s, t),
    z: egoZ(s, t),
    h: 1.25,
    f: w * 0.95,
    hy: h * 0.44,
    w,
    hh: h,
  };
  const pal = PALETTE[s.time];
  const blink = Math.floor(t / 380) % 2 === 0;
  const lights: Light[] = [];

  // ---- Sky and ground ---------------------------------------------------------------
  const sky = ctx.createLinearGradient(0, 0, 0, cam.hy);
  sky.addColorStop(0, pal.skyTop);
  sky.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, cam.hy + 1);
  ctx.fillStyle = night ? "#10140f" : GROUND[s.environment];
  ctx.fillRect(0, cam.hy, w, h - cam.hy);

  // A hair past the near plane so float error never makes proj() return null for clipped geometry.
  const zNear = cam.z + NEAR + 0.01;
  const zFar = cam.z + FAR;

  const quad = (x1: number, x2: number, z1: number, z2: number, color: string, y = 0) => {
    const a = Math.max(z1, zNear);
    const b = Math.min(z2, zFar);
    if (b <= a) return;
    const p1 = proj(cam, x1, y, a)!;
    const p2 = proj(cam, x2, y, a)!;
    const p3 = proj(cam, x2, y, b)!;
    const p4 = proj(cam, x1, y, b)!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fill();
  };

  const sideGaps = (side: "left" | "right") => (s.sideRoads ?? []).filter((r) => r.side === side).map((r) => [r.z - 1.5, r.z + r.width + 1.5] as const);
  const inGap = (side: "left" | "right", z1: number, z2: number) => sideGaps(side).some(([a, b]) => z2 > a && z1 < b);

  // ---- Road surface and markings (flat, drawn first) -------------------------------
  // Side roads
  for (const r of s.sideRoads ?? []) {
    const edge = r.side === "left" ? g.roadLeft : g.roadRight;
    const x1 = r.side === "left" ? edge - 40 : edge;
    const x2 = r.side === "left" ? edge : edge + 40;
    quad(x1, x2, r.z, r.z + r.width, s.environment === "country" ? "#6b6a5c" : "#53585e");
  }
  // Pavements, with gaps for side roads
  if (g.pave > 0) {
    for (const side of ["left", "right"] as const) {
      const x1 = side === "left" ? g.roadLeft - g.pave : g.roadRight;
      const x2 = side === "left" ? g.roadLeft : g.roadRight + g.pave;
      let z = Math.floor(zNear / 10) * 10;
      for (; z < zFar; z += 10) {
        if (inGap(side, z, z + 10)) continue;
        quad(x1, x2, z, z + 10, night ? "#4a4a46" : "#b9b4a8");
        const kx1 = side === "left" ? g.roadLeft - 0.18 : g.roadRight;
        quad(kx1, kx1 + 0.18, z, z + 10, night ? "#5a5a56" : "#d4cfc4");
      }
    }
  }
  // Tarmac
  quad(g.roadLeft, g.roadRight, zNear, zFar, night ? "#26292d" : "#53585e");
  if (g.res > 0) quad(g.ourRight, g.oppLeft, zNear, zFar, night ? "#1d2420" : "#7a7f72");

  const paint = night ? "#c9c9c4" : "#f2f2ee";
  const dashes = (x: number, len: number, gap: number, width = 0.12, color = paint) => {
    const period = len + gap;
    let z = Math.floor(zNear / period) * period;
    for (; z < Math.min(zFar, cam.z + 160); z += period) quad(x - width / 2, x + width / 2, z, z + len, color);
  };
  const solid = (x: number, width = 0.15, color = paint) => quad(x - width / 2, x + width / 2, zNear, Math.min(zFar, cam.z + 220), color);

  // Lane lines within each carriageway
  for (let i = 1; i < s.road.lanesWith; i++) dashes(g.ourLeft + i * g.lw, s.environment === "motorway" || s.environment === "dual" ? 2 : 3, s.environment === "motorway" || s.environment === "dual" ? 7 : 6);
  for (let i = 1; i < s.road.lanesAgainst; i++) dashes(g.oppLeft + i * g.lw, 2, 7);
  if (g.res === 0 && s.road.lanesAgainst > 0) {
    if (s.road.centreLine === "broken") dashes(g.ourRight, 3, 6);
    if (s.road.centreLine === "hazard") dashes(g.ourRight, 6, 2);
  }
  if (s.environment === "motorway" || s.environment === "dual") {
    solid(g.ourLeft, 0.2);
    solid(g.ourRight - 0.2, 0.15);
    if (s.road.lanesAgainst > 0) {
      solid(g.oppLeft + 0.2, 0.15);
      solid(g.oppRight, 0.2);
    }
    // reflective studs: red on the left edge, amber by the central reservation
    let z = Math.floor(zNear / 18) * 18;
    for (; z < cam.z + 120; z += 18) {
      quad(g.ourLeft - 0.08, g.ourLeft + 0.08, z, z + 0.25, "#d02a2a");
      quad(g.ourRight - 0.33, g.ourRight - 0.17, z, z + 0.25, "#f2a600");
    }
  } else if (s.environment === "country" && !s.road.pavement) {
    solid(g.roadLeft + 0.2, 0.1, night ? "#9a9a96" : "#e6e6e0");
    solid(g.roadRight - 0.2, 0.1, night ? "#9a9a96" : "#e6e6e0");
  }

  // Zebra crossings are flat paint too
  for (const sc of s.scenery) {
    if (sc.kind !== "zebra") continue;
    const stripes = Math.floor((g.roadRight - g.roadLeft) / 0.5);
    for (let i = 0; i < stripes; i += 2) quad(g.roadLeft + i * 0.5, g.roadLeft + (i + 1) * 0.5, sc.z - 1.25, sc.z + 1.25, paint);
  }

  // ---- Upright objects, depth sorted ---------------------------------------------------
  // Side walls (houses, hedges, barriers) can never sit between the camera and something
  // on the road, so they're drawn first in their own pass and objects always go on top.
  const walls: Draw[] = [];
  const draws: Draw[] = [];
  const pushWall = (z: number, fn: () => void) => {
    const d = z - cam.z;
    if (d > -15 && d < FAR) walls.push({ d, fn });
  };
  // Objects right beside the camera would be drawn huge; in a real car they'd be out of
  // view past the A-pillar, so skip them.
  const push = (z: number, fn: () => void, x?: number, nearLimit = 5) => {
    const d = z - cam.z;
    if (d <= NEAR || d >= FAR) return;
    if (x !== undefined && d < nearLimit && Math.abs(x - cam.x) > 1.1) return;
    draws.push({ d, fn });
  };

  const wall = (x: number, z1: number, z2: number, y1: number, y2: number, color: string) => {
    const a = Math.max(z1, zNear);
    const b = Math.min(z2, zFar);
    if (b <= a) return;
    const p1 = proj(cam, x, y1, a)!;
    const p2 = proj(cam, x, y2, a)!;
    const p3 = proj(cam, x, y2, b)!;
    const p4 = proj(cam, x, y1, b)!;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fill();
  };

  const sideBase = (side: Scenery["side"]) => (side === "left" ? g.roadLeft - g.pave : g.roadRight + g.pave);

  s.scenery.forEach((sc, idx) => {
    const sign = sc.side === "left" ? -1 : 1;
    switch (sc.kind) {
      case "house":
      case "shop": {
        const len = sc.length ?? 100;
        const unit = sc.kind === "house" ? 8.5 : 7;
        const x = sideBase(sc.side) + sign * (sc.offset ?? (sc.kind === "house" ? 3.5 : 0.3));
        for (let z = sc.z; z < sc.z + len; z += unit) {
          if (inGap(sc.side as "left" | "right", z, z + unit)) continue;
          const r = hash(idx * 1000 + Math.round(z));
          const hgt = sc.kind === "house" ? 6.5 + r * 1.2 : 7.5 + r * 2;
          const base = sc.color ?? (sc.kind === "shop" ? ["#8c6f5a", "#6e7c86", "#a48a6a", "#5f6b5a"][Math.floor(r * 4)] : "#b9785a");
          const col = night ? shade(base, -95) : shade(base, Math.round((r - 0.5) * 30));
          const zz = z;
          pushWall(zz + unit / 2, () => {
            wall(x, zz + 0.2, zz + unit - 0.2, 0, hgt, col);
            // roof edge
            wall(x, zz + 0.2, zz + unit - 0.2, hgt, hgt + 0.5, night ? "#1a1a1d" : "#4a3f3a");
            // windows
            const winCol = night ? (r > 0.45 ? "#d8b46a" : "#202530") : "#33404e";
            if (sc.kind === "shop") {
              wall(x - sign * 0.02, zz + 0.8, zz + unit - 0.8, 0.4, 2.6, night ? "#c7a560" : "#5f7486");
              wall(x - sign * 0.02, zz + 0.5, zz + unit - 0.5, 3.0, 3.6, ["#1d4f9c", "#9b2226", "#2b6a3f", "#c97b00"][Math.floor(r * 4)]);
              for (const wz of [1.5, unit - 2.7]) wall(x - sign * 0.02, zz + wz, zz + wz + 1.2, 4.5, 6, winCol);
            } else {
              wall(x - sign * 0.02, zz + 1.4, zz + 2.6, 1.0, 2.2, winCol);
              wall(x - sign * 0.02, zz + 4.4, zz + 5.6, 0.0, 2.1, night ? "#2a2018" : "#5a3d2c");
              for (const wz of [1.4, 4.6]) wall(x - sign * 0.02, zz + wz, zz + wz + 1.2, 3.6, 4.8, winCol);
            }
          });
        }
        break;
      }
      case "hedge":
      case "fence": {
        const len = sc.length ?? 100;
        const x = (sc.side === "left" ? g.roadLeft : g.roadRight) + sign * (sc.offset ?? 0.5);
        for (let z = Math.max(sc.z, Math.floor(zNear / 12) * 12); z < Math.min(sc.z + len, zFar); z += 12) {
          if (inGap(sc.side as "left" | "right", z, z + 12)) continue;
          const zz = z;
          const r = hash(idx * 31 + z);
          const hgt = sc.kind === "hedge" ? 1.2 + r * 0.25 : 1.1;
          const col = sc.kind === "hedge" ? (night ? "#0e140c" : shade("#4b6a37", Math.round((r - 0.5) * 18))) : night ? "#1a140f" : "#7a5a3a";
          pushWall(zz + 6, () => wall(x, zz, zz + 12.2, 0, hgt, col));
        }
        break;
      }
      case "tree": {
        const x = sideBase(sc.side) + sign * (sc.offset ?? 3);
        push(sc.z, () => {
          const p = proj(cam, x, 0, sc.z);
          if (!p) return;
          ctx.fillStyle = night ? "#0d0b09" : "#5a4330";
          ctx.fillRect(p.x - 0.18 * p.s, p.y - 3 * p.s, 0.36 * p.s, 3 * p.s);
          ctx.fillStyle = night ? "#0c130b" : "#4f7a3c";
          ctx.beginPath();
          ctx.arc(p.x, p.y - 4.6 * p.s, 2.4 * p.s, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = night ? "#101a0e" : "#5f8a48";
          ctx.beginPath();
          ctx.arc(p.x - 0.8 * p.s, p.y - 5.2 * p.s, 1.4 * p.s, 0, Math.PI * 2);
          ctx.fill();
        }, x);
        break;
      }
      case "lamp": {
        const x = (sc.side === "left" ? g.roadLeft - 0.5 : g.roadRight + 0.5) + (g.pave === 0 ? sign * 0.4 : 0);
        push(sc.z, () => {
          const p = proj(cam, x, 0, sc.z);
          const top = proj(cam, x - sign * 1.1, 6.2, sc.z);
          if (!p || !top) return;
          ctx.strokeStyle = night ? "#2a2c30" : "#5c6066";
          ctx.lineWidth = Math.max(1, 0.14 * p.s);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, top.y);
          ctx.lineTo(top.x, top.y);
          ctx.stroke();
          ctx.fillStyle = night ? "#ffe2a0" : "#d6d8da";
          ctx.fillRect(top.x - 0.3 * p.s, top.y, 0.6 * p.s, 0.18 * p.s);
          if (night) {
            lights.push({ x: top.x, y: top.y, r: 0.9 * p.s, color: "255,214,140", strength: 0.9 });
            const pool = proj(cam, x - sign * 1.4, 0, sc.z);
            if (pool) lights.push({ x: pool.x, y: pool.y, r: 5 * pool.s, color: "255,200,130", strength: 0.22 });
          }
        });
        break;
      }
      case "parkedCar": {
        const x = sc.side === "left" ? g.roadLeft + 1.05 : g.roadRight - 1.05;
        push(sc.z, () => {
          const p = proj(cam, x, 0, sc.z);
          if (p) drawCar(ctx, p, sc.color ?? "#6c757d", sc.side === "left" ? "rear" : "front", { night, lights, blink, parked: true });
        }, x, 7);
        break;
      }
      case "busStop": {
        const x = g.roadLeft - 1.5;
        push(sc.z, () => {
          const p = proj(cam, x, 0, sc.z);
          if (!p) return;
          ctx.fillStyle = night ? "rgba(90,110,130,0.5)" : "rgba(170,200,215,0.55)";
          ctx.fillRect(p.x - 1.4 * p.s, p.y - 2.4 * p.s, 1.6 * p.s, 2.4 * p.s);
          ctx.fillStyle = night ? "#1a1d22" : "#30343a";
          ctx.fillRect(p.x - 1.5 * p.s, p.y - 2.55 * p.s, 1.8 * p.s, 0.18 * p.s);
          const pole = proj(cam, g.roadLeft - 0.4, 0, sc.z + 4);
          if (pole) {
            ctx.fillStyle = "#444";
            ctx.fillRect(pole.x - 0.04 * pole.s, pole.y - 2.6 * pole.s, 0.08 * pole.s, 2.6 * pole.s);
            ctx.fillStyle = "#c8102e";
            ctx.beginPath();
            ctx.arc(pole.x, pole.y - 2.6 * pole.s, 0.32 * pole.s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.fillRect(pole.x - 0.25 * pole.s, pole.y - 2.67 * pole.s, 0.5 * pole.s, 0.14 * pole.s);
          }
        });
        break;
      }
      case "sign": {
        const x = sc.side === "left" ? g.roadLeft - 0.9 - (sc.offset ?? 0) : g.roadRight + 0.9 + (sc.offset ?? 0);
        const img = sc.signId ? opts.signImages?.get(sc.signId) : undefined;
        push(sc.z, () => {
          const p = proj(cam, x, 0, sc.z);
          if (!p) return;
          ctx.fillStyle = "#6a6e73";
          ctx.fillRect(p.x - 0.04 * p.s, p.y - 2.1 * p.s, 0.08 * p.s, 2.1 * p.s);
          const size = 0.95 * p.s;
          if (img && img.complete && img.naturalWidth > 0) {
            const ratio = img.naturalWidth / img.naturalHeight;
            const iw = ratio >= 1 ? size : size * ratio;
            const ih = ratio >= 1 ? size / ratio : size;
            if (night) ctx.globalAlpha = 0.75;
            ctx.drawImage(img, p.x - iw / 2, p.y - 2.1 * p.s - ih, iw, ih);
            ctx.globalAlpha = 1;
          }
        }, x);
        break;
      }
      case "zebra": {
        for (const bx of [g.roadLeft - 0.45, g.roadRight + 0.45]) {
          push(sc.z - 1.5, () => {
            const p = proj(cam, bx, 0, sc.z - 1.5);
            if (!p) return;
            for (let k = 0; k < 8; k++) {
              ctx.fillStyle = k % 2 ? "#f2f2ee" : "#111";
              ctx.fillRect(p.x - 0.05 * p.s, p.y - (k + 1) * 0.32 * p.s, 0.1 * p.s, 0.32 * p.s);
            }
            const on = Math.floor(t / 700) % 2 === 0;
            ctx.fillStyle = on ? "#ffb21a" : "#9a6a10";
            ctx.beginPath();
            ctx.arc(p.x, p.y - 2.75 * p.s, 0.2 * p.s, 0, Math.PI * 2);
            ctx.fill();
            if (on) lights.push({ x: p.x, y: p.y - 2.75 * p.s, r: 0.6 * p.s, color: "255,178,26", strength: night ? 0.9 : 0.4 });
          });
        }
        break;
      }
      case "barrier": {
        const x = (g.ourRight + g.oppLeft) / 2;
        for (let z = Math.floor(zNear / 15) * 15; z < Math.min(sc.z + (sc.length ?? 1000), zFar); z += 15) {
          const zz = z;
          pushWall(zz + 7.5, () => {
            wall(x, zz, zz + 15.1, 0.45, 0.8, night ? "#3a3d42" : "#a8adb3");
            wall(x, zz, zz + 15.1, 0, 0.45, night ? "#1a1d20" : "#6d7277");
          });
        }
        break;
      }
      case "gantry":
        break;
    }
  });

  for (const a of s.actors) {
    const st = sampleKeyframes(a.path, t);
    push(st.z, () => {
      const p = proj(cam, st.x, 0, st.z);
      if (!p) return;
      drawActor(ctx, a, p, st, t, { night, lights, blink });
    }, st.x, a.kind === "car" || a.kind === "van" ? 6 : 3);
  }

  // Soft haze where the road meets the sky, under the scenery so it doesn't band it.
  const haze = ctx.createLinearGradient(0, cam.hy - h * 0.03, 0, cam.hy + h * 0.05);
  haze.addColorStop(0, "rgba(0,0,0,0)");
  haze.addColorStop(0.5, pal.haze);
  haze.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = haze;
  ctx.fillRect(0, cam.hy - h * 0.03, w, h * 0.08);

  walls.sort((a, b) => b.d - a.d);
  for (const d of walls) d.fn();
  draws.sort((a, b) => b.d - a.d);
  for (const d of draws) d.fn();

  // ---- Night, weather, bonnet ------------------------------------------------------------

  if (night) {
    // Darken everything except a pool of headlight on the road ahead.
    const dark = ctx.createRadialGradient(w / 2, h * 0.78, 0, w / 2, h * 0.78, w * 0.5);
    dark.addColorStop(0, "rgba(4,6,12,0.04)");
    dark.addColorStop(0.45, "rgba(4,6,12,0.22)");
    dark.addColorStop(0.75, "rgba(4,6,12,0.7)");
    dark.addColorStop(1, "rgba(4,6,12,0.88)");
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    for (const l of lights) {
      l.r = Math.min(l.r, 60);
      const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, Math.max(2, l.r));
      gr.addColorStop(0, `rgba(${l.color},${l.strength})`);
      gr.addColorStop(1, `rgba(${l.color},0)`);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(l.x, l.y, Math.max(2, l.r), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  } else {
    // Daytime brake lights and indicators still get a little glow.
    ctx.globalCompositeOperation = "lighter";
    for (const l of lights) {
      if (l.color === "255,214,140" || l.color === "255,200,130") continue;
      const r = Math.min(l.r, 30);
      const gr = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, Math.max(2, r));
      gr.addColorStop(0, `rgba(${l.color},${l.strength * 0.5})`);
      gr.addColorStop(1, `rgba(${l.color},0)`);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(l.x, l.y, Math.max(2, r), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  if (s.weather === "rain") {
    ctx.strokeStyle = "rgba(220,230,240,0.35)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 120; i++) {
      const rx = (hash(i * 7.3) * w + t * 0.05 * (i % 3)) % w;
      const ry = (hash(i * 3.1) * h + t * 0.9) % h;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 3, ry + 14);
      ctx.stroke();
    }
  }

  drawBonnet(ctx, w, h, night);
}

function drawBonnet(ctx: CanvasRenderingContext2D, w: number, h: number, night: boolean) {
  ctx.fillStyle = night ? "#0b0d10" : "#1f2a3a";
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h * 0.95);
  ctx.quadraticCurveTo(w / 2, h * 0.875, w, h * 0.95);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = night ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.95);
  ctx.quadraticCurveTo(w / 2, h * 0.885, w * 0.92, h * 0.95);
  ctx.stroke();
}

interface ActorCtx {
  night: boolean;
  lights: Light[];
  blink: boolean;
  parked?: boolean;
}

function drawActor(ctx: CanvasRenderingContext2D, a: Actor, p: Pt, st: ReturnType<typeof sampleKeyframes>, t: number, c: ActorCtx) {
  let view: "rear" | "front" | "left" | "right";
  if (st.moving && Math.abs(st.dx) > Math.abs(st.dz) * 1.1) view = st.dx > 0 ? "right" : "left";
  else if (st.moving) view = st.dz >= 0 ? "rear" : "front";
  else view = a.facing === "against" ? "front" : a.facing === "left" ? "left" : a.facing === "right" ? "right" : "rear";

  const indicator = stateAt(a.indicator, t)?.side ?? null;
  const brake = stateAt(a.brake, t)?.on ?? false;
  const doorOpen = a.doorOpenAt !== undefined && t >= a.doorOpenAt;
  const color = a.color ?? "#6c757d";

  switch (a.kind) {
    case "car":
      drawCar(ctx, p, color, view, { ...c, indicator, brake, doorOpen: doorOpen ? Math.min(1, (t - a.doorOpenAt!) / 600) : 0 });
      break;
    case "van":
      drawBox(ctx, p, color, view, { w: 2.0, h: 2.3, len: 5.2 }, { ...c, indicator, brake });
      break;
    case "bus":
      drawBox(ctx, p, color, view, { w: 2.55, h: 3.1, len: 12, bus: true }, { ...c, indicator, brake });
      break;
    case "lorry":
      drawBox(ctx, p, color, view, { w: 2.55, h: 3.9, len: 13.6, lorry: true }, { ...c, indicator, brake });
      break;
    case "tractor":
      drawTractor(ctx, p, color, view, t, c);
      break;
    case "cyclist":
      drawCyclist(ctx, p, color, t, st.moving);
      break;
    case "pedestrian":
      drawPerson(ctx, p, color, 1.72, t, st.moving);
      break;
    case "child":
      drawPerson(ctx, p, color, 1.2, t, st.moving);
      break;
    case "horse":
      drawHorse(ctx, p, color, t);
      break;
    case "ball": {
      const bounce = st.moving ? Math.abs(Math.sin(t / 140)) * 0.25 : 0;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y - (0.12 + bounce) * p.s, Math.max(1.5, 0.12 * p.s), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(p.x - 0.03 * p.s, p.y - (0.2 + bounce) * p.s, 0.06 * p.s, 0.06 * p.s);
      break;
    }
    case "dog": {
      ctx.fillStyle = color;
      ctx.fillRect(p.x - 0.35 * p.s, p.y - 0.5 * p.s, 0.7 * p.s, 0.25 * p.s);
      ctx.fillRect(p.x - 0.3 * p.s, p.y - 0.25 * p.s, 0.06 * p.s, 0.25 * p.s);
      ctx.fillRect(p.x + 0.24 * p.s, p.y - 0.25 * p.s, 0.06 * p.s, 0.25 * p.s);
      ctx.fillRect(p.x + 0.3 * p.s, p.y - 0.65 * p.s, 0.18 * p.s, 0.18 * p.s);
      break;
    }
  }
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
  ctx.fill();
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  p: Pt,
  color: string,
  view: "rear" | "front" | "left" | "right",
  o: ActorCtx & { indicator?: "left" | "right" | null; brake?: boolean; doorOpen?: number },
) {
  const s = p.s;
  const body = o.night ? shade(color.startsWith("#") ? color : "#6c757d", -70) : color;
  if (view === "left" || view === "right") {
    const len = 4.3;
    const dir = view === "right" ? 1 : -1;
    const x0 = p.x - (len / 2) * s;
    ctx.fillStyle = body;
    rr(ctx, x0, p.y - 1.0 * s, len * s, 0.7 * s, 0.2 * s);
    ctx.beginPath();
    const cabFront = dir > 0 ? p.x + 0.9 * s : p.x - 0.9 * s;
    const cabBack = dir > 0 ? p.x - 1.5 * s : p.x + 1.5 * s;
    ctx.moveTo(cabBack, p.y - 1.0 * s);
    ctx.lineTo(cabBack + dir * 0.3 * s, p.y - 1.45 * s);
    ctx.lineTo(cabFront - dir * 0.5 * s, p.y - 1.45 * s);
    ctx.lineTo(cabFront, p.y - 1.0 * s);
    ctx.fill();
    ctx.fillStyle = o.night ? "#0c0f14" : "#2b3644";
    ctx.beginPath();
    ctx.moveTo(cabBack + dir * 0.15 * s, p.y - 1.03 * s);
    ctx.lineTo(cabBack + dir * 0.38 * s, p.y - 1.38 * s);
    ctx.lineTo(cabFront - dir * 0.55 * s, p.y - 1.38 * s);
    ctx.lineTo(cabFront - dir * 0.12 * s, p.y - 1.03 * s);
    ctx.fill();
    ctx.fillStyle = "#15171a";
    for (const wx of [-1.35, 1.35]) {
      ctx.beginPath();
      ctx.arc(p.x + wx * s, p.y - 0.33 * s, 0.33 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    if (o.indicator && o.blink) {
      ctx.fillStyle = "#ffae00";
      ctx.fillRect(p.x + dir * (len / 2 - 0.1) * s, p.y - 0.85 * s, 0.12 * s, 0.12 * s);
    }
    if (o.night) o.lights.push({ x: p.x + dir * (len / 2) * s, y: p.y - 0.75 * s, r: 1.2 * s, color: "255,250,230", strength: 0.8 });
    return;
  }

  const W = 1.8 * s;
  const left = p.x - W / 2;
  // wheels
  ctx.fillStyle = "#121315";
  ctx.fillRect(left + 0.05 * s, p.y - 0.36 * s, 0.32 * s, 0.36 * s);
  ctx.fillRect(left + W - 0.37 * s, p.y - 0.36 * s, 0.32 * s, 0.36 * s);
  // body and cabin
  ctx.fillStyle = body;
  rr(ctx, left, p.y - 0.95 * s, W, 0.66 * s, 0.14 * s);
  ctx.beginPath();
  ctx.moveTo(left + 0.12 * s, p.y - 0.94 * s);
  ctx.lineTo(left + 0.28 * s, p.y - 1.45 * s);
  ctx.lineTo(left + W - 0.28 * s, p.y - 1.45 * s);
  ctx.lineTo(left + W - 0.12 * s, p.y - 0.94 * s);
  ctx.fill();
  ctx.fillStyle = o.night ? "#0a0d12" : view === "rear" ? "#26313d" : "#35475a";
  ctx.beginPath();
  ctx.moveTo(left + 0.24 * s, p.y - 0.98 * s);
  ctx.lineTo(left + 0.36 * s, p.y - 1.38 * s);
  ctx.lineTo(left + W - 0.36 * s, p.y - 1.38 * s);
  ctx.lineTo(left + W - 0.24 * s, p.y - 0.98 * s);
  ctx.fill();
  // number plate: yellow at the back, white at the front
  ctx.fillStyle = view === "rear" ? "#f3c400" : "#f1f1ee";
  ctx.fillRect(p.x - 0.26 * s, p.y - 0.52 * s, 0.52 * s, 0.11 * s);

  if (view === "rear") {
    const tail = o.brake ? "#ff2a2a" : o.night ? "#c21818" : "#8f1717";
    ctx.fillStyle = tail;
    ctx.fillRect(left + 0.05 * s, p.y - 0.86 * s, 0.32 * s, 0.13 * s);
    ctx.fillRect(left + W - 0.37 * s, p.y - 0.86 * s, 0.32 * s, 0.13 * s);
    if (o.brake) ctx.fillRect(p.x - 0.25 * s, p.y - 1.42 * s, 0.5 * s, 0.05 * s);
    if (o.night || o.brake) {
      for (const lx of [left + 0.21 * s, left + W - 0.21 * s]) {
        o.lights.push({ x: lx, y: p.y - 0.8 * s, r: (o.brake ? 0.9 : 0.5) * s, color: "255,40,40", strength: o.brake ? 0.9 : 0.6 });
      }
    }
  } else {
    ctx.fillStyle = o.night && !o.parked ? "#fffbe8" : "#dfe3e6";
    ctx.fillRect(left + 0.07 * s, p.y - 0.84 * s, 0.34 * s, 0.12 * s);
    ctx.fillRect(left + W - 0.41 * s, p.y - 0.84 * s, 0.34 * s, 0.12 * s);
    if (o.night && !o.parked) {
      for (const lx of [left + 0.24 * s, left + W - 0.24 * s]) o.lights.push({ x: lx, y: p.y - 0.78 * s, r: 1.6 * s, color: "255,250,225", strength: 0.85 });
    }
  }
  if (o.indicator && o.blink) {
    ctx.fillStyle = "#ffae00";
    const ix = o.indicator === (view === "rear" ? "left" : "right") ? left : left + W - 0.16 * s;
    ctx.fillRect(ix, p.y - 0.9 * s, 0.16 * s, 0.16 * s);
    o.lights.push({ x: ix + 0.08 * s, y: p.y - 0.82 * s, r: 0.7 * s, color: "255,174,0", strength: 0.8 });
  }
  if (o.doorOpen && view === "rear") {
    // driver's door (right side in the UK) swinging open into the road
    const dw = 0.95 * s * o.doorOpen;
    ctx.fillStyle = shade(color.startsWith("#") ? color : "#6c757d", -25);
    ctx.fillRect(left + W, p.y - 1.25 * s, dw, 0.9 * s);
    ctx.fillStyle = "#26313d";
    ctx.fillRect(left + W + dw * 0.2, p.y - 1.2 * s, dw * 0.65, 0.35 * s);
  }
}

function drawBox(
  ctx: CanvasRenderingContext2D,
  p: Pt,
  color: string,
  view: "rear" | "front" | "left" | "right",
  dims: { w: number; h: number; len: number; bus?: boolean; lorry?: boolean },
  o: ActorCtx & { indicator?: "left" | "right" | null; brake?: boolean },
) {
  const s = p.s;
  const body = o.night ? shade(color, -80) : color;
  if (view === "left" || view === "right") {
    const x0 = p.x - (dims.len / 2) * s;
    ctx.fillStyle = body;
    rr(ctx, x0, p.y - dims.h * s, dims.len * s, (dims.h - 0.35) * s, 0.15 * s);
    ctx.fillStyle = o.night ? "#0c0f14" : "#2b3644";
    ctx.fillRect(x0 + 0.4 * s, p.y - (dims.h - 0.25) * s, (dims.len - 0.8) * s, 0.8 * s);
    ctx.fillStyle = "#121315";
    for (const wx of [-dims.len / 2 + 1.2, dims.len / 2 - 1.4]) {
      ctx.beginPath();
      ctx.arc(p.x + wx * s, p.y - 0.45 * s, 0.45 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  const W = dims.w * s;
  const left = p.x - W / 2;
  ctx.fillStyle = "#121315";
  ctx.fillRect(left + 0.1 * s, p.y - 0.5 * s, 0.4 * s, 0.5 * s);
  ctx.fillRect(left + W - 0.5 * s, p.y - 0.5 * s, 0.4 * s, 0.5 * s);
  ctx.fillStyle = body;
  rr(ctx, left, p.y - dims.h * s, W, (dims.h - 0.3) * s, 0.12 * s);
  if (view === "front") {
    ctx.fillStyle = o.night ? "#0a0d12" : "#35475a";
    ctx.fillRect(left + 0.15 * s, p.y - (dims.h - 0.25) * s, W - 0.3 * s, (dims.lorry ? 1.0 : 1.1) * s);
    ctx.fillStyle = o.night ? "#fffbe8" : "#dfe3e6";
    ctx.fillRect(left + 0.1 * s, p.y - 0.9 * s, 0.35 * s, 0.15 * s);
    ctx.fillRect(left + W - 0.45 * s, p.y - 0.9 * s, 0.35 * s, 0.15 * s);
    if (o.night) for (const lx of [left + 0.27 * s, left + W - 0.27 * s]) o.lights.push({ x: lx, y: p.y - 0.83 * s, r: 1.8 * s, color: "255,250,225", strength: 0.85 });
    return;
  }
  if (dims.bus) {
    ctx.fillStyle = o.night ? "#0a0d12" : "#26313d";
    ctx.fillRect(left + 0.2 * s, p.y - (dims.h - 0.3) * s, W - 0.4 * s, 0.8 * s);
    ctx.fillStyle = "#f3c400";
    ctx.fillRect(left + 0.2 * s, p.y - (dims.h - 0.15) * s, 0.9 * s, 0.22 * s);
  } else if (dims.lorry) {
    ctx.strokeStyle = o.night ? "#333" : "#b9bcc0";
    ctx.lineWidth = Math.max(1, 0.04 * s);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - dims.h * s);
    ctx.lineTo(p.x, p.y - 0.4 * s);
    ctx.stroke();
    ctx.fillStyle = "#c8102e";
    ctx.fillRect(left + 0.1 * s, p.y - 0.62 * s, W - 0.2 * s, 0.1 * s);
  } else {
    ctx.fillStyle = o.night ? "#0a0d12" : "#26313d";
    ctx.fillRect(left + 0.2 * s, p.y - (dims.h - 0.3) * s, W / 2 - 0.3 * s, 0.5 * s);
    ctx.fillRect(p.x + 0.1 * s, p.y - (dims.h - 0.3) * s, W / 2 - 0.3 * s, 0.5 * s);
  }
  ctx.fillStyle = "#f3c400";
  ctx.fillRect(p.x - 0.26 * s, p.y - 0.62 * s, 0.52 * s, 0.11 * s);
  const tail = o.brake ? "#ff2a2a" : o.night ? "#c21818" : "#8f1717";
  ctx.fillStyle = tail;
  ctx.fillRect(left + 0.08 * s, p.y - 0.95 * s, 0.3 * s, 0.22 * s);
  ctx.fillRect(left + W - 0.38 * s, p.y - 0.95 * s, 0.3 * s, 0.22 * s);
  if (o.night || o.brake) for (const lx of [left + 0.23 * s, left + W - 0.23 * s]) o.lights.push({ x: lx, y: p.y - 0.84 * s, r: 0.7 * s, color: "255,40,40", strength: 0.8 });
  if (o.indicator && o.blink) {
    ctx.fillStyle = "#ffae00";
    const ix = o.indicator === "left" ? left : left + W - 0.2 * s;
    ctx.fillRect(ix, p.y - 1.25 * s, 0.2 * s, 0.22 * s);
    o.lights.push({ x: ix + 0.1 * s, y: p.y - 1.15 * s, r: 0.8 * s, color: "255,174,0", strength: 0.9 });
  }
}

function drawTractor(ctx: CanvasRenderingContext2D, p: Pt, color: string, view: "rear" | "front" | "left" | "right", t: number, o: ActorCtx) {
  const s = p.s;
  const body = o.night ? shade(color, -70) : color;
  const beaconOn = Math.floor(t / 300) % 2 === 0;
  let beacon: { x: number; y: number };
  if (view === "left" || view === "right") {
    const dir = view === "right" ? 1 : -1;
    ctx.fillStyle = body;
    ctx.fillRect(p.x - 1.6 * s, p.y - 1.5 * s, 3.2 * s, 0.8 * s);
    ctx.strokeStyle = "#222";
    ctx.lineWidth = Math.max(1, 0.08 * s);
    ctx.strokeRect(p.x - dir * 1.3 * s - 0.6 * s, p.y - 2.8 * s, 1.2 * s, 1.3 * s);
    ctx.fillStyle = "#121315";
    ctx.beginPath();
    ctx.arc(p.x - dir * 0.9 * s, p.y - 0.75 * s, 0.75 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x + dir * 1.2 * s, p.y - 0.45 * s, 0.45 * s, 0, Math.PI * 2);
    ctx.fill();
    beacon = { x: p.x - dir * 1.3 * s, y: p.y - 2.95 * s };
  } else {
    ctx.fillStyle = "#121315";
    ctx.fillRect(p.x - 1.15 * s, p.y - 1.5 * s, 0.55 * s, 1.5 * s);
    ctx.fillRect(p.x + 0.6 * s, p.y - 1.5 * s, 0.55 * s, 1.5 * s);
    ctx.fillStyle = body;
    ctx.fillRect(p.x - 0.6 * s, p.y - 1.6 * s, 1.2 * s, 0.9 * s);
    ctx.strokeStyle = "#222";
    ctx.lineWidth = Math.max(1, 0.08 * s);
    ctx.strokeRect(p.x - 0.6 * s, p.y - 2.8 * s, 1.2 * s, 1.2 * s);
    beacon = { x: p.x, y: p.y - 2.95 * s };
  }
  ctx.fillStyle = beaconOn ? "#ffae00" : "#7a5200";
  ctx.beginPath();
  ctx.arc(beacon.x, beacon.y, 0.16 * s, 0, Math.PI * 2);
  ctx.fill();
  if (beaconOn) o.lights.push({ x: beacon.x, y: beacon.y, r: 0.9 * s, color: "255,174,0", strength: 0.9 });
}

function drawPerson(ctx: CanvasRenderingContext2D, p: Pt, color: string, height: number, t: number, moving: boolean) {
  const s = p.s;
  const H = height * s;
  const phase = moving ? Math.sin(t / 130) : 0;
  ctx.fillStyle = "#2a2d33";
  ctx.fillRect(p.x - 0.13 * s + phase * 0.05 * s, p.y - H * 0.48, 0.1 * s, H * 0.48);
  ctx.fillRect(p.x + 0.03 * s - phase * 0.05 * s, p.y - H * 0.48, 0.1 * s, H * 0.48);
  ctx.fillStyle = color;
  rr(ctx, p.x - 0.2 * s, p.y - H * 0.84, 0.4 * s, H * 0.38, 0.06 * s);
  ctx.fillRect(p.x - 0.26 * s, p.y - H * 0.8, 0.07 * s, H * 0.3);
  ctx.fillRect(p.x + 0.19 * s, p.y - H * 0.8, 0.07 * s, H * 0.3);
  ctx.fillStyle = "#c79a7a";
  ctx.beginPath();
  ctx.arc(p.x, p.y - H * 0.91, Math.max(1, H * 0.065), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a2a20";
  ctx.beginPath();
  ctx.arc(p.x, p.y - H * 0.935, Math.max(1, H * 0.06), Math.PI, 0);
  ctx.fill();
}

function drawCyclist(ctx: CanvasRenderingContext2D, p: Pt, color: string, t: number, moving: boolean) {
  const s = p.s;
  const pedal = moving ? Math.sin(t / 160) : 0;
  ctx.fillStyle = "#15171a";
  ctx.fillRect(p.x - 0.03 * s, p.y - 0.68 * s, 0.06 * s, 0.68 * s);
  ctx.fillStyle = "#2a2d33";
  ctx.fillRect(p.x - 0.14 * s, p.y - (0.95 - pedal * 0.12) * s, 0.09 * s, 0.45 * s);
  ctx.fillRect(p.x + 0.05 * s, p.y - (0.95 + pedal * 0.12) * s, 0.09 * s, 0.45 * s);
  ctx.fillStyle = color;
  rr(ctx, p.x - 0.22 * s, p.y - 1.5 * s, 0.44 * s, 0.6 * s, 0.08 * s);
  ctx.fillStyle = "#e8e8e8";
  ctx.beginPath();
  ctx.arc(p.x, p.y - 1.62 * s, 0.13 * s, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = "#c79a7a";
  ctx.fillRect(p.x - 0.07 * s, p.y - 1.62 * s, 0.14 * s, 0.1 * s);
  ctx.fillStyle = "#b81c1c";
  ctx.fillRect(p.x - 0.05 * s, p.y - 0.78 * s, 0.1 * s, 0.06 * s);
}

function drawHorse(ctx: CanvasRenderingContext2D, p: Pt, color: string, t: number) {
  const s = p.s;
  const step = Math.sin(t / 220) * 0.04;
  ctx.fillStyle = shade(color, -30);
  for (const [lx, d] of [[-0.25, step], [-0.12, -step], [0.12, step], [0.25, -step]] as const) {
    ctx.fillRect(p.x + lx * s - 0.04 * s, p.y - (0.95 + d) * s, 0.08 * s, 0.95 * s);
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y - 1.25 * s, 0.38 * s, 0.38 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2a1c12";
  ctx.fillRect(p.x - 0.05 * s, p.y - 1.3 * s, 0.1 * s, 0.6 * s);
  // rider in hi-vis
  ctx.fillStyle = "#2a2d33";
  ctx.fillRect(p.x - 0.36 * s, p.y - 1.6 * s, 0.1 * s, 0.4 * s);
  ctx.fillRect(p.x + 0.26 * s, p.y - 1.6 * s, 0.1 * s, 0.4 * s);
  ctx.fillStyle = "#d7ff3a";
  rr(ctx, p.x - 0.22 * s, p.y - 2.25 * s, 0.44 * s, 0.62 * s, 0.08 * s);
  ctx.fillStyle = "#1b1b1b";
  ctx.beginPath();
  ctx.arc(p.x, p.y - 2.38 * s, 0.13 * s, 0, Math.PI * 2);
  ctx.fill();
}
