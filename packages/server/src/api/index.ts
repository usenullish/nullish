import type { ApiEnv, DefineApi } from "./types/api";
import { loadDbMiddleware } from "./middlewares/db";
import { defineHealth, healthRoute } from "./resources/_health";
import { defineSettings, settingsRoute } from "./resources/_settings";
import { loadAuthMiddleware } from "./middlewares/auth";
import { defineAuth } from "./resources/_auth";
import { loadCallerMiddleware } from "./middlewares/caller";
import { initResources } from "./resources";
import { OpenAPIHono } from "@hono/zod-openapi";
import { secureHeaders } from "hono/secure-headers";
import { name as title } from "../../package.json";
import { version } from "../../../../package.json";
import { swaggerUI } from "@hono/swagger-ui";
import { loadWorkersMiddleware } from "./middlewares/workers";
import { defineMcp } from "./resources/_mcp";
import { initWebhooks } from "./webhooks";
import { llmUsageLimitMiddleware } from "./middlewares/llm-usage";
import { assertLlmEnabledMiddleware } from "./middlewares/llm-enabled";
import { assertLlmSubscriptionMiddleware } from "./middlewares/llm-subscription";
import { RATE_LIMITS, userRateLimitMiddleware } from "./middlewares/rate-limit";
import { noRobotsMiddleware } from "./middlewares/robots";

export const defineApi: DefineApi = ({ db, jobs, storage, mail, payments }) => {
  const app = new OpenAPIHono<ApiEnv>();

  const resources = initResources({ app });
  const webhooks = initWebhooks({ app });

  app.use("*", secureHeaders({ strictTransportSecurity: "max-age=31536000; includeSubDomains" }));
  app.use("*", noRobotsMiddleware);
  app.use("*", loadDbMiddleware({ db }));
  app.use("*", loadAuthMiddleware({ db, mail }));
  app.use("*", loadWorkersMiddleware({ jobs, storage, mail, payments }));
  app.use("*", loadCallerMiddleware());
  app.use("*", userRateLimitMiddleware({ limit: RATE_LIMITS.api }));

  resources.forEach((resource) => resource.useAssertAuthSessionMiddleware());
  resources.forEach((resource) => resource.useCustomMiddleware());

  app.on(
    "POST",
    "/chat",
    assertLlmEnabledMiddleware,
    assertLlmSubscriptionMiddleware,
    llmUsageLimitMiddleware,
  );

  app.on(["POST", "GET"], "/auth/*", defineAuth);

  app.all("/mcp", defineMcp);

  resources.forEach((resource) => resource.register());

  webhooks.forEach((webhook) => webhook.register());

  app.openapi(settingsRoute, defineSettings({ mail, payments }));
  app.openapi(healthRoute, defineHealth);

  app.openAPIRegistry.registerComponent("securitySchemes", "ApiKey", {
    type: "http",
    scheme: "bearer",
    description: "An API key with the REST API permission, created in the user settings.",
  });

  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      version,
      title,
    },
    security: [{ ApiKey: [] }],
  });

  app.get("/swagger", swaggerUI({ url: "/doc" }));

  return {
    fetch: app.fetch,
  };
};
