import * as React from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  BookOpen,
  CarFront,
  ExternalLink,
  Eye,
  FileText,
  Handshake,
  Milestone,
  OctagonAlert,
  Package,
  PersonStanding,
  RefreshCw,
  Ruler,
  Signpost,
  Siren,
  TriangleAlert,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { HcRef, Nation } from "@shared/types";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/misc";

/** L-plate mark: the one bit of branding. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <rect x="1.5" y="1.5" width="29" height="29" rx="4" fill="#fff" stroke="currentColor" strokeWidth="1.5" className="text-foreground" />
        <path d="M10 6h5v15h8v5H10z" fill="var(--lplate)" />
      </svg>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-[15px] font-bold">Theory Hub</span>
          <span className="block text-xs text-muted">GB car theory test</span>
        </span>
      )}
    </span>
  );
}

export function PageHeader({ title, description, actions, back }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; back?: { to: string; label: string } }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link to={back.to} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-bold sm:text-[28px]">{title}</h1>
        {description && <div className="mt-1 max-w-2xl text-muted">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function LoadingBlock({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cn("h-20", i === 0 && "h-28")} />
      ))}
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof ApiError ? error.message : "Something went wrong loading this page.";
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] border border-danger/30 bg-danger-soft p-5">
      <div className="flex items-center gap-2 font-semibold text-danger">
        <AlertTriangle className="size-5" /> Couldn't load this
      </div>
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon = BookOpen, title, children, action }: { icon?: LucideIcon; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-border-strong px-6 py-10 text-center">
      <div className="mb-3 grid size-12 place-items-center rounded-full bg-surface-2 text-muted">
        <Icon className="size-6" />
      </div>
      <h3 className="font-bold">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Plain text with **bold** support. Content strings come from our own files, never users. */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className={className}>
      {parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-bold">{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>))}
    </span>
  );
}

const TOPIC_ICONS: Record<string, LucideIcon> = {
  eye: Eye,
  handshake: Handshake,
  wrench: Wrench,
  ruler: Ruler,
  "triangle-alert": TriangleAlert,
  "person-standing": PersonStanding,
  truck: Truck,
  "car-front": CarFront,
  milestone: Milestone,
  signpost: Signpost,
  "octagon-alert": OctagonAlert,
  "file-text": FileText,
  siren: Siren,
  package: Package,
};

export function TopicIcon({ name, className }: { name: string; className?: string }) {
  const Icon = TOPIC_ICONS[name] ?? BookOpen;
  return <Icon className={className} aria-hidden="true" />;
}

export function RefLinks({ refs, className }: { refs: HcRef[]; className?: string }) {
  if (refs.length === 0) return null;
  const unique = refs.filter((r, i) => refs.findIndex((x) => x.url === r.url) === i);
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1 text-sm", className)}>
      {unique.map((r) => (
        <li key={r.url}>
          <a href={r.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            {r.label}
            <ExternalLink className="size-3.5" aria-hidden="true" />
            <span className="sr-only">(opens GOV.UK in a new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export const NATION_LABEL: Record<Nation, string> = { england: "England", scotland: "Scotland", wales: "Wales" };

export function StatTile({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-card", className)}>
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

/**
 * Progress drawn like a road centre line: dashes that turn solid as you complete
 * them. One segment per unit (lesson, question).
 */
export function LaneProgress({ done, total, className, label }: { done: number; total: number; className?: string; label: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)} role="img" aria-label={`${label}: ${done} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < done ? "bg-primary" : "bg-surface-3")} />
      ))}
    </div>
  );
}
