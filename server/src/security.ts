import { timingSafeEqual } from "node:crypto";
import net from "node:net";
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./http";

// There's no login, so the browser is the only thing standing between another website
// and this app's API. These guards close the two ways a page on another site could use
// it through the learner's own browser.

/**
 * True for IP addresses, localhost (and *.localhost), and names in `allowed`.
 * An entry starting with a dot also allows its subdomains, e.g. ".home.arpa".
 */
export function isAllowedHost(hostname: string, allowed: readonly string[]): boolean {
  const name = hostname.replace(/^\[(.*)\]$/, "$1").replace(/\.$/, "").toLowerCase();
  if (net.isIP(name) !== 0) return true;
  if (name === "localhost" || name.endsWith(".localhost")) return true;
  return allowed.some((a) => (a.startsWith(".") ? name === a.slice(1) || name.endsWith(a) : name === a));
}

/**
 * DNS rebinding: a page on evil.example points its own name at 127.0.0.1 and can then
 * read this app as if it were same-origin. The Host header still says evil.example, so
 * only answering to names we know about stops it.
 */
export function hostGuard(allowed: readonly string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const hostname = req.hostname;
    if (!hostname || !isAllowedHost(hostname, allowed)) {
      throw new HttpError(403, "host_not_allowed", `This server doesn't answer to "${hostname ?? ""}". Add it to ALLOWED_HOSTS if it's yours.`);
    }
    next();
  };
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF: a form on another site can POST here with the learner's browser. Browsers send
 * Origin on every cross-origin POST, PUT, PATCH and DELETE, so writes whose Origin
 * doesn't match the Host they were sent to are refused. Requests with no Origin at all
 * (curl, scripts) aren't from another web page, so they're let through.
 */
export function sameOriginWrites(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get("origin");
  if (origin === undefined) return next();
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    // "null" (sandboxed frames, privacy redirects) or garbage: not our page.
  }
  if (!originHost || originHost.toLowerCase() !== (req.get("host") ?? "").toLowerCase()) {
    throw new HttpError(403, "cross_origin", "Requests from other websites aren't allowed");
  }
  next();
}

/** Compares a bearer token without leaking how much of it matched through timing. */
export function bearerMatches(header: string | undefined, token: string): boolean {
  const got = Buffer.from(header ?? "");
  const want = Buffer.from(`Bearer ${token}`);
  return got.length === want.length && timingSafeEqual(got, want);
}
