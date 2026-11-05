import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { CryptoHasher } from "bun";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { SignUpService } from "../../src/auth/services/sign-up";
import { createOrganization, openTestDb, resetDb, seedUsers, TEST_USER_ID } from "../_test-utils";

const invitations = DbSchema.Core.Invitations.InvitationsSchema;

const instance = await openTestDb();
const db = instance.connection;

const invite = async ({
  email,
  expiresAt,
}: {
  email: string;
  expiresAt?: Date;
}): Promise<string> => {
  const token = crypto.randomUUID();
  const organizationId = await createOrganization(db, TEST_USER_ID);

  await db.insert(invitations).values({
    organizationId,
    email,
    role: "reviewer",
    tokenHash: new CryptoHasher("sha256").update(token).digest("hex"),
    expiresAt,
  });

  return token;
};

describe("SignUpService", () => {
  beforeEach(async () => {
    await resetDb(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("hasUsers", () => {
    test("returns false when no user exists", async () => {
      const result = await SignUpService.create({ db }).hasUsers();

      expect(result).toEqual({ status: "success", result: false });
    });

    test("returns true when a user exists", async () => {
      await seedUsers(db);

      const result = await SignUpService.create({ db }).hasUsers();

      expect(result).toEqual({ status: "success", result: true });
    });
  });

  describe("isInvitationValid", () => {
    beforeEach(async () => {
      await seedUsers(db);
    });

    test("returns true for the token and the email of a pending invitation", async () => {
      const token = await invite({ email: "invited@test.dev" });

      const result = await SignUpService.create({ db }).isInvitationValid({
        token,
        email: "invited@test.dev",
      });

      expect(result).toEqual({ status: "success", result: true });
    });

    test("matches the email whatever its case", async () => {
      const token = await invite({ email: "Invited@Test.dev" });

      const result = await SignUpService.create({ db }).isInvitationValid({
        token,
        email: "invited@test.dev",
      });

      expect(result).toEqual({ status: "success", result: true });
    });

    test("returns false for another token", async () => {
      await invite({ email: "invited@test.dev" });

      const result = await SignUpService.create({ db }).isInvitationValid({
        token: crypto.randomUUID(),
        email: "invited@test.dev",
      });

      expect(result).toEqual({ status: "success", result: false });
    });

    test("returns false for another email", async () => {
      const token = await invite({ email: "invited@test.dev" });

      const result = await SignUpService.create({ db }).isInvitationValid({
        token,
        email: "someone@test.dev",
      });

      expect(result).toEqual({ status: "success", result: false });
    });

    test("returns false for an expired invitation", async () => {
      const token = await invite({
        email: "expired@test.dev",
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = await SignUpService.create({ db }).isInvitationValid({
        token,
        email: "expired@test.dev",
      });

      expect(result).toEqual({ status: "success", result: false });
    });
  });
});
