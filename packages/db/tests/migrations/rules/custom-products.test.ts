import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { causeMessage, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const plans = DbSchema.Subscription.Plans.PlansSchema;
const customProducts = DbSchema.Subscription.CustomProducts.CustomProductsSchema;

describe("custom products", () => {
  const planIds: string[] = [];

  const insertPlan = async (provider: SubscriptionProvider): Promise<string> => {
    const [plan] = await db.insert(plans).values({ provider }).returning();
    assertNonNullish(plan);
    planIds.push(plan.id);

    return plan.id;
  };

  const productOf = ({
    planId,
    provider = SubscriptionProvider.CUSTOM,
  }: {
    planId: string;
    provider?: SubscriptionProvider;
  }) => ({ planId, provider, name: "Instance", contactUrl: "https://example.com/contact" });

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

  test("allows a product on a custom plan", async () => {
    const planId = await insertPlan(SubscriptionProvider.CUSTOM);

    const [product] = await db.insert(customProducts).values(productOf({ planId })).returning();

    expect(product?.planId).toBe(planId);
  });

  test("rejects a product of a self provider", async () => {
    const planId = await insertPlan(SubscriptionProvider.SELF);

    const error = await db
      .insert(customProducts)
      .values(productOf({ planId, provider: SubscriptionProvider.SELF }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("custom_products_provider_custom");
  });

  test("rejects a product of a stripe provider", async () => {
    const planId = await insertPlan(SubscriptionProvider.STRIPE);

    const error = await db
      .insert(customProducts)
      .values(productOf({ planId, provider: SubscriptionProvider.STRIPE }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("custom_products_provider_custom");
  });

  test("rejects a custom product on a plan of another provider", async () => {
    const planId = await insertPlan(SubscriptionProvider.STRIPE);

    const error = await db
      .insert(customProducts)
      .values(productOf({ planId }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("custom_products_plan_provider_fkey");
  });

  test("rejects a second product on the same plan", async () => {
    const planId = await insertPlan(SubscriptionProvider.CUSTOM);

    await db.insert(customProducts).values(productOf({ planId }));

    const error = await db
      .insert(customProducts)
      .values(productOf({ planId }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("custom_products_plan_uidx");
  });

  test("deletes the product with its plan", async () => {
    const planId = await insertPlan(SubscriptionProvider.CUSTOM);

    await db.insert(customProducts).values(productOf({ planId }));
    await db.delete(plans).where(eq(plans.id, planId));

    const rows = await db.select().from(customProducts).where(eq(customProducts.planId, planId));

    expect(rows).toHaveLength(0);
  });
});
