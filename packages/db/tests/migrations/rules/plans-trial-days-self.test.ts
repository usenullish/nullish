import { afterAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { causeMessage } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const plans = DbSchema.Subscription.Plans.PlansSchema;

const CONSTRAINT = "plans_trial_days_self";

describe("plans_trial_days_self", () => {
  const planIds: string[] = [];

  const insertPlan = async (values: typeof plans.$inferInsert) => {
    const rows = await db.insert(plans).values(values).returning();
    planIds.push(...rows.map(({ id }) => id));
    return rows;
  };

  afterAll(async () => {
    await db.delete(plans).where(inArray(plans.id, planIds));
    await client.close();
  });

  test("allows a self plan with a trial", async () => {
    const [plan] = await insertPlan({ provider: SubscriptionProvider.SELF, trialDays: 14 });

    expect(plan?.trialDays).toBe(14);
  });

  test.each([SubscriptionProvider.STRIPE, SubscriptionProvider.CUSTOM])(
    "rejects a %s plan with a trial",
    async (provider) => {
      const error = await insertPlan({ provider, trialDays: 14 }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain(CONSTRAINT);
    },
  );

  test.each([SubscriptionProvider.STRIPE, SubscriptionProvider.CUSTOM])(
    "allows a %s plan without trial",
    async (provider) => {
      const [plan] = await insertPlan({ provider });

      expect(plan?.trialDays).toBeNull();
    },
  );
});
