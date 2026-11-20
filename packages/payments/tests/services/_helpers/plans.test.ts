import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { assertNonNullish, nonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import {
  getPlanByExternalProduct,
  listPlansWithProduct,
} from "../../../src/services/_helpers/plans";
import { openTestDb } from "../../../../admin/tests/_test-utils";

const plans = DbSchema.Subscription.Plans.PlansSchema;

const instance = await openTestDb();
const db = instance.connection;

afterAll(async () => {
  await instance.close();
});

describe("getPlanByExternalProduct", () => {
  const provider = SubscriptionProvider.STRIPE;
  const externalProductId = `prod_${crypto.randomUUID()}`;

  let planId: string;

  beforeAll(async () => {
    const [plan] = await db.insert(plans).values({ provider, externalProductId }).returning();
    assertNonNullish(plan);
    planId = plan.id;
  });

  afterAll(async () => {
    await db.delete(plans).where(eq(plans.id, planId));
  });

  test("returns the plan of the product", async () => {
    const plan = await db.transaction((tx) =>
      getPlanByExternalProduct({ tx, provider, externalProductId }),
    );

    expect(plan.id).toBe(planId);
    expect(plan.provider).toBe(provider);
    expect(plan.externalProductId).toBe(externalProductId);
  });

  test("throws for a product without plan", async () => {
    await expect(
      db.transaction((tx) =>
        getPlanByExternalProduct({
          tx,
          provider,
          externalProductId: `prod_${crypto.randomUUID()}`,
        }),
      ),
    ).rejects.toThrow();
  });
});

describe("listPlansWithProduct", () => {
  const provider = SubscriptionProvider.STRIPE;

  let withProductId: string;
  let withoutProductId: string;

  beforeAll(async () => {
    const [withProduct] = await db
      .insert(plans)
      .values({ provider, externalProductId: `prod_${crypto.randomUUID()}` })
      .returning();
    assertNonNullish(withProduct);
    withProductId = withProduct.id;

    const [withoutProduct] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.SELF, trialDays: 30 })
      .returning();
    assertNonNullish(withoutProduct);
    withoutProductId = withoutProduct.id;
  });

  afterAll(async () => {
    await db.delete(plans).where(inArray(plans.id, [withProductId, withoutProductId]));
  });

  test("returns the plans linked to a product", async () => {
    const result = await db.transaction((tx) => listPlansWithProduct({ tx }));

    expect(result.map(({ id }) => id)).toContain(withProductId);
  });

  test("leaves out the plans without product", async () => {
    const result = await db.transaction((tx) => listPlansWithProduct({ tx }));

    expect(result.map(({ id }) => id)).not.toContain(withoutProductId);
    expect(result.every(({ externalProductId }) => nonNullish(externalProductId))).toBe(true);
  });
});
