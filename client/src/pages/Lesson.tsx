import { useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Gavel, Lightbulb, MapPin, Route, X } from "lucide-react";
import type { LessonBlock } from "@content/types";
import { ErrorBlock, LoadingBlock, NATION_LABEL, RefLinks, RichText } from "@/components/common";
import { SignImage } from "@/components/SignImage";
import { Button } from "@/components/ui/button";
import { Illustration } from "@/illustrations";
import { api } from "@/lib/api";
import { keys, useInvalidateProgress, useProfile, useSigns, useTopic } from "@/lib/queries";
import { cn } from "@/lib/utils";
import NotFound from "./NotFound";

function KnowledgeCheck({ block }: { block: Extract<LessonBlock, { t: "check" }> }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface-2 p-4">
      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-muted">Quick check</div>
      <p className="mb-3 font-bold">{block.q}</p>
      <div className="grid gap-2">
        {block.options.map((o, i) => {
          const isRight = i === block.answer;
          const state = !answered ? "idle" : isRight ? "right" : picked === i ? "wrong" : "idle";
          return (
            <button
              key={o}
              type="button"
              disabled={answered}
              onClick={() => setPicked(i)}
              className={cn(
                "flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5 text-left",
                !answered && "cursor-pointer hover:border-border-strong",
                state === "right" && "border-success bg-success-soft",
                state === "wrong" && "border-danger bg-danger-soft",
              )}
            >
              {state === "right" ? <Check className="size-4 shrink-0 text-success" /> : state === "wrong" ? <X className="size-4 shrink-0 text-danger" /> : <span className="size-4 shrink-0" />}
              <span className="flex-1 text-left">{o}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <p className={cn("mt-3 text-sm animate-rise", picked === block.answer ? "text-success" : "text-danger")}>
          <strong>{picked === block.answer ? "Right. " : "Not quite. "}</strong>
          <span className="text-foreground">{block.explain}</span>
        </p>
      )}
    </div>
  );
}

function Block({ b, nation }: { b: LessonBlock; nation: string }) {
  const signs = useSigns();
  switch (b.t) {
    case "p":
      return <p className="text-[17px] leading-relaxed"><RichText text={b.text} /></p>;
    case "list":
      return (
        <ul className="space-y-2 pl-1">
          {b.items.map((it) => (
            <li key={it} className="flex gap-3 text-[17px] leading-relaxed">
              <span className="mt-[11px] h-1.5 w-3 shrink-0 rounded-full bg-accent" aria-hidden="true" />
              <span>
                <RichText text={it} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "rule":
      return (
        <div className="rounded-[var(--radius-card)] border-l-4 border-primary bg-primary-soft p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-bold text-primary">
            <Gavel className="size-4" /> The rule
          </div>
          <p className="text-[16px] leading-relaxed"><RichText text={b.text} /></p>
          {b.ref && <RefLinks refs={[b.ref]} className="mt-2" />}
        </div>
      );
    case "tip":
      return (
        <div className="flex gap-3 rounded-[var(--radius-card)] bg-warning-soft p-4">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-warning" />
          <p><RichText text={b.text} /></p>
        </div>
      );
    case "nation": {
      const mine = b.nations.includes(nation as never);
      return (
        <div className={cn("rounded-[var(--radius-card)] border p-4", mine ? "border-accent bg-surface" : "border-border bg-surface-2")}>
          <div className="mb-1 flex flex-wrap items-center gap-2 text-sm font-bold">
            <MapPin className="size-4" /> {b.nations.map((n) => NATION_LABEL[n]).join(" and ")}
            {mine && <span className="rounded bg-accent px-1.5 py-0.5 text-xs text-accent-foreground">Applies to you</span>}
          </div>
          <p><RichText text={b.text} /></p>
        </div>
      );
    }
    case "figure":
      return (
        <figure>
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-2">
            <Illustration id={b.id} />
          </div>
          <figcaption className="mt-2 text-sm text-muted">{b.caption}</figcaption>
        </figure>
      );
    case "signs": {
      const list = b.ids.map((id) => signs.data?.signs.find((s) => s.id === id)).filter(Boolean);
      return (
        <figure>
          <div className="flex flex-wrap gap-3">
            {list.map((s) => (
              <div key={s!.id} className="w-36 text-center">
                <SignImage sign={s!} className="mx-auto border border-border" />
                <div className="mt-1.5 text-xs font-semibold">{s!.name}</div>
              </div>
            ))}
          </div>
          {b.caption && <figcaption className="mt-2 text-sm text-muted">{b.caption}</figcaption>}
        </figure>
      );
    }
    case "scenario":
      return (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-bold text-muted">
            <Route className="size-4" /> On the road: {b.title}
          </div>
          <p className="leading-relaxed">{b.text}</p>
        </div>
      );
    case "table":
      return (
        <figure className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-[15px]">
            <thead>
              <tr className="border-b-2 border-border-strong text-left">
                {b.head.map((h) => (
                  <th key={h} className="py-2 pr-4 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i} className="border-b border-border">
                  {r.map((c, j) => (
                    <td key={j} className={cn("py-2 pr-4 align-top", j === 0 && "font-semibold")}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {b.caption && <figcaption className="mt-2 text-sm text-muted">{b.caption}</figcaption>}
        </figure>
      );
    case "check":
      return <KnowledgeCheck block={b} />;
  }
}

export default function LessonPage() {
  const { topicId = "", lessonId = "" } = useParams();
  const q = useTopic(topicId);
  const profile = useProfile();
  const qc = useQueryClient();
  const invalidate = useInvalidateProgress();
  const complete = useMutation({
    mutationFn: (done: boolean) => (done ? api.post(`/lessons/${lessonId}/complete`) : api.del(`/lessons/${lessonId}/complete`)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.topic(topicId) });
      invalidate();
    },
  });

  if (q.isPending) return <LoadingBlock rows={5} />;
  if (q.isError) return (q.error as { status?: number }).status === 404 ? <NotFound /> : <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  const { topic, stats } = q.data;
  const idx = topic.lessons.findIndex((l) => l.id === lessonId);
  if (idx < 0) return <NotFound />;
  const lesson = topic.lessons[idx];
  const prev = topic.lessons[idx - 1];
  const next = topic.lessons[idx + 1];
  const done = stats.completedLessons.includes(lesson.id);

  return (
    <article className="mx-auto max-w-3xl animate-rise">
      <Link to={`/learn/${topic.id}`} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
        ← {topic.title}
      </Link>
      <div className="mb-1 text-sm font-semibold text-muted">
        Lesson {idx + 1} of {topic.lessons.length} · {lesson.minutes} min read
      </div>
      <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{lesson.title}</h1>
      <p className="mt-2 text-lg text-muted">{lesson.summary}</p>

      <div className="mt-8 space-y-6">
        {lesson.blocks.map((b, i) => (
          <Block key={i} b={b} nation={profile.data?.nation ?? "england"} />
        ))}
      </div>

      <div className="mt-10 rounded-[var(--radius-card)] border border-border bg-surface p-5">
        <div className="mb-2 text-sm font-bold">Highway Code references</div>
        <RefLinks refs={lesson.refs} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {done ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 font-semibold text-success">
              <CircleCheck className="size-5" /> Lesson complete
            </span>
            <Button variant="link" size="sm" onClick={() => complete.mutate(false)}>
              Mark as not done
            </Button>
          </div>
        ) : (
          <Button size="lg" onClick={() => complete.mutate(true)} disabled={complete.isPending}>
            <Check /> Mark lesson as complete
          </Button>
        )}
        <div className="flex gap-2">
          {prev && (
            <Button asChild variant="outline">
              <Link to={`/learn/${topic.id}/${prev.id}`}>
                <ArrowLeft /> Previous
              </Link>
            </Button>
          )}
          {next ? (
            <Button asChild variant={done ? "default" : "outline"}>
              <Link to={`/learn/${topic.id}/${next.id}`}>
                Next lesson <ArrowRight />
              </Link>
            </Button>
          ) : (
            <Button asChild variant={done ? "default" : "outline"}>
              <Link to={`/learn/${topic.id}`}>
                Topic quiz <ArrowRight />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
