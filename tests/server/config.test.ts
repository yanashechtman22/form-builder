import { describe, expect, it } from "vitest";
import { readConfig } from "../../server/config.js";

describe("readConfig", () => {
  it("defaults the port and leaves CORS closed", () => {
    expect(readConfig({})).toEqual({
      port: 3002,
      trustProxy: false,
      corsOrigins: [],
      ollamaHost: "http://127.0.0.1:11434",
      ollamaModel: "llama3.2",
    });
  });

  it("reads a port, trust proxy, and origin list", () => {
    expect(
      readConfig({
        PORT: "8080",
        TRUST_PROXY: "true",
        CORS_ORIGINS: "http://localhost:5173, https://forms.example",
        OLLAMA_HOST: "http://127.0.0.1:11434",
        OLLAMA_MODEL: "qwen2.5:7b",
      }),
    ).toEqual({
      port: 8080,
      trustProxy: true,
      corsOrigins: ["http://localhost:5173", "https://forms.example"],
      ollamaHost: "http://127.0.0.1:11434",
      ollamaModel: "qwen2.5:7b",
    });
  });

  it("rejects a port and an origin that are not usable", () => {
    expect(() => readConfig({ PORT: "0" })).toThrow(/PORT/);
    expect(() => readConfig({ PORT: "nope" })).toThrow(/PORT/);
    expect(() => readConfig({ TRUST_PROXY: "yes" })).toThrow(/TRUST_PROXY/);
    expect(() => readConfig({ CORS_ORIGINS: "localhost:5173" })).toThrow(/CORS_ORIGINS/);
    expect(() => readConfig({ OLLAMA_HOST: "localhost:11434" })).toThrow(/OLLAMA_HOST/);
    expect(() => readConfig({ OLLAMA_MODEL: "has spaces" })).toThrow(/OLLAMA_MODEL/);
  });
});
