import { useState } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleX, Flag, Timer } from "lucide-react";
import { ErrorBlock, LoadingBlock, StatTile } from "@/components/common";
import { Explanation, QuestionView } from "@/components/QuestionView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Segmented } from "@/components/ui/misc";
import { api, type MockResults } from "@/lib/api";
import { keys } from "@/lib/queries";
import { cn, formatDateTime, formatDuration } from "@/lib/utils";

type Filter = "all" | "incorrect" | "unanswered" | "flagged";

export default function MockResultsPage() {
  const { id = "" } = useParams();
  const r = useQuery({ queryKey: keys.mockResults(id), queryFn: () => api.get<MockResults>(`/mock-tests/${id}/results`) });
  const [filter, setFilter] = useState<Filter>("incorrect");

  if (r.isPending) return <LoadingBlock rows={5} />;
  if (r.isError) return <ErrorBlock error={r.error} onRetry={() => r.refetch()} />;
  const d = r.data;
  const items = d.items
    .map((it, i) => ({ ...it, n: i + 1 }))
    .filter((it) => (filter === "all" ? true : filter === "incorrect" ? it.selected && !it.isCorrect : filter === "unanswered" ? !it.selected : it.flagged));

  return (
    <div className="space-y-6 animate-rise">
      <Link to="/mock-tests" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        ← Mock tests
      </Link>

      <Card className={cn("overflow-hidden border-2", d.passed ? "border-success" : "border-danger")}>
        <div className={cn("flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center", d.passed ? "bg-success-soft" : "bg-danger-soft")}>
          <div className={cn("grid size-16 shrink-0 place-items-center rounded-full", d.passed ? "bg-success text-white dark:text-[#0c1f15]" : "bg-danger text-white dark:text-[#1f0c0b]")}>
            {d.passed ? <CircleCheck className="size-9" /> : <CircleX className="size-9" />}
          </div>
          <div className="flex-1">
            <div className={cn("text-3xl font-bold tracking-wide", d.passed ? "text-success" : "text-danger")}>{d.passed ? "PASS" : "FAIL"}</div>
            <p className="mt-1 text-[15px]">
              You scored <strong>{d.score} out of {d.total}</strong> ({d.percent}%). The pass mark is {d.passMark}.
              {!d.passed && d.score < d.passMark && ` You needed ${d.passMark - d.score} more.`}
            </p>
            {d.timedOut && <p className="mt-1 text-sm text-muted">Time ran out, so the test was submitted automatically.</p>}
          </div>
          <div className="text-sm text-muted">{formatDateTime(d.submittedAt)}</div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatTile label="Score" value={`${d.score}/${d.total}`} />
        <StatTile label="Correct" value={d.correct} />
        <StatTile label="Incorrect" value={d.incorrect} />
        <StatTile label="Unanswered" value={d.unanswered} />
        <StatTile label="Time used" value={<span className="inline-flex items-center gap-1.5"><Timer className="size-5 text-muted" />{formatDuration(d.timeUsedMs)}</span>} hint="of 57 minutes" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>By topic</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {d.topics.map((t) => (
                <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_120px_48px] items-center gap-3 text-sm">
                  <span className="truncate">{t.title}</span>
                  <span className="h-2 rounded-full bg-surface-3">
                    <span className={cn("block h-2 rounded-full", t.percent >= 86 ? "bg-success" : t.percent >= 60 ? "bg-primary" : "bg-danger")} style={{ width: `${t.percent}%` }} />
                  </span>
                  <span className="text-right tabular-nums font-semibold">
                    {t.correct}/{t.total}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>What to revise</CardTitle>
          </CardHeader>
          <CardContent>
            {d.revise.length === 0 ? (
              <p className="text-sm text-muted">No topic dropped below the pass rate. Keep taking mocks to make sure it's consistent.</p>
            ) : (
              <ul className="space-y-2">
                {d.revise.map((tid) => {
                  const t = d.topics.find((x) => x.id === tid)!;
                  return (
                    <li key={tid} className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{t.title}</span>
                      <span className="flex gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link to={`/learn/${tid}`}>Lessons</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/practice?topic=${tid}`}>Practise</Link>
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold">Review your answers</h2>
          <Segmented<Filter>
            label="Show questions"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "incorrect", label: `Wrong (${d.incorrect})` },
              { value: "unanswered", label: `Unanswered (${d.unanswered})` },
              { value: "flagged", label: `Flagged (${d.items.filter((i) => i.flagged).length})` },
              { value: "all", label: "All" },
            ]}
          />
        </div>
        {items.length === 0 ? (
          <p className="rounded-lg bg-surface-2 p-4 text-sm text-muted">Nothing to show for this filter.</p>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <Card key={it.id}>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-muted">Question {it.n}</span>
                    {it.flagged && (
                      <Badge variant="accent">
                        <Flag /> Flagged
                      </Badge>
                    )}
                  </div>
                  <QuestionView question={it} selected={it.selected ?? []} correctKeys={it.correctKeys} disabled compact />
                  <Explanation correct={it.isCorrect} unanswered={!it.selected} explanation={it.explanation} hc={it.hc} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
