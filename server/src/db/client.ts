import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

export interface DbHandle {
  sqlite: Database.Database;
  db: Db;
  close(): void;
}

export function openDatabase(file: string): DbHandle {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  // WAL keeps reads fast while writing; one replica means one writer, which SQLite handles fine.
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite, { schema });
  return {
    sqlite,
    db,
    close() {
      if (sqlite.open) sqlite.close();
    },
  };
}

export function runMigrations(handle: DbHandle, migrationsFolder: string): void {
  migrate(handle.db, { migrationsFolder });
}

/** Consistent online copy of the database, safe while the app is running. */
export async function backupTo(handle: DbHandle, dest: string): Promise<void> {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await handle.sqlite.backup(dest);
}
