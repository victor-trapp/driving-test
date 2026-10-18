import fs from "node:fs";
import path from "node:path";

const SQLITE_HEADER = "SQLite format 3\u0000";

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
  if (header.toString("latin1") !== SQLITE_HEADER) {
    const rejected = `${pending}.rejected`;
    fs.renameSync(pending, rejected);
    return { restored: false, reason: `restore.db isn't a SQLite database, renamed to ${path.basename(rejected)}` };
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
