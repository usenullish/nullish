import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { eq, inArray, notInArray } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { BillingPeriod, DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import {
  type SubscriptionBootstrap,
  SubscriptionBootstrapService,
} from "../../src/subscription/services/subscription-bootstrap";
import { openTestDb } from "../_test-utils";

const plans = DbSchema.Subscription.Plans.PlansSchema;
const externalProducts = DbSchema.Subscription.ExternalProducts.ExternalProductsSchema;
const customProducts = DbSchema.Subscription.CustomProducts.CustomProductsSchema;
const customPrices = DbSchema.Subscription.CustomPrices.CustomPricesSchema;
const taxRates = DbSchema.Subscription.SubscriptionTaxRates.SubscriptionTaxRatesSchema;
const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;

const instance = await openTestDb();
const db = instance.connection;

const service = SubscriptionBootstrapService.create({ db });

describe("SubscriptionBootstrapService", () => {
  const insertedPlanIds: string[] = [];
  const insertedTaxRateIds: string[] = [];

  let settingsBefore: typeof subscriptionSettings.$inferSelect;
  let defaultPlans: (typeof plans.$inferSelect)[];

  const setupOf = ({
    initialPlan = "cloud",
    externalProductId = `prod_${crypto.randomUUID()}`,
  }: { initialPlan?: string; externalProductId?: string } = {}): SubscriptionBootstrap => ({
    providers: [
      {
        provider: SubscriptionProvider.STRIPE,
        plans: [{ key: "cloud", trialDays: 14, externalProductId }],
        taxRates: [
          {
            externalTaxRateId: `txr_${crypto.randomUUID()}`,
            startOn: { __date__: "2099-01-01" },
          },
        ],
      },
    ],
    plans: [
      {
        key: "instance",
        provider: SubscriptionProvider.CUSTOM,
        product: { name: "Instance", contactUrl: "https://example.com/contact" },
        prices: [
          { amount: { __bigint__: "12000" }, currency: "CHF", billingPeriod: BillingPeriod.MONTH },
          { amount: { __bigint__: "120000" }, currency: "CHF", billingPeriod: BillingPeriod.YEAR },
        ],
      },
    ],
    settings: { initialPlan, graceDays: 14 },
  });

  const newPlans = () =>
    db
      .select()
      .from(plans)
      .where(
        notInArray(
          plans.id,
          defaultPlans.map(({ id }) => id),
        ),
      );

  const newPlanOf = async (provider: SubscriptionProvider) => {
    const plan = (await newPlans()).find((row) => row.provider === provider);
    assertNonNullish(plan);

    return plan;
  };

  const bootstrap = async (setup: SubscriptionBootstrap) => {
    const result = await service.bootstrap({ setup });

    insertedPlanIds.push(...(await newPlans()).map(({ id }) => id));

    const taxRateIds = (setup.providers ?? []).flatMap(({ taxRates = [] }) =>
      taxRates.map(({ externalTaxRateId }) => externalTaxRateId),
    );
    const rows = await db.select().from(taxRates);
    insertedTaxRateIds.push(
      ...rows
        .filter(({ externalTaxRateId }) => taxRateIds.includes(externalTaxRateId))
        .map(({ id }) => id),
    );

    return result;
  };

  beforeAll(async () => {
    const [settings] = await db.select().from(subscriptionSettings);
    assertNonNullish(settings);
    settingsBefore = settings;

    defaultPlans = await db.select().from(plans);
  });

  afterEach(async () => {
    for (const { id, expiresAt } of defaultPlans) {
      await db.update(plans).set({ expiresAt }).where(eq(plans.id, id));
    }

    await db.update(subscriptionSettings).set({
      initialPlanId: settingsBefore.initialPlanId,
      graceDays: settingsBefore.graceDays,
    });

    await db.delete(plans).where(inArray(plans.id, insertedPlanIds.splice(0)));
    await db.delete(taxRates).where(inArray(taxRates.id, insertedTaxRateIds.splice(0)));
  });

  afterAll(async () => {
    await instance.close();
  });

  test("loads the plans with their products and prices", async () => {
    const externalProductId = `prod_${crypto.randomUUID()}`;

    const result = await bootstrap(setupOf({ externalProductId }));

    expect(result.status).toBe("success");

    const cloud = await newPlanOf(SubscriptionProvider.STRIPE);
    const custom = await newPlanOf(SubscriptionProvider.CUSTOM);

    expect(cloud.trialDays).toBe(14);

    const external = await db
      .select()
      .from(externalProducts)
      .where(eq(externalProducts.planId, cloud.id));

    expect(external.map((product) => product.externalProductId)).toEqual([externalProductId]);

    const [product] = await db
      .select()
      .from(customProducts)
      .where(eq(customProducts.planId, custom.id));
    assertNonNullish(product);

    expect(product.name).toBe("Instance");

    const prices = await db
      .select()
      .from(customPrices)
      .where(eq(customPrices.productId, product.id));

    expect(prices.map(({ amount, billingPeriod }) => [amount, billingPeriod])).toContainEqual([
      120000n,
      BillingPeriod.YEAR,
    ]);
    expect(prices).toHaveLength(2);
  });

  test("loads the tax rates", async () => {
    await bootstrap(setupOf());

    expect(insertedTaxRateIds).toHaveLength(1);
  });

  test("makes the initial plan of the file the initial plan", async () => {
    const result = await bootstrap(setupOf());

    expect(result.status).toBe("success");

    const cloud = await newPlanOf(SubscriptionProvider.STRIPE);
    const [settings] = await db.select().from(subscriptionSettings);

    expect(settings?.initialPlanId).toBe(cloud.id);
    expect(settings?.graceDays).toBe(14);
  });

  test("disables the default self plans", async () => {
    await bootstrap(setupOf());

    const rows = await db
      .select()
      .from(plans)
      .where(
        inArray(
          plans.id,
          defaultPlans.map(({ id }) => id),
        ),
      );

    expect(rows.every(({ expiresAt }) => expiresAt !== null && expiresAt <= new Date())).toBe(true);
  });

  test("fails and loads nothing when other plans than the default ones exist", async () => {
    const [stripePlan] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.STRIPE })
      .returning();
    assertNonNullish(stripePlan);
    insertedPlanIds.push(stripePlan.id);

    const result = await bootstrap(setupOf());

    const rows = await db.select().from(plans);
    const [settings] = await db.select().from(subscriptionSettings);

    expect(result.status).toBe("error");
    expect(rows).toHaveLength(defaultPlans.length + 1);
    expect(insertedTaxRateIds).toHaveLength(0);
    expect(settings?.initialPlanId).toBe(settingsBefore.initialPlanId);
  });

  test("fails when a self plan exists besides the default one", async () => {
    const [selfPlan] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.SELF, trialDays: 30 })
      .returning();
    assertNonNullish(selfPlan);
    insertedPlanIds.push(selfPlan.id);

    const result = await bootstrap(setupOf());

    expect(result.status).toBe("error");
    expect(insertedTaxRateIds).toHaveLength(0);
  });

  test("rejects an initial plan that is not one of the plans", async () => {
    const result = await bootstrap(setupOf({ initialPlan: "unknown" }));

    expect(result.status).toBe("error");
    expect(insertedTaxRateIds).toHaveLength(0);
  });
});
