import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { inArray } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { BillingPeriod, DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCustomPlans } from "../../../src/subscription/composites/custom-plans";
import { resetDb, seedUsers, TEST_USER_ID } from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const plans = DbSchema.Subscription.Plans.PlansSchema;
const customProducts = DbSchema.Subscription.CustomProducts.CustomProductsSchema;
const customPrices = DbSchema.Subscription.CustomPrices.CustomPricesSchema;

describe("DbCustomPlans", () => {
  const planIds: string[] = [];

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

  test("lists the custom plans with their product and prices to a user", async () => {
    const [plan] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.CUSTOM })
      .returning();
    assertNonNullish(plan);
    planIds.push(plan.id);

    const [product] = await db
      .insert(customProducts)
      .values({
        planId: plan.id,
        provider: SubscriptionProvider.CUSTOM,
        name: "Instance",
        contactUrl: "https://example.com/contact",
      })
      .returning();
    assertNonNullish(product);

    await db.insert(customPrices).values({
      productId: product.id,
      amount: 24000n,
      currency: "CHF",
      billingPeriod: BillingPeriod.MONTH,
    });

    const result = await DbCustomPlans.create({ db, userId: TEST_USER_ID }).list();

    if (result.status === "error") {
      throw result.err;
    }

    const customPlan = result.result.find((row) => row.plan.id === plan.id);

    expect(customPlan?.product.name).toBe("Instance");
    expect(customPlan?.prices.map(({ amount }) => amount)).toEqual([24000n]);
  });
});
