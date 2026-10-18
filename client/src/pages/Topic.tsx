import { Link, useNavigate, useParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { CircleCheck, Clock, ListChecks, Trophy } from "lucide-react";
import { ErrorBlock, LaneProgress, LoadingBlock, PageHeader, RefLinks, TopicIcon } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/misc";
import { api } from "@/lib/api";
import { useTopic } from "@/lib/queries";
import NotFound from "./NotFound";

export default function TopicPage() {
  const { topicId = "" } = useParams();
  const q = useTopic(topicId);
  const navigate = useNavigate();
  const startQuiz = useMutation({
    mutationFn: () => api.post<{ id: string }>("/practice", { mode: "quiz", topic: topicId, size: 10 }),
    onSuccess: (r) => navigate(`/practice/s/${r.id}`),
  });

  if (q.isPending) return <LoadingBlock rows={4} />;
  if (q.isError) return (q.error as { status?: number }).status === 404 ? <NotFound /> : <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  const { topic, stats } = q.data;
  const refs = topic.lessons.flatMap((l) => l.refs);

  return (
    <div className="animate-rise">
      <PageHeader
        back={{ to: "/learn", label: "All topics" }}
        title={topic.title}
        description={topic.blurb}
        actions={
          stats.completed ? (
            <Badge variant="success" className="px-3 py-1 text-sm">
              <CircleCheck /> Topic complete
            </Badge>
          ) : undefined
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>What you'll learn</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5">
                {topic.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <ol className="space-y-2">
            {topic.lessons.map((l, i) => {
              const done = stats.completedLessons.includes(l.id);
              return (
                <li key={l.id}>
                  <Link to={`/learn/${topic.id}/${l.id}`} className="flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card hover:border-border-strong">
                    <span className={done ? "grid size-9 shrink-0 place-items-center rounded-full bg-success text-white dark:text-[#0c1f15]" : "grid size-9 shrink-0 place-items-center rounded-full border-2 border-border-strong font-bold text-muted"}>
                      {done ? <CircleCheck className="size-5" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{l.title}</span>
                      <span className="block text-sm text-muted">{l.summary}</span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-1 text-sm text-muted sm:inline-flex">
                      <Clock className="size-4" /> {l.minutes} min
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TopicIcon name={topic.icon} className="size-5 text-primary" /> Your progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <LaneProgress done={stats.lessonsDone} total={stats.lessonsTotal} label="Lessons completed" />
              <div className="flex justify-between">
                <span className="text-muted">Lessons</span>
                <span className="font-semibold">
                  {stats.lessonsDone}/{stats.lessonsTotal}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Questions answered</span>
                <span className="font-semibold">{stats.answered}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Accuracy</span>
                <span className="font-semibold">{stats.accuracy === null ? "–" : `${stats.accuracy}%`}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="size-5 text-warning" /> Topic quiz
              </CardTitle>
              <p className="text-sm text-muted">10 questions. Get 8 or more right, and finish every lesson, to complete the topic.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.quizBest && (
                <p className="text-sm">
                  Best score:{" "}
                  <strong className={stats.quizPassed ? "text-success" : undefined}>
                    {stats.quizBest.score}/{stats.quizBest.total}
                  </strong>
                </p>
              )}
              <Button className="w-full" onClick={() => startQuiz.mutate()} disabled={startQuiz.isPending}>
                {stats.quizBest ? "Retake quiz" : "Take the quiz"}
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link to={`/practice?topic=${topic.id}`}>
                  <ListChecks /> Practise questions
                </Link>
              </Button>
              {startQuiz.isError && <p className="text-sm text-danger">{(startQuiz.error as Error).message}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Highway Code</CardTitle>
            </CardHeader>
            <CardContent>
              <RefLinks refs={refs} className="flex-col gap-y-1.5" />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
