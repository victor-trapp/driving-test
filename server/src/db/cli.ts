// Command line helpers. In the container: node dist/server/cli.js <command>
//
//   migrate                 apply database migrations
//   seed                    migrate, then load bundled questions and clips
//   import <file.json>      import a licensed question pack (see docs/import-format.md)
//   import-clips <file>     register licensed MP4 hazard clips copied into the media dir
//   backup <out.db>         write a consistent copy of the database
import fs from "node:fs";
import { loadConfig, loadEnvFile } from "../config";
import { backupTo, openDatabase, runMigrations } from "./client";
import { importClips, importQuestions, seedContent } from "./seed";

const [command, arg] = process.argv.slice(2);
loadEnvFile();
const config = loadConfig();
const handle = openDatabase(config.databasePath);

try {
  runMigrations(handle, config.migrationsDir);
  switch (command) {
    case "migrate":
      console.log("migrations applied");
      break;
    case "seed": {
      const r = seedContent(handle.db);
      console.log(`seeded ${r.questions} questions and ${r.clips} clips`);
      break;
    }
    case "import": {
      if (!arg) throw new Error("usage: import <file.json>");
      seedContent(handle.db);
      const r = importQuestions(handle.db, JSON.parse(fs.readFileSync(arg, "utf8")));
      console.log(`batch "${r.batch}": ${r.inserted} inserted, ${r.updated} updated, ${r.errors.length} rejected`);
      for (const e of r.errors) console.log(`  #${e.index}${e.id ? ` (${e.id})` : ""}: ${e.message}`);
      if (r.errors.length) process.exitCode = 1;
      break;
    }
    case "import-clips": {
      if (!arg) throw new Error("usage: import-clips <file.json>");
      seedContent(handle.db);
      const r = importClips(handle.db, JSON.parse(fs.readFileSync(arg, "utf8")));
      console.log(`registered ${r.imported} clip(s)`);
      break;
    }
    case "backup": {
      if (!arg) throw new Error("usage: backup <out.db>");
      await backupTo(handle, arg);
      console.log(`backup written to ${arg}`);
      break;
    }
    default:
      console.log("commands: migrate | seed | import <file> | import-clips <file> | backup <out.db>");
      process.exitCode = command ? 1 : 0;
  }
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  handle.close();
}
