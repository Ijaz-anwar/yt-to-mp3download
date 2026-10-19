/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Custom Next.js Production Startup Server for cPanel (Phusion Passenger) & Node.js Hosting
 *
 * Compatible with:
 * - cPanel "Setup Node.js App" (Phusion Passenger)
 * - Standard Node.js environments (`node server.js` or `npm start`)
 */

// Default to production mode when launched by cPanel Passenger unless explicitly overridden
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const { createServer } = require("http");
const next = require("next");

const dev = process.env.NODE_ENV === "development";
const port = parseInt(process.env.PORT || "3000", 10);
const hostname = process.env.HOSTNAME || process.env.HOST || "0.0.0.0";

console.log(
  JSON.stringify({
    level: "INFO",
    event: "server_initializing",
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    env: process.env.NODE_ENV,
    port,
    cwd: process.cwd(),
  })
);

const app = next({
  dev,
  dir: __dirname,
  hostname,
  port,
});

const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    const server = createServer(async (req, res) => {
      try {
        await handle(req, res);
      } catch (err) {
        console.error(
          JSON.stringify({
            level: "ERROR",
            event: "unhandled_request_error",
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            error: err instanceof Error ? err.message : String(err),
          })
        );
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              success: false,
              error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "An unexpected server error occurred.",
              },
            })
          );
        } else {
          res.end();
        }
      }
    });

    server.on("error", (err) => {
      console.error(
        JSON.stringify({
          level: "ERROR",
          event: "http_server_error",
          timestamp: new Date().toISOString(),
          port,
          error: err instanceof Error ? err.message : String(err),
          code: err && err.code ? err.code : undefined,
        })
      );
      process.exit(1);
    });

    // Under Phusion Passenger, calling server.listen(port) allows Passenger to
    // intercept the listener and bind its internal socket or assigned port cleanly.
    server.listen(port, () => {
      console.log(
        JSON.stringify({
          level: "INFO",
          event: "server_listening",
          timestamp: new Date().toISOString(),
          url: `http://${hostname}:${port}`,
          env: process.env.NODE_ENV,
          passenger: Boolean(process.env.PASSENGER_APP_ENV || process.env.IN_PASSENGER),
        })
      );
    });
  })
  .catch((err) => {
    console.error(
      JSON.stringify({
        level: "FATAL",
        event: "nextjs_prepare_failed",
        timestamp: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
    );
    process.exit(1);
  });
