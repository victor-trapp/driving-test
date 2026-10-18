// Original illustrations for the lessons. Drawn top-down unless noted, with traffic
// driving on the left. Fixed colours are used for things that look the same in any
// theme (tarmac, paint, cars); text and backgrounds follow the theme tokens.
import type { IllustrationId } from "@content/types";

const TARMAC = "#4a4f55";
const PAINT = "#f4f4f2";
const YELLOW = "#f2c300";
const GRASS = "var(--surface-2)";
const PAVE = "var(--surface-3)";
const INK = "var(--foreground)";
const MUTED = "var(--muted)";
const BLUE = "#1f5fbf";
const GREEN = "#1e7f4f";
const ORANGE = "#c2410c";
const GREY_CAR = "#8a9099";

const label = { fontFamily: "inherit", fontSize: 12, fill: INK } as const;

export function Car({ x, y, angle = 0, color = BLUE, w = 18, h = 34, indicator }: { x: number; y: number; angle?: number; color?: string; w?: number; h?: number; indicator?: "left" | "right" }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="4" fill={color} />
      <rect x={-w / 2 + 2.5} y={-h / 2 + 6} width={w - 5} height="7" rx="2" fill="#cfe0f2" opacity="0.85" />
      <rect x={-w / 2 + 2.5} y={h / 2 - 9} width={w - 5} height="5" rx="2" fill="#cfe0f2" opacity="0.6" />
      {indicator && <circle cx={indicator === "left" ? -w / 2 : w / 2} cy={-h / 2 + 2} r="2.6" fill="#ffb000" />}
      {indicator && <circle cx={indicator === "left" ? -w / 2 : w / 2} cy={h / 2 - 2} r="2.6" fill="#ffb000" />}
    </g>
  );
}

export function Bike({ x, y, angle = 0 }: { x: number; y: number; angle?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <rect x="-1.5" y="-12" width="3" height="24" rx="1.5" fill="#222" />
      <ellipse cx="0" cy="0" rx="6" ry="5" fill="#e0a800" />
      <circle cx="0" cy="-3" r="3.5" fill="#333" />
    </g>
  );
}

export function Person({ x, y, color = ORANGE }: { x: number; y: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="0" rx="7" ry="5" fill={color} />
      <circle cx="0" cy="0" r="3.6" fill="#3b2a20" />
    </g>
  );
}

function Arrow({ id, color }: { id: string; color: string }) {
  return (
    <marker id={id} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill={color} />
    </marker>
  );
}

function Svg({ viewBox, label: aria, children }: { viewBox: string; label: string; children: React.ReactNode }) {
  return (
    <svg viewBox={viewBox} role="img" aria-label={aria} className="mx-auto block h-auto max-h-[400px] w-full" style={{ fontFamily: "inherit" }}>
      {children}
    </svg>
  );
}

function RoundaboutLanes() {
  const c = { x: 180, y: 140 };
  return (
    <Svg viewBox="0 0 360 330" label="Roundabout lane positions for turning left, going ahead and turning right">
      <defs>
        <Arrow id="ra-l" color={BLUE} />
        <Arrow id="ra-a" color={GREEN} />
        <Arrow id="ra-r" color={ORANGE} />
      </defs>
      <rect width="360" height="330" fill={GRASS} />
      {/* arms */}
      <rect x="150" y="0" width="60" height="80" fill={TARMAC} />
      <rect x="0" y="110" width="110" height="60" fill={TARMAC} />
      <rect x="250" y="110" width="110" height="60" fill={TARMAC} />
      <rect x="140" y="190" width="80" height="140" fill={TARMAC} />
      <circle cx={c.x} cy={c.y} r="80" fill={TARMAC} />
      <circle cx={c.x} cy={c.y} r="40" fill="#6f9161" stroke={PAINT} strokeWidth="2" />
      {/* lane lines */}
      <line x1="180" y1="0" x2="180" y2="62" stroke={PAINT} strokeWidth="2" strokeDasharray="8 8" />
      <line x1="0" y1="140" x2="100" y2="140" stroke={PAINT} strokeWidth="2" strokeDasharray="8 8" />
      <line x1="260" y1="140" x2="360" y2="140" stroke={PAINT} strokeWidth="2" strokeDasharray="8 8" />
      <line x1="180" y1="225" x2="180" y2="330" stroke={PAINT} strokeWidth="2" />
      <line x1="160" y1="240" x2="160" y2="330" stroke={PAINT} strokeWidth="1.5" strokeDasharray="8 8" />
      {/* give way line where we join */}
      <line x1="140" y1="222" x2="180" y2="222" stroke={PAINT} strokeWidth="2.5" strokeDasharray="5 4" />
      {/* routes */}
      <path d="M150 325 L150 230 Q150 158 100 155 L8 155" fill="none" stroke={BLUE} strokeWidth="3" markerEnd="url(#ra-l)" />
      <path d="M150 325 L150 232 Q150 205 159.1 197.3 A61 61 0 0 1 172.6 79.5 L166 8" fill="none" stroke={GREEN} strokeWidth="3" markerEnd="url(#ra-a)" />
      <path d="M170 325 L170 235 L169.4 200.1 A61 61 0 1 1 238.9 124.2 L352 124" fill="none" stroke={ORANGE} strokeWidth="3" markerEnd="url(#ra-r)" />
      {/* key */}
      <g transform="translate(232 214)">
        <rect x="-8" y="-14" width="132" height="102" rx="6" fill="var(--surface)" stroke="var(--border)" />
        {[
          [BLUE, "Left", "left lane, signal left"],
          [GREEN, "Ahead", "left lane, no signal"],
          [ORANGE, "Right", "right lane, signal right"],
        ].map(([color, a, b], i) => (
          <g key={a} transform={`translate(0 ${i * 30})`}>
            <line x1="0" y1="0" x2="16" y2="0" stroke={color} strokeWidth="3" />
            <text x="22" y="4" {...label} fontWeight="700">{a}</text>
            <text x="22" y="18" {...label} fontSize="10.5" fill={MUTED}>{b}</text>
          </g>
        ))}
      </g>
      <text x="8" y="322" {...label} fontSize="11" fill={MUTED}>Traffic flows clockwise. Give way to the right.</text>
    </Svg>
  );
}

function JunctionPriority() {
  return (
    <Svg viewBox="0 0 360 250" label="Car turning left into a side road, giving way to a pedestrian and a cyclist">
      <defs>
        <Arrow id="jp-car" color={BLUE} />
        <Arrow id="jp-ped" color={ORANGE} />
        <Arrow id="jp-bike" color="#a37a00" />
      </defs>
      <rect width="360" height="250" fill={GRASS} />
      <rect x="0" y="134" width="360" height="12" fill={PAVE} />
      <rect x="0" y="230" width="360" height="12" fill={PAVE} />
      <rect x="138" y="0" width="12" height="146" fill={PAVE} />
      <rect x="210" y="0" width="12" height="146" fill={PAVE} />
      <rect x="0" y="146" width="360" height="84" fill={TARMAC} />
      <rect x="150" y="0" width="60" height="146" fill={TARMAC} />
      <line x1="0" y1="188" x2="360" y2="188" stroke={PAINT} strokeWidth="2" strokeDasharray="10 10" />
      <line x1="180" y1="0" x2="180" y2="120" stroke={PAINT} strokeWidth="2" strokeDasharray="10 10" />
      <line x1="150" y1="146" x2="180" y2="146" stroke={PAINT} strokeWidth="2.5" strokeDasharray="5 4" />
      {/* car turning left */}
      <path d="M120 167 Q165 167 165 120 L165 30" fill="none" stroke={BLUE} strokeWidth="2.5" strokeDasharray="6 5" markerEnd="url(#jp-car)" />
      <Car x={92} y={167} angle={90} indicator="left" />
      {/* cyclist going straight on the inside */}
      <path d="M178 157 L330 157" fill="none" stroke="#a37a00" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#jp-bike)" />
      <Bike x={160} y={157} angle={90} />
      {/* pedestrian waiting to cross the side road */}
      <path d="M150 118 L206 118" fill="none" stroke={ORANGE} strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#jp-ped)" />
      <Person x={142} y={118} />
      <text x="8" y="20" {...label} fontWeight="700">Give way to both before turning</text>
      <text x="8" y="40" {...label} fill={MUTED}>Pedestrian waiting: rule H2</text>
      <text x="8" y="56" {...label} fill={MUTED}>Cyclist going ahead: rule H3</text>
    </Svg>
  );
}

function StoppingDistances() {
  const rows = [
    [20, 6, 6],
    [30, 9, 14],
    [40, 12, 24],
    [50, 15, 38],
    [60, 18, 55],
    [70, 21, 75],
  ];
  const scale = 2.9;
  const x0 = 64;
  return (
    <Svg viewBox="0 0 420 268" label="Typical stopping distances: thinking plus braking distance from 20 to 70 mph">
      <g transform="translate(64 14)">
        <rect width="12" height="12" rx="3" style={{ fill: "color-mix(in srgb, var(--chart-1) 40%, var(--surface))" }} />
        <text x="18" y="10" {...label}>Thinking distance</text>
        <rect x="140" width="12" height="12" rx="3" style={{ fill: "var(--chart-1)" }} />
        <text x="158" y="10" {...label}>Braking distance</text>
      </g>
      {[0, 25, 50, 75, 100].map((m) => (
        <g key={m}>
          <line x1={x0 + m * scale} y1="40" x2={x0 + m * scale} y2="240" stroke="var(--chart-grid)" strokeWidth="1" />
          <text x={x0 + m * scale} y="256" textAnchor="middle" {...label} fontSize="10.5" fill={MUTED}>{m} m</text>
        </g>
      ))}
      {rows.map(([mph, think, brake], i) => {
        const y = 48 + i * 32;
        const tw = think * scale;
        const bw = brake * scale;
        return (
          <g key={mph}>
            <text x={x0 - 10} y={y + 15} textAnchor="end" {...label} fontWeight="700">{mph} mph</text>
            <rect x={x0} y={y} width={tw} height="22" style={{ fill: "color-mix(in srgb, var(--chart-1) 40%, var(--surface))" }}>
              <title>{`${mph} mph: thinking ${think} m`}</title>
            </rect>
            <path
              d={`M${x0 + tw + 2} ${y} h${bw - 6} a4 4 0 0 1 4 4 v14 a4 4 0 0 1 -4 4 h${-(bw - 6)} z`}
              style={{ fill: "var(--chart-1)" }}
            >
              <title>{`${mph} mph: braking ${brake} m`}</title>
            </path>
            <text x={x0 + tw + bw + 8} y={y + 15} {...label}>{think + brake} m</text>
          </g>
        );
      })}
    </Svg>
  );
}

function FollowingDistance() {
  return (
    <Svg viewBox="0 0 420 170" label="Two-second gap between two cars, measured against a lamp post">
      <rect width="420" height="170" fill={GRASS} />
      <rect x="0" y="60" width="420" height="70" fill={TARMAC} />
      <rect x="0" y="48" width="420" height="12" fill={PAVE} />
      <line x1="0" y1="95" x2="420" y2="95" stroke={PAINT} strokeWidth="2" strokeDasharray="12 12" />
      <Car x={300} y={78} angle={90} color={GREY_CAR} />
      <Car x={110} y={78} angle={90} />
      {/* lamp post the front car has just passed */}
      <circle cx="292" cy="44" r="5" fill={INK} />
      <line x1="292" y1="44" x2="292" y2="56" stroke={INK} strokeWidth="2" />
      <line x1="128" y1="146" x2="292" y2="146" stroke={INK} strokeWidth="1.5" />
      <line x1="128" y1="140" x2="128" y2="152" stroke={INK} strokeWidth="1.5" />
      <line x1="292" y1="140" x2="292" y2="152" stroke={INK} strokeWidth="1.5" />
      <text x="210" y="164" textAnchor="middle" {...label} fontWeight="700">At least 2 seconds (4 in the wet)</text>
      <text x="8" y="22" {...label} fill={MUTED}>When the car in front passes a fixed point, start counting.</text>
      <text x="8" y="38" {...label} fill={MUTED}>If you reach it before 2 seconds, drop back.</text>
    </Svg>
  );
}

function Light({ x, y, lit, flashing }: { x: number; y: number; lit: "red" | "amber" | "green"; flashing?: boolean }) {
  const on = (c: string) => (c === lit ? c === "red" ? "#e5322d" : c === "amber" ? "#f7a600" : "#2fb35a" : "#2c2f33");
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-11" y="0" width="22" height="58" rx="5" fill="#15171a" />
      <circle cx="0" cy="11" r="7" fill={on("red")} />
      <circle cx="0" cy="29" r="7" fill={on("amber")} />
      <circle cx="0" cy="47" r="7" fill={on("green")} />
      {flashing && (
        <g stroke="#f7a600" strokeWidth="1.5">
          <line x1="13" y1="29" x2="19" y2="29" />
          <line x1="12" y1="22" x2="17" y2="18" />
          <line x1="12" y1="36" x2="17" y2="40" />
        </g>
      )}
    </g>
  );
}

function PedestrianCrossings() {
  const panel = (x: number, y: number, title: string, note: string, body: React.ReactNode) => (
    <g transform={`translate(${x} ${y})`}>
      <rect width="196" height="130" rx="8" fill="var(--surface)" stroke="var(--border)" />
      <text x="12" y="22" {...label} fontWeight="700" fontSize="13">{title}</text>
      <text x="12" y="120" {...label} fontSize="10.5" fill={MUTED}>{note}</text>
      {body}
    </g>
  );
  return (
    <Svg viewBox="0 0 408 276" label="Zebra, pelican, puffin and toucan crossings">
      {panel(4, 4, "Zebra", "Give way to people waiting", (
        <g>
          <rect x="40" y="36" width="116" height="66" fill={TARMAC} />
          {Array.from({ length: 6 }, (_, i) => <rect key={i} x={46 + i * 18} y="36" width="10" height="66" fill={PAINT} />)}
          {[26, 170].map((bx) => (
            <g key={bx}>
              <rect x={bx - 2} y="46" width="4" height="52" fill="#111" />
              {[0, 1, 2, 3].map((k) => <rect key={k} x={bx - 2} y={52 + k * 12} width="4" height="6" fill={PAINT} />)}
              <circle cx={bx} cy="42" r="7" fill="#f7a600" />
            </g>
          ))}
        </g>
      ))}
      {panel(208, 4, "Pelican", "Flashing amber: let them finish", (
        <g>
          <Light x={60} y={36} lit="amber" flashing />
          <Person x={130} y={70} />
          <text x="112" y="100" {...label} fontSize="10.5" fill={MUTED}>flashing amber</text>
        </g>
      ))}
      {panel(4, 142, "Puffin", "Sensors hold traffic, no flashing amber", (
        <g>
          <Light x={60} y={36} lit="red" />
          <rect x="112" y="48" width="26" height="16" rx="3" fill={INK} />
          <circle cx="125" cy="56" r="4.5" fill="var(--surface)" />
          <text x="102" y="84" {...label} fontSize="10.5" fill={MUTED}>kerbside sensor</text>
        </g>
      ))}
      {panel(208, 142, "Toucan", "Pedestrians and cyclists cross together", (
        <g>
          <Light x={60} y={36} lit="red" />
          <Person x={118} y={66} />
          <g transform="translate(150 66)">
            <circle cx="-9" cy="6" r="7" fill="none" stroke={INK} strokeWidth="2" />
            <circle cx="9" cy="6" r="7" fill="none" stroke={INK} strokeWidth="2" />
            <path d="M-9 6 L-2 -6 L6 -6 L9 6 M-2 -6 L0 -10" fill="none" stroke={INK} strokeWidth="2" />
          </g>
        </g>
      ))}
    </Svg>
  );
}

function Overtaking() {
  return (
    <Svg viewBox="0 0 320 260" label="Car overtaking a cyclist with 1.5 metres of space">
      <rect width="320" height="260" fill={GRASS} />
      <rect x="40" y="0" width="12" height="260" fill={PAVE} />
      <rect x="52" y="0" width="180" height="260" fill={TARMAC} />
      <line x1="142" y1="0" x2="142" y2="260" stroke={PAINT} strokeWidth="2" strokeDasharray="14 12" />
      <Bike x={76} y={110} />
      <Car x={136} y={128} color={BLUE} w={22} h={42} />
      {/* 1.5 m dimension */}
      <line x1="83" y1="80" x2="125" y2="80" stroke={YELLOW} strokeWidth="2" />
      <line x1="83" y1="74" x2="83" y2="86" stroke={YELLOW} strokeWidth="2" />
      <line x1="125" y1="74" x2="125" y2="86" stroke={YELLOW} strokeWidth="2" />
      <rect x="84" y="54" width="40" height="18" rx="3" fill="#15171a" />
      <text x="104" y="67" textAnchor="middle" fontSize="12" fontWeight="700" fill={YELLOW}>1.5 m</text>
      <text x="244" y="30" {...label} fontWeight="700">Cyclists</text>
      <text x="244" y="46" {...label} fill={MUTED} fontSize="11">1.5 m at up to</text>
      <text x="244" y="60" {...label} fill={MUTED} fontSize="11">30 mph, more</text>
      <text x="244" y="74" {...label} fill={MUTED} fontSize="11">when faster</text>
      <text x="244" y="110" {...label} fontWeight="700">Horses</text>
      <text x="244" y="126" {...label} fill={MUTED} fontSize="11">2 m, under</text>
      <text x="244" y="140" {...label} fill={MUTED} fontSize="11">10 mph</text>
      <text x="244" y="176" {...label} fontWeight="700">Walkers</text>
      <text x="244" y="192" {...label} fill={MUTED} fontSize="11">2 m, low</text>
      <text x="244" y="206" {...label} fill={MUTED} fontSize="11">speed</text>
    </Svg>
  );
}

function MotorwayLanes() {
  return (
    <Svg viewBox="0 0 340 320" label="Three-lane motorway with lane use and countdown markers before an exit">
      <defs>
        <Arrow id="ml-a" color={GREEN} />
      </defs>
      <rect width="340" height="320" fill={GRASS} />
      {/* slip road leaving to the left near the top */}
      <path d="M60 110 L22 0 L52 0 L84 90 Z" fill={TARMAC} />
      <rect x="60" y="0" width="166" height="320" fill={TARMAC} />
      <rect x="226" y="0" width="14" height="320" fill="#7d8288" />
      <line x1="90" y1="0" x2="90" y2="320" stroke={PAINT} strokeWidth="2" />
      <line x1="135" y1="0" x2="135" y2="320" stroke={PAINT} strokeWidth="2" strokeDasharray="14 12" />
      <line x1="180" y1="0" x2="180" y2="320" stroke={PAINT} strokeWidth="2" strokeDasharray="14 12" />
      <text x="75" y="312" textAnchor="middle" fontSize="9" fill={PAINT} transform="rotate(-90 75 300)">HARD SHOULDER</text>
      <Car x={112} y={240} />
      <Car x={157} y={200} color={GREY_CAR} />
      <path d="M157 170 Q157 120 112 90 L112 40" fill="none" stroke={GREEN} strokeWidth="2.5" strokeDasharray="6 5" markerEnd="url(#ml-a)" />
      {/* countdown markers on the left verge */}
      {[3, 2, 1].map((bars, i) => (
        <g key={bars} transform={`translate(30 ${260 - i * 70})`}>
          <rect x="-7" y="-16" width="14" height="32" rx="2" fill="#1d4f9c" />
          {Array.from({ length: bars }, (_, k) => (
            <line key={k} x1="-5" y1={-10 + k * 8} x2="5" y2={-14 + k * 8 + 6} stroke={PAINT} strokeWidth="2.5" />
          ))}
        </g>
      ))}
      <text x="250" y="230" {...label} fontWeight="700">Keep left</text>
      <text x="250" y="246" {...label} fill={MUTED} fontSize="11">unless</text>
      <text x="250" y="260" {...label} fill={MUTED} fontSize="11">overtaking</text>
      <text x="250" y="110" {...label} fontWeight="700">300, 200,</text>
      <text x="250" y="126" {...label} fontWeight="700">100 yards</text>
      <text x="250" y="142" {...label} fill={MUTED} fontSize="11">to the exit</text>
    </Svg>
  );
}

function BlindSpots() {
  return (
    <Svg viewBox="0 0 320 260" label="Areas covered by mirrors and the blind spots at the rear quarters">
      <defs>
        <pattern id="bs-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={ORANGE} strokeWidth="2.5" />
        </pattern>
      </defs>
      <rect width="320" height="260" fill={GRASS} />
      <rect x="60" y="0" width="200" height="260" fill={TARMAC} />
      <line x1="160" y1="0" x2="160" y2="260" stroke={PAINT} strokeWidth="2" strokeDasharray="14 12" />
      {/* mirror coverage */}
      <path d="M140 92 L60 260 L110 260 Z" fill="#7fb0ff" opacity="0.35" />
      <path d="M180 92 L260 260 L210 260 Z" fill="#7fb0ff" opacity="0.35" />
      <path d="M150 110 L130 260 L190 260 L170 110 Z" fill="#7fb0ff" opacity="0.3" />
      {/* blind spots */}
      <path d="M140 112 L140 170 L92 196 L78 150 Z" fill="url(#bs-hatch)" opacity="0.9" />
      <path d="M180 112 L180 170 L228 196 L242 150 Z" fill="url(#bs-hatch)" opacity="0.9" />
      <Car x={160} y={120} w={40} h={74} />
      <text x="10" y="22" {...label} fontWeight="700">Blind spots</text>
      <text x="10" y="38" {...label} fill={MUTED} fontSize="11">Not visible in any mirror.</text>
      <text x="10" y="52" {...label} fill={MUTED} fontSize="11">Look over your shoulder.</text>
      <g transform="translate(222 20)">
        <rect width="12" height="12" fill="#7fb0ff" opacity="0.5" />
        <text x="18" y="10" {...label} fontSize="11">Mirrors</text>
        <rect y="20" width="12" height="12" fill="url(#bs-hatch)" />
        <text x="18" y="30" {...label} fontSize="11">Blind spot</text>
      </g>
    </Svg>
  );
}

function MotorwayStuds() {
  const studs = (x: number, color: string, from = 0, to = 300) =>
    Array.from({ length: Math.floor((to - from) / 30) + 1 }, (_, i) => <circle key={`${x}-${i}`} cx={x} cy={from + i * 30 + 8} r="4" fill={color} stroke="#15171a" strokeWidth="1" />);
  return (
    <Svg viewBox="0 0 340 300" label="Motorway reflective studs: red on the left edge, white between lanes, amber by the central reservation, green at slip roads">
      <rect width="340" height="300" fill={GRASS} />
      <path d="M0 300 L0 240 L70 150 L70 300 Z" fill={TARMAC} />
      <rect x="70" y="0" width="170" height="300" fill={TARMAC} />
      <rect x="240" y="0" width="14" height="300" fill="#7d8288" />
      <line x1="100" y1="0" x2="100" y2="150" stroke={PAINT} strokeWidth="2" />
      <line x1="170" y1="0" x2="170" y2="300" stroke={PAINT} strokeWidth="2" strokeDasharray="14 12" />
      {studs(100, "#e5322d", 0, 140)}
      {studs(170, PAINT)}
      {studs(236, "#f7a600")}
      {studs(100, "#2fb35a", 170, 300)}
      <g transform="translate(262 40)">
        {[
          ["#e5322d", "Red", "left edge"],
          [PAINT, "White", "lane lines"],
          ["#f7a600", "Amber", "central res."],
          ["#2fb35a", "Green", "slip roads"],
        ].map(([c, a, b], i) => (
          <g key={a} transform={`translate(0 ${i * 40})`}>
            <circle cx="6" cy="6" r="5" fill={c} stroke="#15171a" />
            <text x="16" y="10" {...label} fontWeight="700" fontSize="11.5">{a}</text>
            <text x="16" y="24" {...label} fill={MUTED} fontSize="10.5">{b}</text>
          </g>
        ))}
      </g>
    </Svg>
  );
}

function BoxJunctionArt() {
  const lines = Array.from({ length: 12 }, (_, i) => -40 + i * 16);
  return (
    <Svg viewBox="0 0 320 260" label="Yellow box junction: don't enter unless your exit is clear">
      <defs>
        <clipPath id="bxj-clip">
          <rect x="110" y="80" width="100" height="100" />
        </clipPath>
      </defs>
      <rect width="320" height="260" fill={GRASS} />
      <rect x="110" y="0" width="100" height="260" fill={TARMAC} />
      <rect x="0" y="80" width="320" height="100" fill={TARMAC} />
      <g clipPath="url(#bxj-clip)" stroke={YELLOW} strokeWidth="2.5">
        {lines.map((o) => (
          <g key={o}>
            <line x1={110 + o} y1="80" x2={210 + o} y2="180" />
            <line x1={110 + o} y1="180" x2={210 + o} y2="80" />
          </g>
        ))}
      </g>
      <rect x="110" y="80" width="100" height="100" fill="none" stroke={YELLOW} strokeWidth="3" />
      {/* queue blocking our exit */}
      <Car x={135} y={40} color={GREY_CAR} />
      <Car x={135} y={0} color={GREY_CAR} />
      <Car x={135} y={210} />
      <text x="230" y="214" {...label} fontWeight="700">Exit blocked:</text>
      <text x="230" y="230" {...label} fill={MUTED} fontSize="11">wait before</text>
      <text x="230" y="244" {...label} fill={MUTED} fontSize="11">the box</text>
    </Svg>
  );
}

function ParkingHill() {
  const panel = (x: number, title: string, note: string, downhill: boolean) => (
    <g transform={`translate(${x} 0)`}>
      <rect x="4" y="4" width="192" height="200" rx="8" fill="var(--surface)" stroke="var(--border)" />
      <rect x="20" y="30" width="16" height="150" fill={PAVE} />
      <rect x="36" y="30" width="110" height="150" fill={TARMAC} />
      <text x="16" y="24" {...label} fontWeight="700">{title}</text>
      <g transform="translate(66 105)">
        <rect x="-15" y="-36" width="30" height="72" rx="6" fill={BLUE} />
        {/* front wheels at the top (car faces up the page) */}
        <rect x="-19" y="-30" width="6" height="14" rx="2" fill="#111" transform={`rotate(${downhill ? -25 : 25} -16 -23)`} />
        <rect x="13" y="-30" width="6" height="14" rx="2" fill="#111" transform={`rotate(${downhill ? -25 : 25} 16 -23)`} />
        <rect x="-19" y="16" width="6" height="14" rx="2" fill="#111" />
        <rect x="13" y="16" width="6" height="14" rx="2" fill="#111" />
      </g>
      <g transform="translate(160 60)" stroke={INK} strokeWidth="2" fill="none">
        <line x1="0" y1="0" x2="0" y2="80" />
        <path d={downhill ? "M-6 70 L0 80 L6 70" : "M-6 10 L0 0 L6 10"} />
      </g>
      <text x="150" y="160" {...label} fontSize="10" fill={MUTED}>{downhill ? "down" : "up"}</text>
      <text x="16" y="196" {...label} fontSize="10.5" fill={MUTED}>{note}</text>
    </g>
  );
  return (
    <Svg viewBox="0 0 404 210" label="Parking on a hill: wheels towards the kerb facing downhill, away from the kerb facing uphill">
      {panel(0, "Facing downhill", "Wheels to kerb, reverse gear", true)}
      {panel(204, "Facing uphill", "Wheels away from kerb, 1st gear", false)}
    </Svg>
  );
}

function HazardTypes() {
  const panel = (x: number, title: string, note: string, stepping: boolean) => (
    <g transform={`translate(${x} 0)`}>
      <rect x="4" y="4" width="196" height="192" rx="8" fill="var(--surface)" stroke="var(--border)" />
      <text x="16" y="26" {...label} fontWeight="700">{title}</text>
      <rect x="16" y="40" width="172" height="40" fill={PAVE} />
      <rect x="16" y="80" width="172" height="80" fill={TARMAC} />
      <line x1="16" y1="80" x2="188" y2="80" stroke="#b9b4aa" strokeWidth="3" />
      <line x1="16" y1="120" x2="188" y2="120" stroke={PAINT} strokeWidth="2" strokeDasharray="10 10" />
      <Person x={stepping ? 110 : 110} y={stepping ? 92 : 60} />
      {stepping && <path d="M110 70 L110 82" stroke={ORANGE} strokeWidth="2" strokeDasharray="3 3" />}
      <Car x={40} y={140} angle={90} />
      <text x="16" y="182" {...label} fontSize="11" fill={MUTED}>{note}</text>
    </g>
  );
  return (
    <Svg viewBox="0 0 408 200" label="A potential hazard (pedestrian on the pavement) and a developing hazard (pedestrian stepping into the road)">
      {panel(0, "Potential", "Might step out. Keep watching.", false)}
      {panel(204, "Developing", "Stepping out. Slow down now.", true)}
    </Svg>
  );
}

const ILLUSTRATIONS: Record<IllustrationId, () => React.ReactElement> = {
  "roundabout-lanes": RoundaboutLanes,
  "junction-priority": JunctionPriority,
  "stopping-distances": StoppingDistances,
  "following-distance": FollowingDistance,
  "pedestrian-crossings": PedestrianCrossings,
  overtaking: Overtaking,
  "motorway-lanes": MotorwayLanes,
  "blind-spots": BlindSpots,
  "motorway-studs": MotorwayStuds,
  "box-junction": BoxJunctionArt,
  "parking-hill": ParkingHill,
  "hazard-types": HazardTypes,
};

export function Illustration({ id }: { id: string }) {
  const Comp = ILLUSTRATIONS[id as IllustrationId];
  return Comp ? <Comp /> : null;
}
