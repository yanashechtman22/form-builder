import { z } from "zod";

export const ApiIssueSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
});

export const ApiErrorDtoSchema = z.object({
  code: z.enum([
    "BAD_REQUEST",
    "NOT_FOUND",
    "CONFLICT",
    "VALIDATION_ERROR",
    "PAYLOAD_TOO_LARGE",
    "RATE_LIMITED",
    "MODEL_UNAVAILABLE",
    "CLOSED",
    "INTERNAL_ERROR",
  ]),
  message: z.string(),
  issues: z.array(ApiIssueSchema).optional(),
  currentRevision: z.number().int().positive().optional(),
  requestId: z.string().min(1).max(128).optional(),
});

export type ApiErrorDto = z.infer<typeof ApiErrorDtoSchema>;
export type ApiIssue = z.infer<typeof ApiIssueSchema>;
