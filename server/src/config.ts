import fs from "node:fs";
import path from "node:path";

/** Loads ./.env for local runs, if there is one. Variables already set in the shell win. */
export function loadEnvFile(file = ".env"): void {
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) throw new Error(`${name} must be a number, got "${raw}"`);
  return n;
}

export interface Config {
  port: number;
  host: string;
  dataDir: string;
  databasePath: string;
  mediaDir: string;
  staticDir: string;
  migrationsDir: string;
  timeZone: string;
  /** If set, admin endpoints (backup, import, reset) need `Authorization: Bearer <token>`. */
  adminToken: string | null;
  /** Hostnames the app answers to besides localhost and IP addresses. A leading dot allows subdomains. */
  allowedHosts: string[];
  logRequests: boolean;
}

export function loadConfig(env = process.env): Config {
  const dataDir = path.resolve(env.DATA_DIR ?? "./data");
  const timeZone = env.APP_TIMEZONE ?? "Europe/London";
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone });
  } catch {
    throw new Error(`APP_TIMEZONE must be an IANA time zone like Europe/London, got "${timeZone}"`);
  }
  return {
    port: int("PORT", 3000),
    // Loopback by default so a local run isn't reachable from the network. The Docker
    // image sets HOST=0.0.0.0 because inside a container that's the only way in.
    host: env.HOST ?? "127.0.0.1",
    dataDir,
    databasePath: path.resolve(env.DATABASE_PATH ?? path.join(dataDir, "theory.db")),
    mediaDir: path.resolve(env.MEDIA_DIR ?? path.join(dataDir, "media")),
    staticDir: path.resolve(env.STATIC_DIR ?? "./dist/client"),
    migrationsDir: path.resolve(env.MIGRATIONS_DIR ?? defaultMigrationsDir()),
    timeZone,
    adminToken: env.ADMIN_TOKEN ? env.ADMIN_TOKEN : null,
    allowedHosts: (env.ALLOWED_HOSTS ?? "")
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
    logRequests: (env.LOG_REQUESTS ?? "true") !== "false",
  };
}

// In the built image migrations sit next to the bundle; in dev they're in server/drizzle.
function defaultMigrationsDir(): string {
  const here = path.dirname(new URL(import.meta.url).pathname);
  return here.includes(`${path.sep}dist${path.sep}`) ? path.join(here, "drizzle") : path.resolve("server/drizzle");
}
