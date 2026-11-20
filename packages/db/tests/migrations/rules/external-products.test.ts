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
const externalProducts = DbSchema.Subscription.ExternalProducts.ExternalProductsSchema;

describe("external products", () => {
  const planIds: string[] = [];

  const insertPlan = async (provider: SubscriptionProvider): Promise<string> => {
    const [plan] = await db.insert(plans).values({ provider }).returning();
    assertNonNullish(plan);
    planIds.push(plan.id);

    return plan.id;
  };

  const productOf = ({
    planId,
    provider = SubscriptionProvider.STRIPE,
    externalProductId = `prod_${crypto.randomUUID()}`,
  }: {
    planId: string;
    provider?: SubscriptionProvider;
    externalProductId?: string;
  }) => ({ planId, provider, externalProductId, name: "Cloud" });

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

  test("allows a product on a stripe plan", async () => {
    const planId = await insertPlan(SubscriptionProvider.STRIPE);

    const [product] = await db.insert(externalProducts).values(productOf({ planId })).returning();

    expect(product?.planId).toBe(planId);
  });

  test("rejects a product on a self plan", async () => {
    const planId = await insertPlan(SubscriptionProvider.SELF);

    const error = await db
      .insert(externalProducts)
      .values(productOf({ planId, provider: SubscriptionProvider.SELF }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("external_products_provider_third_party");
  });

  test("rejects a product on a custom plan", async () => {
    const planId = await insertPlan(SubscriptionProvider.CUSTOM);

    const error = await db
      .insert(externalProducts)
      .values(productOf({ planId, provider: SubscriptionProvider.CUSTOM }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("external_products_provider_third_party");
  });

  test("rejects a stripe product on a plan of another provider", async () => {
    const planId = await insertPlan(SubscriptionProvider.SELF);

    const error = await db
      .insert(externalProducts)
      .values(productOf({ planId }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("external_products_plan_provider_fkey");
  });

  test("rejects a second product on the same plan", async () => {
    const planId = await insertPlan(SubscriptionProvider.STRIPE);

    await db.insert(externalProducts).values(productOf({ planId }));

    const error = await db
      .insert(externalProducts)
      .values(productOf({ planId }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("external_products_plan_uidx");
  });

  test("rejects the same product on two plans", async () => {
    const externalProductId = `prod_${crypto.randomUUID()}`;

    const firstPlanId = await insertPlan(SubscriptionProvider.STRIPE);
    const secondPlanId = await insertPlan(SubscriptionProvider.STRIPE);

    await db.insert(externalProducts).values(productOf({ planId: firstPlanId, externalProductId }));

    const error = await db
      .insert(externalProducts)
      .values(productOf({ planId: secondPlanId, externalProductId }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("external_products_provider_external_product_uidx");
  });

  test("deletes the product with its plan", async () => {
    const planId = await insertPlan(SubscriptionProvider.STRIPE);

    await db.insert(externalProducts).values(productOf({ planId }));
    await db.delete(plans).where(eq(plans.id, planId));

    const rows = await db
      .select()
      .from(externalProducts)
      .where(eq(externalProducts.planId, planId));

    expect(rows).toHaveLength(0);
  });
});
