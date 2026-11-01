import { describe, expect, it, vi } from "vitest";
import {
  createOllamaFormGenerator,
  generatedFormToDefinition,
  ModelUnavailableError,
} from "../../server/forms/generate-form.js";

const volunteer = {
  title: "Volunteer signup",
  description: "Help at the Saturday event",
  questions: [
    { type: "shortText", prompt: "Name", required: true },
    { type: "singleSelect", prompt: "Shirt size", required: true, options: ["S", "M", "L"] },
    { type: "checkbox", prompt: "Waiver", required: true },
    { type: "rating", prompt: "How experienced are you?" },
  ],
};

function ollamaResponse(content: unknown, status = 200): Response {
  return new Response(
    JSON.stringify({
      message: {
        role: "assistant",
        content: typeof content === "string" ? content : JSON.stringify(content),
      },
    }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

describe("generatedFormToDefinition", () => {
  it("assigns ids and fills checkbox and rating defaults", () => {
    const result = generatedFormToDefinition(volunteer);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }
    expect(result.definition.title).toBe("Volunteer signup");
    expect(result.definition.questions).toHaveLength(4);
    const [name, size, waiver, experience] = result.definition.questions;
    expect(name?.type).toBe("shortText");
    expect(size?.type).toBe("singleSelect");
    if (size?.type !== "singleSelect") {
      throw new Error("expected a choice question");
    }
    expect(size.options.map((option) => option.label)).toEqual(["S", "M", "L"]);
    expect(waiver?.type).toBe("checkbox");
    if (waiver?.type !== "checkbox") {
      throw new Error("expected a checkbox");
    }
    expect(waiver.label).toBe("Yes");
    expect(experience?.type).toBe("rating");
    if (experience?.type !== "rating") {
      throw new Error("expected a rating");
    }
    expect(experience.max).toBe(5);
  });

  it("turns leftover unicode escapes into letters", () => {
    const result = generatedFormToDefinition({
      title: "How was the trip",
      questions: [{ type: "longText", prompt: "Проверите \\u0432акятеля" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(result.message);
    }
    expect(result.definition.questions[0]?.prompt).toBe("Проверите вакятеля");
  });

  it("rejects a choice question with one option", () => {
    const result = generatedFormToDefinition({
      title: "Pick one",
      questions: [{ type: "singleSelect", prompt: "Color", options: ["Blue"] }],
    });
    expect(result.ok).toBe(false);
  });
});

describe("createOllamaFormGenerator", () => {
  it("retries once when the first reply is not a form", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(ollamaResponse("not json"))
      .mockResolvedValueOnce(ollamaResponse(volunteer));
    const generate = createOllamaFormGenerator({
      host: "http://127.0.0.1:11434",
      model: "llama3.2",
      fetchImpl,
    });

    const definition = await generate("signup form");
    expect(definition.title).toBe("Volunteer signup");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("asks again when the draft is in another language", async () => {
    const russian = {
      title: "Как прошла поездка",
      questions: [{ type: "longText", prompt: "Расскажите о поездке" }],
    };
    const english = {
      title: "How was the trip",
      questions: [{ type: "longText", prompt: "What stood out on the trip?" }],
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(ollamaResponse(russian))
      .mockResolvedValueOnce(ollamaResponse(english));
    const generate = createOllamaFormGenerator({
      host: "http://127.0.0.1:11434",
      model: "llama3.2",
      fetchImpl,
    });

    const definition = await generate("How was the trip");
    expect(definition.questions[0]?.prompt).toBe("What stood out on the trip?");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const secondCall = fetchImpl.mock.calls[1]?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(secondCall?.body)) as {
      messages: { content: string }[];
    };
    expect(body.messages.at(-1)?.content).toMatch(/same language/i);
  });

  it("reports when Ollama cannot be reached", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED"));
    const generate = createOllamaFormGenerator({
      host: "http://127.0.0.1:11434",
      model: "llama3.2",
      fetchImpl,
    });

    await expect(generate("signup form")).rejects.toBeInstanceOf(ModelUnavailableError);
  });
});
