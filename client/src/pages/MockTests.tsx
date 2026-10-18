import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleX, Clapperboard, Flag, Play, Timer } from "lucide-react";
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader, StatTile } from "@/components/common";
import { MockScoreChart } from "@/components/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/misc";
import { api, ApiError } from "@/lib/api";
import { keys, useMocks } from "@/lib/queries";
import { formatDateTime, formatDuration } from "@/lib/utils";

export default function MockTests() {
  const mocks = useMocks();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [discardOpen, setDiscardOpen] = useState(false);

  const create = useMutation({
    mutationFn: () => api.post<{ id: string }>("/mock-tests"),
    onSuccess: (r) => navigate(`/mock-tests/${r.id}`),
    onError: (e) => {
      if (e instanceof ApiError && e.code === "mock_in_progress") qc.invalidateQueries({ queryKey: keys.mocks });
    },
  });
  const discard = useMutation({
    mutationFn: (id: string) => api.del(`/mock-tests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.mocks }),
  });

  const finished = (mocks.data?.tests ?? []).filter((t) => t.status !== "in_progress");
  const passed = finished.filter((t) => t.passed).length;
  const active = mocks.data?.active;

  return (
    <div className="animate-rise">
      <PageHeader title="Mock tests" description="A timed practice version of the multiple-choice part of the GB car theory test." />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="grid gap-3 sm:grid-cols-3">
              <li className="rounded-lg bg-surface-2 p-3">
                <div className="text-2xl font-bold">50</div>
                <div className="text-sm text-muted">questions from every topic</div>
              </li>
              <li className="rounded-lg bg-surface-2 p-3">
                <div className="text-2xl font-bold">57 min</div>
                <div className="text-sm text-muted">it submits itself when time runs out</div>
              </li>
              <li className="rounded-lg bg-surface-2 p-3">
                <div className="text-2xl font-bold">43</div>
                <div className="text-sm text-muted">correct answers to pass</div>
              </li>
            </ul>
            <ul className="space-y-2 text-[15px]">
              <li className="flex gap-2">
                <Flag className="mt-0.5 size-4 shrink-0 text-muted" /> Flag questions to come back to, and change answers any time before you submit.
              </li>
              <li className="flex gap-2">
                <Timer className="mt-0.5 size-4 shrink-0 text-muted" /> You won't see whether you're right until the end, like the real thing.
              </li>
              <li className="flex gap-2">
                <Clapperboard className="mt-0.5 size-4 shrink-0 text-muted" />
                <span>
                  The real test has three questions about one short silent video. Here they're about one of our animated practice clips instead, so the format is close but the clip isn't real footage.
                </span>
              </li>
            </ul>
            {active ? (
              <div className="flex flex-wrap gap-2">
                <Button size="lg" asChild>
                  <Link to={`/mock-tests/${active}`}>
                    <Play /> Resume your test
                  </Link>
                </Button>
                <Button size="lg" variant="outline" onClick={() => setDiscardOpen(true)}>
                  Discard it
                </Button>
                <ConfirmDialog
                  open={discardOpen}
                  onOpenChange={setDiscardOpen}
                  title="Discard this mock test?"
                  description="Your answers so far will be deleted and it won't count towards your stats."
                  confirmLabel="Discard test"
                  destructive
                  onConfirm={() => discard.mutate(active)}
                />
              </div>
            ) : (
              <Button size="lg" onClick={() => create.mutate()} disabled={create.isPending}>
                <Play /> Start a mock test
              </Button>
            )}
            {create.isError && !(create.error instanceof ApiError && create.error.code === "mock_in_progress") && <p className="text-sm text-danger">{create.error.message}</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Taken" value={finished.length} />
            <StatTile label="Passed" value={passed} />
            <StatTile label="Pass rate" value={finished.length ? `${Math.round((passed / finished.length) * 100)}%` : "–"} />
          </div>
          {finished.length > 0 && (
            <Card>
              <CardContent className="pt-5">
                <MockScoreChart data={[...finished].reverse().map((t) => ({ id: t.id, at: t.submittedAt ?? t.startedAt, score: t.score ?? 0, passed: Boolean(t.passed) }))} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">History</h2>
      {mocks.isPending ? (
        <LoadingBlock rows={2} />
      ) : mocks.isError ? (
        <ErrorBlock error={mocks.error} onRetry={() => mocks.refetch()} />
      ) : finished.length === 0 ? (
        <EmptyState icon={Timer} title="No mock tests yet">
          Your results will appear here with a full review of every question.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface">
          <table className="w-full min-w-[560px] text-[15px]">
            <thead className="bg-surface-2 text-left text-sm">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Score</th>
                <th className="px-4 py-2.5 font-semibold">Result</th>
                <th className="px-4 py-2.5 font-semibold">Time used</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {finished.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-4 py-2.5">{formatDateTime(t.submittedAt ?? t.startedAt)}</td>
                  <td className="px-4 py-2.5 font-semibold">{t.score}/50</td>
                  <td className="px-4 py-2.5">
                    {t.passed ? (
                      <Badge variant="success">
                        <CircleCheck /> Pass
                      </Badge>
                    ) : (
                      <Badge variant="danger">
                        <CircleX /> Fail
                      </Badge>
                    )}
                    {t.status === "expired" && <span className="ml-2 text-xs text-muted">timed out</span>}
                  </td>
                  <td className="px-4 py-2.5">{t.timeUsedMs ? formatDuration(t.timeUsedMs) : "–"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link to={`/mock-tests/${t.id}/results`} className="font-semibold text-primary hover:underline">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
