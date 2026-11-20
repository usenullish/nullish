import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { inArray } from "drizzle-orm";
import { assertNonNullish, isArrayEmpty, type Nullable } from "@usenullish/nullish-common";
import { BillingPeriod, DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { listCustomPlans } from "../../../src/subscription/_helpers/custom-plans";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const plans = DbSchema.Subscription.Plans.PlansSchema;
const customProducts = DbSchema.Subscription.CustomProducts.CustomProductsSchema;
const customPrices = DbSchema.Subscription.CustomPrices.CustomPricesSchema;

const DAY_MS = 24 * 60 * 60 * 1000;

describe("subscription/_helpers/custom-plans", () => {
  const planIds: string[] = [];

  const insertCustomPlan = async ({
    name,
    expiresAt = null,
    prices = [],
  }: {
    name: string;
    expiresAt?: Nullable<Date>;
    prices?: Omit<typeof customPrices.$inferInsert, "productId">[];
  }) => {
    const [plan] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.CUSTOM, expiresAt })
      .returning();
    assertNonNullish(plan);
    planIds.push(plan.id);

    const [product] = await db
      .insert(customProducts)
      .values({
        planId: plan.id,
        provider: SubscriptionProvider.CUSTOM,
        name,
        contactUrl: "https://example.com/contact",
      })
      .returning();
    assertNonNullish(product);

    if (!isArrayEmpty(prices)) {
      await db
        .insert(customPrices)
        .values(prices.map((price) => ({ productId: product.id, ...price })));
    }

    return { plan, product };
  };

  const list = async () => {
    const customPlans = await db.transaction((tx) => listCustomPlans({ tx }));

    return customPlans.filter(({ plan }) => planIds.includes(plan.id));
  };

  afterEach(async () => {
    await db.delete(plans).where(inArray(plans.id, planIds.splice(0)));
  });

  afterAll(async () => {
    await client.close();
  });

  test("returns the custom plans with their product and prices", async () => {
    const { plan, product } = await insertCustomPlan({
      name: "Instance",
      prices: [
        { amount: 24000n, currency: "CHF", billingPeriod: BillingPeriod.MONTH },
        { amount: 240000n, currency: "CHF", billingPeriod: BillingPeriod.YEAR },
      ],
    });

    const [customPlan] = await list();
    assertNonNullish(customPlan);

    expect(customPlan.plan.id).toBe(plan.id);
    expect(customPlan.product).toEqual(product);
    expect(
      customPlan.prices.map(({ amount, billingPeriod }) => [amount, billingPeriod]).toSorted(),
    ).toEqual([
      [24000n, BillingPeriod.MONTH],
      [240000n, BillingPeriod.YEAR],
    ]);
  });

  test("returns a custom plan without prices", async () => {
    await insertCustomPlan({ name: "On-Prem" });

    const [customPlan] = await list();

    expect(customPlan?.prices).toEqual([]);
  });

  test("returns only the prices of each plan", async () => {
    await insertCustomPlan({
      name: "Instance",
      prices: [{ amount: 24000n, currency: "CHF", billingPeriod: BillingPeriod.MONTH }],
    });
    await insertCustomPlan({
      name: "Other",
      prices: [{ amount: 10000n, currency: "CHF", billingPeriod: BillingPeriod.YEAR }],
    });

    const customPlans = await list();

    expect(
      customPlans.map(({ product, prices }) => [product.name, prices.map(({ amount }) => amount)]),
    ).toEqual([
      ["Instance", [24000n]],
      ["Other", [10000n]],
    ]);
  });

  test("orders the custom plans by the name of their product", async () => {
    await insertCustomPlan({ name: "On-Prem" });
    await insertCustomPlan({ name: "Instance" });

    const customPlans = await list();

    expect(customPlans.map(({ product }) => product.name)).toEqual(["Instance", "On-Prem"]);
  });

  test("leaves out an expired custom plan", async () => {
    await insertCustomPlan({ name: "Expired", expiresAt: new Date(Date.now() - DAY_MS) });
    await insertCustomPlan({ name: "Open", expiresAt: new Date(Date.now() + DAY_MS) });

    const customPlans = await list();

    expect(customPlans.map(({ product }) => product.name)).toEqual(["Open"]);
  });

  test("returns no custom plan without custom plans", async () => {
    expect(await list()).toEqual([]);
  });
});
