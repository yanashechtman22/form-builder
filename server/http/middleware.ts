import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function requestId(request: Request, response: Response, next: NextFunction): void {
  const incoming = request.get("X-Request-Id");
  const id = incoming && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
  response.locals.requestId = id;
  response.setHeader("X-Request-Id", id);
  next();
}

export function securityHeaders(
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
}

export function apiNoStore(request: Request, response: Response, next: NextFunction): void {
  if (request.originalUrl.startsWith("/api")) {
    response.setHeader("Cache-Control", "no-store");
  }
  next();
}

export function requestLog(request: Request, response: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === "test") {
    next();
    return;
  }

  const startedAt = Date.now();
  const path = request.originalUrl.split("?")[0] ?? request.originalUrl;
  response.on("finish", () => {
    console.log(
      JSON.stringify({
        msg: "request",
        requestId: response.locals.requestId,
        method: request.method,
        path,
        status: response.statusCode,
        durationMs: Date.now() - startedAt,
      }),
    );
  });
  next();
}
