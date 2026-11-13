import type { DbInstance } from "@usenullish/nullish-db";
import type { Hono } from "hono";
import type { Nullable, Nullish } from "@usenullish/nullish-common";
import type { Auth as AuthSession } from "@usenullish/nullish-auth/server";
import type { Auth as AuthTypes } from "@usenullish/nullish-schema/auth";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import type { SendMail } from "@usenullish/nullish-schema/mail";
import { Storage } from "@usenullish/nullish-storage";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { LlmMeter } from "@usenullish/nullish-metering";

export type DefineApi = (args: {
  db: DbInstance;
  jobs: TriggerJobs;
  storage: Storage;
  mail: Nullable<SendMail>;
}) => {
  fetch: Hono["fetch"];
};

export type ApiCaller =
  | {
      type: "user";
      userId: AuthSession["$Infer"]["Session"]["user"]["id"];
      user: AuthSession["$Infer"]["Session"]["user"];
      session: AuthSession["$Infer"]["Session"]["session"];
    }
  | {
      type: "api-key";
      userId: AuthSession["$Infer"]["Session"]["user"]["id"];
      permissions: AuthTypes["ApiKeys"]["Permissions"];
    };

export type ApiEnv = {
  Variables: {
    db: { connection: PostgresDbInstance };
    workers: { jobs: TriggerJobs; storage: Storage; mail: Nullable<SendMail> };
    auth: AuthSession;
    caller: Nullish<ApiCaller>;
    llm: { meter: LlmMeter };
  };
};
