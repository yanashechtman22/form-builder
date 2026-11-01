import clsx from "clsx";
import type { QuestionType } from "@shared/contracts/questions";
import { QUESTION_TYPE_META } from "../../draft/question-type-meta";
import styles from "./SlashMenu.module.css";

type SlashMenuProps = {
  id: string;
  open: boolean;
  types: QuestionType[];
  activeIndex: number;
  optionId: (type: QuestionType) => string;
  onActiveIndexChange: (index: number) => void;
  onSelect: (type: QuestionType) => void;
};

export function SlashMenu({
  id,
  open,
  types,
  activeIndex,
  optionId,
  onActiveIndexChange,
  onSelect,
}: SlashMenuProps) {
  if (!open) {
    return null;
  }

  return (
    <div id={id} className={styles.panel} role="listbox" aria-label="Insert question type">
      <div className={styles.hint}>Question type</div>
      <div className={styles.list}>
        {types.length === 0 ? (
          <p className={styles.empty}>No matching types</p>
        ) : (
          types.map((type, index) => {
            const meta = QUESTION_TYPE_META[type];
            const Icon = meta.Icon;
            return (
              <div
                key={type}
                id={optionId(type)}
                role="option"
                aria-selected={index === activeIndex}
                className={clsx(styles.item, index === activeIndex && styles.itemActive)}
                onMouseEnter={() => onActiveIndexChange(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelect(type)}
              >
                <span className={styles.iconWrap}>
                  <Icon size={14} />
                </span>
                <span className={styles.copy}>
                  <span className={styles.label}>{meta.label}</span>
                  <span className={styles.description}>{meta.description}</span>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
