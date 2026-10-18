import { Link } from "react-router";
import { Clapperboard, Moon, Play, TriangleAlert } from "lucide-react";
import { ErrorBlock, LoadingBlock, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { Illustration } from "@/illustrations";
import { useClips } from "@/lib/queries";
import { formatDuration } from "@/lib/utils";

export default function HazardHome() {
  const clips = useClips();
  return (
    <div className="animate-rise">
      <PageHeader
        title="Hazard perception"
        description="The second part of the theory test. You watch clips filmed from a driver's point of view and click when you see a hazard developing."
        actions={
          <Button asChild>
            <Link to="/hazard-perception/run">
              <Play /> Run all clips
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>How the real test works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["14", "video clips"],
                ["15", "developing hazards (one clip has two)"],
                ["5", "points max per hazard"],
                ["44/75", "to pass"],
              ].map(([n, l]) => (
                <li key={l} className="rounded-lg bg-surface-2 p-3">
                  <div className="text-xl font-bold">{n}</div>
                  <div className="text-xs text-muted">{l}</div>
                </li>
              ))}
            </ul>
            <ul className="space-y-2 text-[15px]">
              <li>The sooner you click once a hazard starts to develop, the more points you get: 5 down to 1 across the scoring window.</li>
              <li>Wrong clicks don't lose points, but clicking constantly or in a rhythm scores zero for that clip.</li>
              <li>You only get one go at each clip and can't go back.</li>
              <li>You need to pass both parts of the theory test in the same sitting.</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Potential or developing?</CardTitle>
            <p className="text-sm text-muted">A potential hazard might cause a problem. A developing one is starting to, and you'd need to slow down, stop or steer round it.</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border border-border">
              <Illustration id="hazard-types" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div role="note" className="my-6 flex gap-3 rounded-[var(--radius-card)] border border-warning/40 bg-warning-soft p-4 text-[15px]">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
        <p>
          These practice clips are original animations made for this app. They aren't DVSA footage, and real clips are filmed video that look quite different. Use them to practise timing and the habit of scanning, then try the official practice clips as well. Licensed MP4 clips can be added in Settings.
        </p>
      </div>

      <h2 className="mb-3 text-lg font-bold">Practice clips</h2>
      {clips.isPending ? (
        <LoadingBlock rows={3} />
      ) : clips.isError ? (
        <ErrorBlock error={clips.error} onRetry={() => clips.refetch()} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {clips.data.map((c) => (
            <li key={c.id}>
              <Link to={`/hazard-perception/${c.id}`} className="flex h-full flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card hover:border-border-strong">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold">{c.title}</h3>
                  {c.scenario?.time === "night" ? <Moon className="size-4 shrink-0 text-muted" /> : <Clapperboard className="size-4 shrink-0 text-muted" />}
                </div>
                <p className="text-sm text-muted">{c.description}</p>
                <div className="mt-auto flex flex-wrap items-center gap-2 pt-1 text-xs text-muted">
                  <span>{formatDuration(c.durationMs)}</span>
                  <span>·</span>
                  <span>{c.hazardCount === 1 ? "1 hazard" : `${c.hazardCount} hazards`}</span>
                  {c.kind === "video" && <Badge variant="primary">Video</Badge>}
                  {c.best !== null && c.best !== undefined && (
                    <Badge variant={c.best >= (c.max ?? 5) * 0.6 ? "success" : "default"} className="ml-auto">
                      Best {c.best}/{c.max}
                    </Badge>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
