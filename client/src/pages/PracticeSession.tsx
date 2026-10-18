import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, CircleCheck, Trophy } from "lucide-react";
import { ErrorBlock, LoadingBlock } from "@/components/common";
import { Explanation, QuestionView } from "@/components/QuestionView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, Progress } from "@/components/ui/misc";
import { api, type AnswerFeedback, type PracticeSession, type PracticeSummary } from "@/lib/api";
import { keys, useInvalidateProgress, useToggleBookmark, useTopics } from "@/lib/queries";
import { cn } from "@/lib/utils";

const MODE_LABEL = { topic: "Topic practice", mixed: "Mixed practice", mistakes: "Reviewing mistakes", bookmarks: "Bookmarked questions", quiz: "Topic quiz" } as const;

export default function PracticeSessionPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const topics = useTopics();
  const invalidate = useInvalidateProgress();
  const session = useQuery({ queryKey: keys.practice(id), queryFn: () => api.get<PracticeSession>(`/practice/${id}`) });
  const [index, setIndex] = useState<number | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [summary, setSummary] = useState<PracticeSummary | null>(null);
  const shownAt = useRef(Date.now());
  const bookmark = useToggleBookmark();

  const s = session.data;
  // Start on the first unanswered question when the session loads. A finished session
  // (including one ended early) can't take more answers, so go straight to its summary.
  useEffect(() => {
    if (s && index === null) {
      const firstOpen = s.items.findIndex((it) => !it.feedback);
      setIndex(firstOpen === -1 ? s.items.length - 1 : firstOpen);
      if (s.completedAt) finish.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s]);

  useEffect(() => {
    setPicked([]);
    shownAt.current = Date.now();
  }, [index]);

  const answer = useMutation({
    mutationFn: (body: { index: number; selected: number[] }) =>
      api.post<{ feedback: AnswerFeedback; completed: boolean }>(`/practice/${id}/answers/${body.index}`, { selected: body.selected, timeMs: Date.now() - shownAt.current }),
    onSuccess: (r, vars) => {
      qc.setQueryData<PracticeSession>(keys.practice(id), (old) =>
        old ? { ...old, items: old.items.map((it, i) => (i === vars.index ? { ...it, selected: vars.selected, feedback: r.feedback } : it)) } : old,
      );
      invalidate();
    },
  });

  const finish = useMutation({
    mutationFn: () => api.post<PracticeSummary>(`/practice/${id}/finish`),
    onSuccess: (r) => {
      setSummary(r);
      invalidate();
      qc.invalidateQueries({ queryKey: keys.practiceList });
    },
  });

  if (session.isPending || index === null) return session.isError ? <ErrorBlock error={session.error} onRetry={() => session.refetch()} /> : <LoadingBlock rows={3} />;
  if (!s) return null;

  if (summary) return <Summary session={s} summary={summary} topicTitle={topics.data?.find((t) => t.id === s.topic)?.title} onAgain={() => navigate("/practice")} />;

  const item = s.items[index];
  const answeredCount = s.items.filter((it) => it.feedback).length;
  const correctCount = s.items.filter((it) => it.feedback?.correct).length;
  const need = item.question.selectCount;
  const isLast = index === s.items.length - 1;
  const allDone = answeredCount === s.items.length;

  const toggle = (key: number) => {
    if (item.feedback) return;
    if (need === 1) setPicked([key]);
    else setPicked((p) => (p.includes(key) ? p.filter((k) => k !== key) : p.length < need ? [...p, key] : p));
  };

  return (
    <div className="mx-auto max-w-3xl animate-rise">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to={s.topic ? `/learn/${s.topic}` : "/practice"} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
          ← {s.topic ? topics.data?.find((t) => t.id === s.topic)?.title ?? "Topic" : "Practice"}
        </Link>
        <Badge variant="outline">{MODE_LABEL[s.mode]}</Badge>
      </div>

      <div className="mb-5 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-semibold">
            Question {index + 1} of {s.items.length}
          </span>
          <span className="tabular-nums text-muted">
            {correctCount}/{answeredCount} correct
          </span>
        </div>
        <Progress value={(answeredCount / s.items.length) * 100} label="Session progress" />
      </div>

      <Card>
        <CardContent className="space-y-5 pt-5">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={item.bookmarked}
              onClick={() =>
                bookmark.mutate(
                  { id: item.question.id, on: !item.bookmarked },
                  {
                    onSuccess: () =>
                      qc.setQueryData<PracticeSession>(keys.practice(id), (old) => (old ? { ...old, items: old.items.map((it, i) => (i === index ? { ...it, bookmarked: !it.bookmarked } : it)) } : old)),
                  },
                )
              }
            >
              {item.bookmarked ? <BookmarkCheck className="text-primary" /> : <Bookmark />}
              {item.bookmarked ? "Bookmarked" : "Bookmark"}
            </Button>
          </div>

          <QuestionView
            question={item.question}
            selected={item.feedback ? (item.selected ?? []) : picked}
            onToggle={toggle}
            correctKeys={item.feedback?.correctKeys}
            disabled={Boolean(item.feedback) || answer.isPending}
          />

          {item.feedback && <Explanation correct={item.feedback.correct} explanation={item.feedback.explanation} hc={item.feedback.hc} />}
          {answer.isError && <p className="text-sm text-danger">{(answer.error as Error).message} Your answer wasn't saved, so try again.</p>}

          <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
            <Button variant="ghost" onClick={() => setIndex(index - 1)} disabled={index === 0}>
              <ArrowLeft /> Back
            </Button>
            {!item.feedback ? (
              <Button size="lg" disabled={picked.length !== need || answer.isPending} onClick={() => answer.mutate({ index, selected: picked })}>
                Check answer
              </Button>
            ) : allDone || isLast ? (
              <Button size="lg" onClick={() => finish.mutate()} disabled={finish.isPending}>
                {allDone ? "See results" : "Finish now"}
              </Button>
            ) : (
              <Button size="lg" onClick={() => setIndex(index + 1)}>
                Next <ArrowRight />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-wrap justify-center gap-1.5" aria-label="Jump to question">
        {s.items.map((it, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Question ${i + 1}${it.feedback ? (it.feedback.correct ? ", correct" : ", incorrect") : ""}`}
            aria-current={i === index}
            className={cn(
              "size-7 cursor-pointer rounded-md text-xs font-bold",
              i === index && "ring-2 ring-primary ring-offset-2 ring-offset-background",
              !it.feedback && "bg-surface-2 text-muted",
              it.feedback?.correct && "bg-success text-white dark:text-[#0c1f15]",
              it.feedback && !it.feedback.correct && "bg-danger text-white dark:text-[#1f0c0b]",
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
      {!allDone && answeredCount > 0 && (
        <p className="mt-4 text-center">
          <Button variant="link" size="sm" onClick={() => finish.mutate()}>
            End session early
          </Button>
        </p>
      )}
    </div>
  );
}

function Summary({ session, summary, topicTitle, onAgain }: { session: PracticeSession; summary: PracticeSummary; topicTitle?: string; onAgain: () => void }) {
  const percent = summary.answered ? Math.round((summary.correct / summary.answered) * 100) : 0;
  const wrong = session.items.filter((it) => it.feedback && !it.feedback.correct);
  const quiz = session.mode === "quiz";
  return (
    <div className="mx-auto max-w-2xl space-y-5 animate-rise">
      <Card>
        <CardContent className="flex flex-col items-center gap-2 pt-8 text-center">
          {quiz && summary.passedQuiz ? <Trophy className="size-10 text-warning" /> : <CircleCheck className="size-10 text-primary" />}
          <h1 className="text-2xl font-bold">{quiz ? (summary.passedQuiz ? "Quiz passed" : summary.passedQuiz === false ? "Not this time" : "Quiz ended") : "Session complete"}</h1>
          <p className="text-4xl font-bold tabular-nums">
            {summary.correct}/{summary.answered}
          </p>
          <p className="text-muted">
            {percent}% correct{topicTitle ? ` in ${topicTitle}` : ""}.{" "}
            {quiz && summary.passedQuiz === false ? "You need 8 out of 10 to complete the topic." : percent >= 86 ? "That's at or above the pass rate for the real test." : "The real test needs 86%, so keep at it."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={onAgain}>Practise again</Button>
            {session.topic && (
              <Button asChild variant="outline">
                <Link to={`/learn/${session.topic}`}>Back to topic</Link>
              </Button>
            )}
            {wrong.length > 0 && (
              <Button asChild variant="outline">
                <Link to="/mistakes">Review mistakes</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {wrong.length > 0 && (
        <div>
          <h2 className="mb-3 font-bold">Questions you got wrong</h2>
          <div className="space-y-3">
            {wrong.map((it) => (
              <Card key={it.question.id}>
                <CardContent className="space-y-3 pt-5">
                  <QuestionView question={it.question} selected={it.selected ?? []} correctKeys={it.feedback!.correctKeys} disabled compact />
                  <Explanation correct={false} explanation={it.feedback!.explanation} hc={it.feedback!.hc} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
