import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import { type FormGenerator } from "./forms/generate-form.js";
import { errorHandler, HttpError } from "./http/errors.js";
import { apiNoStore, requestId, requestLog, securityHeaders } from "./http/middleware.js";
import { createWriteRateLimiter, DEFAULT_WRITE_RATE_LIMIT, type WriteRateLimitOptions } from "./http/rate-limit.js";
import { createFormsRouter } from "./forms/routes.js";
import { formStore, type FormStore } from "./forms/store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_JSON_LIMIT = "1mb";

export type CreateAppOptions = {
  jsonLimit?: string;
  corsOrigins?: readonly string[];
  trustProxy?: boolean;
  writeRateLimit?: WriteRateLimitOptions;
  generateForm?: FormGenerator;
};

export function createApp(store: FormStore = formStore, options: CreateAppOptions = {}) {
  const app = express();
  app.disable("x-powered-by");
  if (options.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(requestId);
  app.use(securityHeaders);
  app.use(apiNoStore);
  app.use(requestLog);

  const corsOrigins = options.corsOrigins ?? [];
  if (corsOrigins.length > 0) {
    app.use(
      cors({
        origin: [...corsOrigins],
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Idempotency-Key", "X-Request-Id"],
        exposedHeaders: ["Location", "X-Request-Id", "Retry-After"],
        maxAge: 600,
      }),
    );
  }

  const writeRateLimit = options.writeRateLimit ?? DEFAULT_WRITE_RATE_LIMIT;
  app.use("/api", createWriteRateLimiter(writeRateLimit));
  app.use(express.json({ limit: options.jsonLimit ?? DEFAULT_JSON_LIMIT }));

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  // In-memory storage has no remote dependency. A database store should fail
  // this route when it cannot be reached, and leave /api/health as liveness.
  app.get("/api/ready", (_request, response) => {
    response.json({ ok: true });
  });

  app.use("/api/forms", createFormsRouter(store, options.generateForm));

  app.use("/api", (_request, _response, next) => {
    next(
      new HttpError({
        status: 404,
        code: "NOT_FOUND",
        message: "We couldn’t find that resource.",
      }),
    );
  });

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "../dist");
    app.use(express.static(distPath));
    app.get(/.*/, (_request, response) => {
      response.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
