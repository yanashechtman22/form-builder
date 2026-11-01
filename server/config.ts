import { z } from "zod";

const PortSchema = z.coerce.number().int().min(1).max(65_535);

const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "llama3.2";

export type ServerConfig = {
  port: number;
  trustProxy: boolean;
  corsOrigins: string[];
  ollamaHost: string;
  ollamaModel: string;
};

export function readConfig(env: NodeJS.ProcessEnv): ServerConfig {
  const portInput = env.PORT === undefined || env.PORT.trim() === "" ? "3002" : env.PORT;
  const port = PortSchema.safeParse(portInput);
  if (!port.success) {
    throw new Error(
      "Invalid server configuration: PORT must be an integer from 1 to 65535.",
    );
  }

  return {
    port: port.data,
    trustProxy: readTrustProxy(env.TRUST_PROXY),
    corsOrigins: readCorsOrigins(env.CORS_ORIGINS),
    ollamaHost: readOllamaHost(env.OLLAMA_HOST),
    ollamaModel: readOllamaModel(env.OLLAMA_MODEL),
  };
}

function readTrustProxy(value: string | undefined): boolean {
  if (value === undefined || value.trim() === "") {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "1" || normalized === "true") {
    return true;
  }
  if (normalized === "0" || normalized === "false") {
    return false;
  }
  throw new Error(
    "Invalid server configuration: TRUST_PROXY must be true or false.",
  );
}

function readCorsOrigins(value: string | undefined): string[] {
  if (value === undefined || value.trim() === "") {
    return [];
  }

  return value.split(",").map((part) => {
    const origin = parseOrigin(part.trim());
    if (!origin) {
      throw new Error(
        "Invalid server configuration: CORS_ORIGINS must be a comma-separated list of origins.",
      );
    }
    return origin;
  });
}

function readOllamaHost(value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_OLLAMA_HOST;
  }
  const origin = parseOrigin(value.trim());
  if (!origin) {
    throw new Error(
      "Invalid server configuration: OLLAMA_HOST must be an http or https origin.",
    );
  }
  return origin;
}

function readOllamaModel(value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_OLLAMA_MODEL;
  }
  const model = value.trim();
  if (!/^[\w.:-]{1,128}$/.test(model)) {
    throw new Error(
      "Invalid server configuration: OLLAMA_MODEL must be a model name such as llama3.2.",
    );
  }
  return model;
}

function parseOrigin(value: string): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
}
