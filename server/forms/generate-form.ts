import { randomUUID } from "node:crypto";
import { ZodError } from "zod";
import { FormDefinitionSchema, type FormDefinition } from "../../shared/contracts/forms.js";
import {
  GENERATED_FORM_JSON_SCHEMA,
  GeneratedFormSchema,
  type GeneratedForm,
} from "../../shared/contracts/generate-form.js";
import {
  DEFAULT_CHECKBOX_LABEL,
  type Question,
} from "../../shared/contracts/questions.js";

const OLLAMA_TIMEOUT_MS = 90_000;

const SYSTEM_PROMPT = [
  "You design forms. Return one JSON object and nothing else.",
  "Use only these question types: shortText, longText, number, date, singleSelect, multiSelect, checkbox, rating.",
  "shortText and longText are free text. number may include min and max. date is a calendar date.",
  "singleSelect and multiSelect need at least two options, as an array of label strings.",
  "checkbox is one confirmation. label is the text beside the box.",
  "rating max is an integer from 3 to 10. Omit max for a 1 to 5 scale.",
  "required is true only when the answer must be filled in.",
  "Write every title, description, prompt, option, and label in the same language as the user's description. Do not translate.",
  "Write letters as themselves. Do not use \\u escapes.",
  "Keep the form focused. Do not invent ids.",
].join(" ");

const LANGUAGE_CORRECTION =
  "Write every title, description, prompt, option, and label in the same language as the user's description. Do not translate.";

export class ModelUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelUnavailableError";
  }
}

export class ModelOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelOutputError";
  }
}

export type FormGenerator = (prompt: string) => Promise<FormDefinition>;

export function generatedFormToDefinition(
  value: unknown,
  createId: () => string = randomUUID,
): { ok: true; definition: FormDefinition } | { ok: false; message: string } {
  const generated = GeneratedFormSchema.safeParse(decodeModelText(value));
  if (!generated.success) {
    return { ok: false, message: issueSummary(generated.error) };
  }

  const candidate: FormDefinition = {
    title: generated.data.title,
    description: blankToUndefined(generated.data.description),
    questions: generated.data.questions.map((question) => toQuestion(question, createId)),
  };
  const parsed = FormDefinitionSchema.safeParse(candidate);
  if (!parsed.success) {
    return { ok: false, message: issueSummary(parsed.error) };
  }
  return { ok: true, definition: parsed.data };
}

export function createOllamaFormGenerator(options: {
  host: string;
  model: string;
  fetchImpl?: typeof fetch;
}): FormGenerator {
  const fetchImpl = options.fetchImpl ?? fetch;

  return async function generate(prompt: string): Promise<FormDefinition> {
    let correction: string | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      let raw: unknown;
      try {
        raw = await complete(fetchImpl, options, prompt, correction);
      } catch (error) {
        if (error instanceof ModelOutputError && attempt === 0) {
          correction = error.message;
          continue;
        }
        throw error;
      }

      const parsed = generatedFormToDefinition(raw);
      if (!parsed.ok) {
        if (attempt === 1) {
          throw new ModelOutputError(parsed.message);
        }
        correction = parsed.message;
        continue;
      }
      if (matchesPromptLanguage(prompt, parsed.definition)) {
        return parsed.definition;
      }
      if (attempt === 1) {
        throw new ModelOutputError(LANGUAGE_CORRECTION);
      }
      correction = LANGUAGE_CORRECTION;
    }
    throw new ModelOutputError("The description could not be turned into a form.");
  };
}

async function complete(
  fetchImpl: typeof fetch,
  options: { host: string; model: string },
  prompt: string,
  correction?: string,
): Promise<unknown> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];
  if (correction) {
    messages.push({
      role: "user",
      content: `That JSON was invalid: ${correction}. Return a corrected JSON object only.`,
    });
  }

  let response: Response;
  try {
    response = await fetchImpl(`${options.host}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: options.model,
        stream: false,
        format: GENERATED_FORM_JSON_SCHEMA,
        messages,
        options: { temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    throw new ModelUnavailableError(message);
  }

  if (!response.ok) {
    throw new ModelUnavailableError(`Ollama returned ${response.status}`);
  }

  const body: unknown = await response.json();
  const content = readMessageContent(body);
  if (!content) {
    throw new ModelOutputError("The model returned an empty reply.");
  }
  return parseModelJson(content);
}

function toQuestion(question: GeneratedForm["questions"][number], createId: () => string): Question {
  const description = blankToUndefined(question.description);
  const required = question.required ?? false;
  const base = {
    id: createId(),
    prompt: question.prompt,
    description,
    required,
  };

  switch (question.type) {
    case "shortText":
    case "longText":
    case "date":
      return { ...base, type: question.type };
    case "number":
      return {
        ...base,
        type: "number",
        ...(question.min !== undefined ? { min: question.min } : {}),
        ...(question.max !== undefined ? { max: question.max } : {}),
      };
    case "singleSelect":
    case "multiSelect":
      return {
        ...base,
        type: question.type,
        options: question.options.map((label) => ({ id: createId(), label })),
      };
    case "checkbox":
      return {
        ...base,
        type: "checkbox",
        label: question.label?.trim() || DEFAULT_CHECKBOX_LABEL,
      };
    case "rating":
      return {
        ...base,
        type: "rating",
        max: question.max ?? 5,
      };
    default: {
      const _exhaustive: never = question;
      throw new Error(`Unhandled generated question: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

const SCRIPTS = [
  "Latin",
  "Cyrillic",
  "Hebrew",
  "Arabic",
  "Greek",
  "Han",
  "Hiragana",
  "Katakana",
  "Hangul",
] as const;

const SCRIPT_PATTERNS = SCRIPTS.map((name) => ({
  name,
  pattern: new RegExp(`\\p{Script=${name}}`, "u"),
}));

const MIN_SCRIPT_LETTERS = 4;
const SCRIPT_SHARE = 0.8;

function decodeModelText(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(/\\u([0-9a-fA-F]{4})/g, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => decodeModelText(item));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, decodeModelText(item)]),
    );
  }
  return value;
}

function matchesPromptLanguage(prompt: string, definition: FormDefinition): boolean {
  const expected = primaryScript(prompt);
  if (!expected) {
    return true;
  }
  return visibleCopy(definition).every((text) => {
    const actual = primaryScript(text);
    return actual === undefined || actual === expected;
  });
}

function visibleCopy(definition: FormDefinition): string[] {
  const parts = [definition.title];
  if (definition.description) {
    parts.push(definition.description);
  }
  for (const question of definition.questions) {
    parts.push(question.prompt);
    if (question.description) {
      parts.push(question.description);
    }
    if (question.type === "singleSelect" || question.type === "multiSelect") {
      parts.push(...question.options.map((option) => option.label));
    }
    if (question.type === "checkbox") {
      parts.push(question.label);
    }
  }
  return parts;
}

function primaryScript(text: string): (typeof SCRIPTS)[number] | undefined {
  const counts = new Map<(typeof SCRIPTS)[number], number>();
  let total = 0;
  for (const char of text) {
    const script = SCRIPT_PATTERNS.find((rule) => rule.pattern.test(char));
    if (!script) {
      continue;
    }
    total += 1;
    counts.set(script.name, (counts.get(script.name) ?? 0) + 1);
  }
  if (total < MIN_SCRIPT_LETTERS) {
    return undefined;
  }
  let bestName: (typeof SCRIPTS)[number] | undefined;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      bestName = name;
      bestCount = count;
    }
  }
  if (!bestName || bestCount / total < SCRIPT_SHARE) {
    return undefined;
  }
  return bestName;
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function issueSummary(error: ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "form"}: ${issue.message}`)
    .join("; ");
}

function readMessageContent(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || !("message" in body)) {
    return undefined;
  }
  const message = body.message;
  if (!message || typeof message !== "object" || !("content" in message)) {
    return undefined;
  }
  return typeof message.content === "string" ? message.content : undefined;
}

function parseModelJson(content: string): unknown {
  const trimmed = content.trim();
  const candidates = [trimmed];
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start && (start !== 0 || end !== trimmed.length - 1)) {
    candidates.push(trimmed.slice(start, end + 1));
  }
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Try the next candidate. A bare prose reply has no JSON object.
    }
  }
  throw new ModelOutputError("The model did not return JSON.");
}
