import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { FORMAT_VERIFIED_ON, HAZARD_TEST, MOCK_EXAM } from "@shared/exam";
import { READINESS_WEIGHTS } from "@shared/readiness";
import { SIGN_ATTRIBUTION, SIGN_CATEGORIES, SIGNS } from "@content/index";
import { CONTENT_VERSION } from "@content/define";
import { GOV } from "@content/hc";
import type { Config } from "./config";
import { backupTo, type DbHandle } from "./db/client";
import { importClips, importQuestions } from "./db/seed";
import { HttpError, parse } from "./http";
import { bearerMatches } from "./security";
import * as hazard from "./services/hazard";
import * as learning from "./services/learning";
import * as mock from "./services/mock";
import * as practice from "./services/practice";
import { progressSummary } from "./services/progress";

// One local profile for now. When auth is added, this is where the user gets resolved.
const PROFILE_ID = 1;

const indexParam = z.coerce.number().int().min(0).max(999);
const selection = z.array(z.number().int().min(0).max(9)).max(6);
// A real calendar day, so 2026-02-31 doesn't get stored.
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s), "not a real date");

export function apiRouter(handle: DbHandle, config: Config): Router {
  const { db } = handle;
  const r = Router();

  // ---- Meta and profile ------------------------------------------------------------
  r.get("/meta", (_req, res) => {
    res.json({
      appVersion: process.env.APP_VERSION ?? "dev",
      contentVersion: CONTENT_VERSION,
      formatVerifiedOn: FORMAT_VERIFIED_ON,
      mockExam: MOCK_EXAM,
      hazardTest: HAZARD_TEST,
      readinessWeights: READINESS_WEIGHTS,
      sources: GOV,
      signAttribution: SIGN_ATTRIBUTION,
      adminProtected: config.adminToken !== null,
    });
  });

  r.get("/profile", (_req, res) => {
    res.json(learning.getProfile(db, PROFILE_ID));
  });

  r.patch("/profile", (req, res) => {
    const body = parse(
      z.object({
        name: z.string().trim().max(60).optional(),
        nation: z.enum(["england", "scotland", "wales"]).optional(),
        theme: z.enum(["system", "light", "dark"]).optional(),
        dailyGoal: z.number().int().min(5).max(200).optional(),
        testDate: isoDate.nullable().optional(),
        onboarded: z.boolean().optional(),
      }),
      req.body,
    );
    res.json(learning.updateProfile(db, PROFILE_ID, body));
  });

  // ---- Learn -----------------------------------------------------------------------
  r.get("/topics", (_req, res) => {
    res.json(learning.listTopics(db, PROFILE_ID));
  });

  r.get("/topics/:id", (req, res) => {
    res.json(learning.getTopic(db, PROFILE_ID, req.params.id));
  });

  r.post("/lessons/:id/complete", (req, res) => {
    res.json(learning.completeLesson(db, PROFILE_ID, req.params.id));
  });

  r.delete("/lessons/:id/complete", (req, res) => {
    learning.uncompleteLesson(db, PROFILE_ID, req.params.id);
    res.status(204).end();
  });

  r.get("/signs", (_req, res) => {
    res.json({ categories: SIGN_CATEGORIES, signs: SIGNS, attribution: SIGN_ATTRIBUTION });
  });

  r.get("/flashcards", (_req, res) => {
    res.json(learning.flashcardState(db, PROFILE_ID));
  });

  r.post("/flashcards", (req, res) => {
    const body = parse(z.object({ signId: z.string().min(1).max(80), knew: z.boolean() }), req.body);
    res.json(learning.reviewFlashcard(db, PROFILE_ID, body.signId, body.knew));
  });

  // ---- Practice ----------------------------------------------------------------------
  r.post("/practice", (req, res) => {
    const body = parse(
      z.object({
        mode: z.enum(["topic", "mixed", "mistakes", "bookmarks", "quiz"]),
        topic: z.string().max(60).nullable().optional(),
        size: z.number().int().refine((n) => (practice.PRACTICE_SIZES as readonly number[]).includes(n), "size must be 10, 20, 30 or 50").default(10),
      }),
      req.body,
    );
    const s = practice.createPractice(db, PROFILE_ID, body);
    res.status(201).json({ id: s.id });
  });

  r.get("/practice", (req, res) => {
    res.json(practice.listPractice(db, PROFILE_ID, { active: req.query.active === "1" }));
  });

  r.get("/practice/:id", (req, res) => {
    res.json(practice.getPractice(db, PROFILE_ID, req.params.id));
  });

  r.post("/practice/:id/answers/:index", (req, res) => {
    const index = parse(indexParam, req.params.index);
    const body = parse(z.object({ selected: selection.min(1), timeMs: z.number().int().min(0).nullable().default(null) }), req.body);
    res.json(practice.answerPractice(db, PROFILE_ID, req.params.id, index, body.selected, body.timeMs));
  });

  r.put("/practice/:id/position", (req, res) => {
    const body = parse(z.object({ index: indexParam }), req.body);
    practice.setPracticePosition(db, PROFILE_ID, req.params.id, body.index);
    res.status(204).end();
  });

  r.post("/practice/:id/finish", (req, res) => {
    res.json(practice.finishPractice(db, PROFILE_ID, req.params.id));
  });

  // ---- Bookmarks and mistakes ----------------------------------------------------------
  r.get("/bookmarks", (_req, res) => {
    res.json(learning.listBookmarks(db, PROFILE_ID));
  });

  r.put("/bookmarks/:questionId", (req, res) => {
    res.json(learning.setBookmark(db, PROFILE_ID, req.params.questionId, true));
  });

  r.delete("/bookmarks/:questionId", (req, res) => {
    res.json(learning.setBookmark(db, PROFILE_ID, req.params.questionId, false));
  });

  r.get("/mistakes", (_req, res) => {
    res.json(learning.listMistakes(db, PROFILE_ID));
  });

  // ---- Mock tests ----------------------------------------------------------------------
  r.get("/mock-tests", (_req, res) => {
    res.json({ active: mock.activeMock(db, PROFILE_ID)?.id ?? null, tests: mock.listMocks(db, PROFILE_ID) });
  });

  r.post("/mock-tests", (_req, res) => {
    const m = mock.createMock(db, PROFILE_ID);
    res.status(201).json({ id: m.id });
  });

  r.get("/mock-tests/:id", (req, res) => {
    res.json(mock.getMock(db, PROFILE_ID, req.params.id));
  });

  r.put("/mock-tests/:id/answers/:index", (req, res) => {
    const index = parse(indexParam, req.params.index);
    const body = parse(z.object({ selected: selection.nullable() }), req.body);
    res.json(mock.answerMock(db, PROFILE_ID, req.params.id, index, body.selected));
  });

  r.put("/mock-tests/:id/flags/:index", (req, res) => {
    const index = parse(indexParam, req.params.index);
    const body = parse(z.object({ flagged: z.boolean() }), req.body);
    res.json(mock.flagMock(db, PROFILE_ID, req.params.id, index, body.flagged));
  });

  r.put("/mock-tests/:id/position", (req, res) => {
    const body = parse(z.object({ index: indexParam }), req.body);
    mock.moveMock(db, PROFILE_ID, req.params.id, body.index);
    res.status(204).end();
  });

  r.post("/mock-tests/:id/submit", (req, res) => {
    const m = mock.submitMock(db, PROFILE_ID, req.params.id);
    res.json({ id: m.id, status: m.status, score: m.score, passed: m.passed });
  });

  r.delete("/mock-tests/:id", (req, res) => {
    mock.discardMock(db, PROFILE_ID, req.params.id);
    res.status(204).end();
  });

  r.get("/mock-tests/:id/results", (req, res) => {
    res.json(mock.mockResults(db, PROFILE_ID, req.params.id));
  });

  // ---- Hazard perception -----------------------------------------------------------------
  r.get("/hazard/clips", (_req, res) => {
    res.json(hazard.listClips(db, PROFILE_ID));
  });

  r.get("/hazard/clips/:id", (req, res) => {
    res.json(hazard.getClip(db, req.params.id));
  });

  r.post("/hazard/clips/:id/attempts", (req, res) => {
    const body = parse(z.object({ clicks: z.array(z.number().min(0)).max(500), runId: z.string().uuid().nullable().default(null) }), req.body);
    res.status(201).json(hazard.submitClipAttempt(db, PROFILE_ID, req.params.id, body.clicks, body.runId));
  });

  r.get("/hazard/attempts", (_req, res) => {
    res.json(hazard.listHazardAttempts(db, PROFILE_ID));
  });

  // ---- Progress ----------------------------------------------------------------------------
  r.get("/progress", (_req, res) => {
    res.json(progressSummary(db, PROFILE_ID, config.timeZone));
  });

  // ---- Admin: backup, import, reset ---------------------------------------------------------
  const admin = Router();
  admin.use((req: Request, _res: Response, next: NextFunction) => {
    if (config.adminToken && !bearerMatches(req.get("authorization"), config.adminToken)) {
      throw new HttpError(401, "unauthorised", "Admin token required");
    }
    next();
  });

  admin.get("/backup", async (_req, res, next) => {
    // A private directory (mode 0700), so other users on the machine can't read or swap the copy.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "theory-backup-"));
    const cleanup = () => fs.rm(dir, { recursive: true, force: true }, () => {});
    const tmp = path.join(dir, "backup.db");
    try {
      await backupTo(handle, tmp);
    } catch (e) {
      cleanup();
      throw e;
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    res.download(tmp, `driving-theory-${stamp}.db`, (err) => {
      cleanup();
      if (err && !res.headersSent) next(err);
    });
  });

  admin.post("/import/questions", (req, res) => {
    try {
      res.json(importQuestions(db, req.body));
    } catch (e) {
      if (e instanceof z.ZodError) throw new HttpError(400, "invalid_import", "The file doesn't match the import format", e.issues);
      throw e;
    }
  });

  admin.post("/import/clips", (req, res) => {
    try {
      res.json(importClips(db, req.body));
    } catch (e) {
      if (e instanceof z.ZodError) throw new HttpError(400, "invalid_import", "The file doesn't match the clip import format", e.issues);
      if (e instanceof Error) throw new HttpError(400, "invalid_import", e.message);
      throw e;
    }
  });

  admin.post("/reset", (req, res) => {
    parse(z.object({ confirm: z.literal("RESET") }), req.body);
    learning.resetProgress(db, PROFILE_ID);
    res.json({ ok: true });
  });

  r.use("/admin", admin);

  r.use((_req, _res) => {
    throw new HttpError(404, "not_found", "No such API route");
  });

  return r;
}
