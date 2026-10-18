import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pct(n: number | null | undefined, fallback = "–"): string {
  return n === null || n === undefined ? fallback : `${Math.round(n)}%`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const shortDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export const formatDate = (ms: number) => dateFmt.format(new Date(ms));
export const formatDateTime = (ms: number) => dateTimeFmt.format(new Date(ms));
export const formatDay = (key: string) => shortDay.format(new Date(`${key}T12:00:00`));

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

/**
 * RFC 4122 v4 id. crypto.randomUUID() only exists in secure contexts (HTTPS or
 * localhost), and this app is usually opened over plain HTTP on the LAN, so build
 * one from getRandomValues, which works everywhere.
 */
export function uuid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
