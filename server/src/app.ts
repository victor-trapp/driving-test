import fs from "node:fs";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import { sql } from "drizzle-orm";
import type { Config } from "./config";
import type { DbHandle } from "./db/client";
import { errorHandler } from "./http";
import { apiRouter } from "./routes";
import { hostGuard, sameOriginWrites } from "./security";

export function createApp(handle: DbHandle, config: Config) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", "loopback");

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "default-src": ["'self'"],
          "script-src": ["'self'"],
          // React and Recharts set inline style attributes.
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:", "blob:"],
          "media-src": ["'self'", "blob:"],
          "font-src": ["'self'", "data:"],
          "connect-src": ["'self'"],
          // Plain HTTP on the LAN: don't force browsers to upgrade to HTTPS.
          "upgrade-insecure-requests": null,
        },
      },
      // HSTS would break plain-HTTP access on the LAN.
      strictTransportSecurity: false,
      crossOriginOpenerPolicy: false,
      originAgentCluster: false,
    }),
  );

  if (config.logRequests) {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        if (req.path.startsWith("/api/") || res.statusCode >= 400) {
          console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
        }
      });
      next();
    });
  }

  // Probes stay outside /api so they're cheap and never touch the profile.
  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });
  app.get("/readyz", (_req, res) => {
    try {
      handle.db.get(sql`SELECT 1`);
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  app.use(hostGuard(config.allowedHosts));
  app.use(sameOriginWrites);

  // Question packs can be a few MB; nothing else sent to the API comes close to 100 kB.
  app.use("/api/admin/import", express.json({ limit: "10mb" }));
  app.use("/api", express.json({ limit: "100kb" }), apiRouter(handle, config));

  // Licensed hazard perception clips live on the data volume.
  app.use("/media", express.static(config.mediaDir, { fallthrough: false, maxAge: "1d" }));

  if (fs.existsSync(path.join(config.staticDir, "index.html"))) {
    app.use(
      express.static(config.staticDir, {
        index: false,
        setHeaders(res, file) {
          // Vite fingerprints everything under /assets, so it can be cached forever.
          if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        },
      }),
    );
    // Client-side routes: anything that isn't a file or API call gets the app shell.
    app.get(/^\/(?!api\/|media\/).*/, (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(config.staticDir, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
