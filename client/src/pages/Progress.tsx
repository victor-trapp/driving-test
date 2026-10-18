import { Link } from "react-router";
import { CircleCheck } from "lucide-react";
import { AccuracyTrend, ActivityChart, MockScoreChart } from "@/components/charts";
import { ErrorBlock, LoadingBlock, PageHeader, StatTile } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { useProgress } from "@/lib/queries";
import { cn, pct } from "@/lib/utils";

export default function Progress() {
  const q = useProgress();
  if (q.isPending) return <LoadingBlock rows={5} />;
  if (q.isError) return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  const p = q.data;

  return (
    <div className="space-y-6 animate-rise">
      <PageHeader title="My progress" description="Everything here comes from your own answers. Nothing is estimated except the readiness score." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Questions answered" value={p.totals.answered.toLocaleString("en-GB")} hint={`${p.totals.correct.toLocaleString("en-GB")} correct`} />
        <StatTile label="Accuracy" value={pct(p.totals.accuracy)} />
        <StatTile label="Average time per question" value={p.totals.avgTimeMs ? `${(p.totals.avgTimeMs / 1000).toFixed(1)}s` : "–"} hint="Practice only. The real test gives you about 68s each." />
        <StatTile label="Study streak" value={`${p.streak} ${p.streak === 1 ? "day" : "days"}`} />
        <StatTile label="Mock tests" value={p.mocks.taken} hint={p.mocks.taken ? `${p.mocks.passed} passed` : undefined} />
        <StatTile label="Mock pass rate" value={pct(p.mocks.passRate)} />
        <StatTile label="Hazard clips tried" value={p.hazard.attempts} hint={p.hazard.averagePercent !== null ? `Average ${p.hazard.averagePercent}% of points` : undefined} />
        <StatTile label="Flashcards reviewed" value={p.totals.flashcardsReviewed} hint={`${p.totals.bookmarks} bookmarked questions`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <ActivityChart data={p.activity} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            {p.activity.some((d) => d.answered > 0) ? <AccuracyTrend data={p.activity} /> : <p className="text-sm text-muted">Your accuracy over time will appear once you've answered some questions.</p>}
          </CardContent>
        </Card>
        {p.mocks.history.length > 0 && (
          <Card className="lg:col-span-2">
            <CardContent className="pt-5">
              <MockScoreChart data={p.mocks.history} />
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Topics</CardTitle>
          <p className="text-sm text-muted">A topic is complete when all its lessons are done and you've scored 8/10 or more in its quiz.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[15px]">
            <thead className="text-left text-sm text-muted">
              <tr className="border-b border-border">
                <th className="py-2 pr-3 font-semibold">Topic</th>
                <th className="py-2 pr-3 font-semibold">Lessons</th>
                <th className="py-2 pr-3 font-semibold">Answered</th>
                <th className="py-2 pr-3 font-semibold">Accuracy</th>
                <th className="py-2 pr-3 font-semibold">Quiz best</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {p.topics.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-3">
                    <Link to={`/learn/${t.id}`} className="font-semibold hover:text-primary">
                      {t.title}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">
                    {t.lessonsDone}/{t.lessonsTotal}
                  </td>
                  <td className="py-2.5 pr-3">
                    {t.distinctAnswered}/{t.bankSize}
                  </td>
                  <td className="py-2.5 pr-3">
                    {t.accuracy === null ? (
                      <span className="text-muted">–</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-20 rounded-full bg-surface-3">
                          <span className={cn("block h-2 rounded-full", t.accuracy >= 86 ? "bg-success" : t.accuracy >= 60 ? "bg-primary" : "bg-danger")} style={{ width: `${t.accuracy}%` }} />
                        </span>
                        {t.accuracy}%
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">{t.quizBest ? `${t.quizBest.score}/${t.quizBest.total}` : "–"}</td>
                  <td className="py-2.5">
                    {t.completed ? (
                      <Badge variant="success">
                        <CircleCheck /> Complete
                      </Badge>
                    ) : t.answered > 0 || t.lessonsDone > 0 ? (
                      <Badge variant="primary">In progress</Badge>
                    ) : (
                      <Badge variant="outline">Not started</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card id="readiness">
        <CardHeader>
          <CardTitle>How readiness is worked out</CardTitle>
          <p className="text-sm text-muted">It's a rough guide to help you decide what to do next. It isn't an official assessment and can't predict your result.</p>
        </CardHeader>
        <CardContent className="space-y-3 text-[15px]">
          <p className="rounded-lg bg-surface-2 p-3 font-semibold">
            Readiness = 25% coverage + 35% recent accuracy + 40% mock tests <span className="font-normal text-muted">(currently {p.readiness.score})</span>
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Coverage ({p.readiness.coverage}%)</strong>: half from lessons completed, half from how many different questions you've answered in each topic, aiming for half of each topic's questions.
            </li>
            <li>
              <strong>Recent accuracy ({p.readiness.accuracy}%)</strong>: your correct rate over the last 100 practice answers. It's scaled down until you've answered 20, so a lucky few don't count as 100%.
            </li>
            <li>
              <strong>Mock tests ({p.readiness.mock}%)</strong>: your average score across your last 3 mock tests.
            </li>
          </ul>
          <p className="text-sm text-muted">Around 80 or above, with your last few mocks passed, is a good sign you're ready to book.</p>
        </CardContent>
      </Card>
    </div>
  );
}
