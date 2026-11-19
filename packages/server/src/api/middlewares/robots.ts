import { createMiddleware } from "hono/factory";
import type { ApiEnv } from "../types/api";

export const noRobotsMiddleware = createMiddleware<ApiEnv>(async (context, next) => {
  await next();
  context.header("X-Robots-Tag", "noindex, nofollow");
});
