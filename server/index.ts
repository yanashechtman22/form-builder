import { createApp } from "./app.js";
import { readConfig } from "./config.js";
import { createOllamaFormGenerator } from "./forms/generate-form.js";
import { formStore } from "./forms/store.js";

const SHUTDOWN_TIMEOUT_MS = 10_000;

function loadConfig(): ReturnType<typeof readConfig> {
  try {
    return readConfig(process.env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid server configuration.");
    process.exit(1);
  }
}

const config = loadConfig();

const port = config.port;
const app = createApp(formStore, {
  trustProxy: config.trustProxy,
  corsOrigins: config.corsOrigins,
  generateForm: createOllamaFormGenerator({
    host: config.ollamaHost,
    model: config.ollamaModel,
  }),
});

const server = app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${port} is already in use. Stop the other process or set PORT to a free port.`,
    );
  } else {
    console.error(
      JSON.stringify({
        msg: "server failed",
        code: error.code,
        message: error.message,
      }),
    );
  }
  process.exit(1);
});

let closing = false;

function shutdown(signal: string): void {
  if (closing) {
    return;
  }
  closing = true;
  console.log(JSON.stringify({ msg: "shutting down", signal }));
  const forceExit = setTimeout(() => {
    server.closeAllConnections();
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();
  server.close((closeError) => {
    clearTimeout(forceExit);
    if (closeError) {
      console.error(
        JSON.stringify({
          msg: "shutdown failed",
          message: closeError.message,
        }),
      );
      process.exit(1);
    }
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
