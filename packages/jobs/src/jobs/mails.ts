import { JobFactory } from "./_job";
import type { Common } from "@usenullish/nullish-schema/primitives";
import { type Jobs, JobsSchema, TriggeredJobKey } from "@usenullish/nullish-schema/jobs";
import type { SendMail } from "@usenullish/nullish-schema/mail";
import { createMailProvider } from "@usenullish/nullish-mail";
import type { JobArgs } from "../_types";
import { withDbContext } from "../_db";
import { TriggeredJob } from "./_job.triggered";
import { MailsWorker } from "./workers/mails/worker";

const MailJobPayloadSchema = JobsSchema.MailsSchema.MailPayloadSchema;
const MailJobResultSchema = JobsSchema.MailsSchema.MailResultSchema;

@JobFactory
export class MailJob extends TriggeredJob<typeof MailJobPayloadSchema, typeof MailJobResultSchema> {
  readonly #mail: SendMail;

  protected constructor({ mail, ...args }: JobArgs & { mail: SendMail }) {
    super({
      ...args,
      key: TriggeredJobKey.Mail,
      payloadSchema: MailJobPayloadSchema,
      resultSchema: MailJobResultSchema,
    });

    this.#mail = mail;
  }

  static async start({ dbUrl }: { dbUrl: Common["PostgresUrl"] }): Promise<MailJob> {
    // TODO: find a better pattern. Not sure the provider should be created here.
    const mail = createMailProvider();

    if (mail.status === "error") {
      throw mail.err;
    }

    return new this({ dbUrl, mail: mail.result });
  }

  protected override async worker({
    payload,
  }: {
    payload: Jobs["Mails"]["Payload"];
  }): Promise<Jobs["Mails"]["Result"]> {
    const result = await withDbContext(async (dbContext) => {
      return await MailsWorker.create({
        db: dbContext.connection,
        mail: this.#mail,
        payload,
      }).run();
    });

    if (result.status === "error") {
      throw result.err;
    }

    return null;
  }
}
