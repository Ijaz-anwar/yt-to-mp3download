export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { setupGracefulShutdown } = await import("./lib/services/error-reporter");
    setupGracefulShutdown();
  }
}

export async function onRequestError(
  err: { digest?: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: "Pages Router" | "App Router";
    routePath: string;
    routeType: "render" | "route" | "action" | "middleware";
    renderSource?: "react-server-components" | "server-rendering";
    revalidateReason?: "on-demand" | "stale";
    renderType?: "dynamic" | "dynamic-resume";
  }
) {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { reportServerError } = await import("./lib/services/error-reporter");
    reportServerError(err, request, context);
  }
}
