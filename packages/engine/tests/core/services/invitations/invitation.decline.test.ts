import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DeclineInvitationService } from "../../../../src/core/services/invitations/invitation.decline";
import { CreateInvitationService } from "../../../../src/core/services/invitations/invitation.create";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../_test-utils";

const invitations = DbSchema.Core.Invitations.InvitationsSchema;
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
}): Promise<{ id: string; token: string }> => {
  const result = await CreateInvitationService.create({
    db,
    userId: TEST_USER_ID,
    organizationId,
    values: { email, role: "reviewer" },
    mail: null,
  }).create();

  if (result.status === "error") {
    throw result.err;
  }

  return { id: result.result.invitation.id, token: result.result.token };
};

const decline = ({ userId = TEST_OTHER_USER_ID, token }: { userId?: string; token: string }) =>
  DeclineInvitationService.create({ db, userId, token }).decline();

const errorMessage = (result: Awaited<ReturnType<typeof decline>>): string =>
  result.status === "error" && result.err instanceof Error && result.err.cause instanceof Error
    ? result.err.cause.message
    : "";

const invitationExists = async (id: string): Promise<boolean> => {
  const rows = await db.select().from(invitations).where(eq(invitations.id, id));
  return rows.length === 1;
};

describe("DeclineInvitationService", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("deletes the invitation without adding the person to the organization", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const { id, token } = await invite({ organizationId });

    const result = await decline({ token });

    expect(result).toEqual({ status: "success", result: undefined });
    expect(await invitationExists(id)).toBeFalse();

    const rows = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, organizationId),
          eq(memberships.userId, TEST_OTHER_USER_ID),
        ),
      );

    expect(rows).toEqual([]);
  });

  test("returns an error Result for an unknown token", async () => {
    const result = await decline({ token: "unknown" });

    expect(errorMessage(result)).toContain("This invitation is invalid or has expired");
  });

  test("returns an error Result for an invitation sent to another email and keeps it", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const { id, token } = await invite({ organizationId, email: "someone@test.dev" });

    const result = await decline({ token });

    expect(errorMessage(result)).toContain("This invitation was sent to another email address");
    expect(await invitationExists(id)).toBeTrue();
  });
});
