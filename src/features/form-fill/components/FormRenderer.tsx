import type { ReactNode } from "react";
import clsx from "clsx";
import type { Question } from "@shared/contracts/questions";
import { QuestionResponseField } from "./QuestionResponseField";
import styles from "./FormRenderer.module.css";

type FormRendererProps = {
  title: string;
  description?: string;
  questions: Question[];
  disabled?: boolean;
  footer?: ReactNode;
  onSubmit?: () => void;
  align?: "center" | "start";
};

export function FormRenderer({
  title,
  description,
  questions,
  disabled = false,
  footer,
  onSubmit,
  align = "center",
}: FormRendererProps) {
  return (
    <form
      className={clsx(styles.form, align === "start" && styles.formStart)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.();
      }}
      noValidate
    >
      <header className={styles.intro}>
        <h1 className={styles.title}>{title || "Untitled form"}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
      </header>

      <div className={styles.questions}>
        {questions.map((question) => (
          <QuestionResponseField
            key={question.id}
            question={question}
            disabled={disabled}
          />
        ))}
      </div>

      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </form>
  );
}
