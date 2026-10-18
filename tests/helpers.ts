import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig, type Config } from "../server/src/config";
import { openDatabase, runMigrations, type DbHandle } from "../server/src/db/client";
import { seedContent } from "../server/src/db/seed";

export const MIGRATIONS = path.resolve("server/drizzle");

export function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "theory-test-"));
}

/** Opens (or reopens) a database file, runs migrations and seeds bundled content. */
export function openTestDb(file: string): DbHandle {
  const handle = openDatabase(file);
  runMigrations(handle, MIGRATIONS);
  seedContent(handle.db);
  return handle;
}

export function testConfig(dir: string): Config {
  return {
    ...loadConfig({ DATA_DIR: dir, LOG_REQUESTS: "false" }),
    migrationsDir: MIGRATIONS,
    staticDir: path.join(dir, "no-static"),
  };
}
