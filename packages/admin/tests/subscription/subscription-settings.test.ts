import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { SubscriptionSettingsService } from "../../src/subscription/services/subscription-settings";
import { openTestDb } from "../_test-utils";

const plans = DbSchema.Subscription.Plans.PlansSchema;
const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;

const instance = await openTestDb();
const db = instance.connection;

const service = SubscriptionSettingsService.create({ db });

describe("SubscriptionSettingsService", () => {
  let initialPlanId: string;
  let otherPlanId: string;

  beforeAll(async () => {
    const [settings] = await db.select().from(subscriptionSettings);
    assertNonNullish(settings);
    initialPlanId = settings.initialPlanId;

    const [plan] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.SELF, trialDays: 30 })
      .returning();
    assertNonNullish(plan);
    otherPlanId = plan.id;
  });

  afterEach(async () => {
    await db.update(subscriptionSettings).set({ initialPlanId, graceDays: 7 });
  });

  afterAll(async () => {
    await db.delete(plans).where(eq(plans.id, otherPlanId));
    await instance.close();
  });

  test("reads the settings", async () => {
    const result = await service.get();

    expect(result).toEqual({
      status: "success",
      result: { id: 1, initialPlanId, graceDays: 7 },
    });
  });

  test("changes the initial plan and the grace days", async () => {
    const result = await service.update({
      settings: { initialPlanId: otherPlanId, graceDays: 10 },
    });

    expect(result).toEqual({
      status: "success",
      result: { id: 1, initialPlanId: otherPlanId, graceDays: 10 },
    });
  });

  test("rejects negative grace days", async () => {
    const result = await service.update({ settings: { graceDays: -1 } });

    expect(result.status).toBe("error");
  });
});
