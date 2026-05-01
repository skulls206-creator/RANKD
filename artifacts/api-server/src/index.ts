import app from "./app";
import { logger } from "./lib/logger";
import { startChartCacheWarmup, startGitHubCacheRefresh, startNodeCountRefresh } from "./routes/fairlaunch";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const refreshLogger = {
  info: (msg: string) => logger.info(msg),
  error: (msg: string) => logger.error(msg),
};

// Bind the port first so the server is reachable within milliseconds of startup.
// The GitHub cache refresh (~50s) runs in the background after we are listening.
// On restart the start script kills any lingering process on this port, but if
// it is still occupied we retry up to 5 times with exponential back-off before
// giving up.
function listenWithRetry(attemptsLeft: number, delayMs: number): void {
  const server = app.listen(port, () => {
    logger.info({ port }, "Server listening");
    startNodeCountRefresh(refreshLogger);
    void startGitHubCacheRefresh(refreshLogger);
    void startChartCacheWarmup(refreshLogger);
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE" && attemptsLeft > 1) {
      logger.warn(
        { port, attemptsLeft: attemptsLeft - 1 },
        "Port in use, retrying after delay…",
      );
      setTimeout(() => listenWithRetry(attemptsLeft - 1, delayMs * 2), delayMs);
    } else {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
  });
}

listenWithRetry(5, 300);
