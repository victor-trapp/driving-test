import fs from "node:fs";
import { loadConfig } from "./config";
import { openDatabase, runMigrations } from "./db/client";
import { applyPendingRestore } from "./db/restore";
import { seedContent } from "./db/seed";
import { createApp } from "./app";

const config = loadConfig();
fs.mkdirSync(config.mediaDir, { recursive: true });

const restore = applyPendingRestore(config.databasePath);
if (restore.restored) console.log(`restored database from restore.db${restore.keptAs ? `, previous copy kept as ${restore.keptAs}` : ""}`);
else if (restore.reason) console.warn(restore.reason);

const handle = openDatabase(config.databasePath);
runMigrations(handle, config.migrationsDir);
const seeded = seedContent(handle.db);
console.log(`database ${config.databasePath}: ${seeded.questions} bundled questions, ${seeded.clips} clips`);

const app = createApp(handle, config);
const server = app.listen(config.port, config.host, () => {
  console.log(`UK Driving Theory Hub listening on http://${config.host}:${config.port}`);
});

// Kubernetes sends SIGTERM and waits terminationGracePeriodSeconds. Stop accepting
// connections, let in-flight requests finish, then close SQLite cleanly so the WAL is
// checkpointed into the main database file.
let stopping = false;
function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal} received, shutting down`);
  const force = setTimeout(() => {
    console.error("forcing exit after timeout");
    handle.close();
    process.exit(1);
  }, 10_000);
  force.unref();
  server.close(() => {
    handle.close();
    console.log("closed cleanly");
    process.exit(0);
  });
  server.closeIdleConnections();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
