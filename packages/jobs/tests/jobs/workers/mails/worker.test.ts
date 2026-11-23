import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { envAppUrl, envDbUrl } from "@usenullish/nullish-env";
import {
  DbSchema,
  DefaultTemplateLanguage,
  SubscriptionStatus,
} from "@usenullish/nullish-schema/db";
import { MailJobType } from "@usenullish/nullish-schema/jobs";
import { MailType, type SendMail } from "@usenullish/nullish-schema/mail";
import { SUBSCRIPTION_PLANS_PATH } from "@usenullish/nullish-schema/server";
import { createOrganization, resetDb, seedUser, TEST_USER_ID } from "../../../_test-utils";
import { MailsWorker } from "../../../../src/jobs/workers/mails/worker";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const organizations = DbSchema.Core.Organizations.OrganizationsSchema;
const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

describe("MailsWorker", () => {
  const send = mock<SendMail["send"]>(async () => undefined);

  const run = ({ organizationId }: { organizationId: string }) =>
    MailsWorker.create({
      db,
      mail: { send },
      payload: {
        type: MailJobType.SubscriptionTrialReminder,
        userId: TEST_USER_ID,
        organizationId,
        lang: DefaultTemplateLanguage.FR,
      },
    }).run();

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });
  });

  afterEach(() => {
    send.mockClear();
  });

  afterAll(async () => {
    await resetDb({ db });
    await client.close();
  });

  test("sends the subscription trial reminder of a trialing organization", async () => {
    const organizationId = await createOrganization({ db, withAddress: false });
    const periodEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    await db
      .update(subscriptions)
      .set({ status: SubscriptionStatus.TRIALING, periodEnd })
      .where(eq(subscriptions.organizationId, organizationId));

    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId));
    assertNonNullish(organization);

    const result = await run({ organizationId });

    expect(result.status).toBe("success");
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      type: MailType.SUBSCRIPTION_TRIAL_REMINDER,
      to: `${TEST_USER_ID}@test.dev`,
      lang: DefaultTemplateLanguage.FR,
      url: `${envAppUrl()}/orgs/${organizationId}${SUBSCRIPTION_PLANS_PATH}`,
      organization: { name: organization.name },
      subscription: { periodEnd },
    });
  });

  test("sends nothing for an organization that is not trialing", async () => {
    const organizationId = await createOrganization({ db, withAddress: false });

    const result = await run({ organizationId });

    expect(result.status).toBe("success");
    expect(send).not.toHaveBeenCalled();
  });

  test("returns an error Result when the email cannot be sent", async () => {
    const organizationId = await createOrganization({ db, withAddress: false });

    await db
      .update(subscriptions)
      .set({
        status: SubscriptionStatus.TRIALING,
        periodEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      })
      .where(eq(subscriptions.organizationId, organizationId));

    send.mockImplementationOnce(async () => {
      throw new Error("SMTP unavailable");
    });

    const result = await run({ organizationId });

    expect(result.status).toBe("error");
  });
});
