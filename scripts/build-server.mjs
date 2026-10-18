// Bundles the Express server (plus shared code and content) into dist/server.
// better-sqlite3 is a native module so it stays external and comes from node_modules.
import { build } from "esbuild";
import { cp, readFile, rm } from "node:fs/promises";

const pkg = JSON.parse(await readFile("package.json", "utf8"));

await rm("dist/server", { recursive: true, force: true });

await build({
  entryPoints: ["server/src/index.ts", "server/src/db/cli.ts"],
  outdir: "dist/server",
  // Flat output so index.js and cli.js both sit next to the drizzle/ migrations folder.
  entryNames: "[name]",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  // Runtime deps are installed with `npm ci --omit=dev`, so keep them out of the bundle.
  external: Object.keys(pkg.dependencies),
  tsconfig: "tsconfig.server.json",
  banner: {
    js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
  },
  logLevel: "info",
});

await cp("server/drizzle", "dist/server/drizzle", { recursive: true });
