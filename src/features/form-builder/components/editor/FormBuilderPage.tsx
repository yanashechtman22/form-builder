import { useFormContext, useWatch } from "react-hook-form";
import { FORM_DESCRIPTION_MAX, FORM_TITLE_MAX } from "@shared/contracts/limits";
import { CharacterCount } from "@/shared/ui/CharacterCount";
import { Input } from "@/shared/ui/Input";
import { Textarea } from "@/shared/ui/Textarea";
import { DEFAULT_FORM_TITLE, type FormDraft } from "../../draft/form-draft";
import { QuestionList } from "./QuestionList";
import styles from "./FormBuilderPage.module.css";

export function FormBuilderPage() {
  const { register, control } = useFormContext<FormDraft>();
  const title = useWatch({ control, name: "title" }) ?? "";
  const description = useWatch({ control, name: "description" }) ?? "";

  return (
    <div className={styles.stack}>
      <div className={styles.details}>
        <div className={styles.titleInput}>
          <Input
            id="form-title"
            placeholder={DEFAULT_FORM_TITLE}
            aria-label="Form title"
            {...register("title")}
            maxLength={FORM_TITLE_MAX}
          />
          <CharacterCount value={title} max={FORM_TITLE_MAX} />
        </div>
        <div className={styles.descriptionInput}>
          <Textarea
            id="form-description"
            placeholder="Form description"
            aria-label="Form description"
            rows={2}
            {...register("description")}
            maxLength={FORM_DESCRIPTION_MAX}
          />
          <CharacterCount value={description} max={FORM_DESCRIPTION_MAX} />
        </div>
      </div>

      <QuestionList />
    </div>
  );
}
