import { useId } from "react";
import type { Sign } from "@content/types";
import { cn } from "@/lib/utils";

// Original drawings of road markings, as seen from above. Asphalt uses a fixed dark
// grey in both themes because that's what the road looks like.
const ASPHALT = "#4a4f55";
const WHITE = "#f4f4f2";
const YELLOW = "#f2c300";
const RED = "#c8102e";
const KERB = "#b9b4aa";
const PAVE = "#d8d3c8";

function Tile({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 160 120" role="img" aria-label={label} className="h-full w-full">
      <rect width="160" height="120" fill={ASPHALT} />
      {children}
    </svg>
  );
}

const dashes = (y: number, len: number, gap: number, color = WHITE, w = 3) =>
  Array.from({ length: Math.ceil(160 / (len + gap)) + 1 }, (_, i) => <rect key={`${y}-${i}`} x={i * (len + gap) - 6} y={y} width={len} height={w} fill={color} />);

const kerbSide = (
  <>
    <rect y="96" width="160" height="24" fill={PAVE} />
    <rect y="92" width="160" height="4" fill={KERB} />
  </>
);

function BoxJunctionTile({ label }: { label: string }) {
  const clip = `bj${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const lines = Array.from({ length: 13 }, (_, i) => -100 + i * 20);
  return (
    <Tile label={label}>
      <clipPath id={clip}>
        <rect x="20" y="10" width="120" height="100" />
      </clipPath>
      <g clipPath={`url(#${clip})`} stroke={YELLOW} strokeWidth="2.5">
        {lines.map((x) => (
          <g key={x}>
            <line x1={x} y1="10" x2={x + 100} y2="110" />
            <line x1={x} y1="110" x2={x + 100} y2="10" />
          </g>
        ))}
      </g>
      <rect x="20" y="10" width="120" height="100" fill="none" stroke={YELLOW} strokeWidth="3" />
    </Tile>
  );
}

const MARKINGS: Record<string, (label: string) => React.ReactElement> = {
  "double-white-solid": (l) => (
    <Tile label={l}>
      {dashes(52, 22, 10)}
      <rect y="62" width="160" height="3" fill={WHITE} />
      <text x="8" y="100" fontSize="11" fill={WHITE} fontFamily="sans-serif">your side ↓ solid</text>
    </Tile>
  ),
  "double-white-broken": (l) => (
    <Tile label={l}>
      <rect y="52" width="160" height="3" fill={WHITE} />
      {dashes(62, 22, 10)}
      <text x="8" y="100" fontSize="11" fill={WHITE} fontFamily="sans-serif">your side ↓ broken</text>
    </Tile>
  ),
  "hazard-line": (l) => <Tile label={l}>{dashes(58, 40, 10)}</Tile>,
  "hatched-broken": (l) => (
    <Tile label={l}>
      {dashes(38, 14, 8)}
      {dashes(80, 14, 8)}
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={i * 20 - 10} y1="80" x2={i * 20 + 22} y2="41" stroke={WHITE} strokeWidth="3" />
      ))}
    </Tile>
  ),
  "hatched-solid": (l) => (
    <Tile label={l}>
      <rect y="38" width="160" height="3" fill={WHITE} />
      <rect y="80" width="160" height="3" fill={WHITE} />
      {Array.from({ length: 10 }, (_, i) => (
        <line key={i} x1={i * 20 - 10} y1="80" x2={i * 20 + 22} y2="41" stroke={WHITE} strokeWidth="3" />
      ))}
    </Tile>
  ),
  "give-way": (l) => (
    <Tile label={l}>
      <rect x="0" y="0" width="160" height="40" fill="#53585e" />
      {dashes(46, 14, 8, WHITE, 4)}
      {dashes(54, 14, 8, WHITE, 4)}
      <path d="M62 112 L98 112 L80 70 Z" fill="none" stroke={WHITE} strokeWidth="4" />
    </Tile>
  ),
  "stop-line": (l) => (
    <Tile label={l}>
      <rect x="0" y="0" width="160" height="40" fill="#53585e" />
      <rect y="46" width="160" height="7" fill={WHITE} />
      <text x="80" y="100" textAnchor="middle" fontSize="26" fontWeight="700" fill={WHITE} fontFamily="sans-serif">STOP</text>
    </Tile>
  ),
  "box-junction": (l) => <BoxJunctionTile label={l} />,
  zigzag: (l) => (
    <Tile label={l}>
      <polyline points={Array.from({ length: 9 }, (_, i) => `${i * 20},${i % 2 ? 78 : 88}`).join(" ")} fill="none" stroke={WHITE} strokeWidth="3" />
      <polyline points={Array.from({ length: 9 }, (_, i) => `${i * 20},${i % 2 ? 22 : 32}`).join(" ")} fill="none" stroke={WHITE} strokeWidth="3" />
      {dashes(54, 22, 10)}
    </Tile>
  ),
  "school-keep-clear": (l) => (
    <Tile label={l}>
      {kerbSide}
      <polyline points={Array.from({ length: 9 }, (_, i) => `${i * 20},${i % 2 ? 76 : 86}`).join(" ")} fill="none" stroke={YELLOW} strokeWidth="3" />
      <text x="80" y="44" textAnchor="middle" fontSize="13" fontWeight="700" fill={YELLOW} fontFamily="sans-serif">SCHOOL KEEP CLEAR</text>
    </Tile>
  ),
  "double-yellow": (l) => (
    <Tile label={l}>
      {kerbSide}
      <rect y="82" width="160" height="3" fill={YELLOW} />
      <rect y="87" width="160" height="3" fill={YELLOW} />
    </Tile>
  ),
  "single-yellow": (l) => (
    <Tile label={l}>
      {kerbSide}
      <rect y="85" width="160" height="3" fill={YELLOW} />
    </Tile>
  ),
  "double-red": (l) => (
    <Tile label={l}>
      {kerbSide}
      <rect y="82" width="160" height="3" fill={RED} />
      <rect y="87" width="160" height="3" fill={RED} />
    </Tile>
  ),
  "kerb-blips": (l) => (
    <Tile label={l}>
      {kerbSide}
      <rect y="85" width="160" height="3" fill={YELLOW} />
      {[40, 110].map((x) => (
        <g key={x}>
          <rect x={x} y="92" width="4" height="10" fill={YELLOW} />
          <rect x={x + 8} y="92" width="4" height="10" fill={YELLOW} />
        </g>
      ))}
    </Tile>
  ),
  "bus-lane": (l) => (
    <Tile label={l}>
      {kerbSide}
      <rect y="40" width="160" height="6" fill={WHITE} />
      <text x="80" y="76" textAnchor="middle" fontSize="20" fontWeight="700" fill={WHITE} fontFamily="sans-serif">BUS LANE</text>
    </Tile>
  ),
};

export function RoadMarking({ id, label, className }: { id: string; label: string; className?: string }) {
  const draw = MARKINGS[id];
  return <div className={cn("overflow-hidden rounded-md", className)}>{draw ? draw(label) : null}</div>;
}

/** Renders a library sign: the official DfT image or one of our marking drawings. */
export function SignImage({ sign, className, size = "md" }: { sign: Sign; className?: string; size?: "sm" | "md" | "lg" }) {
  const box = size === "sm" ? "h-16 w-20" : size === "lg" ? "h-48 w-56 sm:h-56 sm:w-64" : "h-28 w-32";
  if (sign.image.kind === "marking") {
    return <RoadMarking id={sign.image.id} label={sign.name} className={cn(box, "aspect-[4/3] w-auto", className)} />;
  }
  return (
    // White plate behind the sign so it reads the same in dark mode.
    <div className={cn("grid place-items-center rounded-md bg-white p-2", box, className)}>
      <img src={`/signs/${sign.image.file}.webp`} alt={sign.name} loading="lazy" decoding="async" className="h-full w-full object-contain" />
    </div>
  );
}
