import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { assertNonNullish } from "@usenullish/nullish-common";
import { BillingPeriod, DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { causeMessage, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const plans = DbSchema.Subscription.Plans.PlansSchema;
const customProducts = DbSchema.Subscription.CustomProducts.CustomProductsSchema;
const customPrices = DbSchema.Subscription.CustomPrices.CustomPricesSchema;

describe("custom prices", () => {
  const planIds: string[] = [];

  const insertProduct = async (): Promise<{ planId: string; productId: string }> => {
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

    return { planId: plan.id, productId: product.id };
  };

  const priceOf = ({
    productId,
    amount = 12000n,
    currency = "CHF",
    billingPeriod = BillingPeriod.MONTH,
  }: {
    productId: string;
    amount?: bigint;
    currency?: string;
    billingPeriod?: BillingPeriod;
  }) => ({ productId, amount, currency, billingPeriod });

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

  test("allows a monthly and a yearly price of a product", async () => {
    const { productId } = await insertProduct();

    const rows = await db
      .insert(customPrices)
      .values([
        priceOf({ productId }),
        priceOf({ productId, amount: 120000n, billingPeriod: BillingPeriod.YEAR }),
      ])
      .returning();

    expect(rows).toHaveLength(2);
  });

  test("rejects a price of zero", async () => {
    const { productId } = await insertProduct();

    const error = await db
      .insert(customPrices)
      .values(priceOf({ productId, amount: 0n }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("custom_prices_amount_positive");
  });

  test("rejects a negative price", async () => {
    const { productId } = await insertProduct();

    const error = await db
      .insert(customPrices)
      .values(priceOf({ productId, amount: -100n }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("custom_prices_amount_positive");
  });

  test("rejects an unknown currency", async () => {
    const { productId } = await insertProduct();

    const error = await db
      .insert(customPrices)
      .values(priceOf({ productId, currency: "ZZZ" }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("foreign key");
  });

  test("rejects a second price with the same currency and billing period", async () => {
    const { productId } = await insertProduct();

    await db.insert(customPrices).values(priceOf({ productId }));

    const error = await db
      .insert(customPrices)
      .values(priceOf({ productId, amount: 15000n }))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("custom_prices_product_currency_billing_period_uidx");
  });

  test("deletes the prices with their product", async () => {
    const { productId } = await insertProduct();

    await db.insert(customPrices).values(priceOf({ productId }));
    await db.delete(customProducts).where(eq(customProducts.id, productId));

    const rows = await db.select().from(customPrices).where(eq(customPrices.productId, productId));

    expect(rows).toHaveLength(0);
  });

  test("deletes the prices with their plan", async () => {
    const { planId, productId } = await insertProduct();

    await db.insert(customPrices).values(priceOf({ productId }));
    await db.delete(plans).where(eq(plans.id, planId));

    const rows = await db.select().from(customPrices).where(eq(customPrices.productId, productId));

    expect(rows).toHaveLength(0);
  });
});
