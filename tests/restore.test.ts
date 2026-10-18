import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { applyPendingRestore } from "../server/src/db/restore";
import { backupTo, type DbHandle } from "../server/src/db/client";
import { profiles } from "../server/src/db/schema";
import { openTestDb, tempDir } from "./helpers";

const open: DbHandle[] = [];
afterEach(() => open.splice(0).forEach((h) => h.close()));

describe("restore from backup", () => {
  it("swaps in restore.db and keeps the old database", async () => {
    const dir = tempDir();
    const dbFile = path.join(dir, "theory.db");
    const h = openTestDb(dbFile);
    h.db.update(profiles).set({ name: "Before backup" }).where(eq(profiles.id, 1)).run();
    await backupTo(h, path.join(dir, "restore.db"));
    h.db.update(profiles).set({ name: "After backup" }).where(eq(profiles.id, 1)).run();
    h.close();

    const r = applyPendingRestore(dbFile, new Date("2026-10-18T12:00:00Z"));
    expect(r.restored).toBe(true);
    expect(fs.existsSync(path.join(dir, "restore.db"))).toBe(false);
    expect(fs.existsSync(r.keptAs!)).toBe(true);

    const after = openTestDb(dbFile);
    open.push(after);
    expect(after.db.select().from(profiles).get()!.name).toBe("Before backup");
  });

  it("does nothing without restore.db", () => {
    expect(applyPendingRestore(path.join(tempDir(), "theory.db")).restored).toBe(false);
  });

  it("refuses a truncated backup and keeps the current database", async () => {
    const dir = tempDir();
    const dbFile = path.join(dir, "theory.db");
    const h = openTestDb(dbFile);
    h.db.update(profiles).set({ name: "Keep me" }).where(eq(profiles.id, 1)).run();
    const full = path.join(dir, "full.db");
    await backupTo(h, full);
    h.close();
    // Header intact, most of the pages missing: what an interrupted kubectl cp leaves behind.
    const bytes = fs.readFileSync(full);
    fs.writeFileSync(path.join(dir, "restore.db"), bytes.subarray(0, Math.floor(bytes.length / 3)));

    const r = applyPendingRestore(dbFile);
    expect(r.restored).toBe(false);
    expect(r.reason).toMatch(/integrity check/);
    expect(fs.existsSync(path.join(dir, "restore.db.rejected"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "restore.db-wal"))).toBe(false);

    const after = openTestDb(dbFile);
    open.push(after);
    expect(after.db.select().from(profiles).get()!.name).toBe("Keep me");
  });

  it("refuses a file that isn't SQLite", () => {
    const dir = tempDir();
    fs.writeFileSync(path.join(dir, "restore.db"), "not a database");
    const r = applyPendingRestore(path.join(dir, "theory.db"));
    expect(r.restored).toBe(false);
    expect(r.reason).toMatch(/isn't a SQLite database/);
    expect(fs.existsSync(path.join(dir, "restore.db.rejected"))).toBe(true);
  });
});
