import { Link, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, BookOpen, CircleCheck, CircleX, Flame, ListChecks, RotateCcw, Timer, TrendingDown, TrendingUp } from "lucide-react";
import { ActivityChart, MockScoreChart, ReadinessGauge } from "@/components/charts";
import { ErrorBlock, LoadingBlock, NATION_LABEL, StatTile } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { useProgress, useTopics } from "@/lib/queries";
import { formatDate, pct } from "@/lib/utils";

function greeting(name: string) {
  const h = new Date().getHours();
  const part = h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
  return name ? `${part}, ${name}` : `${part}`;
}

export default function Dashboard() {
  const progress = useProgress();
  const topics = useTopics();
  const navigate = useNavigate();
  const quick = useMutation({
    mutationFn: () => api.post<{ id: string }>("/practice", { mode: "mixed", size: 10 }),
    onSuccess: (r) => navigate(`/practice/s/${r.id}`),
  });

  if (progress.isPending) return <LoadingBlock rows={5} />;
  if (progress.isError) return <ErrorBlock error={progress.error} onRetry={() => progress.refetch()} />;
  const p = progress.data;
  const fresh = p.totals.answered === 0 && p.lessons.completed === 0;

  const nextTopic = topics.data?.find((t) => t.nextLesson);
  const continueHref = nextTopic?.nextLesson ? `/learn/${nextTopic.id}/${nextTopic.nextLesson.id}` : "/learn";

  return (
    <div className="space-y-6 animate-rise">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold sm:text-[28px]">{greeting(p.profile.name)}</h1>
        <p className="text-muted">
          {fresh ? "Here's where you'll track how ready you are. Start with a lesson or a few questions." : p.activeToday
              ? p.totals.todayAnswered >= p.profile.dailyGoal
                ? `${p.totals.todayAnswered} questions today. Daily goal of ${p.profile.dailyGoal} done.`
                : `${p.totals.todayAnswered} of ${p.profile.dailyGoal} questions done today.`
              : "Pick up where you left off."}
          <Badge variant="outline" className="ml-2 align-middle">
            Rules for {NATION_LABEL[p.profile.nation]}
          </Badge>
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-5 sm:flex-row sm:items-center">
            <div className="flex flex-col items-center">
              <ReadinessGauge score={p.readiness.score} />
              <div className="-mt-1 text-sm font-semibold">Estimated readiness</div>
            </div>
            <div className="w-full flex-1 space-y-3">
              {[
                ["Topic coverage", p.readiness.coverage, "25%"],
                ["Recent accuracy", p.readiness.accuracy, "35%"],
                ["Mock tests", p.readiness.mock, "40%"],
              ].map(([label, value, weight]) => (
                <div key={label as string}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>
                      {label} <span className="text-muted">· {weight}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-3">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${value}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted">
                An estimate from your own practice, not a DVSA assessment.{" "}
                <Link to="/progress#readiness" className="font-semibold text-primary hover:underline">
                  How it's worked out
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col border-primary/25">
          <CardHeader>
            <span className="text-xs font-bold uppercase tracking-wide text-muted">Suggested next</span>
            <CardTitle className="text-lg">{p.suggestion.title}</CardTitle>
            <p className="text-sm text-muted">{p.suggestion.reason}</p>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild>
              <Link to={p.suggestion.href}>
                Go <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button asChild variant="outline" size="lg" className="h-auto min-h-14 justify-start whitespace-normal py-2 text-left">
          <Link to={continueHref}>
            <BookOpen /> Continue learning
          </Link>
        </Button>
        <Button variant="outline" size="lg" className="h-auto min-h-14 justify-start whitespace-normal py-2 text-left" onClick={() => quick.mutate()} disabled={quick.isPending}>
          <ListChecks /> Quick practice
        </Button>
        <Button asChild variant="outline" size="lg" className="h-auto min-h-14 justify-start whitespace-normal py-2 text-left">
          <Link to="/mock-tests">
            <Timer /> Start mock test
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-auto min-h-14 justify-start whitespace-normal py-2 text-left">
          <Link to="/mistakes">
            <RotateCcw /> Review mistakes
            {p.totals.mistakes > 0 && <Badge variant="danger" className="ml-auto">{p.totals.mistakes}</Badge>}
          </Link>
        </Button>
      </div>
      {quick.isError && <p className="text-sm text-danger">{(quick.error as Error).message}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatTile label="Questions answered" value={p.totals.answered.toLocaleString("en-GB")} />
        <StatTile label="Correct" value={pct(p.totals.accuracy)} />
        <StatTile label="Topics completed" value={`${p.topicsCompleted}/${p.topicsTotal}`} hint={`${p.lessons.completed}/${p.lessons.total} lessons`} />
        <StatTile
          label="Study streak"
          value={
            <span className="inline-flex items-center gap-1.5">
              {p.streak > 0 && <Flame className="size-5 text-warning" aria-hidden="true" />}
              {p.streak} {p.streak === 1 ? "day" : "days"}
            </span>
          }
          hint={p.streak > 0 && !p.activeToday ? "Practise today to keep it going" : undefined}
        />
        <StatTile label="Average mock" value={p.mocks.averageScore === null ? "–" : `${p.mocks.averageScore}/50`} hint={p.mocks.taken ? `${p.mocks.taken} taken` : "None yet"} />
        <StatTile
          label="Last mock"
          value={
            p.mocks.last ? (
              <span className={p.mocks.last.passed ? "text-success" : "text-danger"}>
                <span className="inline-flex items-center gap-1.5">
                  {p.mocks.last.passed ? <CircleCheck className="size-5" /> : <CircleX className="size-5" />}
                  {p.mocks.last.score}/50
                </span>
              </span>
            ) : (
              "–"
            )
          }
          hint={p.mocks.last ? `${p.mocks.last.passed ? "Pass" : "Fail"} · ${formatDate(p.mocks.last.at)}` : "None yet"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            {p.totals.answered > 0 ? (
              <ActivityChart data={p.activity} />
            ) : (
              <EmptyChart title="Questions answered" text="Your daily practice will show up here once you start answering questions." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            {p.mocks.history.length > 0 ? (
              <MockScoreChart data={p.mocks.history} />
            ) : (
              <EmptyChart title="Mock test scores" text="Take a mock test to see your scores against the pass mark of 43." action={<Link to="/mock-tests" className="font-semibold text-primary hover:underline">Go to mock tests</Link>} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TopicList title="Strongest topics" icon={<TrendingUp className="size-4 text-success" />} items={p.strongest} empty="Answer at least 5 questions in a topic to see how you're doing." />
        <TopicList title="Needs work" icon={<TrendingDown className="size-4 text-danger" />} items={p.weakest} empty="Nothing flagged yet. Keep practising across topics." />
      </div>
    </div>
  );
}

function EmptyChart({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div>
      <div className="font-bold">{title}</div>
      <div className="mt-3 grid h-44 place-items-center rounded-lg border border-dashed border-border-strong px-6 text-center">
        <div>
          <p className="text-sm text-muted">{text}</p>
          {action && <div className="mt-2 text-sm">{action}</div>}
        </div>
      </div>
    </div>
  );
}

function TopicList({ title, icon, items, empty }: { title: string; icon: React.ReactNode; items: { id: string; title: string; accuracy: number | null; answered: number }[]; empty: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon} {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted">{empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((t) => (
              <li key={t.id}>
                <Link to={`/practice?topic=${t.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-primary">
                  <span className="font-semibold">{t.title}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted">
                    {t.accuracy}% · {t.answered} answered
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
