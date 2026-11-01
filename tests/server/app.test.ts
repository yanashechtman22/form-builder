import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/app.js";
import { FormStore } from "../../server/forms/store.js";

describe("HTTP platform", () => {
  it("returns 400 for malformed JSON and keeps a request id", async () => {
    const response = await request(createApp(new FormStore()))
      .post("/api/forms")
      .set("Content-Type", "application/json")
      .set("X-Request-Id", "req-json")
      .send("{");

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("BAD_REQUEST");
    expect(response.body.requestId).toBe("req-json");
    expect(response.headers["x-request-id"]).toBe("req-json");
  });

  it("returns 413 when the JSON body exceeds the limit", async () => {
    const response = await request(createApp(new FormStore(), { jsonLimit: "40b" }))
      .post("/api/forms")
      .send({ title: "x".repeat(200) });

    expect(response.status).toBe(413);
    expect(response.body.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("replaces an unsafe request id and sets no-store plus security headers", async () => {
    const response = await request(createApp(new FormStore()))
      .get("/api/health")
      .set("X-Request-Id", "bad id");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(response.headers["x-request-id"]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("reports readiness separately from liveness", async () => {
    const response = await request(createApp(new FormStore())).get("/api/ready");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("allows only configured origins", async () => {
    const app = createApp(new FormStore(), {
      corsOrigins: ["http://localhost:5173"],
    });

    const allowed = await request(app).get("/api/health").set("Origin", "http://localhost:5173");
    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");

    const denied = await request(app).get("/api/health").set("Origin", "https://evil.example");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("rate limits writes and lets reads through", async () => {
    let now = 1_000_000;
    const app = createApp(new FormStore(), {
      writeRateLimit: { limit: 2, windowMs: 60_000, now: () => now },
    });

    expect((await request(app).post("/api/forms").send({})).status).toBe(201);
    expect((await request(app).get("/api/forms")).status).toBe(200);
    expect((await request(app).post("/api/forms").send({})).status).toBe(201);

    const blocked = await request(app).post("/api/forms").send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe("RATE_LIMITED");
    expect(blocked.headers["retry-after"]).toBe("60");

    now += 60_000;
    expect((await request(app).post("/api/forms").send({})).status).toBe(201);
  });
});
