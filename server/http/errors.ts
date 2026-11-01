import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import type { ApiErrorDto, ApiIssue } from "../../shared/contracts/api-errors.js";

export class HttpError extends Error {
  readonly status: number;
  readonly code: ApiErrorDto["code"];
  readonly issues?: ApiIssue[];
  readonly currentRevision?: number;

  constructor(options: {
    status: number;
    code: ApiErrorDto["code"];
    message: string;
    issues?: ApiIssue[];
    currentRevision?: number;
  }) {
    super(options.message);
    this.name = "HttpError";
    this.status = options.status;
    this.code = options.code;
    this.issues = options.issues;
    this.currentRevision = options.currentRevision;
  }
}

export function zodIssues(error: ZodError): ApiIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
  }));
}

type ParserFailure = {
  status: number;
  code: ApiErrorDto["code"];
  message: string;
};

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction,
): void {
  const requestId = readRequestId(response);
  const parserFailure = readParserFailure(error);

  if (parserFailure) {
    sendError(response, parserFailure.status, {
      code: parserFailure.code,
      message: parserFailure.message,
      requestId,
    });
    return;
  }

  if (error instanceof HttpError) {
    sendError(response, error.status, {
      code: error.code,
      message: error.message,
      issues: error.issues,
      currentRevision: error.currentRevision,
      requestId,
    });
    return;
  }

  if (error instanceof ZodError) {
    sendError(response, 422, {
      code: "VALIDATION_ERROR",
      message: "Please check your input and try again.",
      issues: zodIssues(error),
      requestId,
    });
    return;
  }

  logInternalError(request, requestId, error);
  sendError(response, 500, {
    code: "INTERNAL_ERROR",
    message: "Something went wrong",
    requestId,
  });
}

function sendError(response: Response, status: number, body: ApiErrorDto): void {
  response.status(status).json(body);
}

function readRequestId(response: Response): string | undefined {
  const value = response.locals.requestId;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readParserFailure(error: unknown): ParserFailure | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }
  const candidate = error as Error & { status?: unknown; statusCode?: unknown; type?: unknown };
  const status = typeof candidate.status === "number" ? candidate.status : candidate.statusCode;
  const type = candidate.type;
  if (typeof status !== "number" || typeof type !== "string") {
    return undefined;
  }

  if (type === "entity.parse.failed") {
    return {
      status: 400,
      code: "BAD_REQUEST",
      message: "The request body must be valid JSON.",
    };
  }
  if (type === "entity.too.large") {
    return {
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: "The request body is too large.",
    };
  }
  if (type === "charset.unsupported" || type === "encoding.unsupported") {
    return {
      status: 415,
      code: "BAD_REQUEST",
      message: "That content type isn’t supported.",
    };
  }
  return undefined;
}

function logInternalError(request: Request, requestId: string | undefined, error: unknown): void {
  const summary =
    error instanceof Error
      ? { name: error.name, message: error.message.slice(0, 300) }
      : { name: "UnknownError", message: "Non-error thrown" };
  console.error(
    JSON.stringify({
      msg: "request failed",
      requestId,
      method: request.method,
      path: request.originalUrl.split("?")[0] ?? request.originalUrl,
      ...summary,
    }),
  );
}
