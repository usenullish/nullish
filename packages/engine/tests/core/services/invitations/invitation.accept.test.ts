import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { AcceptInvitationService } from "../../../../src/core/services/invitations/invitation.accept";
import { CreateInvitationService } from "../../../../src/core/services/invitations/invitation.create";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../_test-utils";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;

const INVITEE_EMAIL = `${TEST_OTHER_USER_ID}@test.dev`;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const invite = async ({
  organizationId,
  email = INVITEE_EMAIL,
}: {
  organizationId: string;
  email?: string;
}): Promise<string> => {
  const result = await CreateInvitationService.create({
    db,
    userId: TEST_USER_ID,
    organizationId,
    values: { email, role: "reviewer" },
  }).create();

  if (result.status === "error") {
    throw result.err;
  }

  return result.result.token;
};

const accept = ({ userId = TEST_OTHER_USER_ID, token }: { userId?: string; token: string }) =>
  AcceptInvitationService.create({ db, userId, token }).accept();

const errorMessage = (result: Awaited<ReturnType<typeof accept>>): string =>
  result.status === "error" && result.err instanceof Error && result.err.cause instanceof Error
    ? result.err.cause.message
    : "";

describe("AcceptInvitationService", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("adds the invited person to the organization and returns the membership", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const token = await invite({ organizationId });

    const result = await accept({ token });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.organizationId).toBe(organizationId);
    expect(result.result.role).toBe("reviewer");

    const [row] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, organizationId),
          eq(memberships.userId, TEST_OTHER_USER_ID),
        ),
      );

    expect(row?.id).toBe(result.result.id);
  });

  test("returns an error Result when the invitation was already used", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const token = await invite({ organizationId });
    await accept({ token });

    const result = await accept({ token });

    expect(errorMessage(result)).toContain("This invitation is invalid or has expired");
  });

  test("returns an error Result for an unknown token", async () => {
    const result = await accept({ token: "unknown" });

    expect(errorMessage(result)).toContain("This invitation is invalid or has expired");
  });

  test("returns an error Result for an invitation sent to another email", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const token = await invite({ organizationId, email: "someone@test.dev" });

    const result = await accept({ token });

    expect(errorMessage(result)).toContain("This invitation was sent to another email address");
  });

  test("returns an error Result for a person who is already a member", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const token = await invite({ organizationId, email: `${TEST_USER_ID}@test.dev` });

    const result = await accept({ userId: TEST_USER_ID, token });

    expect(errorMessage(result)).toContain("You are already a member of this organization");
  });
});
