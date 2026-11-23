import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
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
import type { SendMail } from "@usenullish/nullish-schema/mail";
import type { Common } from "@usenullish/nullish-schema/primitives";
import { setupJobQueuesDb } from "../../src/_setup";
import { createOrganization, resetDb, seedUser, TEST_USER_ID } from "../_test-utils";
import { MailJob } from "../../src/jobs/mails";

const dbUrl = envDbUrl();

const client = new BunSQL(dbUrl);
const db = drizzle({ client });

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

const MAIL_KEYS = [
  "NULLISH_MAIL_FROM",
  "NULLISH_MAIL_SMTP_URL",
  "NULLISH_MAIL_SES_REGION",
  "NULLISH_MAIL_SES_ACCESS_KEY_ID",
  "NULLISH_MAIL_SES_SECRET_ACCESS_KEY",
] as const;

class TestMailJob extends MailJob {
  static create({ dbUrl }: { dbUrl: Common["PostgresUrl"] }): TestMailJob {
    return new this({ dbUrl, mail: { send: mock<SendMail["send"]>(async () => undefined) } });
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

  describe("start", () => {
    const saved = new Map<string, string | undefined>();

    beforeEach(() => {
      for (const key of MAIL_KEYS) {
        saved.set(key, process.env[key]);
        delete process.env[key];
      }
    });

    afterEach(() => {
      for (const key of MAIL_KEYS) {
        const value = saved.get(key);
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });

    test("starts with the mail provider of the configuration", async () => {
      process.env.NULLISH_MAIL_FROM = "noreply@test.dev";
      process.env.NULLISH_MAIL_SMTP_URL = "smtp://localhost:1025";

      const started = await MailJob.start({ dbUrl });

      expect(started).toBeInstanceOf(MailJob);

      await started.stop();
    });

    test("throws when the mail provider cannot be created", async () => {
      process.env.NULLISH_MAIL_FROM = "noreply@test.dev";
      process.env.NULLISH_MAIL_SMTP_URL = "smtp://localhost:1025";
      process.env.NULLISH_MAIL_SES_REGION = "eu-central-2";
      process.env.NULLISH_MAIL_SES_ACCESS_KEY_ID = "access-key-id";
      process.env.NULLISH_MAIL_SES_SECRET_ACCESS_KEY = "secret-access-key";

      await expect(MailJob.start({ dbUrl })).rejects.toThrow(
        "Emails are sent with either SMTP or Amazon SES, not both.",
      );
    });
  });
});
