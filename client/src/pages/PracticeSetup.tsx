import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Bookmark, Play, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Segmented } from "@/components/ui/misc";
import { Select } from "@/components/ui/select";
import { api, type PracticeMode, type PracticeSummary } from "@/lib/api";
import { keys, useProgress, useTopics } from "@/lib/queries";
import { formatDateTime } from "@/lib/utils";

export function useStartPractice() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (body: { mode: PracticeMode; topic?: string | null; size: number }) => api.post<{ id: string }>("/practice", body),
    onSuccess: (r) => navigate(`/practice/s/${r.id}`),
  });
}

export default function PracticeSetup() {
  const [params] = useSearchParams();
  const topics = useTopics();
  const progress = useProgress();
  const active = useQuery({ queryKey: keys.practiceList, queryFn: () => api.get<PracticeSummary[]>("/practice?active=1") });
  const [topic, setTopic] = useState(params.get("topic") ?? "all");
  const [size, setSize] = useState(20);
  const start = useStartPractice();

  const options = [{ value: "all", label: "All topics (mixed)" }, ...(topics.data ?? []).map((t) => ({ value: t.id, label: `${t.number}. ${t.title}` }))];
  const chosen = topics.data?.find((t) => t.id === topic);
  const mistakes = progress.data?.totals.mistakes ?? 0;
  const saved = progress.data?.totals.bookmarks ?? 0;
  const unfinished = (active.data ?? []).filter((s) => s.mode !== "quiz" && s.answered < s.total).slice(0, 3);

  return (
    <div className="animate-rise">
      <PageHeader title="Practice questions" description="Questions are picked at random, favouring ones you've seen least, and the answers are shuffled every time. You'll see the explanation straight after each answer." />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Start a session</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Topic</Label>
              <Select label="Topic" value={topic} onValueChange={setTopic} options={options} />
              {chosen && (
                <p className="text-sm text-muted">
                  {chosen.bankSize} questions in this topic · you've answered {chosen.distinctAnswered} of them
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Number of questions</Label>
              <div>
                <Segmented<number>
                  label="Number of questions"
                  value={size}
                  onChange={setSize}
                  options={[10, 20, 30, 50].map((n) => ({ value: n, label: String(n) }))}
                />
              </div>
              {chosen && chosen.bankSize < size && <p className="text-sm text-muted">This topic has {chosen.bankSize} questions, so you'll get all of them.</p>}
            </div>
            <Button size="lg" onClick={() => start.mutate({ mode: topic === "all" ? "mixed" : "topic", topic: topic === "all" ? null : topic, size })} disabled={start.isPending}>
              <Play /> Start practising
            </Button>
            {start.isError && <p className="text-sm text-danger">{(start.error as Error).message}</p>}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="size-4" /> Review my mistakes
              </CardTitle>
              <p className="text-sm text-muted">{mistakes ? `${mistakes} questions you got wrong last time you saw them.` : "Questions you get wrong will collect here."}</p>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" disabled={!mistakes || start.isPending} onClick={() => start.mutate({ mode: "mistakes", size: 20 })}>
                Practise mistakes
              </Button>
              <Button asChild variant="ghost">
                <Link to="/mistakes">See list</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="size-4" /> Bookmarked questions
              </CardTitle>
              <p className="text-sm text-muted">{saved ? `${saved} saved for later.` : "Bookmark tricky questions while you practise."}</p>
            </CardHeader>
            <CardContent>
              <Button variant="outline" disabled={!saved || start.isPending} onClick={() => start.mutate({ mode: "bookmarks", size: 50 })}>
                Practise bookmarks
              </Button>
            </CardContent>
          </Card>
          {unfinished.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Unfinished sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-border">
                  {unfinished.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        <span className="font-semibold">{s.topic ? topics.data?.find((t) => t.id === s.topic)?.title : s.mode === "mixed" ? "Mixed" : s.mode === "mistakes" ? "Mistakes" : "Bookmarks"}</span>
                        <span className="block text-muted">
                          {s.answered}/{s.total} · {formatDateTime(s.startedAt)}
                        </span>
                      </span>
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/practice/s/${s.id}`}>Resume</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
