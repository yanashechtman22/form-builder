import { QUESTION_TYPES, type QuestionType } from "@shared/contracts/questions";
import { Menu } from "@/shared/ui/Menu";
import { ChevronDownIcon } from "@/shared/ui/Icons";
import { QUESTION_TYPE_META } from "../../draft/question-type-meta";
import styles from "./QuestionTypeSelect.module.css";

type QuestionTypeSelectProps = {
  value: QuestionType;
  onChange: (value: QuestionType) => void;
  id: string;
};

export function QuestionTypeSelect({ value, onChange, id }: QuestionTypeSelectProps) {
  const meta = QUESTION_TYPE_META[value];
  const ActiveIcon = meta.Icon;

  return (
    <Menu width={240}>
      <Menu.Target>
        <button type="button" id={id} className={styles.trigger} aria-label="Question type">
          <ActiveIcon size={14} />
          <span className={styles.label}>{meta.label}</span>
          <ChevronDownIcon size={14} />
        </button>
      </Menu.Target>
      <Menu.Dropdown>
        {QUESTION_TYPES.map((type) => {
          const item = QUESTION_TYPE_META[type];
          const Icon = item.Icon;
          return (
            <Menu.Item
              key={type}
              leftSection={
                <span className={styles.itemIcon}>
                  <Icon size={14} />
                </span>
              }
              onClick={() => onChange(type)}
            >
              {item.label}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
