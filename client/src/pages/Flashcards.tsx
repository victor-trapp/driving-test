import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, RotateCcw, Shuffle, X } from "lucide-react";
import { shuffle } from "@shared/random";
import type { Sign } from "@content/types";
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from "@/components/common";
import { SignImage } from "@/components/SignImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { keys, useFlashcards, useInvalidateProgress, useSigns } from "@/lib/queries";

type Deck = "all" | "wrong" | "new" | Sign["category"];

export default function Flashcards() {
  const signs = useSigns();
  const state = useFlashcards();
  const qc = useQueryClient();
  const invalidate = useInvalidateProgress();
  const [deck, setDeck] = useState<Deck>("all");
  const [order, setOrder] = useState<Sign[] | null>(null);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ knew: 0, didnt: 0 });

  const review = useMutation({
    mutationFn: (b: { signId: string; knew: boolean }) => api.post("/flashcards", b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.flashcards });
      invalidate();
    },
  });

  const pool = useMemo(() => {
    const all = signs.data?.signs ?? [];
    const st = state.data ?? {};
    if (deck === "all") return all;
    if (deck === "wrong") return all.filter((s) => st[s.id] && !st[s.id].knew);
    if (deck === "new") return all.filter((s) => !st[s.id]);
    return all.filter((s) => s.category === deck);
  }, [signs.data, state.data, deck]);

  if (signs.isPending || state.isPending) return <LoadingBlock rows={3} />;
  if (signs.isError) return <ErrorBlock error={signs.error} onRetry={() => signs.refetch()} />;
  if (state.isError) return <ErrorBlock error={state.error} onRetry={() => state.refetch()} />;

  const wrongCount = signs.data.signs.filter((s) => state.data[s.id] && !state.data[s.id].knew).length;
  const begin = () => {
    setOrder(shuffle(pool));
    setI(0);
    setRevealed(false);
    setTally({ knew: 0, didnt: 0 });
  };

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl animate-rise">
        <PageHeader back={{ to: "/road-signs", label: "Road signs" }} title="Sign flashcards" description="See the sign, say what it means, then check. Be honest about whether you knew it, and the ones you didn't will be easy to come back to." />
        <Card>
          <CardContent className="space-y-4 pt-5">
            <Select
              label="Deck"
              value={deck}
              onValueChange={(v) => setDeck(v as Deck)}
              options={[
                { value: "all", label: `All signs (${signs.data.signs.length})` },
                { value: "wrong", label: `Ones I didn't know (${wrongCount})` },
                { value: "new", label: "Not seen yet" },
                ...signs.data.categories.map((c) => ({ value: c.id, label: c.title })),
              ]}
            />
            <Button size="lg" onClick={begin} disabled={pool.length === 0}>
              <Shuffle /> Start {pool.length} cards
            </Button>
            {pool.length === 0 && <p className="text-sm text-muted">{deck === "wrong" ? "Nothing here yet. Cards you mark as 'didn't know' will collect in this deck." : "No cards in this deck."}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (i >= order.length) {
    return (
      <div className="mx-auto max-w-2xl animate-rise">
        <EmptyState
          icon={Check}
          title="Deck finished"
          action={
            <div className="flex gap-2">
              <Button onClick={begin}>
                <RotateCcw /> Go again
              </Button>
              <Button variant="outline" onClick={() => setOrder(null)}>
                Choose another deck
              </Button>
            </div>
          }
        >
          You knew {tally.knew} of {order.length}. {tally.didnt > 0 ? `The ${tally.didnt} you didn't know are in the "Ones I didn't know" deck.` : "Nice work."}
        </EmptyState>
      </div>
    );
  }

  const card = order[i];
  const answer = (knew: boolean) => {
    review.mutate({ signId: card.id, knew });
    setTally((t) => (knew ? { ...t, knew: t.knew + 1 } : { ...t, didnt: t.didnt + 1 }));
    setRevealed(false);
    setI(i + 1);
  };

  return (
    <div className="mx-auto max-w-xl animate-rise">
      <div className="mb-3 flex items-center justify-between text-sm">
        <button type="button" onClick={() => setOrder(null)} className="cursor-pointer font-semibold text-muted hover:text-foreground">
          ← Decks
        </button>
        <span className="tabular-nums text-muted">
          {i + 1} / {order.length}
        </span>
      </div>
      <Progress value={(i / order.length) * 100} className="mb-4" label="Deck progress" />
      <Card>
        <CardContent className="flex min-h-[420px] flex-col items-center gap-5 pt-8 text-center">
          <SignImage sign={card} size="lg" className="border border-border" />
          {!revealed ? (
            <>
              <p className="text-muted">What does this sign mean?</p>
              <Button size="lg" onClick={() => setRevealed(true)} className="mt-auto w-full sm:w-auto">
                <Eye /> Reveal
              </Button>
            </>
          ) : (
            <div className="flex w-full flex-1 flex-col gap-3 animate-rise">
              <h2 className="text-xl font-bold">{card.name}</h2>
              <p className="font-semibold">{card.meaning}</p>
              <p className="text-sm text-muted">{card.explanation}</p>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                <Button size="lg" variant="outline" onClick={() => answer(false)}>
                  <X /> Didn't know
                </Button>
                <Button size="lg" onClick={() => answer(true)}>
                  <Check /> Knew it
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {review.isError && <p className="mt-3 text-sm text-danger">The last card didn't save: {review.error.message}</p>}
    </div>
  );
}
