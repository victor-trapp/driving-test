// Original top-down drawings of each kind of pedestrian crossing, with the features you'd
// use to tell them apart labelled. Traffic drives on the left: the top lane goes right and
// the bottom lane goes left. Signals and beacons are drawn side-on so you can see them.
import type { CrossingId } from "@content/types";
import { Bike, Car, Person } from "./index";

const W = 320;
const TARMAC = "#4a4f55";
const PAINT = "#f4f4f2";
const YELLOW = "#f2c300";
const PAVE = "var(--surface-3)";
const KERB = "var(--border-strong)";
const INK = "var(--foreground)";
const LEADER = "#9aa0a8";
const HOUSING = "#15171a";
const OFF = "#2c2f33";
const RED_ON = "#e5322d";
const AMBER_ON = "#f7a600";
const GREEN_ON = "#2fb35a";
const BLUE = "#1f5fbf";
const SILVER = "#8a9099";

// Road from y 60 to 160, pavements above and below.
function Road({ centre = false }: { centre?: boolean }) {
  return (
    <>
      <rect width={W} height="220" fill={PAVE} />
      <rect y="60" width={W} height="100" fill={TARMAC} />
      <rect y="58" width={W} height="2" fill={KERB} />
      <rect y="160" width={W} height="2" fill={KERB} />
      {centre && <line x1="0" y1="110" x2={W} y2="110" stroke={PAINT} strokeWidth="2" strokeDasharray="12 10" />}
    </>
  );
}

function zig(x1: number, x2: number, y: number, color = PAINT) {
  const pts: string[] = [];
  for (let x = x1, i = 0; x <= x2; x += 8, i++) pts.push(`${x},${y + (i % 2 ? 3.5 : -3.5)}`);
  return <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.8" />;
}

/** Zig-zags along both kerbs and the centre on each approach, stopping at `left` and `right`. */
function ZigZags({ left, right }: { left: number; right: number }) {
  return (
    <g>
      {[66, 110, 154].map((y) => (
        <g key={y}>
          {zig(8, left, y)}
          {zig(right, W - 8, y)}
        </g>
      ))}
    </g>
  );
}

function Stripes({ x, w }: { x: number; w: number }) {
  return <g>{Array.from({ length: 7 }, (_, i) => <rect key={i} x={x} y={62 + i * 14} width={w} height="8" fill={PAINT} />)}</g>;
}

/** Broken give way line across one lane: the top lane (y 60-110) or the bottom one. */
function GiveWay({ x, lane }: { x: number; lane: "top" | "bottom" }) {
  const y0 = lane === "top" ? 60 : 110;
  return <g>{Array.from({ length: 6 }, (_, k) => <rect key={k} x={x} y={y0 + 3 + k * 8} width="3" height="5" fill={PAINT} />)}</g>;
}

function StopLine({ x, lane }: { x: number; lane: "top" | "bottom" }) {
  return <rect x={x} y={lane === "top" ? 61 : 111} width="3.5" height="48" fill={PAINT} />;
}

/** The two rows of studs that mark the edges of a signal-controlled crossing. */
function Studs({ x1, x2 }: { x1: number; x2: number }) {
  return (
    <g>
      {[x1, x2].map((x) => Array.from({ length: 13 }, (_, k) => <rect key={`${x}-${k}`} x={x - 1.5} y={62 + k * 7.6} width="3" height="3" fill={PAINT} />))}
    </g>
  );
}

/** Belisha beacon, side-on, standing at (x, base). */
function Beacon({ x, base }: { x: number; base: number }) {
  return (
    <g>
      <rect x={x - 2} y={base - 23} width="4" height="23" fill={HOUSING} />
      {[1, 3].map((k) => <rect key={k} x={x - 1.2} y={base - 23 + k * 5.6} width="2.4" height="5.6" fill={PAINT} />)}
      <circle cx={x} cy={base - 28} r="8.5" fill={AMBER_ON} opacity="0.3" />
      <circle cx={x} cy={base - 28} r="5.2" fill={AMBER_ON} />
    </g>
  );
}

function Rays({ x, y }: { x: number; y: number }) {
  return (
    <g stroke={AMBER_ON} strokeWidth="1.3" strokeLinecap="round">
      <line x1={x + 6} y1={y} x2={x + 10} y2={y} />
      <line x1={x + 5} y1={y - 5} x2={x + 8} y2={y - 8} />
      <line x1={x + 5} y1={y + 5} x2={x + 8} y2={y + 8} />
    </g>
  );
}

/** Traffic signal for drivers, side-on, with its top at (x, y). */
function Signal({ x, y, lit }: { x: number; y: number; lit: "red" | "amber" | "green" | "flashing" }) {
  return (
    <g>
      <rect x={x - 1} y={y + 30} width="2" height="14" fill={HOUSING} />
      <rect x={x - 6} y={y} width="12" height="31" rx="2.5" fill={HOUSING} />
      <circle cx={x} cy={y + 6} r="3.5" fill={lit === "red" ? RED_ON : OFF} />
      <circle cx={x} cy={y + 15.5} r="3.5" fill={lit === "amber" || lit === "flashing" ? AMBER_ON : OFF} />
      <circle cx={x} cy={y + 25} r="3.5" fill={lit === "green" ? GREEN_ON : OFF} />
      {lit === "flashing" && <Rays x={x} y={y + 15.5} />}
    </g>
  );
}

function Standing({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none">
      <circle cx="0" cy="-4.3" r="1.6" fill={color} stroke="none" />
      <line x1="0" y1="-2.4" x2="0" y2="1.8" />
      <line x1="0" y1="1.8" x2="-1.3" y2="5" />
      <line x1="0" y1="1.8" x2="1.3" y2="5" />
      <line x1="0" y1="-1.6" x2="-2" y2="1.2" />
      <line x1="0" y1="-1.6" x2="2" y2="1.2" />
    </g>
  );
}

function Walking({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none">
      <circle cx="0.6" cy="-4.3" r="1.6" fill={color} stroke="none" />
      <line x1="0.2" y1="-2.4" x2="-0.3" y2="1.6" />
      <line x1="-0.3" y1="1.6" x2="-2.7" y2="5" />
      <line x1="-0.3" y1="1.6" x2="2.3" y2="5" />
      <line x1="0" y1="-1.4" x2="-2.3" y2="0.6" />
      <line x1="0" y1="-1.4" x2="2.3" y2="-0.4" />
    </g>
  );
}

function Cycle({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round">
      <circle cx="-3.2" cy="2.4" r="2.3" />
      <circle cx="3.2" cy="2.4" r="2.3" />
      <path d="M-3.2 2.4 L-0.6 -1.2 L2.2 -1.2 L3.2 2.4 M-0.6 -1.2 L-1.4 -3.2 M2.2 -1.2 L2.6 -3.4" />
    </g>
  );
}

function HorseRider({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y})`} fill={color} stroke={color} strokeLinecap="round">
      <ellipse cx="-0.5" cy="1.2" rx="4" ry="1.9" stroke="none" />
      <line x1="2.6" y1="0.4" x2="4.4" y2="-2.6" strokeWidth="1.4" />
      <line x1="-3.4" y1="2.4" x2="-3.6" y2="5.2" strokeWidth="1" />
      <line x1="2.4" y1="2.4" x2="2.6" y2="5.2" strokeWidth="1" />
      <circle cx="-0.6" cy="-4.4" r="1.3" stroke="none" />
      <line x1="-0.6" y1="-3" x2="-0.6" y2="-0.4" strokeWidth="1.3" />
    </g>
  );
}

/**
 * Signal head for people crossing: red figure on top, green below. `extra` adds the green
 * cycle of a toucan; `horse` swaps both figures for a horse and rider.
 */
function PedSignal({ x, y, show, extra }: { x: number; y: number; show: "red" | "green" | "flashing"; extra?: "cycle" | "horse" }) {
  const w = extra === "cycle" ? 24 : 16;
  const red = show === "red" ? RED_ON : OFF;
  const green = show === "red" ? OFF : GREEN_ON;
  return (
    <g>
      <rect x={x - 1} y={y + 33} width="2" height="10" fill={HOUSING} />
      <rect x={x - w / 2} y={y} width={w} height="34" rx="2.5" fill={HOUSING} />
      {extra === "horse" ? (
        <>
          <HorseRider x={x} y={y + 9} color={red} />
          <HorseRider x={x} y={y + 25} color={green} />
        </>
      ) : (
        <>
          <Standing x={x} y={y + 9} color={red} />
          <Walking x={extra === "cycle" ? x - 5 : x} y={y + 25} color={green} />
          {extra === "cycle" && <Cycle x={x + 5} y={y + 24} color={green} />}
        </>
      )}
      {show === "flashing" && <Rays x={x + w / 2 - 6} y={y + 25} />}
    </g>
  );
}

function PushButton({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 1} y={y + 9} width="2" height="10" fill={HOUSING} />
      <rect x={x - 5} y={y} width="10" height="10" rx="1.5" fill={YELLOW} stroke={HOUSING} strokeWidth="1" />
      <circle cx={x} cy={y + 5} r="2.2" fill={HOUSING} />
    </g>
  );
}

function HorseTop({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="3" rx="5.5" ry="12" fill="#7a4e2d" />
      <ellipse cx="0" cy="-11" rx="2.8" ry="5" fill="#6a4226" />
      <circle cx="0" cy="1" r="4.4" fill="#2f3b52" />
      <circle cx="0" cy="1" r="2.5" fill="#111" />
    </g>
  );
}

/** Railing drawn as a line with posts. */
function Railing({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / 8));
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6b7078" strokeWidth="2.2" />
      {Array.from({ length: n + 1 }, (_, k) => (
        <circle key={k} cx={x1 + ((x2 - x1) * k) / n} cy={y1 + ((y2 - y1) * k) / n} r="1.6" fill="#55595f" />
      ))}
    </g>
  );
}

/** Label on a pavement with a leader line to the feature it names. */
function Callout({ x, y, text, anchor = "start", line }: { x: number; y: number; text: string; anchor?: "start" | "end" | "middle"; line?: [number, number, number, number] }) {
  return (
    <g>
      {line && (
        <>
          <line x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} stroke={LEADER} strokeWidth="1" />
          <circle cx={line[2]} cy={line[3]} r="2.2" fill={PAINT} stroke={HOUSING} strokeWidth="1" />
        </>
      )}
      <text x={x} y={y} textAnchor={anchor} fontSize="10.5" fontWeight="700" fill={INK} stroke={PAVE} strokeWidth="3" paintOrder="stroke" strokeLinejoin="round">
        {text}
      </text>
    </g>
  );
}

const east = (x: number, color = BLUE) => <Car x={x} y={85} angle={90} color={color} />;
const west = (x: number, color = SILVER) => <Car x={x} y={135} angle={-90} color={color} />;

function Zebra() {
  return (
    <>
      <Road />
      <ZigZags left={120} right={200} />
      <Stripes x={140} w={40} />
      <GiveWay x={131} lane="top" />
      <GiveWay x={186} lane="bottom" />
      <Beacon x={134} base={56} />
      <Beacon x={186} base={204} />
      {east(102)}
      {west(222)}
      <Person x={160} y={96} />
      <Person x={168} y={178} color="#7c3aed" />
      <Callout x={14} y={24} text="Belisha beacon" line={[96, 21, 128, 28]} />
      <Callout x={14} y={210} text="Zig-zag lines" line={[44, 200, 52, 154]} />
      <Callout x={306} y={210} text="Give way line" anchor="end" line={[236, 200, 188, 152]} />
    </>
  );
}

function Parallel() {
  return (
    <>
      <Road />
      <ZigZags left={112} right={208} />
      <Stripes x={132} w={30} />
      {[165, 187].map((x) => Array.from({ length: 12 }, (_, k) => <rect key={`${x}-${k}`} x={x} y={62.5 + k * 8.2} width="4.5" height="4.5" fill={PAINT} />))}
      <GiveWay x={123} lane="top" />
      <GiveWay x={201} lane="bottom" />
      <Beacon x={126} base={56} />
      <Beacon x={198} base={204} />
      {east(94)}
      {west(236)}
      <Person x={147} y={124} />
      <Bike x={177} y={96} />
      <Callout x={14} y={24} text="Zebra stripes" line={[88, 21, 140, 66]} />
      <Callout x={306} y={24} text="Cycle crossing" anchor="end" line={[226, 21, 182, 70]} />
      <Callout x={306} y={210} text="Belisha beacons" anchor="end" line={[222, 200, 204, 178]} />
    </>
  );
}

function SignalBase({ left, right, studs, stops, lit }: { left: number; right: number; studs: [number, number]; stops: [number, number]; lit: "red" | "flashing" }) {
  return (
    <>
      <Road />
      <ZigZags left={left} right={right} />
      <Studs x1={studs[0]} x2={studs[1]} />
      <StopLine x={stops[0]} lane="top" />
      <StopLine x={stops[1]} lane="bottom" />
      <Signal x={stops[0] - 8} y={8} lit={lit} />
      <Signal x={stops[1] + 11} y={168} lit={lit} />
      {east(stops[0] - 28)}
      {west(stops[1] + 32)}
    </>
  );
}

function Pelican() {
  return (
    <>
      <SignalBase left={112} right={208} studs={[140, 180]} stops={[124, 193]} lit="flashing" />
      <PedSignal x={170} y={8} show="flashing" />
      <PushButton x={150} y={172} />
      <Person x={160} y={88} />
      <Callout x={14} y={24} text="Flashing amber" line={[94, 21, 110, 26]} />
      <Callout x={306} y={24} text="Figures on the far side" anchor="end" line={[188, 21, 178, 24]} />
      <Callout x={14} y={210} text="Studs" line={[44, 202, 140, 150]} />
      <Callout x={124} y={214} text="Push button" anchor="end" line={[126, 210, 146, 182]} />
    </>
  );
}

function Puffin() {
  return (
    <>
      <SignalBase left={112} right={208} studs={[140, 180]} stops={[124, 193]} lit="red" />
      <rect x="135" y="61" width="50" height="98" fill="#8ec5ff" opacity="0.18" stroke="#8ec5ff" strokeWidth="1.2" strokeDasharray="4 3" />
      <PedSignal x={174} y={166} show="green" />
      <PushButton x={160} y={190} />
      <circle cx="174" cy="163" r="3" fill="#8ec5ff" stroke={HOUSING} strokeWidth="1" />
      <Person x={160} y={128} />
      <Callout x={14} y={24} text="No flashing amber" line={[108, 21, 110, 22]} />
      <Callout x={306} y={24} text="Sensors watch the crossing" anchor="end" line={[200, 30, 184, 66]} />
      <Callout x={14} y={210} text="Figures above the button" line={[140, 206, 164, 194]} />
    </>
  );
}

function Toucan() {
  return (
    <>
      <SignalBase left={104} right={216} studs={[130, 190]} stops={[114, 203]} lit="red" />
      <rect x="150" y="0" width="22" height="58" fill="#a4553d" opacity="0.55" />
      <rect x="136" y="162" width="22" height="58" fill="#a4553d" opacity="0.55" />
      <PedSignal x={180} y={168} show="green" extra="cycle" />
      <Bike x={172} y={92} />
      <Person x={146} y={120} />
      <Callout x={306} y={24} text="Cyclists ride across" anchor="end" line={[196, 21, 176, 84]} />
      <Callout x={14} y={210} text="Green cycle and figure" line={[134, 206, 170, 196]} />
    </>
  );
}

function Equestrian() {
  return (
    <>
      <SignalBase left={108} right={212} studs={[134, 186]} stops={[118, 199]} lit="red" />
      <Railing x1={128} y1={14} x2={128} y2={55} />
      <Railing x1={192} y1={14} x2={192} y2={55} />
      <Railing x1={128} y1={165} x2={128} y2={204} />
      <Railing x1={192} y1={165} x2={192} y2={204} />
      <PedSignal x={170} y={172} show="green" extra="horse" />
      {/* One post with a button at the usual height and one up where a rider can reach it. */}
      <rect x="185" y="168" width="2" height="48" fill={HOUSING} />
      <PushButton x={186} y={163} />
      <PushButton x={186} y={196} />
      <HorseTop x={160} y={104} />
      <Callout x={306} y={24} text="Pavement barriers" anchor="end" line={[214, 21, 192, 30]} />
      <Callout x={14} y={210} text="Horse and rider signal" line={[130, 206, 162, 196]} />
      <Callout x={14} y={182} text="High button" line={[80, 178, 181, 167]} />
    </>
  );
}

function SchoolPatrol() {
  return (
    <>
      <Road centre />
      {zig(200, W - 8, 66, YELLOW)}
      <rect x="16" y="6" width="44" height="40" rx="3" fill="#fff" />
      <image href="/signs/545.webp" x="18" y="8" width="40" height="36" preserveAspectRatio="xMidYMid meet" />
      <rect x="37" y="46" width="2" height="10" fill={HOUSING} />
      {east(104)}
      {west(224)}
      <line x1="160" y1="46" x2="160" y2="96" stroke={HOUSING} strokeWidth="2" />
      <circle cx="160" cy="29" r="17" fill="#fff" stroke={RED_ON} strokeWidth="3" />
      <text x="160" y="30" textAnchor="middle" fontSize="8.5" fontWeight="800" fill={HOUSING}>STOP</text>
      <text x="160" y="38.5" textAnchor="middle" fontSize="5.6" fontWeight="700" letterSpacing="0" fill={HOUSING}>children</text>
      <Person x={160} y={100} color="#c8d400" />
      {[[146, 118], [172, 124], [154, 140]].map(([x, y]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(0.8)`}>
          <Person x={0} y={0} color="#7c3aed" />
        </g>
      ))}
      <Callout x={68} y={26} text="Warning sign" />
      <Callout x={306} y={24} text="'Stop for children' sign" anchor="end" line={[184, 21, 176, 27]} />
      <Callout x={306} y={210} text="School keep clear" anchor="end" line={[262, 200, 262, 70]} />
    </>
  );
}

const SCENES: Record<CrossingId, { label: string; draw: () => React.ReactElement }> = {
  zebra: { label: "Zebra crossing: black and white stripes, Belisha beacons at each end, zig-zags and give way lines", draw: Zebra },
  parallel: { label: "Parallel crossing: zebra stripes with a cycle crossing alongside marked by white squares", draw: Parallel },
  pelican: { label: "Pelican crossing: drivers see flashing amber while the pedestrian signal on the far side flashes green", draw: Pelican },
  puffin: { label: "Puffin crossing: sensors watch the crossing and the pedestrian signal sits above the button on the near side", draw: Puffin },
  toucan: { label: "Toucan crossing: a wide signal crossing where a cyclist rides across beside a pedestrian, with a green cycle signal", draw: Toucan },
  equestrian: { label: "Equestrian crossing: a horse and rider crossing between pavement barriers, with a horse signal and a high button", draw: Equestrian },
  "school-patrol": { label: "School crossing patrol holding a Stop for children sign in the road while children cross and cars wait", draw: SchoolPatrol },
};

export function CrossingScene({ id }: { id: CrossingId }) {
  const scene = SCENES[id];
  return (
    <svg viewBox={`0 0 ${W} 220`} role="img" aria-label={scene.label} className="block h-auto w-full" style={{ fontFamily: "inherit" }}>
      <scene.draw />
    </svg>
  );
}
