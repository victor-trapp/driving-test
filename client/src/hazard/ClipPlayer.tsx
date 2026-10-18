import { useCallback, useEffect, useRef, useState } from "react";
import { Flag, Play, RotateCcw, Square } from "lucide-react";
import type { Scenario } from "@shared/scenario";
import { SIGNS } from "@content/signs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { renderFrame } from "./render";

export interface PlayableClip {
  id: string;
  title: string;
  kind: "animated" | "video";
  durationMs: number;
  scenario: Scenario | null;
  src: string | null;
}

interface Props {
  clip: PlayableClip;
  /** test: one run, clicks recorded. watch: replay freely, no clicks. review: replay showing windows and your clicks. */
  mode: "test" | "watch" | "review";
  onComplete?: (clicks: number[]) => void;
  windows?: { startMs: number; endMs: number }[];
  reviewClicks?: number[];
  className?: string;
  autoStart?: boolean;
}

const signImageCache = new Map<string, HTMLImageElement>();
function signImages(s: Scenario | null) {
  const map = new Map<string, HTMLImageElement>();
  for (const sc of s?.scenery ?? []) {
    if (sc.kind !== "sign" || !sc.signId) continue;
    const sign = SIGNS.find((x) => x.id === sc.signId);
    if (!sign || sign.image.kind !== "dft") continue;
    let img = signImageCache.get(sign.id);
    if (!img) {
      img = new Image();
      img.src = `/signs/${sign.image.file}.webp`;
      signImageCache.set(sign.id, img);
    }
    map.set(sc.signId, img);
  }
  return map;
}

export function ClipPlayer({ clip, mode, onComplete, windows, reviewClicks, className, autoStart }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const raf = useRef(0);
  const lastT = useRef(0);
  const startAt = useRef(0);
  const clicksRef = useRef<number[]>([]);
  const [state, setState] = useState<"idle" | "playing" | "done">("idle");
  const [clicks, setClicks] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [flash, setFlash] = useState(0);
  const images = useRef(signImages(clip.scenario));

  const draw = useCallback(
    (t: number) => {
      const c = canvas.current;
      if (!c || !clip.scenario) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth;
      const h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastT.current = t;
      renderFrame(ctx, clip.scenario, t, w, h, { signImages: images.current });
    },
    [clip.scenario],
  );

  // First frame as a poster, and redraw on resize at whatever time was last shown.
  useEffect(() => {
    if (clip.kind !== "animated") return;
    draw(lastT.current);
    const ro = new ResizeObserver(() => draw(lastT.current));
    if (canvas.current) ro.observe(canvas.current);
    const t = setTimeout(() => draw(lastT.current), 300); // after sign images load
    return () => {
      ro.disconnect();
      clearTimeout(t);
    };
  }, [clip.kind, draw]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const finish = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setState("done");
    setProgress(1);
    if (mode === "test") onComplete?.(clicksRef.current.slice());
  }, [mode, onComplete]);

  const start = useCallback(() => {
    clicksRef.current = [];
    setClicks([]);
    setProgress(0);
    setState("playing");
    wrap.current?.focus();
    if (clip.kind === "video" && video.current) {
      video.current.currentTime = 0;
      void video.current.play();
      const tick = () => {
        const v = video.current;
        if (!v) return;
        setProgress(v.currentTime / Math.max(0.001, clip.durationMs / 1000));
        if (v.ended) return finish();
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
      return;
    }
    startAt.current = performance.now();
    const tick = () => {
      const t = performance.now() - startAt.current;
      if (t >= clip.durationMs) {
        draw(clip.durationMs);
        return finish();
      }
      draw(t);
      setProgress(t / clip.durationMs);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [clip.kind, clip.durationMs, draw, finish]);

  useEffect(() => {
    if (autoStart) start();
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    video.current?.pause();
    setState("idle");
    setProgress(0);
    draw(0);
  };

  const now = () => (clip.kind === "video" && video.current ? video.current.currentTime * 1000 : performance.now() - startAt.current);

  const registerClick = () => {
    if (state !== "playing" || mode !== "test") return;
    const t = Math.round(now());
    clicksRef.current.push(t);
    setClicks(clicksRef.current.slice());
    setFlash((f) => f + 1);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (state === "playing") registerClick();
      else if (state === "idle") start();
    }
  };

  const shownClicks = mode === "review" ? (reviewClicks ?? []) : clicks;

  return (
    <div className={cn("w-full", className)}>
      <div
        ref={wrap}
        tabIndex={0}
        role="application"
        aria-label={mode === "test" ? "Hazard perception clip. Press space or click when you see a developing hazard." : `Driving clip: ${clip.title}`}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          if (e.button === 0) registerClick();
        }}
        className={cn("relative aspect-video w-full touch-manipulation select-none overflow-hidden rounded-[var(--radius-card)] bg-black", mode === "test" && state === "playing" && "cursor-crosshair")}
      >
        {clip.kind === "animated" ? (
          <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
        ) : (
          <video ref={video} src={clip.src ?? undefined} className="absolute inset-0 h-full w-full" playsInline muted preload="auto" />
        )}

        {/* click feedback, like the flags in the real test */}
        {flash > 0 && state === "playing" && (
          <span key={flash} className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs font-semibold text-white animate-rise">
            <Flag className="size-3.5 text-[#ff5a4a]" /> {clicks.length}
          </span>
        )}

        {state !== "playing" && (
          <div className="absolute inset-0 grid place-items-center bg-black/35">
            <div className="flex flex-col items-center gap-3 px-4 text-center text-white">
              {state === "idle" && (
                <>
                  <Button size="lg" variant="accent" onClick={(e) => (e.stopPropagation(), start())} onPointerDown={(e) => e.stopPropagation()}>
                    <Play /> {mode === "test" ? "Start clip" : "Play clip"}
                  </Button>
                  {mode === "test" && <p className="max-w-sm text-sm text-white/90">Click, tap or press space as soon as you see a hazard starting to develop. You get one go.</p>}
                </>
              )}
              {state === "done" && mode !== "test" && (
                <Button size="lg" variant="accent" onClick={(e) => (e.stopPropagation(), start())} onPointerDown={(e) => e.stopPropagation()}>
                  <RotateCcw /> Watch again
                </Button>
              )}
              {state === "done" && mode === "test" && <p className="rounded-md bg-black/60 px-3 py-2 text-sm font-semibold">Clip finished</p>}
            </div>
          </div>
        )}

        <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/85">
          Practice clip · not DVSA footage
        </span>
      </div>

      {/* timeline */}
      <div className="mt-2 flex items-center gap-3">
        <div className="relative h-3 flex-1 overflow-visible rounded-full bg-surface-3" aria-hidden="true">
          {mode === "review" &&
            windows?.map((w, i) => {
              const band = (w.endMs - w.startMs) / 5;
              return (
                <div key={i} className="absolute inset-y-0 flex" style={{ left: `${(w.startMs / clip.durationMs) * 100}%`, width: `${((w.endMs - w.startMs) / clip.durationMs) * 100}%` }}>
                  {[5, 4, 3, 2, 1].map((pts) => (
                    <div key={pts} title={`${pts} points`} className="h-full" style={{ width: `${(band / (w.endMs - w.startMs)) * 100}%`, background: `color-mix(in srgb, var(--success) ${20 + pts * 14}%, transparent)` }} />
                  ))}
                </div>
              );
            })}
          <div className="absolute inset-y-0 left-0 rounded-full bg-primary/50" style={{ width: `${progress * 100}%` }} />
          {shownClicks.map((c, i) => (
            <Flag key={i} className="absolute -top-4 size-3.5 -translate-x-1/2 text-danger" style={{ left: `${(c / clip.durationMs) * 100}%` }} />
          ))}
        </div>
        {state === "playing" && mode !== "test" && (
          <Button size="sm" variant="ghost" onClick={stop}>
            <Square /> Stop
          </Button>
        )}
      </div>
    </div>
  );
}
