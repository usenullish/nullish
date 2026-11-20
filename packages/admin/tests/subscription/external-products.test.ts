import { afterAll, describe, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { ExternalProductsService } from "../../src/subscription/services/external-products";
import { openTestDb } from "../_test-utils";

const plans = DbSchema.Subscription.Plans.PlansSchema;

const instance = await openTestDb();
const db = instance.connection;

const service = ExternalProductsService.create({ db });

describe("ExternalProductsService", () => {
  const planIds: string[] = [];

  const insertPlan = async (provider: SubscriptionProvider): Promise<string> => {
    const [plan] = await db.insert(plans).values({ provider }).returning();
    assertNonNullish(plan);
    planIds.push(plan.id);

    return plan.id;
  };

  afterAll(async () => {
    await db.delete(plans).where(inArray(plans.id, planIds));
    await instance.close();
  });

  test("links a stripe plan to its product", async () => {
    const planId = await insertPlan(SubscriptionProvider.STRIPE);
    const externalProductId = `prod_${crypto.randomUUID()}`;

    const result = await service.insert({
      externalProduct: { planId, provider: SubscriptionProvider.STRIPE, externalProductId },
    });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.planId).toBe(planId);
    expect(result.result.externalProductId).toBe(externalProductId);
  });

  test("rejects a product on a self plan", async () => {
    const planId = await insertPlan(SubscriptionProvider.SELF);

    const result = await service.insert({
      externalProduct: {
        planId,
        provider: SubscriptionProvider.STRIPE,
        externalProductId: `prod_${crypto.randomUUID()}`,
      },
    });

    expect(result.status).toBe("error");
  });
});
