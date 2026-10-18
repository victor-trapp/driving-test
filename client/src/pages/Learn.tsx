import { Link } from "react-router";
import { CircleCheck } from "lucide-react";
import { ErrorBlock, LaneProgress, LoadingBlock, PageHeader, TopicIcon } from "@/components/common";
import { Badge } from "@/components/ui/misc";
import { useTopics } from "@/lib/queries";

export default function Learn() {
  const topics = useTopics();
  return (
    <div className="animate-rise">
      <PageHeader title="Learn" description="Fourteen topics, the same ones the theory test questions are grouped into. Work through the lessons, then take the short quiz at the end of each topic." />
      {topics.isPending ? (
        <LoadingBlock rows={6} />
      ) : topics.isError ? (
        <ErrorBlock error={topics.error} onRetry={() => topics.refetch()} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {topics.data.map((t) => (
            <li key={t.id}>
              <Link
                to={`/learn/${t.id}`}
                className="group flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card transition-colors hover:border-border-strong"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <TopicIcon name={t.icon} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-muted">Topic {t.number}</div>
                    <h2 className="font-bold group-hover:text-primary">{t.title}</h2>
                  </div>
                  {t.completed && (
                    <Badge variant="success">
                      <CircleCheck /> Done
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted">{t.blurb}</p>
                <div className="mt-auto space-y-2">
                  <LaneProgress done={t.lessonsDone} total={t.lessonsTotal} label="Lessons completed" />
                  <div className="flex justify-between text-xs text-muted">
                    <span>
                      {t.lessonsDone}/{t.lessonsTotal} lessons
                    </span>
                    <span>{t.quizBest ? `Quiz best ${t.quizBest.score}/${t.quizBest.total}` : t.accuracy !== null ? `${t.accuracy}% correct` : `${t.bankSize} questions`}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
