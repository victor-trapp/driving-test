import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Flag, Grid3x3, LogOut, TriangleAlert } from "lucide-react";
import { formatClock } from "@shared/exam";
import { ErrorBlock, LoadingBlock, Logo } from "@/components/common";
import { QuestionView } from "@/components/QuestionView";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { api, ApiError, type MockState } from "@/lib/api";
import { keys, useInvalidateProgress } from "@/lib/queries";
import { cn } from "@/lib/utils";

const LETTER_KEYS = ["a", "b", "c", "d", "e", "f"];

export default function MockExam() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const invalidate = useInvalidateProgress();
  const fetchedAt = useRef(0);
  const mock = useQuery({
    queryKey: keys.mock(id),
    queryFn: async () => {
      const r = await api.get<MockState>(`/mock-tests/${id}`);
      fetchedAt.current = Date.now();
      return r;
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const [answers, setAnswers] = useState<(number[] | null)[]>([]);
  const [flags, setFlags] = useState<boolean[]>([]);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [gridOpen, setGridOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);

  const m = mock.data;

  useEffect(() => {
    if (!m) return;
    if (m.status !== "in_progress") {
      navigate(`/mock-tests/${id}/results`, { replace: true });
      return;
    }
    setAnswers(m.answers);
    setFlags(m.flags);
    setIndex(m.currentIndex);
  }, [m, id, navigate]);

  const submit = useCallback(async () => {
    if (submitted.current) return;
    submitted.current = true;
    setSubmitting(true);
    try {
      await api.post(`/mock-tests/${id}/submit`);
    } catch (e) {
      // A 409 means the server already finalised it (e.g. time ran out). Either way go to results.
      if (!(e instanceof ApiError && e.status === 409)) {
        submitted.current = false;
        setSubmitting(false);
        setSaveError("Couldn't submit the test. Check the server is reachable and try again.");
        return;
      }
    }
    invalidate();
    qc.invalidateQueries({ queryKey: keys.mocks });
    qc.removeQueries({ queryKey: keys.mock(id) });
    navigate(`/mock-tests/${id}/results`, { replace: true });
  }, [id, navigate, qc, invalidate]);

  // Countdown. The server's clock is the source of truth, so correct for any skew.
  useEffect(() => {
    if (!m || m.status !== "in_progress") return;
    const skew = m.serverNow - fetchedAt.current;
    const tick = () => {
      const left = m.deadlineAt - (Date.now() + skew);
      setRemaining(Math.max(0, left));
      if (left <= 0) void submit();
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [m, submit]);

  const save = useCallback(
    async (i: number, selected: number[] | null) => {
      try {
        await api.put(`/mock-tests/${id}/answers/${i}`, { selected });
        setSaveError(null);
      } catch (e) {
        if (e instanceof ApiError && e.code === "time_up") return void submit();
        setSaveError("Your last answer didn't save. Check the connection, then choose it again.");
      }
    },
    [id, submit],
  );

  const move = useCallback(
    (i: number) => {
      if (!m) return;
      const next = Math.max(0, Math.min(m.questions.length - 1, i));
      setIndex(next);
      api.put(`/mock-tests/${id}/position`, { index: next }).catch(() => {});
      window.scrollTo({ top: 0 });
    },
    [m, id],
  );

  const toggle = useCallback(
    (key: number) => {
      if (!m) return;
      const q = m.questions[index];
      const current = answers[index] ?? [];
      let next: number[];
      if (q.selectCount === 1) next = [key];
      else next = current.includes(key) ? current.filter((k) => k !== key) : current.length < q.selectCount ? [...current, key] : current;
      const copy = answers.slice();
      copy[index] = next.length ? next : null;
      setAnswers(copy);
      void save(index, copy[index]);
    },
    [m, index, answers, save],
  );

  const toggleFlag = useCallback(() => {
    const copy = flags.slice();
    copy[index] = !copy[index];
    setFlags(copy);
    api.put(`/mock-tests/${id}/flags/${index}`, { flagged: copy[index] }).catch(() => setSaveError("Couldn't save the flag."));
  }, [flags, index, id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!m || gridOpen || confirmOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const q = m.questions[index];
      const li = LETTER_KEYS.indexOf(k);
      const ni = ["1", "2", "3", "4", "5", "6"].indexOf(k);
      const pos = li >= 0 ? li : ni;
      if (pos >= 0 && pos < q.options.length) {
        e.preventDefault();
        toggle(q.options[pos].key);
      } else if (e.key === "ArrowRight") move(index + 1);
      else if (e.key === "ArrowLeft") move(index - 1);
      else if (k === "f") toggleFlag();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [m, index, toggle, move, toggleFlag, gridOpen, confirmOpen]);

  if (mock.isPending) return <div className="mx-auto max-w-3xl p-6"><LoadingBlock rows={4} /></div>;
  if (mock.isError) return <div className="mx-auto max-w-3xl p-6"><ErrorBlock error={mock.error} onRetry={() => mock.refetch()} /></div>;
  if (!m || answers.length === 0) return null;

  const q = m.questions[index];
  const answeredCount = answers.filter((a) => a && a.length).length;
  const unanswered = m.questions.length - answeredCount;
  const flagged = flags.filter(Boolean).length;
  const low = remaining !== null && remaining < 5 * 60 * 1000;
  const scenarioBlock = q.scenarioId ? m.questions.map((x, i) => (x.scenarioId === q.scenarioId ? i : -1)).filter((i) => i >= 0) : [];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Logo compact />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">Mock theory test</div>
            <div className="text-xs text-muted">
              Question {index + 1} of {m.questions.length} · {answeredCount} answered
            </div>
          </div>
          <div
            role="timer"
            aria-live="off"
            aria-label={`Time remaining ${remaining !== null ? formatClock(remaining) : ""}`}
            className={cn("rounded-lg px-3 py-1.5 font-bold tabular-nums", low ? "bg-danger-soft text-danger" : "bg-surface-2")}
          >
            {remaining !== null ? formatClock(remaining) : "--:--"}
          </div>
          <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
            Finish
          </Button>
        </div>
        <div className="h-1 bg-surface-3">
          <div className="h-1 bg-primary transition-[width]" style={{ width: `${(answeredCount / m.questions.length) * 100}%` }} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {saveError && (
          <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-danger/40 bg-danger-soft p-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" /> {saveError}
          </div>
        )}
        {scenarioBlock.length > 0 && (
          <p className="mb-3 rounded-lg bg-surface-2 px-3 py-2 text-sm">
            Questions {scenarioBlock[0] + 1} to {scenarioBlock[scenarioBlock.length - 1] + 1} are about the same clip. It's an animated practice clip, not DVSA footage.
          </p>
        )}
        <QuestionView key={q.id} question={q} selected={answers[index] ?? []} onToggle={toggle} number={index + 1} />
        <p className="mt-6 hidden text-xs text-muted sm:block">Keys: A–D to answer · ← → to move · F to flag</p>
      </main>

      <footer className="sticky bottom-0 z-20 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-3">
          <Button variant="outline" onClick={() => move(index - 1)} disabled={index === 0} aria-label="Previous question">
            <ArrowLeft /> <span className="hidden sm:inline">Previous</span>
          </Button>
          <Button variant={flags[index] ? "accent" : "ghost"} onClick={toggleFlag} aria-pressed={flags[index]}>
            <Flag /> {flags[index] ? "Flagged" : "Flag"}
          </Button>
          <Button variant="ghost" onClick={() => setGridOpen(true)}>
            <Grid3x3 /> <span className="hidden sm:inline">All questions</span>
          </Button>
          <div className="flex-1" />
          {index < m.questions.length - 1 ? (
            <Button onClick={() => move(index + 1)}>
              <span className="hidden sm:inline">Next</span> <ArrowRight />
            </Button>
          ) : (
            <Button onClick={() => setConfirmOpen(true)}>Review and finish</Button>
          )}
        </div>
      </footer>

      <Dialog open={gridOpen} onOpenChange={setGridOpen}>
        <DialogContent className="max-w-xl">
          <DialogTitle>All questions</DialogTitle>
          <DialogDescription>
            {answeredCount} answered, {unanswered} unanswered, {flagged} flagged.
          </DialogDescription>
          <div className="mt-4 grid grid-cols-8 gap-1.5 sm:grid-cols-10">
            {m.questions.map((_, i) => {
              const done = Boolean(answers[i]?.length);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    move(i);
                    setGridOpen(false);
                  }}
                  aria-label={`Question ${i + 1}, ${done ? "answered" : "unanswered"}${flags[i] ? ", flagged" : ""}`}
                  className={cn(
                    "relative grid h-10 cursor-pointer place-items-center rounded-md text-sm font-bold",
                    done ? "bg-primary text-primary-foreground" : "border border-border-strong bg-surface text-muted",
                    i === index && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
                  )}
                >
                  {i + 1}
                  {flags[i] && <Flag className="absolute -right-1 -top-1 size-3.5 fill-accent text-accent-foreground" />}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-primary" /> Answered
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded border border-border-strong" /> Unanswered
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Flag className="size-3 fill-accent text-accent-foreground" /> Flagged
            </span>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Finish the test?"
        description={
          <>
            {unanswered > 0 ? <strong className="text-danger">{unanswered} unanswered. </strong> : "Every question is answered. "}
            {flagged > 0 && <>{flagged} flagged for review. </>}
            Once you submit you can't change your answers.
          </>
        }
        confirmLabel="Submit test"
        cancelLabel="Keep going"
        onConfirm={() => void submit()}
      />

      <div className="mx-auto mb-4 hidden max-w-3xl px-4 text-center text-xs text-muted sm:block">
        <Link to="/mock-tests" className="inline-flex items-center gap-1 hover:text-foreground">
          <LogOut className="size-3.5" /> Leave for now (the timer keeps running)
        </Link>
      </div>
    </div>
  );
}
