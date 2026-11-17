import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL, CryptoHasher } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const invitations = DbSchema.Core.Invitations.InvitationsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

describe("find_invitation of a locked organization", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("rejects accepting an invitation to a locked organization", async () => {
    const organizationId = await createOrganization(db);
    const token = crypto.randomUUID();

    await db.insert(invitations).values({
      organizationId,
      email: `${TEST_OTHER_USER_ID}@test.dev`,
      role: "accountant",
      tokenHash: new CryptoHasher("sha256").update(token).digest("hex"),
    });

    await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.INACTIVE })
      .where(eq(subscriptions.organizationId, organizationId));

    const error = await db
      .transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
        await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_OTHER_USER_ID})`);
        return await tx.execute(sql`SELECT * FROM core.accept_invitation(${token})`);
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("This invitation is invalid or has expired");
  });
});
