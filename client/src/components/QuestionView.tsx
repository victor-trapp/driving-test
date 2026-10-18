import { useQuery } from "@tanstack/react-query";
import { Check, CircleCheck, CircleX, Info, X } from "lucide-react";
import type { HcRef, ImageRef, PublicQuestion } from "@shared/types";
import { api, type ClipSummary } from "@/lib/api";
import { keys, useSigns } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { ClipPlayer } from "@/hazard/ClipPlayer";
import { Illustration } from "@/illustrations";
import { RefLinks } from "./common";
import { SignImage } from "./SignImage";
import { Skeleton } from "./ui/misc";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export function QuestionImage({ image }: { image: ImageRef }) {
  const signs = useSigns();
  if (image.kind === "illustration") {
    return (
      <div className="mx-auto w-full max-w-md overflow-hidden rounded-lg border border-border">
        <Illustration id={image.ref} />
      </div>
    );
  }
  const sign = signs.data?.signs.find((s) => s.id === image.ref);
  if (!sign) return <Skeleton className="mx-auto h-40 w-48" />;
  return (
    <div className="flex justify-center">
      <SignImage sign={sign} size="lg" className="border border-border" />
    </div>
  );
}

export function ScenarioClip({ clipId }: { clipId: string }) {
  const clip = useQuery({ queryKey: keys.clip(clipId), queryFn: () => api.get<ClipSummary>(`/hazard/clips/${clipId}`), staleTime: Infinity });
  if (clip.isPending) return <Skeleton className="aspect-video w-full" />;
  if (clip.isError) return <p className="text-sm text-danger">Couldn't load the clip for this question.</p>;
  return (
    <div>
      <ClipPlayer clip={clip.data} mode="watch" />
      <p className="mt-1 text-xs text-muted">Watch the clip as many times as you like, then answer. In the real test this would be a silent video.</p>
    </div>
  );
}

export interface QuestionViewProps {
  question: PublicQuestion;
  selected: number[];
  onToggle?: (key: number) => void;
  /** After answering in practice, or in review: mark options correct/incorrect. */
  correctKeys?: number[] | null;
  disabled?: boolean;
  number?: number;
  compact?: boolean;
}

export function QuestionView({ question, selected, onToggle, correctKeys, disabled, number, compact }: QuestionViewProps) {
  const multi = question.selectCount > 1;
  const revealed = Boolean(correctKeys);
  return (
    <div className="space-y-4">
      {question.scenarioId && !compact && <ScenarioClip clipId={question.scenarioId} />}
      <div>
        {number !== undefined && <div className="mb-1 text-sm font-semibold text-muted">Question {number}</div>}
        <h2 className={cn("font-bold", compact ? "text-base" : "text-lg sm:text-xl")}>{question.text}</h2>
        {multi && <p className="mt-1 text-sm font-semibold text-primary">Mark {question.selectCount} answers</p>}
      </div>
      {question.image && <QuestionImage image={question.image} />}
      <div role={multi ? "group" : "radiogroup"} aria-label="Answers" className="grid gap-2">
        {question.options.map((o, i) => {
          const isSelected = selected.includes(o.key);
          const isCorrect = correctKeys?.includes(o.key) ?? false;
          const state = revealed ? (isCorrect ? "correct" : isSelected ? "wrong" : "idle") : isSelected ? "selected" : "idle";
          return (
            <button
              key={o.key}
              type="button"
              role={multi ? "checkbox" : "radio"}
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onToggle?.(o.key)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors sm:p-3.5",
                !disabled && "cursor-pointer hover:border-border-strong hover:bg-surface-2",
                state === "idle" && "border-border bg-surface",
                state === "selected" && "border-primary bg-primary-soft",
                state === "correct" && "border-success bg-success-soft",
                state === "wrong" && "border-danger bg-danger-soft",
                disabled && "cursor-default",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-md border text-sm font-bold",
                  state === "idle" && "border-border-strong text-muted",
                  state === "selected" && "border-primary bg-primary text-primary-foreground",
                  state === "correct" && "border-success bg-success text-white dark:text-[#0c1f15]",
                  state === "wrong" && "border-danger bg-danger text-white dark:text-[#1f0c0b]",
                )}
                aria-hidden="true"
              >
                {state === "correct" ? <Check className="size-4" /> : state === "wrong" ? <X className="size-4" /> : LETTERS[i]}
              </span>
              <span className="pt-0.5 text-[15px] sm:text-base">{o.text}</span>
              {revealed && isCorrect && <span className="sr-only">(correct answer)</span>}
              {revealed && isSelected && !isCorrect && <span className="sr-only">(your answer, incorrect)</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Explanation({ correct, explanation, hc, unanswered, title }: { correct: boolean | null; explanation: string; hc: HcRef[]; unanswered?: boolean; title?: string }) {
  const tone = unanswered ? "neutral" : correct ? "good" : "bad";
  return (
    <div
      role="status"
      className={cn(
        "rounded-lg border p-4 animate-rise",
        tone === "good" && "border-success/40 bg-success-soft",
        tone === "bad" && "border-danger/40 bg-danger-soft",
        tone === "neutral" && "border-border bg-surface-2",
      )}
    >
      <div className={cn("mb-1 flex items-center gap-2 font-bold", tone === "good" && "text-success", tone === "bad" && "text-danger")}>
        {tone === "good" ? <CircleCheck className="size-5" /> : tone === "bad" ? <CircleX className="size-5" /> : <Info className="size-5" />}
        {title ?? (tone === "good" ? "Correct" : tone === "bad" ? "Not quite" : "Not answered")}
      </div>
      <p className="text-[15px]">{explanation}</p>
      <RefLinks refs={hc} className="mt-3" />
    </div>
  );
}
