import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import {
  getAvailableExternalProduct,
  getExternalProduct,
  listExternalProducts,
} from "../../../src/services/_helpers/external-products";
import { openTestDb } from "../../../../admin/tests/_test-utils";

const plans = DbSchema.Subscription.Plans.PlansSchema;
const externalProducts = DbSchema.Subscription.ExternalProducts.ExternalProductsSchema;

const instance = await openTestDb();
const db = instance.connection;

afterAll(async () => {
  await instance.close();
});

describe("external products", () => {
  const provider = SubscriptionProvider.STRIPE;
  const externalProductId = `prod_${crypto.randomUUID()}`;

  const expiredProductId = `prod_${crypto.randomUUID()}`;

  let planId: string;
  let expiredPlanId: string;
  let withoutProductId: string;

  beforeAll(async () => {
    const [plan] = await db.insert(plans).values({ provider }).returning();
    assertNonNullish(plan);
    planId = plan.id;

    await db
      .insert(externalProducts)
      .values({ planId, provider, externalProductId, name: "Cloud" });

    const [expired] = await db
      .insert(plans)
      .values({ provider, expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) })
      .returning();
    assertNonNullish(expired);
    expiredPlanId = expired.id;

    await db.insert(externalProducts).values({
      planId: expiredPlanId,
      provider,
      externalProductId: expiredProductId,
      name: "Expired",
    });

    const [withoutProduct] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.SELF, trialDays: 30 })
      .returning();
    assertNonNullish(withoutProduct);
    withoutProductId = withoutProduct.id;
  });

  afterAll(async () => {
    await db.delete(plans).where(inArray(plans.id, [planId, expiredPlanId, withoutProductId]));
  });

  describe("getExternalProduct", () => {
    test("returns the product with its plan", async () => {
      const product = await db.transaction((tx) =>
        getExternalProduct({ tx, provider, externalProductId }),
      );

      expect(product.planId).toBe(planId);
      expect(product.provider).toBe(provider);
      expect(product.externalProductId).toBe(externalProductId);
    });

    test("throws for an unknown product", async () => {
      await expect(
        db.transaction((tx) =>
          getExternalProduct({
            tx,
            provider,
            externalProductId: `prod_${crypto.randomUUID()}`,
          }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("getAvailableExternalProduct", () => {
    test("returns the product of a plan not expired", async () => {
      const product = await db.transaction((tx) =>
        getAvailableExternalProduct({ tx, provider, externalProductId }),
      );

      expect(product.planId).toBe(planId);
    });

    test("throws for a product whose plan has expired", async () => {
      await expect(
        db.transaction((tx) =>
          getAvailableExternalProduct({ tx, provider, externalProductId: expiredProductId }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("getExternalProduct with an expired plan", () => {
    test("still returns the product, for the subscriptions already on it", async () => {
      const product = await db.transaction((tx) =>
        getExternalProduct({ tx, provider, externalProductId: expiredProductId }),
      );

      expect(product.planId).toBe(expiredPlanId);
    });
  });

  describe("listExternalProducts", () => {
    test("leaves out the products whose plan has expired", async () => {
      const result = await db.transaction((tx) => listExternalProducts({ tx }));

      expect(result.map(({ planId }) => planId)).not.toContain(expiredPlanId);
    });

    test("returns the products of the plans", async () => {
      const result = await db.transaction((tx) => listExternalProducts({ tx }));

      expect(result.map(({ planId }) => planId)).toContain(planId);
    });

    test("leaves out the plans without product", async () => {
      const result = await db.transaction((tx) => listExternalProducts({ tx }));

      expect(result.map(({ planId }) => planId)).not.toContain(withoutProductId);
    });
  });
});
