import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { inArray } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { PlansService } from "../../src/services/plans";
import { openTestDb } from "../../../admin/tests/_test-utils";

const plans = DbSchema.Subscription.Plans.PlansSchema;

const instance = await openTestDb();
const db = instance.connection;

describe("PlansService", () => {
  const externalProductId = `prod_${crypto.randomUUID()}`;

  let withProductId: string;
  let withoutProductId: string;

  beforeAll(async () => {
    const [withProduct] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.STRIPE, externalProductId })
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
    await instance.close();
  });

  test("lists the plans linked to a product", async () => {
    const result = await PlansService.create({ db }).listPlans();

    expect(result.status).toBe("success");

    const ids = result.status === "success" ? result.result.map(({ id }) => id) : [];

    expect(ids).toContain(withProductId);
    expect(ids).not.toContain(withoutProductId);
  });
});
