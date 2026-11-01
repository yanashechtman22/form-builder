import { useEffect, useRef } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { OPTION_LABEL_MAX } from "@shared/contracts/limits";
import { Button } from "@/shared/ui/Button";
import { IconButton } from "@/shared/ui/IconButton";
import { Input } from "@/shared/ui/Input";
import { PlusIcon, TrashIcon } from "@/shared/ui/Icons";
import type { FormDraft } from "../../draft/form-draft";
import styles from "./ChoiceOptionsEditor.module.css";

type ChoiceOptionsEditorProps = {
  questionIndex: number;
};

export function ChoiceOptionsEditor({ questionIndex }: ChoiceOptionsEditorProps) {
  const { control, register } = useFormContext<FormDraft>();
  const { fields, insert, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`,
    keyName: "fieldKey",
  });
  const pendingFocusIndex = useRef<number | null>(null);
  const optionRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    const index = pendingFocusIndex.current;
    if (index === null) {
      return;
    }
    optionRefs.current[index]?.focus();
    pendingFocusIndex.current = null;
  }, [fields.length]);

  function addOption(afterIndex?: number) {
    const nextIndex = afterIndex === undefined ? fields.length : afterIndex + 1;
    pendingFocusIndex.current = nextIndex;
    insert(nextIndex, { id: crypto.randomUUID(), label: "" }, { shouldFocus: false });
  }

  return (
    <div className={styles.list}>
      {fields.map((field, optionIndex) => {
        const { ref, ...optionRegister } = register(
          `questions.${questionIndex}.options.${optionIndex}.label`,
        );
        return (
          <div key={field.fieldKey} className={styles.row}>
            <span className={styles.bullet} aria-hidden="true" />
            <Input
              {...optionRegister}
              ref={(node) => {
                ref(node);
                optionRefs.current[optionIndex] = node;
              }}
              placeholder={`Option ${optionIndex + 1}`}
              aria-label={`Option ${optionIndex + 1}`}
              maxLength={OPTION_LABEL_MAX}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addOption(optionIndex);
                }
              }}
            />
            <IconButton
              label={`Remove option ${optionIndex + 1}`}
              tone="danger"
              disabled={fields.length <= 2}
              onClick={() => remove(optionIndex)}
            >
              <TrashIcon />
            </IconButton>
          </div>
        );
      })}
      <div className={styles.addButton}>
        <Button variant="ghost" size="sm" onClick={() => addOption()}>
          <PlusIcon />
          Add option
        </Button>
      </div>
    </div>
  );
}
