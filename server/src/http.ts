import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny, type z } from "zod";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, "not_found", `${what} not found`);

export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, "invalid_request", "Request validation failed", result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  return result.data;
}

export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) return next(err);
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: "invalid_request", message: "Validation failed", details: err.issues } });
    return;
  }
  // body-parser errors (bad JSON, too large) carry a status
  const status = typeof err === "object" && err && "status" in err ? Number((err as { status: unknown }).status) : 500;
  if (status >= 400 && status < 500) {
    res.status(status).json({ error: { code: "bad_request", message: (err as Error).message } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "internal", message: "Something went wrong" } });
}
