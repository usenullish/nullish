import { JobFactory } from "./_job";
import type { Common } from "@usenullish/nullish-schema/primitives";
import { type Jobs, JobsSchema, TriggeredJobKey } from "@usenullish/nullish-schema/jobs";
import type { JobArgs } from "../_types";
import { withDbContext } from "../_db";
import { TriggeredJob } from "./_job.triggered";
import { MailsWorker } from "./workers/mails/worker";

const MailJobPayloadSchema = JobsSchema.MailsSchema.MailPayloadSchema;
const MailJobResultSchema = JobsSchema.MailsSchema.MailResultSchema;

@JobFactory
export class MailJob extends TriggeredJob<typeof MailJobPayloadSchema, typeof MailJobResultSchema> {
  protected constructor(args: JobArgs) {
    super({
      ...args,
      key: TriggeredJobKey.Mail,
      payloadSchema: MailJobPayloadSchema,
      resultSchema: MailJobResultSchema,
    });
  }

  static async start({ dbUrl }: { dbUrl: Common["PostgresUrl"] }): Promise<MailJob> {
    return new this({ dbUrl });
  }

  protected override async worker({
    payload,
  }: {
    payload: Jobs["Mails"]["Payload"];
  }): Promise<Jobs["Mails"]["Result"]> {
    const result = await withDbContext(async (dbContext) => {
      return await MailsWorker.create({
        db: dbContext.connection,
        payload,
      }).run();
    });

    if (result.status === "error") {
      throw result.err;
    }

    return null;
  }
}
