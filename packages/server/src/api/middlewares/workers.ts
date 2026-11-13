import { createMiddleware } from "hono/factory";
import type { ApiEnv } from "../types/api";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import { Storage } from "@usenullish/nullish-storage";
import type { SendMail } from "@usenullish/nullish-schema/mail";
import type { Nullable } from "@usenullish/nullish-common";

export const loadWorkersMiddleware = ({
  jobs,
  storage,
  mail,
}: {
  jobs: TriggerJobs;
  storage: Storage;
  mail: Nullable<SendMail>;
}) =>
  createMiddleware<ApiEnv>(async (context, next) => {
    context.set("workers", { jobs, storage, mail });
    await next();
  });
