import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { vi } from "vitest";
import type { FormEditorDto } from "@shared/contracts/forms";
import type { Question } from "@shared/contracts/questions";
import { CommandBridgeProvider } from "@/app/command-bridge";
import { FormBuilderPage } from "@/features/form-builder/components/editor/FormBuilderPage";
import { FormDraftLayout } from "@/features/form-builder/components/layout/FormDraftLayout";
import { FormPreviewPage } from "@/features/form-builder/components/layout/FormPreviewPage";
import { renderWithProviders } from "@/test/render";

export function buildForm(questions: Question[], overrides: Partial<FormEditorDto> = {}): FormEditorDto {
  return {
    id: crypto.randomUUID(),
    revision: 1,
    title: "Customer survey",
    description: "",
    questions,
    acceptingResponses: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

export function shortTextQuestion(prompt: string): Question {
  return { id: crypto.randomUUID(), type: "shortText", prompt, required: false };
}

export function singleSelectQuestion(prompt: string, labels: string[]): Question {
  return {
    id: crypto.randomUUID(),
    type: "singleSelect",
    prompt,
    required: false,
    options: labels.map((label) => ({ id: crypto.randomUUID(), label })),
  };
}

type FakeApiOptions = {
  /** Reject saves the way the server does when another tab saved first. */
  conflictOnSave?: boolean;
};

export type FakeApi = {
  /** Bodies of every PUT the editor sent. */
  saves: Array<Record<string, unknown>>;
  /** Every request in order, as "METHOD /path". */
  requests: string[];
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Stands in for the Express API: serves one form and accepts or rejects saves. */
export function installFakeApi(form: FormEditorDto, options: FakeApiOptions = {}): FakeApi {
  let current = form;
  let deleted = false;
  const api: FakeApi = { saves: [], requests: [] };

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      api.requests.push(`${method} ${url}`);
      if (url !== `/api/forms/${form.id}` || deleted) {
        return jsonResponse({ code: "NOT_FOUND", message: "Not found" }, 404);
      }
      if (method === "DELETE") {
        deleted = true;
        return new Response(null, { status: 204 });
      }
      if (method === "GET") {
        return jsonResponse(current);
      }
      if (method === "PUT") {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        api.saves.push(body);
        if (options.conflictOnSave) {
          return jsonResponse(
            { code: "CONFLICT", message: "Revision mismatch", currentRevision: current.revision + 1 },
            409,
          );
        }
        const { expectedRevision: _expectedRevision, ...definition } = body;
        current = { ...current, ...definition, revision: current.revision + 1 } as FormEditorDto;
        return jsonResponse(current);
      }
      return jsonResponse({ code: "BAD_REQUEST", message: "Unsupported" }, 400);
    }),
  );

  return api;
}

/** Mounts the real editor routes at /forms/:id/edit. Returns the router for navigation. */
export function renderEditor(form: FormEditorDto) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        // Like the real lazy-loaded dashboard: navigation stays pending for a moment,
        // during which the editor is still mounted.
        lazy: async () => {
          await new Promise((resolve) => setTimeout(resolve, 150));
          return { Component: () => <p>Dashboard</p> };
        },
      },
      {
        path: "forms/:formId",
        element: <FormDraftLayout />,
        children: [
          { path: "edit", element: <FormBuilderPage /> },
          { path: "preview", element: <FormPreviewPage /> },
        ],
      },
    ],
    { initialEntries: [`/forms/${form.id}/edit`] },
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  renderWithProviders(
    <QueryClientProvider client={queryClient}>
      <CommandBridgeProvider>
        <RouterProvider router={router} />
      </CommandBridgeProvider>
    </QueryClientProvider>,
  );

  return {
    navigate: (to: string) => act(() => router.navigate(to)),
  };
}
