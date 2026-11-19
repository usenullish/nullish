import { createMiddleware } from "hono/factory";
import type { ApiEnv } from "../types/api";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import { Storage } from "@usenullish/nullish-storage";
import type { SendMail } from "@usenullish/nullish-schema/mail";
import type { ProcessPayments } from "@usenullish/nullish-schema/payments";
import type { Nullable } from "@usenullish/nullish-common";

export const loadWorkersMiddleware = ({
  jobs,
  storage,
  mail,
  payments,
}: {
  jobs: TriggerJobs;
  storage: Storage;
  mail: Nullable<SendMail>;
  payments: Nullable<ProcessPayments>;
}) =>
  createMiddleware<ApiEnv>(async (context, next) => {
    context.set("workers", { jobs, storage, mail, payments });
    await next();
  });
