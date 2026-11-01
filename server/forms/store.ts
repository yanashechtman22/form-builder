import { randomUUID } from "node:crypto";
import type { FormDefinition } from "../../shared/contracts/forms.js";
import type { Answer } from "../../shared/contracts/submissions.js";

export const FORM_SCHEMA_VERSION = 1;

export type FormRecord = {
  schemaVersion: number;
  id: string;
  revision: number;
  acceptingResponses: boolean;
  definition: FormDefinition;
  createdAt: Date;
  updatedAt: Date;
};

export type SubmissionRecord = {
  schemaVersion: number;
  id: string;
  formId: string;
  formRevision: number;
  submittedAt: Date;
  formSnapshot: FormDefinition;
  answers: Answer[];
};

export type ListPage = {
  limit: number;
  cursor?: string;
};

export type ListResult<T> =
  | { status: "ok"; items: T[]; nextCursor: string | null }
  | { status: "invalid_cursor" };

type IdempotencySlot = {
  fingerprint: string;
  submissionId: string;
};

function cloneDefinition(definition: FormDefinition): FormDefinition {
  return structuredClone(definition);
}

function cloneAnswers(answers: Answer[]): Answer[] {
  return structuredClone(answers);
}

function compareNewest(a: { id: string; at: number }, b: { id: string; at: number }): number {
  const byTime = b.at - a.at;
  if (byTime !== 0) {
    return byTime;
  }
  if (a.id < b.id) {
    return -1;
  }
  if (a.id > b.id) {
    return 1;
  }
  return 0;
}

function slicePage<T extends { id: string }>(
  sorted: T[],
  page: ListPage,
): ListResult<T> {
  let start = 0;
  if (page.cursor) {
    const index = sorted.findIndex((item) => item.id === page.cursor);
    if (index === -1) {
      return { status: "invalid_cursor" };
    }
    start = index + 1;
  }

  const items = sorted.slice(start, start + page.limit);
  const hasMore = start + page.limit < sorted.length;
  return {
    status: "ok",
    items,
    nextCursor: hasMore && items.length > 0 ? items[items.length - 1].id : null,
  };
}

export class FormStore {
  private readonly forms = new Map<string, FormRecord>();
  private readonly submissions = new Map<string, SubmissionRecord[]>();
  private readonly idempotency = new Map<string, IdempotencySlot>();

  listForms(page: ListPage): ListResult<FormRecord> {
    const sorted = [...this.forms.values()].sort((a, b) =>
      compareNewest(
        { id: a.id, at: a.updatedAt.getTime() },
        { id: b.id, at: b.updatedAt.getTime() },
      ),
    );
    const paged = slicePage(sorted, page);
    if (paged.status === "invalid_cursor") {
      return paged;
    }
    return {
      status: "ok",
      items: paged.items.map((form) => this.cloneForm(form)),
      nextCursor: paged.nextCursor,
    };
  }

  getForm(formId: string): FormRecord | undefined {
    const form = this.forms.get(formId);
    return form ? this.cloneForm(form) : undefined;
  }

  createForm(definition: FormDefinition): FormRecord {
    const now = new Date();
    const form: FormRecord = {
      schemaVersion: FORM_SCHEMA_VERSION,
      id: randomUUID(),
      revision: 1,
      acceptingResponses: true,
      definition: cloneDefinition(definition),
      createdAt: now,
      updatedAt: now,
    };
    this.forms.set(form.id, form);
    this.submissions.set(form.id, []);
    return this.cloneForm(form);
  }

  /**
   * Revision compare and write stay in this synchronous method.
   * A database-backed store has to do both in one conditional update.
   */
  updateForm(
    formId: string,
    definition: FormDefinition,
    expectedRevision: number,
  ):
    | { status: "updated"; form: FormRecord }
    | { status: "not_found" }
    | { status: "conflict"; form: FormRecord } {
    const existing = this.forms.get(formId);
    if (!existing) {
      return { status: "not_found" };
    }
    if (existing.revision !== expectedRevision) {
      return { status: "conflict", form: this.cloneForm(existing) };
    }

    const updated: FormRecord = {
      ...existing,
      revision: existing.revision + 1,
      definition: cloneDefinition(definition),
      updatedAt: new Date(),
    };
    this.forms.set(formId, updated);
    return { status: "updated", form: this.cloneForm(updated) };
  }

  setAcceptingResponses(
    formId: string,
    acceptingResponses: boolean,
  ): { status: "updated"; form: FormRecord } | { status: "not_found" } {
    const existing = this.forms.get(formId);
    if (!existing) {
      return { status: "not_found" };
    }
    const updated: FormRecord = {
      ...existing,
      acceptingResponses,
      updatedAt: new Date(),
    };
    this.forms.set(formId, updated);
    return { status: "updated", form: this.cloneForm(updated) };
  }

  deleteForm(formId: string): { status: "deleted" } | { status: "not_found" } {
    if (!this.forms.has(formId)) {
      return { status: "not_found" };
    }
    this.forms.delete(formId);
    this.submissions.delete(formId);
    const prefix = `${formId}:`;
    for (const key of this.idempotency.keys()) {
      if (key.startsWith(prefix)) {
        this.idempotency.delete(key);
      }
    }
    return { status: "deleted" };
  }

  listSubmissions(
    formId: string,
    page: ListPage,
  ): ListResult<SubmissionRecord> | { status: "not_found" } {
    if (!this.forms.has(formId)) {
      return { status: "not_found" };
    }
    const sorted = [...(this.submissions.get(formId) ?? [])].sort((a, b) =>
      compareNewest(
        { id: a.id, at: a.submittedAt.getTime() },
        { id: b.id, at: b.submittedAt.getTime() },
      ),
    );
    const paged = slicePage(sorted, page);
    if (paged.status === "invalid_cursor") {
      return paged;
    }
    return {
      status: "ok",
      items: paged.items.map((submission) => this.cloneSubmission(submission)),
      nextCursor: paged.nextCursor,
    };
  }

  getSubmission(
    formId: string,
    submissionId: string,
  ):
    | { status: "ok"; submission: SubmissionRecord }
    | { status: "form_not_found" }
    | { status: "not_found" } {
    if (!this.forms.has(formId)) {
      return { status: "form_not_found" };
    }
    const found = (this.submissions.get(formId) ?? []).find(
      (submission) => submission.id === submissionId,
    );
    if (!found) {
      return { status: "not_found" };
    }
    return { status: "ok", submission: this.cloneSubmission(found) };
  }

  /**
   * Revision compare and insert stay in this synchronous method.
   * A database-backed store has to do both in one conditional insert.
   */
  createSubmission(
    formId: string,
    formRevision: number,
    answers: Answer[],
    idempotency?: { key: string; fingerprint: string },
  ):
    | { status: "created"; submission: SubmissionRecord; form: FormRecord }
    | { status: "replayed"; submission: SubmissionRecord; form: FormRecord }
    | { status: "idempotency_conflict" }
    | { status: "not_found" }
    | { status: "conflict"; form: FormRecord } {
    if (idempotency) {
      const replay = this.replaySubmission(formId, idempotency);
      if (replay) {
        return replay;
      }
    }

    const form = this.forms.get(formId);
    if (!form) {
      return { status: "not_found" };
    }
    if (form.revision !== formRevision) {
      return { status: "conflict", form: this.cloneForm(form) };
    }

    const submission: SubmissionRecord = {
      schemaVersion: FORM_SCHEMA_VERSION,
      id: randomUUID(),
      formId,
      formRevision,
      submittedAt: new Date(),
      formSnapshot: cloneDefinition(form.definition),
      answers: cloneAnswers(answers),
    };
    const existing = this.submissions.get(formId) ?? [];
    existing.push(submission);
    this.submissions.set(formId, existing);
    if (idempotency) {
      this.idempotency.set(idempotencyStorageKey(formId, idempotency.key), {
        fingerprint: idempotency.fingerprint,
        submissionId: submission.id,
      });
    }
    return {
      status: "created",
      submission: this.cloneSubmission(submission),
      form: this.cloneForm(form),
    };
  }

  matchIdempotency(
    formId: string,
    idempotency: { key: string; fingerprint: string },
  ):
    | { status: "miss" }
    | { status: "replayed"; submission: SubmissionRecord }
    | { status: "conflict" } {
    const replay = this.replaySubmission(formId, idempotency);
    if (!replay) {
      return { status: "miss" };
    }
    if (replay.status === "idempotency_conflict") {
      return { status: "conflict" };
    }
    return { status: "replayed", submission: replay.submission };
  }

  getSubmissionCount(formId: string): number {
    return this.submissions.get(formId)?.length ?? 0;
  }

  clear(): void {
    this.forms.clear();
    this.submissions.clear();
    this.idempotency.clear();
  }

  private replaySubmission(
    formId: string,
    idempotency: { key: string; fingerprint: string },
  ):
    | { status: "replayed"; submission: SubmissionRecord; form: FormRecord }
    | { status: "idempotency_conflict" }
    | undefined {
    const slot = this.idempotency.get(idempotencyStorageKey(formId, idempotency.key));
    if (!slot) {
      return undefined;
    }
    if (slot.fingerprint !== idempotency.fingerprint) {
      return { status: "idempotency_conflict" };
    }
    const form = this.forms.get(formId);
    const submission = (this.submissions.get(formId) ?? []).find(
      (item) => item.id === slot.submissionId,
    );
    if (!form || !submission) {
      return { status: "idempotency_conflict" };
    }
    return {
      status: "replayed",
      submission: this.cloneSubmission(submission),
      form: this.cloneForm(form),
    };
  }

  private cloneForm(form: FormRecord): FormRecord {
    return {
      ...form,
      definition: cloneDefinition(form.definition),
      createdAt: new Date(form.createdAt),
      updatedAt: new Date(form.updatedAt),
    };
  }

  private cloneSubmission(submission: SubmissionRecord): SubmissionRecord {
    return {
      ...submission,
      formSnapshot: cloneDefinition(submission.formSnapshot),
      answers: cloneAnswers(submission.answers),
      submittedAt: new Date(submission.submittedAt),
    };
  }
}

function idempotencyStorageKey(formId: string, key: string): string {
  return `${formId}:${key}`;
}

export const formStore = new FormStore();
