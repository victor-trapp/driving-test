import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Dot, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CircleCheck, CircleX } from "lucide-react";
import { cn, formatDate, formatDay } from "@/lib/utils";

// Chart conventions (from the dataviz checklist): one hue per single-series chart, no
// legend for one series, 2px lines, bars capped at 24px with rounded data ends,
// hairline recessive grid, text in ink colours only, tooltip on hover, table fallback.

const axisTick = { fill: "var(--muted)", fontSize: 12 };

/** Typed tooltip content: renders from the hovered row's data. */
function tip<T>(render: (row: T) => React.ReactNode) {
  return ({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) =>
    active && payload?.[0]?.payload ? render(payload[0].payload as T) : null;
}

function TipBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-lg">
      <div className="font-semibold">{title}</div>
      <div className="text-muted">{children}</div>
    </div>
  );
}

/** Wraps a chart with a "Show as table" toggle so the numbers are always available as text. */
export function ChartFrame({ title, description, table, children, className }: { title: string; description?: string; table: { head: string[]; rows: (string | number)[][] }; children: React.ReactNode; className?: string }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <figure className={cn("min-w-0", className)}>
      <figcaption className="mb-3 flex items-start justify-between gap-3">
        <span>
          <span className="block font-bold">{title}</span>
          {description && <span className="block text-sm text-muted">{description}</span>}
        </span>
        <button type="button" onClick={() => setAsTable((v) => !v)} className="shrink-0 cursor-pointer text-sm font-semibold text-primary hover:underline">
          {asTable ? "Show chart" : "Show as table"}
        </button>
      </figcaption>
      {asTable ? (
        <div className="max-h-64 overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-2 text-left">
              <tr>{table.head.map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}</tr>
            </thead>
            <tbody className="tabular-nums">
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {r.map((c, j) => <td key={j} className="px-3 py-1.5">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </figure>
  );
}

export function ActivityChart({ data }: { data: { day: string; answered: number; correct: number }[] }) {
  return (
    <ChartFrame
      title="Questions answered"
      description="Last 30 days"
      table={{ head: ["Day", "Answered", "Correct"], rows: data.filter((d) => d.answered > 0).map((d) => [formatDay(d.day), d.answered, d.correct]) }}
    >
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -6 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="day" tickFormatter={formatDay} tick={axisTick} tickLine={false} axisLine={false} interval={6} minTickGap={8} />
            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              content={tip<{ day: string; answered: number; correct: number }>((d) => (
                <TipBox title={formatDay(d.day)}>
                  {d.answered} answered, {d.correct} correct
                </TipBox>
              ))}
            />
            <Bar dataKey="answered" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function AccuracyTrend({ data }: { data: { day: string; answered: number; correct: number }[] }) {
  const points = data.filter((d) => d.answered > 0).map((d) => ({ day: d.day, accuracy: Math.round((d.correct / d.answered) * 100), answered: d.answered }));
  return (
    <ChartFrame
      title="Accuracy by day"
      description="Days you practised, last 30 days. The line at 86% is the pass rate for the real test."
      table={{ head: ["Day", "Accuracy", "Answered"], rows: points.map((p) => [formatDay(p.day), `${p.accuracy}%`, p.answered]) }}
    >
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -6 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="day" tickFormatter={formatDay} tick={axisTick} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={axisTick} tickLine={false} axisLine={false} width={40} unit="%" />
            <ReferenceLine y={86} stroke="var(--muted)" strokeDasharray="0" strokeWidth={1} label={{ value: "86%", position: "insideTopRight", fill: "var(--muted)", fontSize: 11 }} />
            <Tooltip
              content={tip<{ day: string; accuracy: number; answered: number }>((d) => (
                <TipBox title={formatDay(d.day)}>
                  {d.accuracy}% of {d.answered}
                </TipBox>
              ))}
            />
            <Line type="monotone" dataKey="accuracy" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 4, fill: "var(--chart-1)", stroke: "var(--surface)", strokeWidth: 2 }} activeDot={{ r: 6, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}

export function MockScoreChart({ data, passMark = 43 }: { data: { id: string; at: number; score: number; passed: boolean }[]; passMark?: number }) {
  const points = data.map((d, i) => ({ ...d, n: i + 1 }));
  return (
    <ChartFrame
      title="Mock test scores"
      description={`Out of 50. You need ${passMark} to pass.`}
      table={{ head: ["Test", "Date", "Score", "Result"], rows: points.map((p) => [p.n, formatDate(p.at), `${p.score}/50`, p.passed ? "Pass" : "Fail"]) }}
    >
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -6 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis dataKey="n" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis domain={[0, 50]} ticks={[0, 10, 20, 30, 43, 50]} tick={axisTick} tickLine={false} axisLine={false} width={40} />
            <ReferenceLine y={passMark} stroke="var(--muted)" strokeWidth={1} label={{ value: "Pass", position: "insideTopLeft", fill: "var(--muted)", fontSize: 11 }} />
            <Tooltip
              content={tip<{ n: number; at: number; score: number; passed: boolean }>((d) => (
                <TipBox title={`Test ${d.n} · ${formatDate(d.at)}`}>
                  {d.score}/50, {d.passed ? "pass" : "fail"}
                </TipBox>
              ))}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--chart-1)"
              strokeWidth={2}
              isAnimationActive={false}
              dot={(props: { cx?: number; cy?: number; payload?: { passed: boolean; id: string } }) => (
                <Dot key={props.payload?.id} cx={props.cx} cy={props.cy} r={5} fill={props.payload?.passed ? "var(--chart-pass)" : "var(--chart-fail)"} stroke="var(--surface)" strokeWidth={2} />
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <CircleCheck className="size-3.5 text-success" /> Pass
        </span>
        <span className="inline-flex items-center gap-1">
          <CircleX className="size-3.5 text-danger" /> Fail
        </span>
      </div>
    </ChartFrame>
  );
}

/** Dial for the readiness estimate. The only hero figure on the dashboard. */
export function ReadinessGauge({ score, size = 220 }: { score: number; size?: number }) {
  const r = 80;
  const cx = 100;
  const cy = 96;
  const start = Math.PI;
  const angle = (v: number) => start + (Math.PI * Math.max(0, Math.min(100, v))) / 100;
  const pt = (v: number, rad = r) => [cx + rad * Math.cos(angle(v)), cy + rad * Math.sin(angle(v))] as const;
  const arc = (from: number, to: number) => {
    const [x1, y1] = pt(from);
    const [x2, y2] = pt(to);
    // A half circle never needs the large-arc flag.
    return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  return (
    <svg viewBox="0 0 200 112" width={size} role="img" aria-label={`Estimated readiness ${score} out of 100`} className="max-w-full">
      <path d={arc(0, 100)} fill="none" stroke="var(--surface-3)" strokeWidth="14" strokeLinecap="round" />
      {/* the zone that roughly lines up with passing mocks */}
      <path d={arc(80, 100)} fill="none" stroke="color-mix(in srgb, var(--success) 30%, var(--surface-3))" strokeWidth="14" />
      {score > 0 && <path d={arc(0, score)} fill="none" stroke="var(--primary)" strokeWidth="14" strokeLinecap="round" />}
      {[0, 25, 50, 75, 100].map((v) => {
        const [x1, y1] = pt(v, r + 10);
        const [x2, y2] = pt(v, r + 15);
        return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--muted)" strokeWidth="1.5" />;
      })}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="40" fontWeight="700" fill="var(--foreground)">
        {score}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="11" fill="var(--muted)">
        out of 100
      </text>
    </svg>
  );
}
