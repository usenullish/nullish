import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { createOrganization, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const claims = DbSchema.Subscription.Claims.ClaimsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const logsOf = (recordId: string) =>
  db.execute<{
    table_schema: string;
    table_name: string;
    organization_id: string;
    operation: string;
  }>(
    sql`SELECT table_schema, table_name, organization_id, operation FROM audit.logs WHERE record_id = ${recordId} ORDER BY logged_at`,
  );

describe("audit.logs of subscription.subscriptions", () => {
  let organizationId: string;
  let claimId: string;
  let subscriptionId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db);

    const [claim] = await db.insert(claims).values({}).returning();
    assertNonNullish(claim);
    claimId = claim.id;

    const [subscription] = await db
      .insert(subscriptions)
      .values({ organizationId, claimId, status: SubscriptionStatus.ACTIVE })
      .returning();
    assertNonNullish(subscription);
    subscriptionId = subscription.id;
  });

  afterAll(async () => {
    await resetDb(db);
    await db.delete(claims).where(eq(claims.id, claimId));
    await client.close();
  });

  test("records the creation of a subscription", async () => {
    const [log] = await logsOf(subscriptionId);

    expect(log?.table_schema).toBe("subscription");
    expect(log?.table_name).toBe("subscriptions");
    expect(log?.organization_id).toBe(organizationId);
    expect(log?.operation).toBe("insert");
  });

  test("records a change of status", async () => {
    await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.PAST_DUE })
      .where(eq(subscriptions.id, subscriptionId));

    const logs = await logsOf(subscriptionId);

    expect(logs.at(-1)?.operation).toBe("update");
  });
});
