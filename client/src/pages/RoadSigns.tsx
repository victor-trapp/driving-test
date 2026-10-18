import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Footprints, Layers, Search } from "lucide-react";
import type { Sign, SignCategory } from "@content/types";
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader, RefLinks } from "@/components/common";
import { SignImage } from "@/components/SignImage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/misc";
import { useSigns } from "@/lib/queries";
import { cn } from "@/lib/utils";

export default function RoadSigns() {
  const q = useSigns();
  const [category, setCategory] = useState<SignCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Sign | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (q.data?.signs ?? []).filter(
      (s) => (category === "all" || s.category === category) && (!term || `${s.name} ${s.meaning} ${s.explanation}`.toLowerCase().includes(term)),
    );
  }, [q.data, category, search]);

  if (q.isPending) return <LoadingBlock rows={4} />;
  if (q.isError) return <ErrorBlock error={q.error} onRetry={() => q.refetch()} />;
  const { categories, attribution } = q.data;
  const current = categories.find((c) => c.id === category);

  return (
    <div className="animate-rise">
      <PageHeader
        title="Road signs"
        description="UK traffic signs and road markings, with what they mean and what to do."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/road-signs/crossings">
                <Footprints /> Pedestrian crossings
              </Link>
            </Button>
            <Button asChild>
              <Link to="/road-signs/flashcards">
                <Layers /> Flashcards
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search signs, e.g. 'bus lane' or 'give way'" className="pl-9" aria-label="Search signs" />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          {[{ id: "all" as const, title: "All" }, ...categories].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                category === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface text-muted hover:text-foreground",
              )}
            >
              {c.title}
            </button>
          ))}
        </div>
        {current && <p className="text-sm text-muted">{current.blurb}</p>}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No signs match">
          Try a different word or clear the filter.
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => setOpen(s)} className="flex h-full w-full cursor-pointer flex-col items-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-3 text-center shadow-card hover:border-border-strong">
                <SignImage sign={s} />
                <span className="text-sm font-semibold leading-snug">{s.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-xs text-muted">{attribution} Road marking drawings are our own.</p>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          {open && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <SignImage sign={open} size="lg" className="border border-border" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-muted">{categories.find((c) => c.id === open.category)?.title}</div>
                <DialogTitle>{open.name}</DialogTitle>
                <DialogDescription className="text-base text-foreground">{open.meaning}</DialogDescription>
              </div>
              <p className="text-[15px]">{open.explanation}</p>
              {open.hc && <RefLinks refs={[open.hc]} />}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
