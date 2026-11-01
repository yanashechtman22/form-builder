import { useEffect, useRef } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { QUESTION_PROMPT_MAX } from "@shared/contracts/limits";
import type { QuestionType } from "@shared/contracts/questions";
import { CharacterCount } from "@/shared/ui/CharacterCount";
import { Input } from "@/shared/ui/Input";
import { DEFAULT_QUESTION_PROMPT, type FormDraft } from "../../draft/form-draft";
import { questionPromptDomId } from "../../dom-ids";
import { SlashMenu } from "./SlashMenu";
import { useSlashMenu } from "./use-slash-menu";
import styles from "./QuestionPromptField.module.css";

type QuestionPromptFieldProps = {
  index: number;
  questionId: string;
  /** Focus the field once, then call `onAutoFocused` (used for freshly inserted questions). */
  autoFocus: boolean;
  onAutoFocused: () => void;
  onSelectType: (type: QuestionType) => void;
};

export function QuestionPromptField({
  index,
  questionId,
  autoFocus,
  onAutoFocused,
  onSelectType,
}: QuestionPromptFieldProps) {
  const { register, control } = useFormContext<FormDraft>();
  const promptRef = useRef<HTMLInputElement | null>(null);
  const prompt = useWatch({ control, name: `questions.${index}.prompt` }) ?? "";
  const slash = useSlashMenu({
    questionIndex: index,
    onSelectType,
    focusPrompt: () => promptRef.current?.focus(),
  });
  const { typeMenu } = slash;

  useEffect(() => {
    if (autoFocus) {
      promptRef.current?.focus();
      onAutoFocused();
    }
  }, [autoFocus, onAutoFocused]);

  const { ref: registerRef, onChange: registerOnChange, ...promptRegister } = register(
    `questions.${index}.prompt`,
  );

  return (
    <div className={styles.root} ref={slash.containerRef}>
      <Input
        id={questionPromptDomId(questionId)}
        placeholder={DEFAULT_QUESTION_PROMPT}
        aria-label={`Question ${index + 1} title`}
        role="combobox"
        aria-expanded={slash.open}
        aria-controls={slash.open ? typeMenu.listboxId : undefined}
        aria-activedescendant={slash.open ? typeMenu.activeOptionId : undefined}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        maxLength={QUESTION_PROMPT_MAX}
        {...promptRegister}
        ref={(node) => {
          registerRef(node);
          promptRef.current = node;
        }}
        onChange={(event) => {
          void registerOnChange(event);
          slash.onPromptChange(event);
        }}
        onKeyDown={slash.onPromptKeyDown}
      />
      {slash.open ? (
        <div className={styles.slashAnchor}>
          <SlashMenu
            id={typeMenu.listboxId}
            open={slash.open}
            types={typeMenu.types}
            activeIndex={typeMenu.activeIndex}
            optionId={typeMenu.optionId}
            onActiveIndexChange={typeMenu.setActiveIndex}
            onSelect={slash.select}
          />
        </div>
      ) : null}
      <CharacterCount value={prompt} max={QUESTION_PROMPT_MAX} />
    </div>
  );
}
