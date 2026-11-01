import { type FormListDto, type FormSummaryDto } from "@shared/contracts/forms";
import { LIST_PAGE_MAX } from "@shared/contracts/pagination";
import {
  type SubmissionDto,
  type SubmissionListDto,
} from "@shared/contracts/submissions";
import { apiClient } from "./client";

const MAX_LIST_PAGES = 200;

export async function listForms(signal?: AbortSignal): Promise<FormListDto> {
  const items = await loadEveryPage<FormSummaryDto>((cursor) =>
    apiClient.listForms({
      signal,
      query: { limit: LIST_PAGE_MAX, cursor },
    }),
  );
  // Callers render every form. Follow the cursors here and return one list.
  return { items, nextCursor: null };
}

export async function listSubmissions(
  formId: string,
  signal?: AbortSignal,
): Promise<SubmissionListDto> {
  const items = await loadEveryPage<SubmissionDto>((cursor) =>
    apiClient.listSubmissions({
      params: { formId },
      signal,
      query: { limit: LIST_PAGE_MAX, cursor },
    }),
  );
  // Response summaries count every answer, so this follows pages before returning.
  return { items, nextCursor: null };
}

async function loadEveryPage<T>(
  loadPage: (cursor: string | undefined) => Promise<{ items: T[]; nextCursor: string | null }>,
): Promise<T[]> {
  const items: T[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  for (let pageIndex = 0; pageIndex < MAX_LIST_PAGES; pageIndex += 1) {
    const page = await loadPage(cursor);
    items.push(...page.items);
    if (page.nextCursor === null) {
      return items;
    }
    if (seenCursors.has(page.nextCursor)) {
      throw new Error("The server repeated a page cursor.");
    }
    seenCursors.add(page.nextCursor);
    cursor = page.nextCursor;
  }

  throw new Error("The result was too large to load.");
}
