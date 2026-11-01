import { useMemo } from "react";
import { FormProvider, useForm, useFormContext, useWatch } from "react-hook-form";
import type { Question } from "@shared/contracts/questions";
import {
  createEmptyAnswerValues,
  type AnswerFormValues,
} from "@/features/form-fill/utils/answer-values";
import { FormRenderer } from "@/features/form-fill/components/FormRenderer";
import { Button } from "@/shared/ui/Button";
import type { FormDraft } from "../../draft/form-draft";
import styles from "./FormPreviewPage.module.css";

function draftQuestionsAsQuestions(draft: FormDraft): Question[] {
  return draft.questions.map((question) => {
    if (question.type === "singleSelect" || question.type === "multiSelect") {
      return {
        ...question,
        prompt: question.prompt || "Untitled question",
        options: question.options.map((option, index) => ({
          ...option,
          label: option.label || `Option ${index + 1}`,
        })),
      } as Question;
    }
    return {
      ...question,
      prompt: question.prompt || "Untitled question",
    } as Question;
  });
}

export function FormPreviewPage() {
  const { control } = useFormContext<FormDraft>();
  const draft = useWatch({ control }) as FormDraft;
  const questions = useMemo(() => draftQuestionsAsQuestions(draft), [draft]);

  const answerMethods = useForm<AnswerFormValues>({
    values: createEmptyAnswerValues(questions),
  });

  return (
    <div className={styles.stack}>
      <p className={styles.note}>
        Preview of your latest edits, including ones you have not saved. Share opens the last
        saved version.
      </p>
      <FormProvider {...answerMethods}>
        <FormRenderer
          align="start"
          title={draft.title}
          description={draft.description}
          questions={questions}
          disabled
          footer={
            <Button type="button" disabled>
              Submit
            </Button>
          }
        />
      </FormProvider>
    </div>
  );
}
