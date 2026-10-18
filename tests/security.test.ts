import path from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../server/src/app";
import { loadConfig } from "../server/src/config";
import type { DbHandle } from "../server/src/db/client";
import { bearerMatches, isAllowedHost } from "../server/src/security";
import { openTestDb, tempDir, testConfig } from "./helpers";

const open: DbHandle[] = [];
afterEach(() => open.splice(0).forEach((h) => h.close()));

function setup(allowedHosts: string[] = []) {
  const dir = tempDir();
  const handle = openTestDb(path.join(dir, "t.db"));
  open.push(handle);
  return createApp(handle, { ...testConfig(dir), allowedHosts });
}

describe("host checks (DNS rebinding)", () => {
  it("answers to localhost and IP addresses only, by default", async () => {
    const app = setup();
    for (const host of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000", "192.168.0.55:30081", "app.localhost:5173"]) {
      await request(app).get("/api/meta").set("Host", host).expect(200);
    }
    const res = await request(app).get("/api/admin/backup").set("Host", "evil.example:3000").expect(403);
    expect(res.body.error.code).toBe("host_not_allowed");
  });

  it("answers to names listed in ALLOWED_HOSTS", async () => {
    const app = setup(["theory.home.arpa", ".tailnet.ts.net"]);
    await request(app).get("/api/meta").set("Host", "theory.home.arpa").expect(200);
    await request(app).get("/api/meta").set("Host", "box.tailnet.ts.net").expect(200);
    await request(app).get("/api/meta").set("Host", "theory.home.arpa.evil.example").expect(403);
  });

  it("leaves the probes alone", async () => {
    const app = setup();
    await request(app).get("/healthz").set("Host", "anything.example").expect(200);
  });

  it("matches names exactly, without being fooled by look-alikes", () => {
    expect(isAllowedHost("localhost", [])).toBe(true);
    expect(isAllowedHost("LOCALHOST.", [])).toBe(true);
    expect(isAllowedHost("localhost.evil.example", [])).toBe(false);
    expect(isAllowedHost("notlocalhost", [])).toBe(false);
    expect(isAllowedHost("evilhome.arpa", [".home.arpa"])).toBe(false);
    expect(isAllowedHost("home.arpa", [".home.arpa"])).toBe(true);
  });
});

describe("cross-site writes (CSRF)", () => {
  it("refuses writes from another site's page", async () => {
    const app = setup();
    const res = await request(app).post("/api/mock-tests").set("Host", "localhost:3000").set("Origin", "https://evil.example").expect(403);
    expect(res.body.error.code).toBe("cross_origin");
    await request(app).post("/api/admin/reset").set("Host", "localhost:3000").set("Origin", "null").send({ confirm: "RESET" }).expect(403);
    // Another port on the same machine is a different origin too.
    await request(app).post("/api/mock-tests").set("Host", "localhost:3000").set("Origin", "http://localhost:8080").expect(403);
  });

  it("allows the app's own pages and non-browser clients", async () => {
    const app = setup();
    await request(app).post("/api/mock-tests").set("Host", "localhost:5173").set("Origin", "http://localhost:5173").expect(201);
    await request(app).patch("/api/profile").set("Host", "192.168.0.55:30081").set("Origin", "http://192.168.0.55:30081").send({ name: "Sam" }).expect(200);
    await request(app).patch("/api/profile").send({ name: "Sam" }).expect(200);
  });

  it("doesn't get in the way of reads", async () => {
    const app = setup();
    await request(app).get("/api/meta").set("Origin", "https://evil.example").expect(200);
  });
});

describe("request limits", () => {
  it("caps ordinary request bodies but lets question packs through", async () => {
    const app = setup();
    const big = "x".repeat(200_000);
    await request(app).patch("/api/profile").send({ name: big }).expect(413);
    const res = await request(app).post("/api/admin/import/questions").send({ source: "big", questions: [{ id: "x", padding: big }] }).expect(200);
    expect(res.body.errors).toHaveLength(1);
  });
});

describe("config", () => {
  it("listens on loopback unless told otherwise", () => {
    expect(loadConfig({}).host).toBe("127.0.0.1");
    expect(loadConfig({ HOST: "0.0.0.0" }).host).toBe("0.0.0.0");
  });

  it("reads ALLOWED_HOSTS as a comma-separated list", () => {
    expect(loadConfig({ ALLOWED_HOSTS: " Theory.Home.Arpa, ,.ts.net" }).allowedHosts).toEqual(["theory.home.arpa", ".ts.net"]);
    expect(loadConfig({}).allowedHosts).toEqual([]);
  });

  it("rejects a time zone that doesn't exist at startup", () => {
    expect(() => loadConfig({ APP_TIMEZONE: "Europe/Atlantis" })).toThrow(/APP_TIMEZONE/);
  });
});

describe("admin token", () => {
  it("only accepts the exact bearer token", () => {
    expect(bearerMatches("Bearer s3cret", "s3cret")).toBe(true);
    expect(bearerMatches("Bearer s3cre", "s3cret")).toBe(false);
    expect(bearerMatches("Bearer s3cretx", "s3cret")).toBe(false);
    expect(bearerMatches("s3cret", "s3cret")).toBe(false);
    expect(bearerMatches(undefined, "s3cret")).toBe(false);
  });
});
