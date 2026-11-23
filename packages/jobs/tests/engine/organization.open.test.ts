import { afterAll, afterEach, beforeAll, describe, expect, mock, spyOn, test } from "bun:test";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, type Nullable } from "@usenullish/nullish-common";
import {
  DbSchema,
  DefaultTemplateLanguage,
  LegalForm,
  MembershipRole,
  SubscriptionProvider,
} from "@usenullish/nullish-schema/db";
import { MailJobType, TriggeredJobKey } from "@usenullish/nullish-schema/jobs";
import type { ProcessPayments } from "@usenullish/nullish-schema/payments";
import { OpenOrganizationService } from "@usenullish/nullish-engine/core";
import { envDbUrl } from "@usenullish/nullish-env";
import { type StartedJobs, startJobs } from "../../src/start";
import type { TriggeredJobs } from "../../src/jobs.triggered";
import { resetDb, seedUser, TEST_USER_ID } from "../_test-utils";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;
const plans = DbSchema.Subscription.Plans.PlansSchema;
const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;

const DAY_MS = 24 * 60 * 60 * 1000;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const payments: ProcessPayments = {
  handle: mock<ProcessPayments["handle"]>(async () => undefined),
  checkout: mock<ProcessPayments["checkout"]>(async () => ({
    url: "https://checkout.stripe.com/c/pay/cs_1",
  })),
  manage: mock<ProcessPayments["manage"]>(async () => ({
    url: "https://billing.stripe.com/p/session/bps_1",
  })),
  cancel: mock<ProcessPayments["cancel"]>(),
  listPlans: mock<ProcessPayments["listPlans"]>(async () => []),
};

describe("OpenOrganizationService", () => {
  const planIds: string[] = [];

  let jobs: TriggeredJobs;
  let closeJobs: StartedJobs["close"];
  let initialPlanId: string;

  const open = ({ withPayments }: { withPayments: boolean }) =>
    OpenOrganizationService.create({
      db,
      userId: TEST_USER_ID,
      jobs,
      payments: withPayments ? payments : (null as Nullable<ProcessPayments>),
    }).open({
      values: { name: "Opened Org", legalForm: LegalForm.LLC },
      lang: DefaultTemplateLanguage.FR,
    });

  const useInitialPlan = async ({ trialDays }: { trialDays: number }) => {
    const [plan] = await db
      .insert(plans)
      .values({ provider: SubscriptionProvider.SELF, trialDays })
      .returning();
    assertNonNullish(plan);
    planIds.push(plan.id);

    await db.update(subscriptionSettings).set({ initialPlanId: plan.id });
  };

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });

    const [settings] = await db.select().from(subscriptionSettings);
    assertNonNullish(settings);
    initialPlanId = settings.initialPlanId;

    const started = await startJobs();

    if (started.status === "error") {
      throw started.err;
    }

    jobs = started.result.triggered;
    closeJobs = started.result.close;
  });

  afterEach(async () => {
    mock.restore();
    await db.update(subscriptionSettings).set({ initialPlanId });
  });

  afterAll(async () => {
    await closeJobs();
    await resetDb({ db });
    await db.delete(plans).where(inArray(plans.id, planIds));
    await client.close();
  });

  test("opens the organization and makes the caller its admin", async () => {
    const result = await open({ withPayments: false });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.name).toBe("Opened Org");

    const [membership] = await db
      .select()
      .from(memberships)
      .where(
        and(eq(memberships.organizationId, result.result.id), eq(memberships.userId, TEST_USER_ID)),
      );

    expect(membership?.role).toBe(MembershipRole.ADMIN);
  });

  test("schedules no reminder without payments", async () => {
    await useInitialPlan({ trialDays: 14 });
    const trigger = spyOn(jobs, "trigger");

    const result = await open({ withPayments: false });

    expect(result.status).toBe("success");
    expect(trigger).not.toHaveBeenCalled();
  });

  test("schedules no reminder without a trial", async () => {
    const trigger = spyOn(jobs, "trigger");

    const result = await open({ withPayments: true });

    expect(result.status).toBe("success");
    expect(trigger).not.toHaveBeenCalled();
  });

  test("schedules the reminder three days before the end of a trial", async () => {
    await useInitialPlan({ trialDays: 14 });
    const trigger = spyOn(jobs, "trigger");

    const result = await open({ withPayments: true });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(trigger).toHaveBeenCalledTimes(1);

    const [args] = trigger.mock.calls[0] ?? [];

    expect(args?.key).toBe(TriggeredJobKey.Mail);
    expect(args?.payload).toEqual({
      type: MailJobType.SubscriptionTrialReminder,
      userId: TEST_USER_ID,
      organizationId: result.result.id,
      lang: DefaultTemplateLanguage.FR,
    });
    expect(args?.delay).toBeGreaterThan(11 * DAY_MS - 60_000);
    expect(args?.delay).toBeLessThanOrEqual(11 * DAY_MS);
  });

  test("schedules the reminder halfway through a trial shorter than six days", async () => {
    await useInitialPlan({ trialDays: 2 });
    const trigger = spyOn(jobs, "trigger");

    const result = await open({ withPayments: true });

    expect(result.status).toBe("success");

    const [args] = trigger.mock.calls[0] ?? [];

    expect(args?.delay).toBeGreaterThan(DAY_MS - 60_000);
    expect(args?.delay).toBeLessThanOrEqual(DAY_MS);
  });

  test("still opens the organization when the reminder cannot be scheduled", async () => {
    await useInitialPlan({ trialDays: 14 });
    spyOn(jobs, "trigger").mockRejectedValue(new Error("Queue unavailable"));
    const error = spyOn(console, "error").mockImplementation(() => {});

    const result = await open({ withPayments: true });

    expect(result.status).toBe("success");
    expect(error).toHaveBeenCalled();
  });
});
