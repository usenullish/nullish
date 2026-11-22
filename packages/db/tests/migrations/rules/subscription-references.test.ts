import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  createOrganization,
  organizations,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const references = DbSchema.Subscription.SubscriptionReferences.SubscriptionReferencesSchema;

const asUser = <T>(
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_USER_ID})`);
    return await fn(tx);
  });

const subscriptionIdOf = async (organizationId: string): Promise<string> => {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId));
  assertNonNullish(subscription);

  return subscription.id;
};

const referenceOf = ({
  subscriptionId,
  provider = SubscriptionProvider.STRIPE,
  externalSubscriptionId = `sub_${crypto.randomUUID()}`,
}: {
  subscriptionId: string;
  provider?: SubscriptionProvider;
  externalSubscriptionId?: string;
}) => ({
  subscriptionId,
  provider,
  externalCustomerId: `cus_${crypto.randomUUID()}`,
  externalSubscriptionId,
});

describe("subscription references", () => {
  let organizationId: string;
  let subscriptionId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    subscriptionId = await subscriptionIdOf(organizationId);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("rejects a member reading the references", async () => {
    await db.insert(references).values(referenceOf({ subscriptionId }));

    const error = await asUser((tx) => tx.select().from(references)).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("permission denied");
  });

  test("rejects a member writing a reference", async () => {
    const error = await asUser((tx) =>
      tx.insert(references).values(referenceOf({ subscriptionId })),
    ).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("permission denied");
  });

  test("rejects a reference of a self provider", async () => {
    const error = await db
      .insert(references)
      .values(referenceOf({ subscriptionId, provider: SubscriptionProvider.SELF }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscription_references_provider_third_party");
  });

  test("rejects a reference of a custom provider", async () => {
    const error = await db
      .insert(references)
      .values(referenceOf({ subscriptionId, provider: SubscriptionProvider.CUSTOM }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscription_references_provider_third_party");
  });

  test("rejects a second reference for a subscription", async () => {
    await db.insert(references).values(referenceOf({ subscriptionId }));

    const error = await db
      .insert(references)
      .values(referenceOf({ subscriptionId }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("subscription_references_subscription_uidx");
  });

  test("rejects the same external subscription of a provider twice", async () => {
    const externalSubscriptionId = `sub_${crypto.randomUUID()}`;
    const otherSubscriptionId = await subscriptionIdOf(await createOrganization(db));

    await db.insert(references).values(referenceOf({ subscriptionId, externalSubscriptionId }));

    const error = await db
      .insert(references)
      .values(referenceOf({ subscriptionId: otherSubscriptionId, externalSubscriptionId }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "subscription_references_provider_external_subscription_uidx",
    );
  });

  test("deletes the reference with its organization", async () => {
    await db.insert(references).values(referenceOf({ subscriptionId }));

    await db
      .update(organizations)
      .set({ deletedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000) })
      .where(eq(organizations.id, organizationId));
    await db.delete(organizations).where(eq(organizations.id, organizationId));

    const rows = await db
      .select()
      .from(references)
      .where(eq(references.subscriptionId, subscriptionId));

    expect(rows).toHaveLength(0);
  });
});
