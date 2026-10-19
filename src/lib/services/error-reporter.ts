import { logger, sanitizeErrorMessage } from "./error-handler";

let shutdownInitialized = false;

/**
 * Registers process lifecycle event listeners for graceful worker shutdown (SIGTERM / SIGINT).
 * Terminates all running FFmpeg child processes safely before the process exits.
 */
export function setupGracefulShutdown(): void {
  if (shutdownInitialized) return;
  shutdownInitialized = true;

  // Schedule periodic cleanup of expired temporary media files and job records
  const intervalMinutes =
    parseInt(process.env.MEDIA_CLEANUP_INTERVAL_MINUTES || "", 10) || 15;
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

  const cleanupTimer = setInterval(async () => {
    try {
      const { runRetentionCleanup } = await import("./job-manager");
      await runRetentionCleanup(true);
    } catch {
      // Ignore background cleanup errors
    }
  }, intervalMs);

  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }

  const handleTermination = async (signal: string) => {
    logger.info("server_shutdown_signal_received", { signal });
    try {
      const { shutdownActiveJobs } = await import("./job-manager");
      const cancelledCount = await shutdownActiveJobs();
      logger.info("active_jobs_shutdown_complete", { signal, cancelledCount });
    } catch (err) {
      logger.error("error_during_worker_shutdown", err, { signal });
    }
  };

  process.on("SIGTERM", () => {
    handleTermination("SIGTERM").finally(() => {
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    handleTermination("SIGINT").finally(() => {
      process.exit(0);
    });
  });
}

/**
 * Centralized production server error reporter (integrates with Next.js onRequestError).
 * Strips sensitive query tokens, filesystem paths, and payload details.
 */
export function reportServerError(
  err: { digest?: string } & Error,
  request: {
    path: string;
    method: string;
    headers?: Record<string, string>;
  },
  context?: Record<string, unknown>
): void {
  const sanitizedMessage = sanitizeErrorMessage(err?.message || "Unknown server error");

  logger.error("server_request_unhandled_error", err, {
    digest: err.digest,
    path: request.path,
    method: request.method,
    sanitizedMessage,
    routeType: context?.routeType,
  });

  // If a production error webhook / monitoring endpoint is configured, dispatch asynchronously
  const webhookUrl = process.env.ERROR_MONITORING_WEBHOOK_URL;
  if (webhookUrl && /^https?:\/\//.test(webhookUrl)) {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level: "ERROR",
        timestamp: new Date().toISOString(),
        digest: err.digest,
        path: request.path,
        method: request.method,
        message: sanitizedMessage,
      }),
    }).catch(() => {
      // Ignore background telemetry reporting failures
    });
  }
}
