import { randomUUID } from "node:crypto";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../../server/app.js";
import { ModelOutputError, ModelUnavailableError } from "../../../server/forms/generate-form.js";
import { FormStore } from "../../../server/forms/store.js";

function validDefinition() {
  const optionA = randomUUID();
  const optionB = randomUUID();
  return {
    title: "Team feedback",
    description: "Weekly pulse",
    questions: [
      {
        id: randomUUID(),
        type: "shortText" as const,
        prompt: "What went well?",
        required: true,
      },
      {
        id: randomUUID(),
        type: "singleSelect" as const,
        prompt: "Overall mood",
        required: true,
        options: [
          { id: optionA, label: "Good" },
          { id: optionB, label: "Okay" },
        ],
      },
      {
        id: randomUUID(),
        type: "rating" as const,
        prompt: "Energy",
        required: false,
        max: 5 as const,
      },
    ],
  };
}

describe("forms API", () => {
  let store: FormStore;

  beforeEach(() => {
    store = new FormStore();
  });

  it("creates a form from a generated definition", async () => {
    const app = createApp(store, {
      generateForm: async () => validDefinition(),
    });
    const response = await request(app)
      .post("/api/forms/generate")
      .send({ prompt: "Weekly team feedback" });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe("Team feedback");
    expect(response.body.revision).toBe(1);
    expect(response.body.questions).toHaveLength(3);
  });

  it("asks for a description before generating", async () => {
    const response = await request(createApp(store, { generateForm: async () => validDefinition() }))
      .post("/api/forms/generate")
      .send({ prompt: "   " });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("reports when the local model is unavailable", async () => {
    const app = createApp(store, {
      generateForm: async () => {
        throw new ModelUnavailableError("connect ECONNREFUSED");
      },
    });
    const response = await request(app)
      .post("/api/forms/generate")
      .send({ prompt: "Volunteer signup" });

    expect(response.status).toBe(503);
    expect(response.body.code).toBe("MODEL_UNAVAILABLE");
  });

  it("rejects a model reply that is not a form", async () => {
    const app = createApp(store, {
      generateForm: async () => {
        throw new ModelOutputError("questions: Required");
      },
    });
    const response = await request(app)
      .post("/api/forms/generate")
      .send({ prompt: "Volunteer signup" });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("creates a default form", async () => {
    const response = await request(createApp(store)).post("/api/forms").send({});
    expect(response.status).toBe(201);
    expect(response.body.title).toBe("Untitled form");
    expect(response.body.questions).toHaveLength(1);
    expect(response.body.revision).toBe(1);
    expect(response.body.acceptingResponses).toBe(true);
  });

  it("updates a form with revision checks", async () => {
    const created = await request(createApp(store)).post("/api/forms").send({});
    const formId = created.body.id as string;
    const definition = validDefinition();

    const updated = await request(createApp(store))
      .put(`/api/forms/${formId}`)
      .send({ ...definition, expectedRevision: 1 });

    expect(updated.status).toBe(200);
    expect(updated.body.revision).toBe(2);
    expect(updated.body.title).toBe("Team feedback");

    const conflict = await request(createApp(store))
      .put(`/api/forms/${formId}`)
      .send({ ...definition, expectedRevision: 1 });

    expect(conflict.status).toBe(409);
    expect(conflict.body.code).toBe("CONFLICT");
  });

  it("accepts a valid submission and lists it", async () => {
    const app = createApp(store);
    const created = await request(app).post("/api/forms").send({});
    const formId = created.body.id as string;
    const definition = validDefinition();

    await request(app)
      .put(`/api/forms/${formId}`)
      .send({ ...definition, expectedRevision: 1 });

    const shortTextId = definition.questions[0].id;
    const selectId = definition.questions[1].id;
    const optionId = definition.questions[1].type === "singleSelect"
      ? definition.questions[1].options[0].id
      : "";

    const submitted = await request(app)
      .post(`/api/forms/${formId}/submissions`)
      .send({
        formRevision: 2,
        answers: [
          { questionId: shortTextId, type: "shortText", value: "Shipped the feature" },
          { questionId: selectId, type: "singleSelect", value: optionId },
        ],
      });

    expect(submitted.status).toBe(201);
    expect(submitted.body.id).toBeTruthy();

    const listed = await request(app).get(`/api/forms/${formId}/submissions`);
    expect(listed.status).toBe(200);
    expect(listed.body.items).toHaveLength(1);
    expect(listed.body.nextCursor).toBeNull();
    expect(listed.body.items[0].formSnapshot.title).toBe("Team feedback");

    const fetched = await request(app).get(submitted.headers.location);
    expect(fetched.status).toBe(200);
    expect(fetched.body.id).toBe(submitted.body.id);
  });

  it("rejects incomplete required answers", async () => {
    const app = createApp(store);
    const created = await request(app).post("/api/forms").send({});
    const formId = created.body.id as string;
    const definition = validDefinition();

    await request(app)
      .put(`/api/forms/${formId}`)
      .send({ ...definition, expectedRevision: 1 });

    const response = await request(app)
      .post(`/api/forms/${formId}/submissions`)
      .send({
        formRevision: 2,
        answers: [],
      });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a stale revision on submit", async () => {
    const app = createApp(store);
    const saved = await saveForm(app);

    const response = await request(app)
      .post(`/api/forms/${saved.formId}/submissions`)
      .send({ formRevision: 1, answers: answersFor(saved.definition) });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("CONFLICT");
    expect(response.body.currentRevision).toBe(2);
  });

  it("returns one page of submissions and the next cursor", async () => {
    const app = createApp(store);
    const saved = await saveForm(app);
    const answers = answersFor(saved.definition);

    const first = await request(app)
      .post(`/api/forms/${saved.formId}/submissions`)
      .send({ formRevision: saved.revision, answers });
    const second = await request(app)
      .post(`/api/forms/${saved.formId}/submissions`)
      .send({ formRevision: saved.revision, answers });

    const page = await request(app).get(`/api/forms/${saved.formId}/submissions?limit=1`);
    expect(page.status).toBe(200);
    expect(page.body.items).toHaveLength(1);
    expect(page.body.nextCursor).toBe(page.body.items[0].id);

    const rest = await request(app).get(
      `/api/forms/${saved.formId}/submissions?limit=1&cursor=${page.body.nextCursor}`,
    );
    expect(rest.status).toBe(200);
    expect(rest.body.items).toHaveLength(1);
    expect(rest.body.nextCursor).toBeNull();
    expect(new Set([page.body.items[0].id, rest.body.items[0].id])).toEqual(
      new Set([first.body.id, second.body.id]),
    );
    expect(page.body.items[0].submittedAt >= rest.body.items[0].submittedAt).toBe(true);

    const unknownCursor = await request(app).get(
      `/api/forms/${saved.formId}/submissions?cursor=${randomUUID()}`,
    );
    expect(unknownCursor.status).toBe(400);
    expect(unknownCursor.body.code).toBe("BAD_REQUEST");
  });

  it("replays a submission when the idempotency key and body match", async () => {
    const app = createApp(store);
    const saved = await saveForm(app);
    const answers = answersFor(saved.definition);
    const key = "retry-same-answers";

    const created = await request(app)
      .post(`/api/forms/${saved.formId}/submissions`)
      .set("Idempotency-Key", key)
      .send({ formRevision: saved.revision, answers });
    expect(created.status).toBe(201);

    await request(app)
      .put(`/api/forms/${saved.formId}`)
      .send({ ...saved.definition, expectedRevision: saved.revision });

    const replayed = await request(app)
      .post(`/api/forms/${saved.formId}/submissions`)
      .set("Idempotency-Key", key)
      .send({ formRevision: saved.revision, answers });

    expect(replayed.status).toBe(200);
    expect(replayed.body.id).toBe(created.body.id);

    const listed = await request(app).get(`/api/forms/${saved.formId}/submissions`);
    expect(listed.body.items).toHaveLength(1);

    const conflict = await request(app)
      .post(`/api/forms/${saved.formId}/submissions`)
      .set("Idempotency-Key", key)
      .send({
        formRevision: saved.revision,
        answers: answers.map((answer, index) =>
          index === 0 && answer.type === "shortText"
            ? { ...answer, value: "A different answer" }
            : answer,
        ),
      });
    expect(conflict.status).toBe(409);
    expect(conflict.body.currentRevision).toBeUndefined();

    const afterConflict = await request(app).get(`/api/forms/${saved.formId}/submissions`);
    expect(afterConflict.body.items).toHaveLength(1);
  });

  it("stops new responses and still replays an earlier submit", async () => {
    const app = createApp(store);
    const saved = await saveForm(app);
    const answers = answersFor(saved.definition);
    const key = "already-sent";

    const created = await request(app)
      .post(`/api/forms/${saved.formId}/submissions`)
      .set("Idempotency-Key", key)
      .send({ formRevision: saved.revision, answers });
    expect(created.status).toBe(201);

    const closed = await request(app)
      .put(`/api/forms/${saved.formId}/acceptance`)
      .send({ acceptingResponses: false });
    expect(closed.status).toBe(200);
    expect(closed.body.revision).toBe(saved.revision);
    expect(closed.body.acceptingResponses).toBe(false);

    const published = await request(app).get(`/api/forms/${saved.formId}/public`);
    expect(published.status).toBe(200);
    expect(published.body.acceptingResponses).toBe(false);
    expect(published.body.title).toBe("Team feedback");

    const rejected = await request(app)
      .post(`/api/forms/${saved.formId}/submissions`)
      .send({ formRevision: saved.revision, answers });
    expect(rejected.status).toBe(409);
    expect(rejected.body.code).toBe("CLOSED");

    const replayed = await request(app)
      .post(`/api/forms/${saved.formId}/submissions`)
      .set("Idempotency-Key", key)
      .send({ formRevision: saved.revision, answers });
    expect(replayed.status).toBe(200);
    expect(replayed.body.id).toBe(created.body.id);
  });

  it("deletes a form and its responses", async () => {
    const app = createApp(store);
    const saved = await saveForm(app);
    await request(app)
      .post(`/api/forms/${saved.formId}/submissions`)
      .send({ formRevision: saved.revision, answers: answersFor(saved.definition) });

    const deleted = await request(app).delete(`/api/forms/${saved.formId}`);
    expect(deleted.status).toBe(204);

    const missing = await request(app).get(`/api/forms/${saved.formId}`);
    expect(missing.status).toBe(404);

    const responses = await request(app).get(`/api/forms/${saved.formId}/submissions`);
    expect(responses.status).toBe(404);
  });

  it("returns 404 for an unknown form and an unknown response", async () => {
    const app = createApp(store);
    const missingForm = await request(app).get(`/api/forms/${randomUUID()}`);
    expect(missingForm.status).toBe(404);

    const saved = await saveForm(app);
    const missingResponse = await request(app).get(
      `/api/forms/${saved.formId}/submissions/${randomUUID()}`,
    );
    expect(missingResponse.status).toBe(404);
    expect(missingResponse.body.code).toBe("NOT_FOUND");
  });
});

async function saveForm(app: ReturnType<typeof createApp>) {
  const created = await request(app).post("/api/forms").send({});
  const definition = validDefinition();
  const updated = await request(app)
    .put(`/api/forms/${created.body.id as string}`)
    .send({ ...definition, expectedRevision: 1 });
  return {
    formId: created.body.id as string,
    definition,
    revision: updated.body.revision as number,
  };
}

function answersFor(definition: ReturnType<typeof validDefinition>) {
  const shortText = definition.questions[0];
  const select = definition.questions[1];
  const optionId = select.type === "singleSelect" ? select.options[0].id : "";
  return [
    { questionId: shortText.id, type: "shortText" as const, value: "Shipped the feature" },
    { questionId: select.id, type: "singleSelect" as const, value: optionId },
  ];
}
