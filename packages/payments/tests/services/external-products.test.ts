import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { ExternalProductsService } from "../../src/services/external-products";
import { openTestDb } from "../../../admin/tests/_test-utils";

const plans = DbSchema.Subscription.Plans.PlansSchema;
const externalProducts = DbSchema.Subscription.ExternalProducts.ExternalProductsSchema;

const instance = await openTestDb();
const db = instance.connection;

describe("ExternalProductsService", () => {
  const externalProductId = `prod_${crypto.randomUUID()}`;

  let withProductId: string;
  let withoutProductId: string;

  beforeAll(async () => {
    const [withProduct] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.STRIPE })
      .returning();
    assertNonNullish(withProduct);
    withProductId = withProduct.id;

    await db.insert(externalProducts).values({
      planId: withProductId,
      provider: SubscriptionProvider.STRIPE,
      externalProductId,
    });

    const [withoutProduct] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.SELF, trialDays: 30 })
      .returning();
    assertNonNullish(withoutProduct);
    withoutProductId = withoutProduct.id;
  });

  afterAll(async () => {
    await db.delete(plans).where(inArray(plans.id, [withProductId, withoutProductId]));
    await instance.close();
  });

  test("lists the products linked to a plan", async () => {
    const result = await ExternalProductsService.create({ db }).list();

    expect(result.status).toBe("success");

    const products = result.status === "success" ? result.result : [];

    expect(products).toContainEqual(
      expect.objectContaining({
        planId: withProductId,
        provider: SubscriptionProvider.STRIPE,
        externalProductId,
      }),
    );
    expect(products.map(({ planId }) => planId)).not.toContain(withoutProductId);
  });
});
