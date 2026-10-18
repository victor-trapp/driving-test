import path from "node:path";

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
  logRequests: boolean;
}

export function loadConfig(env = process.env): Config {
  const dataDir = path.resolve(env.DATA_DIR ?? "./data");
  return {
    port: int("PORT", 3000),
    host: env.HOST ?? "0.0.0.0",
    dataDir,
    databasePath: path.resolve(env.DATABASE_PATH ?? path.join(dataDir, "theory.db")),
    mediaDir: path.resolve(env.MEDIA_DIR ?? path.join(dataDir, "media")),
    staticDir: path.resolve(env.STATIC_DIR ?? "./dist/client"),
    migrationsDir: path.resolve(env.MIGRATIONS_DIR ?? defaultMigrationsDir()),
    timeZone: env.APP_TIMEZONE ?? "Europe/London",
    adminToken: env.ADMIN_TOKEN ? env.ADMIN_TOKEN : null,
    logRequests: (env.LOG_REQUESTS ?? "true") !== "false",
  };
}

// In the built image migrations sit next to the bundle; in dev they're in server/drizzle.
function defaultMigrationsDir(): string {
  const here = path.dirname(new URL(import.meta.url).pathname);
  return here.includes(`${path.sep}dist${path.sep}`) ? path.join(here, "drizzle") : path.resolve("server/drizzle");
}
