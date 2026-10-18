import { CircleCheck, RotateCcw } from "lucide-react";
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from "@/components/common";
import { Explanation, QuestionView } from "@/components/QuestionView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMistakes } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { useStartPractice } from "./PracticeSetup";

export default function Mistakes() {
  const q = useMistakes();
  const start = useStartPractice();
  const n = q.data?.length ?? 0;
  return (
    <div className="animate-rise">
      <PageHeader
        title="Review my mistakes"
        description="Every question you got wrong the last time you answered it. Get it right and it drops off the list."
        actions={
          n > 0 ? (
            <Button onClick={() => start.mutate({ mode: "mistakes", size: n > 30 ? 50 : n > 20 ? 30 : n > 10 ? 20 : 10 })} disabled={start.isPending}>
              <RotateCcw /> Practise {Math.min(n, 50)} {n === 1 ? "mistake" : "mistakes"}
            </Button>
          ) : undefined
        }
      />
      {q.isPending ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorBlock error={q.error} onRetry={() => q.refetch()} />
      ) : n === 0 ? (
        <EmptyState icon={CircleCheck} title="No mistakes to review">
          Questions you answer wrongly in practice or mock tests will show up here.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {q.data.map((m) => (
            <Card key={m.question.id}>
              <CardContent className="space-y-3 pt-5">
                <div className="text-xs text-muted">Last answered {formatDate(m.at)}</div>
                <QuestionView question={m.question} selected={m.lastSelected} correctKeys={m.question.correctKeys} disabled compact />
                <Explanation correct={false} explanation={m.question.explanation} hc={m.question.hc} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
