import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, RotateCcw } from "lucide-react";
import { ErrorBlock, LoadingBlock, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipPlayer } from "@/hazard/ClipPlayer";
import { api, type ClipAttemptResult, type ClipSummary } from "@/lib/api";
import { keys, useInvalidateProgress } from "@/lib/queries";
import { cn } from "@/lib/utils";

const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

export function HazardResult({ clip, result, clicks }: { clip: ClipSummary; result: ClipAttemptResult; clicks: number[] }) {
  const r = result.result;
  return (
    <div className="space-y-4 animate-rise">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-bold tabular-nums">
          {r.total}/{r.max}
        </span>
        <span className="text-muted">
          {clicks.length} {clicks.length === 1 ? "click" : "clicks"}
        </span>
      </div>
      {r.flagged && (
        <div role="alert" className="flex gap-2 rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
          <span>
            <strong>Scored zero for clicking too much.</strong> {r.reason} In the real test this would also score nothing for the clip.
          </span>
        </div>
      )}
      <ul className="space-y-3">
        {result.hazards.map((h) => (
          <li key={h.id} className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold">{h.label}</div>
                <div className="text-sm text-muted">
                  Scoring window {secs(h.startMs)} to {secs(h.endMs)}
                  {h.clickMs !== null ? ` · you clicked at ${secs(h.clickMs)}` : " · no click in the window"}
                </div>
              </div>
              <span className={cn("shrink-0 rounded-md px-2 py-1 text-sm font-bold tabular-nums", h.score >= 4 ? "bg-success-soft text-success" : h.score >= 1 ? "bg-primary-soft text-primary" : "bg-danger-soft text-danger")}>
                {h.score} / 5
              </span>
            </div>
            <p className="mt-2 text-[15px]">{h.explanation}</p>
          </li>
        ))}
      </ul>
      <div>
        <h3 className="mb-2 font-bold">Watch it back</h3>
        <p className="mb-2 text-sm text-muted">The shaded bar shows the scoring window, from 5 points (darkest) to 1. Flags show where you clicked.</p>
        <ClipPlayer clip={clip} mode="review" windows={result.hazards} reviewClicks={clicks} />
      </div>
    </div>
  );
}

export default function HazardClipPage() {
  const { clipId = "" } = useParams();
  const qc = useQueryClient();
  const invalidate = useInvalidateProgress();
  const clip = useQuery({ queryKey: keys.clip(clipId), queryFn: () => api.get<ClipSummary>(`/hazard/clips/${clipId}`), staleTime: Infinity });
  const [attempt, setAttempt] = useState(0);
  const [clicks, setClicks] = useState<number[]>([]);
  const submit = useMutation({
    mutationFn: (c: number[]) => api.post<ClipAttemptResult>(`/hazard/clips/${clipId}/attempts`, { clicks: c }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.clips });
      invalidate();
    },
  });

  if (clip.isPending) return <LoadingBlock rows={3} />;
  if (clip.isError) return <ErrorBlock error={clip.error} onRetry={() => clip.refetch()} />;

  return (
    <div className="mx-auto max-w-4xl animate-rise">
      <PageHeader back={{ to: "/hazard-perception", label: "Hazard perception" }} title={clip.data.title} description={clip.data.description} />
      {!submit.data ? (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <ClipPlayer
              key={attempt}
              clip={clip.data}
              mode="test"
              onComplete={(c) => {
                setClicks(c);
                submit.mutate(c);
              }}
            />
            {submit.isPending && <p className="text-sm text-muted">Scoring…</p>}
            {submit.isError && (
              <p className="text-sm text-danger">
                Couldn't save your attempt: {(submit.error as Error).message}{" "}
                <Button variant="link" size="sm" onClick={() => submit.mutate(clicks)}>
                  Try again
                </Button>
              </p>
            )}
            <p className="text-xs text-muted">{clip.data.licence}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-5">
            <HazardResult clip={clip.data} result={submit.data} clicks={clicks} />
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                onClick={() => {
                  submit.reset();
                  setAttempt((a) => a + 1);
                }}
              >
                <RotateCcw /> Try this clip again
              </Button>
              <Button asChild variant="outline">
                <Link to="/hazard-perception">Choose another clip</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
