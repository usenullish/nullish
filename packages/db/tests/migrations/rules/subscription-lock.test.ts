import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import {
  causeMessage,
  clients,
  createClient,
  createOrganization,
  organizations,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const DAY_MS = 24 * 60 * 60 * 1000;

const asUser = <T>(
  fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
): Promise<T> =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_USER_ID})`);
    return await fn(tx);
  });

describe("subscription lock", () => {
  let organizationId: string;

  const setSubscription = ({
    status,
    periodEnd,
  }: {
    status: SubscriptionStatus;
    periodEnd: Date | null;
  }) =>
    db
      .update(subscriptions)
      .set({ status, periodEnd })
      .where(eq(subscriptions.organizationId, organizationId));

  const visibleClients = () =>
    asUser((tx) => tx.select().from(clients).where(eq(clients.organizationId, organizationId)));

  const insertClient = () =>
    asUser((tx) => tx.insert(clients).values({ organizationId, name: "New client" }));

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
    await createClient(db, organizationId);
  });

  test("allows an active subscription without end", async () => {
    expect(await visibleClients()).toHaveLength(1);
    expect(await insertClient()).toBeDefined();
  });

  test("allows an active subscription before its end", async () => {
    await setSubscription({
      status: SubscriptionStatus.ACTIVE,
      periodEnd: new Date(Date.now() + DAY_MS),
    });

    expect(await visibleClients()).toHaveLength(1);
  });

  test("locks an active subscription after its end", async () => {
    await setSubscription({
      status: SubscriptionStatus.ACTIVE,
      periodEnd: new Date(Date.now() - DAY_MS),
    });

    expect(await visibleClients()).toHaveLength(0);

    const error = await insertClient().catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("row-level security");
  });

  test("allows a past due subscription within the grace period", async () => {
    await setSubscription({
      status: SubscriptionStatus.PAST_DUE,
      periodEnd: new Date(Date.now() - 3 * DAY_MS),
    });

    expect(await visibleClients()).toHaveLength(1);
  });

  test("locks a past due subscription after the grace period", async () => {
    await setSubscription({
      status: SubscriptionStatus.PAST_DUE,
      periodEnd: new Date(Date.now() - 8 * DAY_MS),
    });

    expect(await visibleClients()).toHaveLength(0);
  });

  test("locks an inactive subscription", async () => {
    await setSubscription({ status: SubscriptionStatus.INACTIVE, periodEnd: null });

    expect(await visibleClients()).toHaveLength(0);

    const error = await insertClient().catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("row-level security");
  });

  test("keeps a locked organization and its subscription readable", async () => {
    await setSubscription({ status: SubscriptionStatus.INACTIVE, periodEnd: null });

    const visibleOrganizations = await asUser((tx) =>
      tx.select().from(organizations).where(eq(organizations.id, organizationId)),
    );
    const visibleSubscriptions = await asUser((tx) =>
      tx.select().from(subscriptions).where(eq(subscriptions.organizationId, organizationId)),
    );

    expect(visibleOrganizations).toHaveLength(1);
    expect(visibleSubscriptions).toHaveLength(1);
  });
});
