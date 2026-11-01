import type { Request } from "express";
import { Router } from "express";
import { z } from "zod";
import {
  CreateFormRequestSchema,
  SetAcceptanceRequestSchema,
  UpdateFormRequestSchema,
} from "../../shared/contracts/forms.js";
import { GenerateFormRequestSchema } from "../../shared/contracts/generate-form.js";
import {
  SubmitFormRequestSchema,
  type SubmitFormRequest,
} from "../../shared/contracts/submissions.js";
import { validateSubmissionAnswers } from "../../shared/contracts/validate-answers.js";
import { formApi, mountPath } from "../../shared/contracts/form-api.js";
import { createDefaultFormDefinition } from "./default-form.js";
import {
  ModelOutputError,
  ModelUnavailableError,
  type FormGenerator,
} from "./generate-form.js";
import { HttpError, zodIssues } from "../http/errors.js";
import { readListPage } from "../http/list-query.js";
import {
  toFormEditorDto,
  toFormSummaryDto,
  toPublicFormDto,
  toSubmissionDto,
  toSubmissionReceiptDto,
} from "./mappers.js";
import type { FormStore } from "./store.js";

const IdempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);

export function createFormsRouter(
  store: FormStore,
  generateForm?: FormGenerator,
): Router {
  const router = Router();

  router.get(mountPath(formApi.listForms.path), (request, response) => {
    const page = store.listForms(readListPage(request));
    if (page.status === "invalid_cursor") {
      throw invalidCursor();
    }
    response.json({
      items: page.items.map((form) => toFormSummaryDto(form, store.getSubmissionCount(form.id))),
      nextCursor: page.nextCursor,
    });
  });

  router.post(mountPath(formApi.createForm.path), (request, response) => {
    const parsedBody = CreateFormRequestSchema.safeParse(
      request.body && Object.keys(request.body).length > 0
        ? request.body
        : createDefaultFormDefinition(),
    );

    if (!parsedBody.success) {
      throw new HttpError({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Please check your form and try again.",
        issues: zodIssues(parsedBody.error),
      });
    }

    const form = store.createForm(parsedBody.data);
    response.status(201).location(`/api/forms/${form.id}`).json(toFormEditorDto(form));
  });

  router.post(mountPath(formApi.generateForm.path), async (request, response) => {
    const parsedBody = GenerateFormRequestSchema.safeParse(request.body);
    if (!parsedBody.success) {
      throw new HttpError({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Describe the form you want, then try again.",
        issues: zodIssues(parsedBody.error),
      });
    }
    if (!generateForm) {
      throw new HttpError({
        status: 503,
        code: "MODEL_UNAVAILABLE",
        message: "We couldn’t generate a form right now. Please try again.",
      });
    }

    try {
      const definition = await generateForm(parsedBody.data.prompt);
      const form = store.createForm(definition);
      response.status(201).location(`/api/forms/${form.id}`).json(toFormEditorDto(form));
    } catch (error) {
      if (error instanceof ModelUnavailableError) {
        console.error(
          JSON.stringify({ msg: "form generation unavailable", message: error.message }),
        );
        throw new HttpError({
          status: 503,
          code: "MODEL_UNAVAILABLE",
          message: "We couldn’t generate a form right now. Please try again.",
        });
      }
      if (error instanceof ModelOutputError) {
        throw new HttpError({
          status: 422,
          code: "VALIDATION_ERROR",
          message: "That description couldn’t be turned into a form. Try saying it another way.",
        });
      }
      throw error;
    }
  });

  router.get(mountPath(formApi.getForm.path), (request, response) => {
    const form = store.getForm(pathParam(request, "formId"));
    if (!form) {
      throw formNotFound();
    }
    response.json(toFormEditorDto(form));
  });

  router.put(mountPath(formApi.updateForm.path), (request, response) => {
    const parsedBody = UpdateFormRequestSchema.safeParse(request.body);
    if (!parsedBody.success) {
      throw new HttpError({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Please check your form and try again.",
        issues: zodIssues(parsedBody.error),
      });
    }

    const { expectedRevision, ...definition } = parsedBody.data;
    const result = store.updateForm(pathParam(request, "formId"), definition, expectedRevision);

    if (result.status === "not_found") {
      throw formNotFound();
    }

    if (result.status === "conflict") {
      throw new HttpError({
        status: 409,
        code: "CONFLICT",
        message: "This form was updated elsewhere. Refresh and try again.",
        currentRevision: result.form.revision,
      });
    }

    response.json(toFormEditorDto(result.form));
  });

  router.put(mountPath(formApi.setAcceptance.path), (request, response) => {
    const parsedBody = SetAcceptanceRequestSchema.safeParse(request.body);
    if (!parsedBody.success) {
      throw new HttpError({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Please check your form and try again.",
        issues: zodIssues(parsedBody.error),
      });
    }
    const result = store.setAcceptingResponses(
      pathParam(request, "formId"),
      parsedBody.data.acceptingResponses,
    );
    if (result.status === "not_found") {
      throw formNotFound();
    }
    response.json(toFormEditorDto(result.form));
  });

  router.delete(mountPath(formApi.deleteForm.path), (request, response) => {
    const result = store.deleteForm(pathParam(request, "formId"));
    if (result.status === "not_found") {
      throw formNotFound();
    }
    response.status(204).send();
  });

  router.get(mountPath(formApi.getPublicForm.path), (request, response) => {
    const form = store.getForm(pathParam(request, "formId"));
    if (!form) {
      throw formNotFound();
    }
    response.json(toPublicFormDto(form));
  });

  router.get(mountPath(formApi.listSubmissions.path), (request, response) => {
    const result = store.listSubmissions(pathParam(request, "formId"), readListPage(request));
    if (result.status === "not_found") {
      throw formNotFound();
    }
    if (result.status === "invalid_cursor") {
      throw invalidCursor();
    }
    response.json({
      items: result.items.map(toSubmissionDto),
      nextCursor: result.nextCursor,
    });
  });

  router.get(mountPath(formApi.getSubmission.path), (request, response) => {
    const result = store.getSubmission(pathParam(request, "formId"), pathParam(request, "submissionId"));
    if (result.status === "form_not_found") {
      throw formNotFound();
    }
    if (result.status === "not_found") {
      throw new HttpError({
        status: 404,
        code: "NOT_FOUND",
        message: "We couldn’t find this response.",
      });
    }
    response.json(toSubmissionDto(result.submission));
  });

  router.post(mountPath(formApi.submitForm.path), (request, response) => {
    const parsedBody = SubmitFormRequestSchema.safeParse(request.body);
    if (!parsedBody.success) {
      throw new HttpError({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Please check your answers and try again.",
        issues: zodIssues(parsedBody.error),
      });
    }

    const idempotencyKey = readIdempotencyKey(request);
    const fingerprint = submissionFingerprint(parsedBody.data);
    if (idempotencyKey) {
      const match = store.matchIdempotency(pathParam(request, "formId"), {
        key: idempotencyKey,
        fingerprint,
      });
      if (match.status === "replayed") {
        response
          .status(200)
          .location(
            `/api/forms/${pathParam(request, "formId")}/submissions/${match.submission.id}`,
          )
          .json(toSubmissionReceiptDto(match.submission));
        return;
      }
      if (match.status === "conflict") {
        throw new HttpError({
          status: 409,
          code: "CONFLICT",
          message: "This idempotency key was already used for a different submission.",
        });
      }
    }

    const form = store.getForm(pathParam(request, "formId"));
    if (!form) {
      throw formNotFound();
    }

    if (!form.acceptingResponses) {
      throw new HttpError({
        status: 409,
        code: "CLOSED",
        message: "This form is no longer accepting responses.",
      });
    }

    if (form.revision !== parsedBody.data.formRevision) {
      throw new HttpError({
        status: 409,
        code: "CONFLICT",
        message: "This form was updated. Refresh the page and try again.",
        currentRevision: form.revision,
      });
    }

    const answerIssues = validateSubmissionAnswers(form.definition, parsedBody.data);
    if (answerIssues.length > 0) {
      throw new HttpError({
        status: 422,
        code: "VALIDATION_ERROR",
        message: "Please check your answers and try again.",
        issues: answerIssues,
      });
    }

    const result = store.createSubmission(
      pathParam(request, "formId"),
      parsedBody.data.formRevision,
      parsedBody.data.answers,
      idempotencyKey ? { key: idempotencyKey, fingerprint } : undefined,
    );

    if (result.status === "not_found") {
      throw formNotFound();
    }

    if (result.status === "conflict") {
      throw new HttpError({
        status: 409,
        code: "CONFLICT",
        message: "This form was updated. Refresh the page and try again.",
        currentRevision: result.form.revision,
      });
    }

    if (result.status === "idempotency_conflict") {
      throw new HttpError({
        status: 409,
        code: "CONFLICT",
        message: "This idempotency key was already used for a different submission.",
      });
    }

    response
      .status(result.status === "replayed" ? 200 : 201)
      .location(`/api/forms/${pathParam(request, "formId")}/submissions/${result.submission.id}`)
      .json(toSubmissionReceiptDto(result.submission));
  });

  return router;
}

function pathParam(request: Request, name: string): string {
  const value = request.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError({
      status: 400,
      code: "BAD_REQUEST",
      message: "That address is not valid.",
    });
  }
  return value;
}

function formNotFound(): HttpError {
  return new HttpError({
    status: 404,
    code: "NOT_FOUND",
    message: "We couldn’t find this form.",
  });
}

function invalidCursor(): HttpError {
  return new HttpError({
    status: 400,
    code: "BAD_REQUEST",
    message: "That page cursor is not valid.",
  });
}

function readIdempotencyKey(request: Request): string | undefined {
  const raw = request.get("Idempotency-Key");
  if (raw === undefined) {
    return undefined;
  }
  const parsed = IdempotencyKeySchema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError({
      status: 400,
      code: "BAD_REQUEST",
      message: "Idempotency-Key must be 1-128 letters, numbers, underscores, or hyphens.",
    });
  }
  return parsed.data;
}

function submissionFingerprint(body: SubmitFormRequest): string {
  return JSON.stringify({
    formRevision: body.formRevision,
    answers: body.answers,
  });
}
