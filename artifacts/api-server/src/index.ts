import app from "./app";
import { logger } from "./lib/logger";
import { startGitHubCacheRefresh } from "./routes/fairlaunch";

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

// Bind the port FIRST so the server is reachable within milliseconds of startup.
// The GitHub cache refresh takes ~50s on first run — if we awaited it before
// listen() the old process would still own port 8080 when we finally try to bind,
// causing EADDRINUSE on every rapid restart (e.g. back-to-back task merges).
const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");

  // Start the GitHub release cache refresh in the background AFTER we are
  // already bound and serving. The coins endpoint works fine with empty GitHub
  // cache — it just won't show version/release data for the first ~50s.
  void startGitHubCacheRefresh(refreshLogger);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});
