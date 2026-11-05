import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL, CryptoHasher } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createOrganization,
  memberships,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const invitations = DbSchema.Core.Invitations.InvitationsSchema;

const INVITEE_EMAIL = `${TEST_OTHER_USER_ID}@test.dev`;

const hashOf = (token: string): string => new CryptoHasher("sha256").update(token).digest("hex");

const insertInvitation = async ({
  organizationId,
  email = INVITEE_EMAIL,
  expiresAt,
}: {
  organizationId: string;
  email?: string;
  expiresAt?: Date;
}): Promise<{ id: string; token: string }> => {
  const token = crypto.randomUUID();

  const [row] = await db
    .insert(invitations)
    .values({ organizationId, email, role: "accountant", tokenHash: hashOf(token), expiresAt })
    .returning();
  assertNonNullish(row);

  return { id: row.id, token };
};

const getAs = ({ userId, token }: { userId?: string; token: string }) =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);

    if (userId !== undefined) {
      await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    }

    return await tx.execute<{ organization_name: string }>(
      sql`SELECT * FROM core.get_invitation(${token})`,
    );
  });

const invitationExists = async (id: string): Promise<boolean> => {
  const rows = await db.select().from(invitations).where(eq(invitations.id, id));
  return rows.length === 1;
};

describe("get_invitation", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
  });

  test("returns the name of the organization to the invited person", async () => {
    const { token } = await insertInvitation({ organizationId });

    const rows = await getAs({ userId: TEST_OTHER_USER_ID, token });

    expect(rows).toEqual([{ organization_name: `Org ${TEST_USER_ID}` }]);
  });

  test("leaves the invitation pending", async () => {
    const { id, token } = await insertInvitation({ organizationId });

    await getAs({ userId: TEST_OTHER_USER_ID, token });

    expect(await invitationExists(id)).toBeTrue();
  });

  test("matches the email whatever its case", async () => {
    const { token } = await insertInvitation({
      organizationId,
      email: INVITEE_EMAIL.toUpperCase(),
    });

    const rows = await getAs({ userId: TEST_OTHER_USER_ID, token });

    expect(rows).toHaveLength(1);
  });

  test("rejects an unknown token", async () => {
    const error = await getAs({ userId: TEST_OTHER_USER_ID, token: crypto.randomUUID() }).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("This invitation is invalid or has expired");
  });

  test("rejects an expired invitation", async () => {
    const { token } = await insertInvitation({
      organizationId,
      expiresAt: new Date(Date.now() - 1000),
    });

    const error = await getAs({ userId: TEST_OTHER_USER_ID, token }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("This invitation is invalid or has expired");
  });

  test("rejects an invitation sent to another email", async () => {
    const { token } = await insertInvitation({ organizationId, email: "someone@test.dev" });

    const error = await getAs({ userId: TEST_OTHER_USER_ID, token }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("This invitation was sent to another email address");
  });

  test("rejects a person who is already a member", async () => {
    await db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: "reviewer" });
    const { token } = await insertInvitation({ organizationId });

    const error = await getAs({ userId: TEST_OTHER_USER_ID, token }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("You are already a member of this organization");
  });

  test("rejects a caller who is not signed in", async () => {
    const { token } = await insertInvitation({ organizationId });

    const error = await getAs({ token }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("Sign in to access the invitation");
  });
});
