import type { Request } from "express";
import { z } from "zod";
import { LIST_PAGE_DEFAULT, LIST_PAGE_MAX } from "../../shared/contracts/pagination.js";
import { HttpError, zodIssues } from "./errors.js";
import type { ListPage } from "../forms/store.js";

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(LIST_PAGE_MAX).default(LIST_PAGE_DEFAULT),
  cursor: z.string().uuid().optional(),
});

export function readListPage(request: Request): ListPage {
  const parsed = ListQuerySchema.safeParse({
    limit: firstQueryValue(request.query.limit),
    cursor: firstQueryValue(request.query.cursor),
  });
  if (!parsed.success) {
    throw new HttpError({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Check the page size and cursor, then try again.",
      issues: zodIssues(parsed.error),
    });
  }
  return {
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
  };
}

function firstQueryValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}
