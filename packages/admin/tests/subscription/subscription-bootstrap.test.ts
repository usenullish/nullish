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
const planRules = DbSchema.Subscription.PlanRules.PlanRulesSchema;
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
    externalProductId = `prod_${crypto.randomUUID()}`,
  }: { externalProductId?: string } = {}): SubscriptionBootstrap => [
    { provider: SubscriptionProvider.SELF, trialDays: 30, rules: { maxMembers: 5 } },
    {
      provider: SubscriptionProvider.CUSTOM,
      name: "Instance",
      contactUrl: "https://example.com/contact",
      prices: [
        { amount: { __bigint__: "12000" }, currency: "CHF", billingPeriod: BillingPeriod.MONTH },
        { amount: { __bigint__: "120000" }, currency: "CHF", billingPeriod: BillingPeriod.YEAR },
      ],
    },
    {
      provider: SubscriptionProvider.STRIPE,
      externalProductId,
      name: "Cloud",
      rules: { maxMembers: 10 },
      taxRates: [
        {
          externalTaxRateId: `txr_${crypto.randomUUID()}`,
          startOn: { __date__: "2099-01-01" },
        },
      ],
    },
  ];

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

    const taxRateIds = setup.flatMap((plan) =>
      plan.provider === SubscriptionProvider.STRIPE
        ? (plan.taxRates ?? []).map(({ externalTaxRateId }) => externalTaxRateId)
        : [],
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

    const planIds = insertedPlanIds.splice(0);
    const planRulesIds = (await db.select().from(plans).where(inArray(plans.id, planIds)))
      .map(({ planRulesId }) => planRulesId)
      .filter((id) => id !== null);

    await db.delete(plans).where(inArray(plans.id, planIds));
    await db.delete(planRules).where(inArray(planRules.id, planRulesIds));
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

    const external = await db
      .select()
      .from(externalProducts)
      .where(eq(externalProducts.planId, cloud.id));

    expect(external.map(({ externalProductId, name }) => [externalProductId, name])).toEqual([
      [externalProductId, "Cloud"],
    ]);

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

  test("loads the self plan", async () => {
    await bootstrap(setupOf());

    const self = await newPlanOf(SubscriptionProvider.SELF);

    expect(self.trialDays).toBe(30);
  });

  test("loads the rules of the self and external plans", async () => {
    await bootstrap(setupOf());

    const maxMembersOf = async (provider: SubscriptionProvider) => {
      const { planRulesId } = await newPlanOf(provider);
      assertNonNullish(planRulesId);

      const [rules] = await db.select().from(planRules).where(eq(planRules.id, planRulesId));

      return rules?.maxMembers;
    };

    expect(await maxMembersOf(SubscriptionProvider.SELF)).toBe(5);
    expect(await maxMembersOf(SubscriptionProvider.STRIPE)).toBe(10);
  });

  test("leaves a plan without rules when none is given", async () => {
    await bootstrap(setupOf());

    const custom = await newPlanOf(SubscriptionProvider.CUSTOM);

    expect(custom.planRulesId).toBeNull();
  });

  test("makes the self plan the initial plan", async () => {
    const result = await bootstrap(setupOf());

    expect(result.status).toBe("success");

    const self = await newPlanOf(SubscriptionProvider.SELF);
    const [settings] = await db.select().from(subscriptionSettings);

    expect(settings?.initialPlanId).toBe(self.id);
    expect(settings?.graceDays).toBe(settingsBefore.graceDays);
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

  test("rejects a file without a self plan", async () => {
    const result = await bootstrap(
      setupOf().filter(({ provider }) => provider !== SubscriptionProvider.SELF),
    );

    expect(result.status).toBe("error");
    expect(insertedTaxRateIds).toHaveLength(0);
  });

  test("rejects a file with two self plans", async () => {
    const result = await bootstrap([
      ...setupOf(),
      { provider: SubscriptionProvider.SELF, trialDays: 7 },
    ]);

    expect(result.status).toBe("error");
    expect(insertedTaxRateIds).toHaveLength(0);
  });
});
