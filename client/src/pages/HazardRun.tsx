import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleX, Play } from "lucide-react";
import { HAZARD_TEST } from "@shared/exam";
import { ErrorBlock, LoadingBlock, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { ClipPlayer } from "@/hazard/ClipPlayer";
import { api, type ClipAttemptResult } from "@/lib/api";
import { keys, useClips, useInvalidateProgress } from "@/lib/queries";
import { cn, uuid } from "@/lib/utils";

// Runs every clip back to back like the real test, then shows the total. Our library has
// fewer clips than the real 14, so the pass line is scaled to the same proportion (44/75).
export default function HazardRun() {
  const clips = useClips();
  const qc = useQueryClient();
  const invalidate = useInvalidateProgress();
  const runId = useMemo(() => uuid(), []);
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<ClipAttemptResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (clips.isPending) return <LoadingBlock rows={3} />;
  if (clips.isError) return <ErrorBlock error={clips.error} onRetry={() => clips.refetch()} />;
  const list = clips.data;
  const max = list.reduce((a, c) => a + c.hazardCount * HAZARD_TEST.maxPointsPerHazard, 0);
  const passLine = Math.ceil((HAZARD_TEST.passMark / HAZARD_TEST.maxScore) * max);
  const done = results.length === list.length;
  const total = results.reduce((a, r) => a + r.result.total, 0);

  const onComplete = async (clicks: number[]) => {
    try {
      const r = await api.post<ClipAttemptResult>(`/hazard/clips/${list[i].id}/attempts`, { clicks, runId });
      setResults((prev) => [...prev, r]);
      setError(null);
      if (i + 1 < list.length) setI(i + 1);
      else {
        qc.invalidateQueries({ queryKey: keys.clips });
        invalidate();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (!started) {
    return (
      <div className="mx-auto max-w-3xl animate-rise">
        <PageHeader back={{ to: "/hazard-perception", label: "Hazard perception" }} title="Run all clips" description={`${list.length} clips back to back, scored at the end. There's no going back once a clip has played, just like the real test.`} />
        <Card>
          <CardContent className="space-y-3 pt-5 text-[15px]">
            <p>
              Maximum score here is {max} ({list.reduce((a, c) => a + c.hazardCount, 0)} hazards). The real test has 14 clips and a pass mark of 44 out of 75. To keep the same standard, the practice pass line here is <strong>{passLine}/{max}</strong>.
            </p>
            <Button size="lg" onClick={() => setStarted(true)}>
              <Play /> Start
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    const passed = total >= passLine;
    return (
      <div className="mx-auto max-w-3xl space-y-4 animate-rise">
        <PageHeader back={{ to: "/hazard-perception", label: "Hazard perception" }} title="Results" />
        <Card className={cn("border-2", passed ? "border-success" : "border-danger")}>
          <CardContent className="flex items-center gap-4 pt-5">
            {passed ? <CircleCheck className="size-12 text-success" /> : <CircleX className="size-12 text-danger" />}
            <div>
              <div className={cn("text-2xl font-bold", passed ? "text-success" : "text-danger")}>{passed ? "Above the pass line" : "Below the pass line"}</div>
              <p>
                {total} out of {max}. Practice pass line {passLine} (same proportion as 44/75).
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clip by clip</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {results.map((r, k) => (
                <li key={r.clipId} className="flex items-center justify-between gap-3 py-2.5">
                  <Link to={`/hazard-perception/${r.clipId}`} className="font-semibold hover:text-primary">
                    {k + 1}. {list.find((c) => c.id === r.clipId)?.title}
                  </Link>
                  <span className="text-sm tabular-nums">
                    {r.result.flagged && <span className="mr-2 text-danger">pattern clicking</span>}
                    <strong>{r.result.total}</strong>/{r.result.max}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl animate-rise">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-semibold">
          Clip {i + 1} of {list.length}
        </span>
        <span className="text-muted">{list[i].title}</span>
      </div>
      <Progress value={(i / list.length) * 100} className="mb-4" label="Clips completed" />
      <ClipPlayer key={list[i].id} clip={list[i]} mode="test" onComplete={onComplete} />
      {error && <p className="mt-3 text-sm text-danger">Couldn't save that clip: {error}</p>}
    </div>
  );
}
