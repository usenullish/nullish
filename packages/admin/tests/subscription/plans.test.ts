import { afterAll, describe, expect, test } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { PlansService } from "../../src/subscription/services/plans";
import { openTestDb } from "../_test-utils";

const plans = DbSchema.Subscription.Plans.PlansSchema;
const planRules = DbSchema.Subscription.PlanRules.PlanRulesSchema;

const instance = await openTestDb();
const db = instance.connection;

const service = PlansService.create({ db });

const DAY_MS = 24 * 60 * 60 * 1000;

describe("PlansService", () => {
  const insertedIds: string[] = [];
  const insertedPlanRulesIds: string[] = [];

  afterAll(async () => {
    await db.delete(plans).where(inArray(plans.id, insertedIds));
    await db.delete(planRules).where(inArray(planRules.id, insertedPlanRulesIds));
    await instance.close();
  });

  test("inserts a plan with its rules", async () => {
    const result = await service.insert({
      plan: { provider: SubscriptionProvider.STRIPE },
      rules: { maxMembers: 3 },
    });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    insertedIds.push(result.result.id);

    const { planRulesId } = result.result;
    assertNonNullish(planRulesId);
    insertedPlanRulesIds.push(planRulesId);

    const [rules] = await db.select().from(planRules).where(eq(planRules.id, planRulesId));

    expect(rules?.maxMembers).toBe(3);
  });

  test("inserts a plan without rules", async () => {
    const result = await service.insert({ plan: { provider: SubscriptionProvider.CUSTOM } });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    insertedIds.push(result.result.id);

    expect(result.result.planRulesId).toBeNull();
  });

  test("inserts neither the rules nor the plan when the rules are invalid", async () => {
    const before = await db.select().from(planRules);

    const result = await service.insert({
      plan: { provider: SubscriptionProvider.STRIPE },
      rules: { maxMembers: 0 },
    });

    expect(result.status).toBe("error");
    expect(await db.select().from(planRules)).toHaveLength(before.length);
  });

  test("inserts a plan with its trial days and end date", async () => {
    const expiresAt = new Date(Date.now() + DAY_MS);

    const result = await service.insert({
      plan: { provider: SubscriptionProvider.SELF, trialDays: 14, expiresAt },
    });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    insertedIds.push(result.result.id);

    expect(result.result.trialDays).toBe(14);
    expect(result.result.expiresAt?.getTime()).toBe(expiresAt.getTime());
  });

  test("lists the plans, the seeded one included", async () => {
    const result = await service.list();

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.length).toBeGreaterThanOrEqual(2);
  });

  test("sets the end date of a plan", async () => {
    const inserted = await service.insert({ plan: { provider: SubscriptionProvider.SELF } });

    if (inserted.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    insertedIds.push(inserted.result.id);

    const expiresAt = new Date(Date.now() + 2 * DAY_MS);

    const result = await service.update({ planId: inserted.result.id, plan: { expiresAt } });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result?.expiresAt?.getTime()).toBe(expiresAt.getTime());
  });

  test("rejects a trial of zero days", async () => {
    const result = await service.insert({
      plan: { provider: SubscriptionProvider.SELF, trialDays: 0 },
    });

    expect(result.status).toBe("error");
  });
});
