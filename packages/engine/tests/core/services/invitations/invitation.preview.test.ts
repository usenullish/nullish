import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { envDbUrl } from "@usenullish/nullish-env";
import { PreviewInvitationService } from "../../../../src/core/services/invitations/invitation.preview";
import { CreateInvitationService } from "../../../../src/core/services/invitations/invitation.create";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../_test-utils";

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
    mail: null,
  }).create();

  if (result.status === "error") {
    throw result.err;
  }

  return result.result.token;
};

const preview = ({ userId = TEST_OTHER_USER_ID, token }: { userId?: string; token: string }) =>
  PreviewInvitationService.create({ db, userId, token }).preview();

const errorMessage = (result: Awaited<ReturnType<typeof preview>>): string =>
  result.status === "error" && result.err instanceof Error && result.err.cause instanceof Error
    ? result.err.cause.message
    : "";

describe("PreviewInvitationService", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("returns the name of the organization to the invited person", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const token = await invite({ organizationId });

    const result = await preview({ token });

    expect(result).toEqual({
      status: "success",
      result: { organizationName: `Org ${TEST_USER_ID}` },
    });
  });

  test("returns an error Result for an unknown token", async () => {
    const result = await preview({ token: "unknown" });

    expect(errorMessage(result)).toContain("This invitation is invalid or has expired");
  });

  test("returns an error Result for an invitation sent to another email", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const token = await invite({ organizationId, email: "someone@test.dev" });

    const result = await preview({ token });

    expect(errorMessage(result)).toContain("This invitation was sent to another email address");
  });
});
