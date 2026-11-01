import { randomUUID } from "node:crypto";
import type { FormDefinition } from "../../shared/contracts/forms.js";

export function createDefaultFormDefinition(): FormDefinition {
  return {
    title: "Untitled form",
    description: "",
    questions: [
      {
        id: randomUUID(),
        type: "shortText",
        prompt: "Untitled question",
        description: "",
        required: false,
      },
    ],
  };
}
