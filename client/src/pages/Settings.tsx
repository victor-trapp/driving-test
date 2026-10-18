import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, Upload } from "lucide-react";
import type { Nation } from "@shared/types";
import { ErrorBlock, LoadingBlock, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input, Label, Segmented } from "@/components/ui/misc";
import { ApiError, type Profile } from "@/lib/api";
import { useMeta, useProfile, useUpdateProfile } from "@/lib/queries";
import { applyTheme } from "@/lib/theme";

const TOKEN_KEY = "theory-admin-token";

function readToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

async function adminFetch(path: string, init: RequestInit, token: string) {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error?.code ?? "error", data?.error?.message ?? `Request failed (${res.status})`, data?.error?.details);
  }
  return res;
}

export default function Settings() {
  const profile = useProfile();
  const meta = useMeta();
  const update = useUpdateProfile();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [token, setToken] = useState(readToken);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile.data) setName(profile.data.name);
  }, [profile.data]);

  useEffect(() => {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      // ignore
    }
  }, [token]);

  const backup = useMutation({
    mutationFn: async () => {
      const res = await adminFetch("/backup", { method: "GET" }, token);
      const blob = await res.blob();
      const name = res.headers.get("content-disposition")?.match(/filename="?([^"]+)"?/)?.[1] ?? "driving-theory-backup.db";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      // Firefox only follows links that are in the document, and revoking the URL straight
      // after click() can cancel the download in Safari and Firefox.
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    },
  });

  const importPack = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("That file isn't valid JSON.");
      }
      const res = await adminFetch("/import/questions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(json) }, token);
      return (await res.json()) as { batch: string; inserted: number; updated: number; errors: { index: number; id?: string; message: string }[] };
    },
    onSuccess: (r) => {
      setImportResult(`"${r.batch}": ${r.inserted} added, ${r.updated} updated${r.errors.length ? `, ${r.errors.length} rejected (first: ${r.errors[0].message})` : ""}.`);
      qc.invalidateQueries();
    },
  });

  const reset = useMutation({
    mutationFn: () => adminFetch("/reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: "RESET" }) }, token),
    onSuccess: () => qc.invalidateQueries(),
  });

  if (profile.isPending) return <LoadingBlock rows={4} />;
  if (profile.isError) return <ErrorBlock error={profile.error} onRetry={() => profile.refetch()} />;
  const p = profile.data;
  const save = (patch: Partial<Omit<Profile, "id">>) => update.mutate(patch);

  return (
    <div className="mx-auto max-w-3xl space-y-4 animate-rise">
      <PageHeader title="Settings" />

      <Card>
        <CardHeader>
          <CardTitle>You</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <div className="flex gap-2">
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              <Button variant="outline" onClick={() => save({ name: name.trim() })} disabled={name.trim() === p.name}>
                Save
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nation</Label>
            <p className="text-sm text-muted">Highlights rules that differ where you drive. The test itself covers all of Great Britain.</p>
            <Segmented<Nation> label="Nation" value={p.nation} onChange={(v) => save({ nation: v })} options={[{ value: "england", label: "England" }, { value: "scotland", label: "Scotland" }, { value: "wales", label: "Wales" }]} />
          </div>
          <div className="space-y-2">
            <Label>Daily goal</Label>
            <Segmented<number> label="Daily goal" value={p.dailyGoal} onChange={(v) => save({ dailyGoal: v })} options={[10, 20, 30, 50].map((n) => ({ value: n, label: `${n} questions` }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-date">Theory test date (optional)</Label>
            <Input id="test-date" type="date" className="max-w-52" value={p.testDate ?? ""} onChange={(e) => save({ testDate: e.target.value || null })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <Segmented<Profile["theme"]>
            label="Theme"
            value={p.theme}
            onChange={(v) => {
              applyTheme(v);
              save({ theme: v });
            }}
            options={[{ value: "system", label: "Match device" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <p className="text-sm text-muted">Your progress is stored in a SQLite database on the server's persistent volume.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {meta.data?.adminProtected && (
            <div className="space-y-2">
              <Label htmlFor="token">Admin token</Label>
              <p className="text-sm text-muted">This server has ADMIN_TOKEN set, so backups, imports and resets need it. It's kept for this browser tab only.</p>
              <Input id="token" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" className="max-w-sm" />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={() => backup.mutate()} disabled={backup.isPending}>
              <Download /> Download backup
            </Button>
            <span className="text-sm text-muted">A consistent copy of the database, safe to take while the app is running.</span>
          </div>
          {backup.isError && <p className="text-sm text-danger">{(backup.error as Error).message}</p>}

          <div className="space-y-2 border-t border-border pt-5">
            <div className="font-semibold">Import a question pack</div>
            <p className="text-sm text-muted">
              Add extra questions you're licensed to use, as a JSON file. The format is described in <code className="rounded bg-surface-2 px-1">docs/import-format.md</code>. Imported questions can't overwrite the built-in ones.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              aria-label="Question pack JSON file"
              // The visible button below opens it; keep the hidden input out of the tab order.
              tabIndex={-1}
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importPack.mutate(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importPack.isPending}>
              <Upload /> Choose JSON file
            </Button>
            {importResult && <p className="text-sm">{importResult}</p>}
            {importPack.isError && <p className="text-sm text-danger">{(importPack.error as Error).message}</p>}
          </div>

          <div className="space-y-2 border-t border-border pt-5">
            <div className="font-semibold text-danger">Reset progress</div>
            <p className="text-sm text-muted">Deletes all answers, sessions, mock tests, bookmarks, lessons completed, flashcards and hazard attempts. Download a backup first if you might want them back.</p>
            <Button variant="danger" onClick={() => setResetOpen(true)}>
              Reset everything
            </Button>
            {reset.isSuccess && <p className="text-sm text-success">Progress reset.</p>}
            {reset.isError && <p className="text-sm text-danger">{(reset.error as Error).message}</p>}
            <ConfirmDialog
              open={resetOpen}
              onOpenChange={(o) => {
                setResetOpen(o);
                if (!o) setResetText("");
              }}
              title="Reset all progress?"
              description="This can't be undone from the app."
              confirmLabel="Reset"
              destructive
              confirmDisabled={resetText !== "RESET"}
              onConfirm={() => reset.mutate()}
            >
              <div className="mt-4 space-y-2">
                <Label htmlFor="reset-confirm">Type RESET to confirm</Label>
                <Input id="reset-confirm" value={resetText} onChange={(e) => setResetText(e.target.value)} autoComplete="off" />
              </div>
            </ConfirmDialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About and sources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-[15px]">
          <p>
            Theory Hub is an independent practice tool for the Great Britain car theory test (category B). It isn't made, endorsed or approved by DVSA. All practice questions are original, written from the Highway Code, and aren't official DVSA revision questions. Northern Ireland runs its own test, which isn't covered here.
          </p>
          <p>Test format last checked against GOV.UK on {meta.data?.formatVerifiedOn ?? "…"}: 50 questions in 57 minutes with a pass mark of 43, and hazard perception with 14 clips, 75 points and a pass mark of 44.</p>
          <p className="text-sm text-muted">
            {meta.data?.signAttribution} Highway Code content is summarised and linked from GOV.UK and is © Crown copyright, used under the{" "}
            <a href={meta.data?.sources.ogl} target="_blank" rel="noreferrer noopener" className="font-semibold text-primary hover:underline">
              Open Government Licence v3.0
            </a>
            .
          </p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {[
              ["The theory test", meta.data?.sources.theoryTest],
              ["Multiple-choice questions", meta.data?.sources.mcq],
              ["Hazard perception test", meta.data?.sources.hazardTest],
              ["Pass mark and result", meta.data?.sources.passMark],
              ["The Highway Code", meta.data?.sources.highwayCode],
              ["Know your traffic signs", meta.data?.sources.kyts],
            ].map(([label, url]) =>
              url ? (
                <li key={label}>
                  <a href={url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                    {label} <ExternalLink className="size-3.5" />
                  </a>
                </li>
              ) : null,
            )}
          </ul>
          <p className="text-xs text-muted">
            App {meta.data?.appVersion ?? "…"} · content version {meta.data?.contentVersion ?? "…"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
