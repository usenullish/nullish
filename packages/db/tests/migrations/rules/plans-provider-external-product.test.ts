import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { causeMessage, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const plans = DbSchema.Subscription.Plans.PlansSchema;

describe("plans provider and external product", () => {
  const planIds: string[] = [];

  const insertPlans = async (values: (typeof plans.$inferInsert)[]) => {
    const rows = await db.insert(plans).values(values).returning();
    planIds.push(...rows.map(({ id }) => id));

    return rows;
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterEach(async () => {
    await db.delete(plans).where(inArray(plans.id, planIds.splice(0)));
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("allows a plan with a provider and an external product", async () => {
    const externalProductId = `prod_${crypto.randomUUID()}`;

    const [plan] = await insertPlans([
      { provider: SubscriptionProvider.STRIPE, externalProductId },
    ]);

    expect(plan?.provider).toBe(SubscriptionProvider.STRIPE);
    expect(plan?.externalProductId).toBe(externalProductId);
  });

  test("allows several plans without provider and external product", async () => {
    const rows = await insertPlans([{}, {}]);

    expect(rows).toHaveLength(2);
  });

  test("rejects a provider without external product", async () => {
    const error = await insertPlans([{ provider: SubscriptionProvider.STRIPE }]).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("plans_provider_external_product");
  });

  test("rejects an external product without provider", async () => {
    const error = await insertPlans([{ externalProductId: `prod_${crypto.randomUUID()}` }]).catch(
      (e: unknown) => e,
    );

    expect(causeMessage(error)).toContain("plans_provider_external_product");
  });

  test("rejects two plans with the same product of a provider", async () => {
    const plan = {
      provider: SubscriptionProvider.STRIPE,
      externalProductId: `prod_${crypto.randomUUID()}`,
    };

    await insertPlans([plan]);

    const error = await insertPlans([plan]).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("plans_provider_external_product_uidx");
  });
});
