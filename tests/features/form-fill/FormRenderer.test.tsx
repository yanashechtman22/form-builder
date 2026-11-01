import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormProvider, useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import type { Question } from "@shared/contracts/questions";
import { renderWithProviders } from "@/test/render";
import { Button } from "@/shared/ui/Button";
import {
  buildAnswersFromValues,
  createEmptyAnswerValues,
  type AnswerFormValues,
} from "@/features/form-fill/utils/answer-values";
import { FormRenderer } from "@/features/form-fill/components/FormRenderer";

const questions: Question[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    type: "shortText",
    prompt: "Your name",
    required: true,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    type: "rating",
    prompt: "Score",
    required: false,
    max: 5,
  },
];

function Harness({ onValidSubmit }: { onValidSubmit: (count: number) => void }) {
  const methods = useForm<AnswerFormValues>({
    defaultValues: createEmptyAnswerValues(questions),
  });

  return (
    <FormProvider {...methods}>
      <FormRenderer
        title="Demo form"
        questions={questions}
        onSubmit={() => {
          const result = buildAnswersFromValues(questions, methods.getValues());
          if (!result.ok) {
            for (const [questionId, message] of Object.entries(result.fieldErrors)) {
              methods.setError(questionId, { type: "validate", message });
            }
            return;
          }
          onValidSubmit(result.answers.length);
        }}
        footer={<Button type="submit">Submit</Button>}
      />
    </FormProvider>
  );
}

describe("FormRenderer", () => {
  it("blocks submit when a required field is empty", async () => {
    const user = userEvent.setup();
    const onValidSubmit = vi.fn();
    renderWithProviders(<Harness onValidSubmit={onValidSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("This question is required")).toBeInTheDocument();
    expect(onValidSubmit).not.toHaveBeenCalled();
  });

  it("submits typed answers when valid", async () => {
    const user = userEvent.setup();
    const onValidSubmit = vi.fn();
    renderWithProviders(<Harness onValidSubmit={onValidSubmit} />);

    await user.type(screen.getByRole("textbox", { name: /your name/i }), "Ada");
    await user.click(screen.getByRole("radio", { name: "4" }));
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onValidSubmit).toHaveBeenCalledWith(2);
  });
});
