import { afterAll, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { CustomProductsService } from "../../src/subscription/services/custom-products";
import { openTestDb } from "../_test-utils";

const plans = DbSchema.Subscription.Plans.PlansSchema;
const customProducts = DbSchema.Subscription.CustomProducts.CustomProductsSchema;

const instance = await openTestDb();
const db = instance.connection;

const service = CustomProductsService.create({ db });

describe("CustomProductsService", () => {
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

  test("links a custom plan to its product", async () => {
    const planId = await insertPlan(SubscriptionProvider.CUSTOM);

    const result = await service.insert({
      customProduct: {
        planId,
        provider: SubscriptionProvider.CUSTOM,
        name: "On-prem",
        contactUrl: "https://example.com/contact",
      },
    });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.planId).toBe(planId);
    expect(result.result.name).toBe("On-prem");
    expect(result.result.contactUrl).toBe("https://example.com/contact");
  });

  test("rejects a product on a stripe plan", async () => {
    const planId = await insertPlan(SubscriptionProvider.STRIPE);

    const result = await service.insert({
      customProduct: {
        planId,
        provider: SubscriptionProvider.CUSTOM,
        name: "On-prem",
        contactUrl: "https://example.com/contact",
      },
    });

    expect(result.status).toBe("error");
  });

  test("rejects a second product on the same plan", async () => {
    const planId = await insertPlan(SubscriptionProvider.CUSTOM);

    const customProduct = {
      planId,
      provider: SubscriptionProvider.CUSTOM,
      name: "On-prem",
      contactUrl: "https://example.com/contact",
    };

    await service.insert({ customProduct });

    const result = await service.insert({ customProduct });

    expect(result.status).toBe("error");
  });

  test("lists the products", async () => {
    const planId = await insertPlan(SubscriptionProvider.CUSTOM);

    await service.insert({
      customProduct: {
        planId,
        provider: SubscriptionProvider.CUSTOM,
        name: "On-prem",
        contactUrl: "https://example.com/contact",
      },
    });

    const result = await service.list();

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result).toContainEqual(expect.objectContaining({ planId, name: "On-prem" }));
  });

  test("deletes a product and keeps its plan", async () => {
    const planId = await insertPlan(SubscriptionProvider.CUSTOM);

    const inserted = await service.insert({
      customProduct: {
        planId,
        provider: SubscriptionProvider.CUSTOM,
        name: "On-prem",
        contactUrl: "https://example.com/contact",
      },
    });

    if (inserted.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const result = await service.delete({ productId: inserted.result.id });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result?.id).toBe(inserted.result.id);

    const products = await db
      .select()
      .from(customProducts)
      .where(eq(customProducts.id, inserted.result.id));
    const kept = await db.select().from(plans).where(eq(plans.id, planId));

    expect(products).toHaveLength(0);
    expect(kept).toHaveLength(1);
  });

  test("returns nothing when deleting an unknown product", async () => {
    const result = await service.delete({ productId: crypto.randomUUID() });

    expect(result.status).toBe("success");
    expect(result.status === "success" ? result.result : null).toBeUndefined();
  });
});
