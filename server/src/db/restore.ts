import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const SQLITE_HEADER = "SQLite format 3\u0000";

/** Null when the file is a readable, uncorrupted SQLite database, otherwise what's wrong. */
function integrityProblem(file: string): string | null {
  try {
    const db = new Database(file, { fileMustExist: true });
    try {
      const result = db.pragma("quick_check", { simple: true });
      return result === "ok" ? null : String(result);
    } finally {
      db.close();
    }
  } catch (e) {
    return (e as Error).message;
  } finally {
    // Opening a WAL-mode backup can leave these behind; they mustn't follow the file.
    for (const suffix of ["-wal", "-shm"]) fs.rmSync(`${file}${suffix}`, { force: true });
  }
}

/**
 * Restores a backup dropped next to the database as `restore.db`. Runs once at startup,
 * before the database is opened, so nothing has the file locked:
 *
 *   kubectl cp theory-backup.db driving-theory/<pod>:/data/restore.db
 *   kubectl -n driving-theory rollout restart deploy/driving-theory
 *
 * The current database is kept as theory.db.before-restore-<timestamp>.
 */
export function applyPendingRestore(databasePath: string, now = new Date()): { restored: boolean; keptAs?: string; reason?: string } {
  const pending = path.join(path.dirname(databasePath), "restore.db");
  if (!fs.existsSync(pending)) return { restored: false };

  const header = Buffer.alloc(16);
  const fd = fs.openSync(pending, "r");
  fs.readSync(fd, header, 0, 16, 0);
  fs.closeSync(fd);
  const rejected = `${pending}.rejected`;
  if (header.toString("latin1") !== SQLITE_HEADER) {
    fs.renameSync(pending, rejected);
    return { restored: false, reason: `restore.db isn't a SQLite database, renamed to ${path.basename(rejected)}` };
  }
  // A truncated copy still has a valid header. Check it properly before replacing a working database with it.
  const problem = integrityProblem(pending);
  if (problem) {
    fs.renameSync(pending, rejected);
    return { restored: false, reason: `restore.db failed the integrity check (${problem}), renamed to ${path.basename(rejected)}` };
  }

  let keptAs: string | undefined;
  if (fs.existsSync(databasePath)) {
    keptAs = `${databasePath}.before-restore-${now.toISOString().replace(/[:.]/g, "-")}`;
    fs.renameSync(databasePath, keptAs);
  }
  // WAL and shared-memory files belong to the old database and must not be replayed onto the backup.
  for (const suffix of ["-wal", "-shm"]) fs.rmSync(`${databasePath}${suffix}`, { force: true });
  fs.renameSync(pending, databasePath);
  return { restored: true, keptAs };
}
