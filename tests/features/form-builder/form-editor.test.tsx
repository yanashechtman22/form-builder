import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildForm,
  installFakeApi,
  renderEditor,
  shortTextQuestion,
  singleSelectQuestion,
} from "./editor-harness";

/** Counts how often each card's type editor renders, keyed by question index. */
const typeEditorRenders = vi.hoisted(() => new Map<number, number>());

vi.mock("@/features/form-builder/components/editor/question-type-editor", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/form-builder/components/editor/question-type-editor")
    >();
  return {
    QuestionTypeEditor: (props: Parameters<typeof actual.QuestionTypeEditor>[0]) => {
      typeEditorRenders.set(props.index, (typeEditorRenders.get(props.index) ?? 0) + 1);
      return actual.QuestionTypeEditor(props);
    },
  };
});

beforeAll(() => {
  // jsdom has no layout engine; the editor scrolls invalid questions into view.
  Element.prototype.scrollIntoView = vi.fn();
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  typeEditorRenders.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const SAVE_STATUS = /^(Saved|Unsaved|Saving…)$/;

/** The header's save indicator. (dnd-kit also renders an unrelated role="status" live region.) */
function saveStatus() {
  return screen.getByText(SAVE_STATUS);
}

async function openEditor(form = buildForm([shortTextQuestion("Your name")])) {
  const api = installFakeApi(form);
  const view = renderEditor(form);
  await screen.findByRole("textbox", { name: "Form title" });
  return { form, api, ...view };
}

describe("form editor", () => {
  it("loads the saved form into the draft", async () => {
    await openEditor();

    expect(screen.getByRole("textbox", { name: "Form title" })).toHaveValue("Customer survey");
    expect(screen.getByRole("combobox", { name: "Question 1 title" })).toHaveValue("Your name");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves edits against the loaded revision and becomes clean again", async () => {
    const user = userEvent.setup();
    const { api } = await openEditor();

    const title = screen.getByRole("textbox", { name: "Form title" });
    await user.clear(title);
    await user.type(title, "Renamed");
    expect(saveStatus()).toHaveTextContent("Unsaved");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => expect(saveStatus()).toHaveTextContent("Saved"));
    expect(api.saves).toHaveLength(1);
    expect(api.saves[0]).toMatchObject({ title: "Renamed", expectedRevision: 1 });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves with Ctrl+S", async () => {
    const user = userEvent.setup();
    const { api } = await openEditor();

    await user.type(screen.getByRole("textbox", { name: "Form title" }), "!");
    await user.keyboard("{Control>}s{/Control}");

    await vi.waitFor(() => expect(api.saves).toHaveLength(1));
  });

  it("explains a save conflict without losing the author's edits", async () => {
    const user = userEvent.setup();
    const form = buildForm([shortTextQuestion("Your name")]);
    installFakeApi(form, { conflictOnSave: true });
    renderEditor(form);
    const title = await screen.findByRole("textbox", { name: "Form title" });

    await user.type(title, " v2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Someone else saved changes");
    expect(title).toHaveValue("Customer survey v2");
    expect(saveStatus()).toHaveTextContent("Unsaved");
  });

  it("clears the save error as soon as the author edits again", async () => {
    const user = userEvent.setup();
    const form = buildForm([shortTextQuestion("Your name")]);
    installFakeApi(form, { conflictOnSave: true });
    renderEditor(form);
    const title = await screen.findByRole("textbox", { name: "Form title" });

    await user.type(title, "!");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("alert");

    await user.type(title, "?");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows validation issues on the offending question and focuses it", async () => {
    const user = userEvent.setup();
    const form = buildForm([
      shortTextQuestion("Your name"),
      singleSelectQuestion("Favourite colour", ["Red", "Blue"]),
    ]);
    const api = installFakeApi(form);
    renderEditor(form);
    await screen.findByRole("textbox", { name: "Form title" });

    // Blank out an option so the second question can no longer be saved.
    const secondTitle = screen.getByRole("combobox", { name: "Question 2 title" });
    await user.click(secondTitle);
    const secondOption = screen.getByRole("textbox", { name: "Option 2" });
    await user.clear(secondOption);
    // Move away so the first card is active again; saving must bring us back.
    await user.click(screen.getByRole("combobox", { name: "Question 1 title" }));

    await user.click(screen.getByRole("button", { name: "Save" }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts.some((alert) => alert.textContent?.includes("Add at least two options"))).toBe(
      true,
    );
    expect(api.saves).toHaveLength(0);
    await vi.waitFor(() => expect(secondTitle).toHaveFocus());
  });

  it("asks before dropping typed options, and only changes type when confirmed", async () => {
    const user = userEvent.setup();
    await openEditor(buildForm([singleSelectQuestion("Favourite colour", ["Red", "Blue"])]));

    const title = screen.getByRole("combobox", { name: "Question 1 title" });
    await user.clear(title);
    await user.type(title, "/short");
    await user.keyboard("{Enter}");

    const dialog = await screen.findByRole("dialog", { name: "Change question type?" });
    await user.click(within(dialog).getByRole("button", { name: "Change type" }));

    await vi.waitFor(() =>
      expect(screen.queryByRole("textbox", { name: "Option 1" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Question type" })).toHaveTextContent("Short text");
    expect(title).toHaveValue("");
  });

  it("keeps the question type when the author cancels the change", async () => {
    const user = userEvent.setup();
    await openEditor(buildForm([singleSelectQuestion("Favourite colour", ["Red", "Blue"])]));

    const title = screen.getByRole("combobox", { name: "Question 1 title" });
    await user.clear(title);
    await user.type(title, "/short{Enter}");
    const dialog = await screen.findByRole("dialog", { name: "Change question type?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Question type" })).toHaveTextContent(
      "Single select",
    );
    expect(screen.getByRole("textbox", { name: "Option 1" })).toHaveValue("Red");
  });

  it("closes the slash menu with Escape and removes the typed slash", async () => {
    const user = userEvent.setup();
    await openEditor();

    const title = screen.getByRole("combobox", { name: "Question 1 title" });
    await user.clear(title);
    await user.type(title, "/");
    expect(title).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(title).toHaveAttribute("aria-expanded", "false");
    expect(title).toHaveValue("");
  });

  it("filters the slash menu as the author types after the slash", async () => {
    const user = userEvent.setup();
    await openEditor();

    const title = screen.getByRole("combobox", { name: "Question 1 title" });
    await user.clear(title);
    await user.type(title, "/rat");

    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent("Rating");
  });

  it("inserts a new question after the active one and focuses it", async () => {
    const user = userEvent.setup();
    await openEditor(buildForm([shortTextQuestion("First"), shortTextQuestion("Second")]));

    await user.click(screen.getAllByRole("button", { name: "Insert question" })[0]);
    await user.click(await screen.findByRole("option", { name: /Number/ }));

    const inserted = await screen.findByRole("combobox", { name: "Question 2 title" });
    await vi.waitFor(() => expect(inserted).toHaveFocus());
    expect(inserted).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Question 3 title" })).toHaveValue("Second");
  });

  it("does not re-render other cards while typing in one", async () => {
    const user = userEvent.setup();
    await openEditor(
      buildForm([shortTextQuestion("First"), shortTextQuestion("Second"), shortTextQuestion("Third")]),
    );

    // The first keystroke flips the form to dirty, which legitimately updates the header.
    const first = screen.getByRole("combobox", { name: "Question 1 title" });
    await user.type(first, "a");
    typeEditorRenders.clear();

    await user.type(first, "bcdef");

    expect(typeEditorRenders.get(1) ?? 0).toBe(0);
    expect(typeEditorRenders.get(2) ?? 0).toBe(0);
  });

  it("asks before leaving with unsaved changes, and lets the author stay", async () => {
    const user = userEvent.setup();
    const { navigate } = await openEditor();

    await user.type(screen.getByRole("textbox", { name: "Form title" }), "!");
    await navigate("/");

    const dialog = await screen.findByRole("dialog", { name: "Discard unsaved changes?" });
    await user.click(within(dialog).getByRole("button", { name: "Keep editing" }));

    expect(screen.getByRole("textbox", { name: "Form title" })).toHaveValue("Customer survey!");
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("leaves without asking when nothing changed", async () => {
    const { navigate } = await openEditor();

    await navigate("/");

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
  });

  it("returns to the dashboard after deleting, without flashing a load error", async () => {
    const user = userEvent.setup();
    const { form, api } = await openEditor();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete this form?" });
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Couldn’t open form")).not.toBeInTheDocument();
    // The page must not ask for the form it just deleted (that 404 is what showed the error).
    const afterDelete = api.requests.slice(api.requests.indexOf(`DELETE /api/forms/${form.id}`) + 1);
    expect(afterDelete).not.toContain(`GET /api/forms/${form.id}`);
  });

  it("does not ask when switching between edit and preview", async () => {
    const user = userEvent.setup();
    const { form, navigate } = await openEditor();

    await user.type(screen.getByRole("textbox", { name: "Form title" }), "!");
    await navigate(`/forms/${form.id}/preview`);

    expect(screen.queryByRole("dialog", { name: "Discard unsaved changes?" })).not.toBeInTheDocument();
    expect(await screen.findByText(SAVE_STATUS)).toHaveTextContent("Unsaved");
  });
});
