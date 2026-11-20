import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import {
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

  let planId: string;
  let withoutProductId: string;

  beforeAll(async () => {
    const [plan] = await db.insert(plans).values({ provider }).returning();
    assertNonNullish(plan);
    planId = plan.id;

    await db.insert(externalProducts).values({ planId, provider, externalProductId });

    const [withoutProduct] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.SELF, trialDays: 30 })
      .returning();
    assertNonNullish(withoutProduct);
    withoutProductId = withoutProduct.id;
  });

  afterAll(async () => {
    await db.delete(plans).where(inArray(plans.id, [planId, withoutProductId]));
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

  describe("listExternalProducts", () => {
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
