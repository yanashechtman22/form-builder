import { z } from "zod";
import { GenerateFormRequestSchema } from "./generate-form.js";
import {
  CreateFormRequestSchema,
  FormEditorDtoSchema,
  FormListDtoSchema,
  PublicFormDtoSchema,
  SetAcceptanceRequestSchema,
  UpdateFormRequestSchema,
} from "./forms.js";
import { LIST_PAGE_MAX } from "./pagination.js";
import {
  SubmissionDtoSchema,
  SubmissionListDtoSchema,
  SubmissionReceiptDtoSchema,
  SubmitFormRequestSchema,
} from "./submissions.js";

export const FORM_API_PREFIX = "/api/forms";

const ListPageQuerySchema = z.object({
  limit: z.number().int().min(1).max(LIST_PAGE_MAX).optional(),
  cursor: z.string().uuid().optional(),
});

type Operation = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  response: z.ZodTypeAny;
  body?: z.ZodTypeAny;
  bodyOptional?: boolean;
  query?: z.ZodTypeAny;
};

function defineApi<const T extends Record<string, Operation>>(api: T): T {
  return api;
}

export const formApi = defineApi({
  listForms: {
    method: "GET",
    path: "/api/forms",
    query: ListPageQuerySchema,
    response: FormListDtoSchema,
  },
  createForm: {
    method: "POST",
    path: "/api/forms",
    body: CreateFormRequestSchema,
    bodyOptional: true,
    response: FormEditorDtoSchema,
  },
  generateForm: {
    method: "POST",
    path: "/api/forms/generate",
    body: GenerateFormRequestSchema,
    response: FormEditorDtoSchema,
  },
  getForm: {
    method: "GET",
    path: "/api/forms/:formId",
    response: FormEditorDtoSchema,
  },
  updateForm: {
    method: "PUT",
    path: "/api/forms/:formId",
    body: UpdateFormRequestSchema,
    response: FormEditorDtoSchema,
  },
  deleteForm: {
    method: "DELETE",
    path: "/api/forms/:formId",
    response: z.void(),
  },
  setAcceptance: {
    method: "PUT",
    path: "/api/forms/:formId/acceptance",
    body: SetAcceptanceRequestSchema,
    response: FormEditorDtoSchema,
  },
  getPublicForm: {
    method: "GET",
    path: "/api/forms/:formId/public",
    response: PublicFormDtoSchema,
  },
  listSubmissions: {
    method: "GET",
    path: "/api/forms/:formId/submissions",
    query: ListPageQuerySchema,
    response: SubmissionListDtoSchema,
  },
  getSubmission: {
    method: "GET",
    path: "/api/forms/:formId/submissions/:submissionId",
    response: SubmissionDtoSchema,
  },
  submitForm: {
    method: "POST",
    path: "/api/forms/:formId/submissions",
    body: SubmitFormRequestSchema,
    response: SubmissionReceiptDtoSchema,
  },
});

export function mountPath(fullPath: string, prefix = FORM_API_PREFIX): string {
  if (!fullPath.startsWith(prefix)) {
    throw new Error(`Path ${fullPath} is outside ${prefix}`);
  }
  const rest = fullPath.slice(prefix.length);
  return rest.length === 0 ? "/" : rest;
}
