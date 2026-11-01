import type {
  FormEditorDto,
  FormSummaryDto,
  PublicFormDto,
} from "../../shared/contracts/forms.js";
import type {
  SubmissionDto,
  SubmissionReceiptDto,
} from "../../shared/contracts/submissions.js";
import type { FormRecord, SubmissionRecord } from "./store.js";

export function toFormSummaryDto(
  form: FormRecord,
  submissionCount: number,
): FormSummaryDto {
  return {
    id: form.id,
    title: form.definition.title,
    questionCount: form.definition.questions.length,
    submissionCount,
    acceptingResponses: form.acceptingResponses,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
  };
}

export function toFormEditorDto(form: FormRecord): FormEditorDto {
  return {
    id: form.id,
    revision: form.revision,
    title: form.definition.title,
    description: form.definition.description,
    questions: form.definition.questions,
    acceptingResponses: form.acceptingResponses,
    createdAt: form.createdAt.toISOString(),
    updatedAt: form.updatedAt.toISOString(),
  };
}

export function toPublicFormDto(form: FormRecord): PublicFormDto {
  return {
    id: form.id,
    revision: form.revision,
    title: form.definition.title,
    description: form.definition.description,
    questions: form.definition.questions,
    acceptingResponses: form.acceptingResponses,
  };
}

export function toSubmissionReceiptDto(
  submission: SubmissionRecord,
): SubmissionReceiptDto {
  return {
    id: submission.id,
    submittedAt: submission.submittedAt.toISOString(),
  };
}

export function toSubmissionDto(submission: SubmissionRecord): SubmissionDto {
  return {
    id: submission.id,
    formId: submission.formId,
    formRevision: submission.formRevision,
    submittedAt: submission.submittedAt.toISOString(),
    formSnapshot: submission.formSnapshot,
    answers: submission.answers,
  };
}
