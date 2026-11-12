import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth } from "@usenullish/nullish-auth/server";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { MailType } from "@usenullish/nullish-schema/mail";
import { resetDb } from "../../../engine/tests/_test-utils";

describe("email verification", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;

  const email = "first@test.local";
  const password = "password-1234";

  const createAuthWithMail = () => {
    const send = mock(async () => {});

    const auth = createAuth({
      db,
      env: {
        signUp: true,
        signIn: { mail: { send } },
        baseURL: envAuthUrl(),
        secret: envAuthSecret(),
      },
    });

    return { auth, send };
  };

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;
    db = instance.connection;
  });

  beforeEach(async () => {
    await resetDb(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("sign-up", () => {
    test("sends the verify email email to the address", async () => {
      const { auth, send } = createAuthWithMail();

      await auth.api.signUpEmail({ body: { email, password, name: email } });

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ type: MailType.VERIFY_EMAIL, to: email }),
      );
    });

    test("does not sign in before the email is verified", async () => {
      const { auth } = createAuthWithMail();

      const { token } = await auth.api.signUpEmail({ body: { email, password, name: email } });

      expect(token).toBeNull();
    });
  });

  describe("sign-in", () => {
    test("rejects a sign-in before the email is verified", async () => {
      const { auth } = createAuthWithMail();

      await auth.api.signUpEmail({ body: { email, password, name: email } });

      await expect(auth.api.signInEmail({ body: { email, password } })).rejects.toThrow(
        /email not verified/i,
      );
    });
  });

  describe("reset password", () => {
    test("sends the reset password email to the address", async () => {
      const { auth, send } = createAuthWithMail();

      await auth.api.signUpEmail({ body: { email, password, name: email } });

      send.mockClear();

      await auth.api.requestPasswordReset({ body: { email } });

      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ type: MailType.RESET_PASSWORD, to: email }),
      );
    });

    test("sends nothing for an unknown address", async () => {
      const { auth, send } = createAuthWithMail();

      await auth.api.requestPasswordReset({ body: { email: "unknown@test.local" } });

      expect(send).not.toHaveBeenCalled();
    });
  });
});
