import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./errors.js";

const WRITE_METHODS = new Set(["POST", "PUT"]);
const MAX_BUCKETS = 10_000;

type Bucket = {
  count: number;
  resetAt: number;
};

export type WriteRateLimitOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

export const DEFAULT_WRITE_RATE_LIMIT: WriteRateLimitOptions = {
  limit: 60,
  windowMs: 60_000,
};

export function createWriteRateLimiter(options: WriteRateLimitOptions) {
  const buckets = new Map<string, Bucket>();
  const now = options.now ?? Date.now;

  return function writeRateLimit(
    request: Request,
    response: Response,
    next: NextFunction,
  ): void {
    if (!WRITE_METHODS.has(request.method)) {
      next();
      return;
    }

    const currentTime = now();
    pruneExpiredBuckets(buckets, currentTime);

    const key = request.ip || request.socket.remoteAddress || "unknown";
    const existing = buckets.get(key);
    if (!existing || currentTime >= existing.resetAt) {
      buckets.set(key, { count: 1, resetAt: currentTime + options.windowMs });
      next();
      return;
    }

    if (existing.count >= options.limit) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existing.resetAt - currentTime) / 1000),
      );
      response.setHeader("Retry-After", String(retryAfterSeconds));
      next(
        new HttpError({
          status: 429,
          code: "RATE_LIMITED",
          message: "Too many requests. Please wait and try again.",
        }),
      );
      return;
    }

    existing.count += 1;
    next();
  };
}

function pruneExpiredBuckets(buckets: Map<string, Bucket>, now: number): void {
  if (buckets.size <= MAX_BUCKETS) {
    return;
  }
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
    }
  }
}
