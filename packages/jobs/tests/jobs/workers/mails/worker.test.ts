import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  DbSchema,
  DefaultTemplateLanguage,
  SubscriptionStatus,
} from "@usenullish/nullish-schema/db";
import { MailJobType } from "@usenullish/nullish-schema/jobs";
import type { SendMail } from "@usenullish/nullish-schema/mail";
import { createOrganization, resetDb, seedUser, TEST_USER_ID } from "../../../_test-utils";
import { MailsWorker } from "../../../../src/jobs/workers/mails/worker";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

describe("MailsWorker", () => {
  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });
  });

  afterAll(async () => {
    await resetDb({ db });
    await client.close();
  });

  test("runs the subscription trial reminder of an organization", async () => {
    const organizationId = await createOrganization({ db, withAddress: false });

    await db
      .update(subscriptions)
      .set({
        status: SubscriptionStatus.TRIALING,
        periodEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      })
      .where(eq(subscriptions.organizationId, organizationId));

    const result = await MailsWorker.create({
      db,
      mail: { send: mock<SendMail["send"]>(async () => undefined) },
      payload: {
        type: MailJobType.SubscriptionTrialReminder,
        userId: TEST_USER_ID,
        organizationId,
        lang: DefaultTemplateLanguage.EN,
      },
    }).run();

    expect(result.status).toBe("success");
  });
});
