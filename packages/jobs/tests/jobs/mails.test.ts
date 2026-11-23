import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  DbSchema,
  DefaultTemplateLanguage,
  SubscriptionStatus,
} from "@usenullish/nullish-schema/db";
import { type Jobs, MailJobType } from "@usenullish/nullish-schema/jobs";
import type { Common } from "@usenullish/nullish-schema/primitives";
import { setupJobQueuesDb } from "../../src/_setup";
import { createOrganization, resetDb, seedUser, TEST_USER_ID } from "../_test-utils";
import { MailJob } from "../../src/jobs/mails";

const dbUrl = envDbUrl();

const client = new BunSQL(dbUrl);
const db = drizzle({ client });

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

class TestMailJob extends MailJob {
  static create({ dbUrl }: { dbUrl: Common["PostgresUrl"] }): TestMailJob {
    return new this({ dbUrl });
  }

  run(args: { payload: Jobs["Mails"]["Payload"] }): Promise<Jobs["Mails"]["Result"]> {
    return this.worker(args);
  }
}

describe("MailJob", () => {
  let job: TestMailJob;

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });

    await setupJobQueuesDb({ dbUrl });
    job = TestMailJob.create({ dbUrl });
  });

  afterAll(async () => {
    await job.stop();
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

    const result = await job.run({
      payload: {
        type: MailJobType.SubscriptionTrialReminder,
        userId: TEST_USER_ID,
        organizationId,
        lang: DefaultTemplateLanguage.EN,
      },
    });

    expect(result).toBeNull();
  });
});
