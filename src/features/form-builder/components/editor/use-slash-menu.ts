import { useCallback, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useClickOutside } from "@mantine/hooks";
import { useFormContext } from "react-hook-form";
import type { QuestionType } from "@shared/contracts/questions";
import type { FormDraft } from "../../draft/form-draft";
import { useTypeMenu } from "./use-type-menu";

type UseSlashMenuOptions = {
  questionIndex: number;
  onSelectType: (type: QuestionType) => void;
  focusPrompt: () => void;
};

/**
 * "/" in an empty question title opens a type picker, Notion-style.
 * The typed text after the slash filters the list; picking a type clears it.
 */
export function useSlashMenu({ questionIndex, onSelectType, focusPrompt }: UseSlashMenuOptions) {
  const { getValues, setValue } = useFormContext<FormDraft>();
  const promptName = `questions.${questionIndex}.prompt` as const;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const typeMenu = useTypeMenu(open, query);

  const dismiss = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);
  const containerRef = useClickOutside<HTMLDivElement>(dismiss);

  function clearPrompt() {
    setValue(promptName, "", { shouldDirty: true });
  }

  function select(type: QuestionType) {
    dismiss();
    clearPrompt();
    onSelectType(type);
    requestAnimationFrame(focusPrompt);
  }

  function onPromptChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value;
    if (value.startsWith("/")) {
      setOpen(true);
      setQuery(value.slice(1));
    } else if (open) {
      dismiss();
    }
  }

  function onPromptKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const action = typeMenu.onKeyDown(event);
    if (action.type === "close") {
      dismiss();
      if (getValues(promptName).startsWith("/")) {
        clearPrompt();
      }
      return;
    }
    if (action.type === "select") {
      select(action.questionType);
      return;
    }
    const isPlainSlash =
      event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey;
    if (isPlainSlash && !getValues(promptName)) {
      setQuery("");
      setOpen(true);
    }
  }

  return { open, containerRef, typeMenu, select, onPromptChange, onPromptKeyDown };
}
