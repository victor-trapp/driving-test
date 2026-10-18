import { Link } from "react-router";
import { BookOpen, Lightbulb, ListChecks } from "lucide-react";
import { CROSSING_RULES, CROSSINGS, LIGHT_SEQUENCES } from "@content/crossings";
import { signById } from "@content/signs";
import type { Crossing } from "@content/types";
import { PageHeader, RefLinks, RichText } from "@/components/common";
import { SignImage } from "@/components/SignImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { CrossingScene } from "@/illustrations/crossings";

type Lamp = (typeof LIGHT_SEQUENCES)[keyof typeof LIGHT_SEQUENCES][number]["lamps"][number];

const LAMP_NAMES: Record<string, string> = {
  red: "Red",
  amber: "Amber",
  green: "Green",
  "amber-flashing": "Flashing amber",
  "red,amber": "Red and amber",
};
const lampName = (lamps: readonly Lamp[]) => LAMP_NAMES[lamps.join(",")] ?? lamps.join(" and ");

const CONTROL_BADGE = { "Give way": "warning", "Traffic lights": "primary", "School patrol": "accent" } as const;

/** A traffic light head showing which lamps are lit. Flashing amber pulses unless reduced motion is on. */
function LampHead({ lamps, className }: { lamps: readonly Lamp[]; className?: string }) {
  const flashing = lamps.includes("amber-flashing");
  const lit = (c: "red" | "amber" | "green") => lamps.includes(c) || (c === "amber" && flashing);
  const fill = (c: "red" | "amber" | "green") => (lit(c) ? { red: "#e5322d", amber: "#f7a600", green: "#2fb35a" }[c] : "#2c2f33");
  return (
    <svg viewBox="0 0 24 60" className={className} aria-hidden="true">
      <rect x="1" y="1" width="22" height="58" rx="5" fill="#15171a" />
      <circle cx="12" cy="12" r="7" fill={fill("red")} />
      <circle cx="12" cy="30" r="7" fill={fill("amber")} className={flashing ? "motion-safe:animate-pulse" : undefined} />
      <circle cx="12" cy="48" r="7" fill={fill("green")} />
    </svg>
  );
}

function Sequence({ kind }: { kind: keyof typeof LIGHT_SEQUENCES }) {
  const steps = LIGHT_SEQUENCES[kind];
  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Lights you'll see</h3>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-2" aria-label={`Light sequence: ${steps.map((s) => lampName(s.lamps)).join(", then ")}, then red again`}>
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <span className="flex flex-col items-center gap-1">
              <LampHead lamps={s.lamps} className="h-11 w-5" />
              <span className="text-[11px] font-semibold leading-none">{lampName(s.lamps)}</span>
            </span>
            {i < steps.length - 1 && <span className="pb-4 text-muted" aria-hidden="true">→</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it) => (
        <li key={it} className="flex gap-2.5 text-[15px] leading-relaxed">
          <span className="mt-[9px] h-1.5 w-2.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
          <span>
            <RichText text={it} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function CrossingCard({ c }: { c: Crossing }) {
  const signs = c.signs.map((id) => signById(id)).filter((s) => s !== undefined);
  return (
    <Card id={c.id} className="flex scroll-mt-20 flex-col overflow-hidden">
      <div className="border-b border-border">
        <CrossingScene id={c.id} />
      </div>
      <CardContent className="flex flex-1 flex-col gap-5 pt-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">{c.name}</h2>
            <Badge variant={CONTROL_BADGE[c.control]}>{c.control}</Badge>
          </div>
          {c.aka && <p className="mt-0.5 text-sm text-muted">{c.aka}</p>}
          <p className="mt-2 text-[15px]">
            <span className="font-semibold">Who crosses: </span>
            {c.users}
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">How to spot it</h3>
          <Bullets items={c.spot} />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">What you do as a driver</h3>
          <Bullets items={c.driver} />
        </div>

        {c.lights && <Sequence kind={c.lights} />}

        <div className="flex gap-2.5 rounded-lg bg-warning-soft p-3">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden="true" />
          <p className="text-[15px]">
            <span className="font-bold">Remember: </span>
            {c.remember}
          </p>
        </div>

        {signs.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">Signs and markings</h3>
            <ul className="flex flex-wrap gap-3">
              {signs.map((s) => (
                <li key={s.id} className="flex w-24 flex-col items-center gap-1 text-center">
                  <SignImage sign={s} size="sm" className="border border-border" />
                  <span className="text-xs font-semibold leading-snug">{s.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <RefLinks refs={c.refs} className="mt-auto border-t border-border pt-4" />
      </CardContent>
    </Card>
  );
}

export default function Crossings() {
  return (
    <div className="animate-rise">
      <PageHeader
        back={{ to: "/road-signs", label: "Road signs" }}
        title="Pedestrian crossings"
        description="Every kind of crossing you'll meet in Great Britain, how to tell them apart, and what you have to do as a driver at each one."
      />

      <nav aria-label="Jump to a crossing" className="mb-6 flex flex-wrap gap-1.5">
        {CROSSINGS.map((c) => (
          <a key={c.id} href={`#${c.id}`} className="rounded-full border border-border-strong bg-surface px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground">
            {c.name.replace(/ crossing$/, "")}
          </a>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-2">
        {CROSSINGS.map((c) => (
          <CrossingCard key={c.id} c={c} />
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Light sequences</CardTitle>
            <p className="text-sm text-muted">What catches people out: only a pelican has a flashing amber. The others work like ordinary traffic lights.</p>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            {(
              [
                ["pelican", "Pelican"],
                ["standard", "Puffin, toucan and equestrian"],
              ] as const
            ).map(([kind, title]) => (
              <div key={kind}>
                <h3 className="mb-3 font-bold">{title}</h3>
                <ol className="space-y-3">
                  {LIGHT_SEQUENCES[kind].map((s, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <LampHead lamps={s.lamps} className="h-14 w-6 shrink-0" />
                      <div>
                        <div className="font-semibold">{lampName(s.lamps)}</div>
                        <div className="text-sm text-muted">{s.meaning}</div>
                      </div>
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-sm text-muted">Then back to red.</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">At every crossing</CardTitle>
            <p className="text-sm text-muted">These apply whatever kind of crossing it is.</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {CROSSING_RULES.map((r) => (
                <li key={r.text} className="flex gap-2.5 text-[15px] leading-relaxed">
                  <span className="mt-[9px] h-1.5 w-2.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                  <span>
                    <RichText text={r.text} />{" "}
                    <a href={r.ref.url} target="_blank" rel="noreferrer noopener" className="whitespace-nowrap text-sm font-semibold text-primary hover:underline">
                      {r.ref.label.replace(/^Highway Code r/, "R")}
                      <span className="sr-only"> (opens GOV.UK in a new tab)</span>
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/learn/rules-of-the-road/road-crossings">
            <BookOpen /> Lesson: traffic lights and crossings
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/practice?topic=rules-of-the-road">
            <ListChecks /> Practise Rules of the Road questions
          </Link>
        </Button>
      </div>
    </div>
  );
}
