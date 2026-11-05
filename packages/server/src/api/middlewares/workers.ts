import { createMiddleware } from "hono/factory";
import type { ApiEnv } from "../types/api";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import { Storage } from "@usenullish/nullish-storage";

export const loadWorkersMiddleware = ({ jobs, storage }: { jobs: TriggerJobs; storage: Storage }) =>
  createMiddleware<ApiEnv>(async (context, next) => {
    context.set("workers", { jobs, storage });
    await next();
  });
