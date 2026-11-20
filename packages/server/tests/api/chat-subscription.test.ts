import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import {
  DbSchema,
  type PostgresDbInstance,
  SubscriptionStatus,
} from "@usenullish/nullish-schema/db";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import { assertNonNullish } from "@usenullish/nullish-common";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";
import { defineApi } from "../../src/api";
import { createOrganization, resetDb } from "../../../engine/tests/_test-utils";

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const llmReservations = DbSchema.Metering.LlmReservations.LlmReservationsSchema;

const LLM_KEYS = ["NULLISH_LLM_URL", "NULLISH_LLM_CHAT_MODEL", "NULLISH_LLM_API_KEY"] as const;

describe("POST /chat of a locked organization", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;
  let user: { id: string; cookie: string };
  let organizationId: string;

  const saved = new Map<string, string | undefined>();

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;
    db = instance.connection;

    await resetDb(db);

    const auth = createAuth({
      db,
      env: {
        signUp: true,
        emailAndPassword: { autoSignIn: true },
        baseURL: envAuthUrl(),
        secret: envAuthSecret(),
      },
    });

    const { headers, response } = await auth.api.signUpEmail({
      body: {
        email: "chat-subscription@test.local",
        password: "password-1234",
        name: "chat-subscription@test.local",
      },
      returnHeaders: true,
    });

    const [cookie] = (headers.get("set-cookie") ?? "").split(";");
    assertNonNullish(cookie);

    user = { id: response.user.id, cookie };

    organizationId = await createOrganization(db, user.id);

    await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.INACTIVE })
      .where(eq(subscriptions.organizationId, organizationId));
  });

  beforeEach(() => {
    for (const key of LLM_KEYS) {
      saved.set(key, process.env[key]);
    }

    process.env.NULLISH_LLM_URL = "https://llm.example.com/v1";
    process.env.NULLISH_LLM_CHAT_MODEL = "qwen3.5:9b";
    process.env.NULLISH_LLM_API_KEY = "sk-test";
  });

  afterEach(() => {
    for (const key of LLM_KEYS) {
      const value = saved.get(key);

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("is rejected before any tokens are reserved", async () => {
    const { fetch } = defineApi({
      db: instance,
      jobs: {} as TriggerJobs,
      storage: FsStorageProvider.create(),
      mail: null,
      payments: null,
    });

    const response = await fetch(
      new Request("http://localhost/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: user.cookie },
        body: JSON.stringify({
          domain: { type: "organization", organizationId },
          message: "Hello",
        }),
      }),
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "The subscription of this organization is not valid.",
      code: ErrorCode.REJECTED,
    });

    const reservations = await db
      .select()
      .from(llmReservations)
      .where(eq(llmReservations.userId, user.id));

    expect(reservations).toHaveLength(0);
  });
});
