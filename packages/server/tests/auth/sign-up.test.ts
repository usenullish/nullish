import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import { createAuth, INVITATION_TOKEN_HEADER } from "@usenullish/nullish-auth/server";
import { nonNullish } from "@usenullish/nullish-common";
import { CreateInvitationService } from "@usenullish/nullish-engine/core";
import { DefaultTemplateLanguage, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { createOrganization, resetDb } from "../../../engine/tests/_test-utils";
import { envAuthSecret, envAuthUrl } from "@usenullish/nullish-env";

describe("sign-up", () => {
  let instance: DbInstance;
  let db: PostgresDbInstance;

  const signUp = ({
    mode,
    email,
    invitationToken,
  }: {
    mode: boolean | "invite_only";
    email: string;
    invitationToken?: string;
  }) =>
    createAuth({
      db,
      env: {
        signUp: mode,
        emailAndPassword: { autoSignIn: true },
        baseURL: envAuthUrl(),
        secret: envAuthSecret(),
      },
    }).api.signUpEmail({
      body: { email, password: "password-1234", name: email },
      headers: new Headers(
        nonNullish(invitationToken) ? { [INVITATION_TOKEN_HEADER]: invitationToken } : {},
      ),
    });

  const seedAdmin = async (): Promise<string> => {
    const { user } = await signUp({ mode: true, email: "admin@test.local" });
    return user.id;
  };

  const invite = async ({ email }: { email: string }): Promise<string> => {
    const userId = await seedAdmin();
    const organizationId = await createOrganization(db, userId);

    const result = await CreateInvitationService.create({
      db,
      userId,
      organizationId,
      mail: null,
    }).create({ invitation: { email, role: "reviewer" }, language: DefaultTemplateLanguage.EN });

    if (result.status === "error") {
      throw result.err;
    }

    return result.result.token;
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

  describe.each([true, false, "invite_only"] as const)("with %p", (mode) => {
    test("lets the first user sign up", async () => {
      const { user } = await signUp({ mode, email: "first@test.local" });

      expect(user.email).toBe("first@test.local");
    });
  });

  describe("when enabled", () => {
    test("lets anyone sign up", async () => {
      await seedAdmin();

      const { user } = await signUp({ mode: true, email: "anyone@test.local" });

      expect(user.email).toBe("anyone@test.local");
    });
  });

  describe("when disabled", () => {
    test("rejects a sign-up", async () => {
      await seedAdmin();

      await expect(signUp({ mode: false, email: "stranger@test.local" })).rejects.toThrow(
        "sign_up_disabled",
      );
    });

    test("rejects a sign-up with a valid invitation", async () => {
      const invitationToken = await invite({ email: "invited@test.local" });

      await expect(
        signUp({ mode: false, email: "invited@test.local", invitationToken }),
      ).rejects.toThrow("sign_up_disabled");
    });
  });

  describe("when invite only", () => {
    test("lets an invited person sign up with the token", async () => {
      const invitationToken = await invite({ email: "invited@test.local" });

      const { user } = await signUp({
        mode: "invite_only",
        email: "invited@test.local",
        invitationToken,
      });

      expect(user.email).toBe("invited@test.local");
    });

    test("rejects a sign-up without token", async () => {
      await invite({ email: "invited@test.local" });

      await expect(signUp({ mode: "invite_only", email: "invited@test.local" })).rejects.toThrow(
        "sign_up_invitation_only",
      );
    });

    test("rejects a sign-up with an unknown token", async () => {
      await invite({ email: "invited@test.local" });

      await expect(
        signUp({ mode: "invite_only", email: "invited@test.local", invitationToken: "unknown" }),
      ).rejects.toThrow("sign_up_invitation_only");
    });

    test("rejects the token of an invitation sent to another email", async () => {
      const invitationToken = await invite({ email: "invited@test.local" });

      await expect(
        signUp({ mode: "invite_only", email: "someone@test.local", invitationToken }),
      ).rejects.toThrow("sign_up_invitation_only");
    });
  });
});
