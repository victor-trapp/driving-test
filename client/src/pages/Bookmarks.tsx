import { useState } from "react";
import { Bookmark, BookmarkX, Eye, Play } from "lucide-react";
import { EmptyState, ErrorBlock, LoadingBlock, PageHeader } from "@/components/common";
import { Explanation, QuestionView } from "@/components/QuestionView";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBookmarks, useToggleBookmark } from "@/lib/queries";
import { useStartPractice } from "./PracticeSetup";

export default function Bookmarks() {
  const q = useBookmarks();
  const toggle = useToggleBookmark();
  const start = useStartPractice();
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const n = q.data?.length ?? 0;

  return (
    <div className="animate-rise">
      <PageHeader
        title="Bookmarks"
        description="Questions you've saved to come back to."
        actions={
          n > 0 ? (
            <Button onClick={() => start.mutate({ mode: "bookmarks", size: 50 })} disabled={start.isPending}>
              <Play /> Practise bookmarks
            </Button>
          ) : undefined
        }
      />
      {q.isPending ? (
        <LoadingBlock />
      ) : q.isError ? (
        <ErrorBlock error={q.error} onRetry={() => q.refetch()} />
      ) : n === 0 ? (
        <EmptyState icon={Bookmark} title="Nothing bookmarked yet">
          Use the bookmark button on any practice question to save it here.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {q.data.map(({ question }) => {
            const open = revealed.has(question.id);
            return (
              <Card key={question.id}>
                <CardContent className="space-y-3 pt-5">
                  <QuestionView question={question} selected={[]} correctKeys={open ? question.correctKeys : null} disabled compact />
                  {open && <Explanation correct={null} explanation={question.explanation} hc={question.hc} unanswered title="Why" />}
                  <div className="flex flex-wrap gap-2">
                    {!open && (
                      <Button variant="outline" size="sm" onClick={() => setRevealed(new Set(revealed).add(question.id))}>
                        <Eye /> Show answer
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => toggle.mutate({ id: question.id, on: false })}>
                      <BookmarkX /> Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
