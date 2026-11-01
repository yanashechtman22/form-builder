import { useEffect, useId, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import clsx from "clsx";
import { useMatch, useNavigate } from "react-router-dom";
import { QUESTION_TYPES, type QuestionType } from "@shared/contracts/questions";
import { QUESTION_TYPE_META } from "@/features/form-builder/draft/question-type-meta";
import { useCreateFormMutation } from "@/features/forms/hooks/use-create-form-mutation";
import { ShareFormPanel } from "@/features/forms/components/ShareFormPopover";
import { useCommandBridge } from "./command-bridge-context";
import styles from "./CommandPalette.module.css";

type CommandAction = {
  id: string;
  group: string;
  title: string;
  hint?: string;
  keywords?: string[];
  shortcut?: string[];
  closesPalette?: boolean;
  run: () => void | Promise<void>;
};

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function matchesQuery(action: CommandAction, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  const haystack = [action.title, action.hint ?? "", action.group, ...(action.keywords ?? [])]
    .join(" ")
    .toLowerCase();
  return haystack.includes(normalized);
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const formMatch = useMatch("/forms/:formId/*");
  const { draft } = useCommandBridge();
  const formId = draft?.formId ?? formMatch?.params.formId;
  const { mutateAsync: createForm } = useCreateFormMutation();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [shareFormId, setShareFormId] = useState<string | null>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      setShareFormId(null);
    }
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMod = event.metaKey || event.ctrlKey;
      if (isMod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  const actions = useMemo(() => {
    const items: CommandAction[] = [
      {
        id: "forms",
        group: "Navigate",
        title: "Go to forms",
        hint: "Dashboard",
        keywords: ["home", "list"],
        run: () => navigate("/"),
      },
      {
        id: "new-form",
        group: "Forms",
        title: "Create new form",
        keywords: ["add", "new"],
        run: async () => {
          const form = await createForm();
          navigate(`/forms/${form.id}/edit`);
        },
      },
    ];

    if (formId) {
      items.push(
        {
          id: "preview",
          group: "Navigate",
          title: "Open preview",
          run: () => navigate(`/forms/${formId}/preview`),
        },
        {
          id: "responses",
          group: "Navigate",
          title: "Open responses",
          run: () => navigate(`/forms/${formId}/responses`),
        },
        {
          id: "share",
          group: "Editor",
          title: "Share fill link",
          hint: "Copy or open the link",
          closesPalette: false,
          run: () => {
            setShareFormId(formId);
          },
        },
        {
          id: "edit",
          group: "Navigate",
          title: "Open editor",
          run: () => navigate(`/forms/${formId}/edit`),
        },
      );
    }

    if (draft) {
      items.push(
        {
          id: "save",
          group: "Editor",
          title: "Save form",
          shortcut: ["⌘", "S"],
          keywords: ["persist"],
          run: async () => {
            await draft.save();
          },
        },
        ...QUESTION_TYPES.map((type: QuestionType) => ({
          id: `add-${type}`,
          group: "Add question",
          title: `Add ${QUESTION_TYPE_META[type].label}`,
          hint: QUESTION_TYPE_META[type].description,
          keywords: QUESTION_TYPE_META[type].keywords,
          run: () => {
            draft.insertQuestion(type);
            navigate(`/forms/${draft.formId}/edit`);
          },
        })),
      );
    }

    return items.filter((action) => matchesQuery(action, query));
  }, [createForm, draft, formId, navigate, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  function runAction(action: CommandAction) {
    void Promise.resolve(action.run()).finally(() => {
      if (action.closesPalette !== false) {
        onOpenChange(false);
      }
    });
  }

  function onDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (shareFormId) {
      if (event.key === "Escape") {
        event.preventDefault();
        setShareFormId(null);
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(actions.length - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Enter" && actions[activeIndex]) {
      event.preventDefault();
      runAction(actions[activeIndex]);
    }
  }

  if (!open) {
    return null;
  }

  const groups = actions.reduce<Record<string, CommandAction[]>>((acc, action) => {
    acc[action.group] = acc[action.group] ?? [];
    acc[action.group].push(action);
    return acc;
  }, {});

  let runningIndex = -1;

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={onDialogKeyDown}
      >
        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search actions…"
            aria-label="Search commands"
            role="combobox"
            aria-expanded={shareFormId === null}
            aria-controls={shareFormId === null ? listboxId : undefined}
            aria-activedescendant={
              shareFormId === null && actions.length > 0
                ? `${listboxId}-option-${activeIndex}`
                : undefined
            }
            aria-autocomplete="list"
            autoFocus
          />
          <kbd className="kbd">esc</kbd>
        </div>

        {shareFormId ? (
          <div className={styles.sharePane}>
            <button
              type="button"
              className={styles.shareBack}
              onClick={() => setShareFormId(null)}
            >
              Back
            </button>
            <ShareFormPanel
              formId={shareFormId}
              hasUnsavedChanges={draft?.hasUnsavedChanges ?? false}
              acceptingResponses={draft?.acceptingResponses ?? true}
            />
          </div>
        ) : (
        <div className={styles.list} id={listboxId} role="listbox">
          {actions.length === 0 ? (
            <p className={styles.empty}>No matching actions</p>
          ) : (
            Object.entries(groups).map(([group, groupActions]) => (
              <div key={group}>
                <div className={styles.groupLabel}>{group}</div>
                {groupActions.map((action) => {
                  runningIndex += 1;
                  const index = runningIndex;
                  return (
                    <div
                      key={action.id}
                      id={`${listboxId}-option-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                      tabIndex={-1}
                      className={clsx(styles.item, index === activeIndex && styles.itemActive)}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => runAction(action)}
                    >
                      <span className={styles.itemLabel}>
                        <span className={styles.itemTitle}>{action.title}</span>
                        {action.hint ? (
                          <span className={styles.itemHint}>{action.hint}</span>
                        ) : null}
                      </span>
                      {action.shortcut ? (
                        <span className={styles.shortcuts}>
                          {action.shortcut.map((key) => (
                            <kbd key={key} className="kbd">
                              {key}
                            </kbd>
                          ))}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
        )}

        <div className={styles.footer}>
          <span>Navigate with ↑↓ · Enter to run</span>
          <span>
            <kbd className="kbd">⌘</kbd>
            <kbd className="kbd">K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
