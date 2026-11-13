import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { OpenAPIHono } from "@hono/zod-openapi";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import type { Nullable } from "@usenullish/nullish-common";
import { envAppUrl } from "@usenullish/nullish-env";
import { MailType, type SendMail } from "@usenullish/nullish-schema/mail";
import type { ApiEnv } from "../../../src/api/types/api";
import { loadDbMiddleware } from "../../../src/api/middlewares/db";
import { loadAuthMiddleware } from "../../../src/api/middlewares/auth";
import { defineAuth } from "../../../src/api/resources/_auth";
import { resetDb } from "../../../../engine/tests/_test-utils";

describe("auth middleware", () => {
  let instance: DbInstance;

  const email = "first@test.local";

  const signUp = async ({ mail }: { mail: Nullable<SendMail> }) => {
    const app = new OpenAPIHono<ApiEnv>();

    app.use("*", loadDbMiddleware({ db: instance }));
    app.use("*", loadAuthMiddleware({ db: instance, mail }));
    app.on(["POST", "GET"], "/auth/*", defineAuth);

    const response = await app.request("/auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: envAppUrl() },
      body: JSON.stringify({ email, password: "password-1234", name: email }),
    });

    return (await response.json()) as { token: Nullable<string> };
  };

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;
  });

  beforeEach(async () => {
    await resetDb(instance.connection);
  });

  afterAll(async () => {
    await resetDb(instance.connection);
    await instance.close();
  });

  describe("with mail", () => {
    test("sends the verify email email on sign-up", async () => {
      const send = mock(async () => {});

      await signUp({ mail: { send } });

      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ type: MailType.VERIFY_EMAIL, to: email }),
      );
    });

    test("does not sign in on sign-up", async () => {
      const { token } = await signUp({ mail: { send: async () => {} } });

      expect(token).toBeNull();
    });
  });

  describe("without mail", () => {
    test("signs in on sign-up outside production", async () => {
      const { token } = await signUp({ mail: null });

      expect(token).toBeString();
    });
  });
});
