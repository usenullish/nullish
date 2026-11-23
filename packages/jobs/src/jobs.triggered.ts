import { Jobs } from "./jobs";
import type {
  Jobs as JobsType,
  TriggerJobs,
  TriggeredJobKey,
} from "@usenullish/nullish-schema/jobs";
import type { JobArgs } from "./_types";
import { PdfInvoiceJob } from "./jobs/pdf-invoices";
import { MigrationJob } from "./jobs/migrations";
import { MailJob } from "./jobs/mails";
import type { TriggeredJob } from "./jobs/_job.triggered";
import { assertNonNullish } from "@usenullish/nullish-common";

export class TriggeredJobs extends Jobs<TriggeredJobKey, TriggeredJob> implements TriggerJobs {
  protected constructor(args: { jobs: TriggeredJob[] }) {
    super(args);
  }

  static async start(args: JobArgs): Promise<TriggeredJobs> {
    const jobs = await Promise.all(
      [PdfInvoiceJob, MigrationJob, MailJob].map(async (Job) => {
        return await Job.start(args);
      }),
    );

    return new this({ jobs });
  }

  async trigger<P>({
    key,
    payload,
    delay,
  }: {
    key: TriggeredJobKey;
    payload: P;
    delay?: number;
  }): Promise<JobsType["Common"]["ScheduledJobs"]> {
    const job = this._jobs[key];

    assertNonNullish(job, `Job ${key} has not been started`);

    return await job.trigger({ payload, delay });
  }
}
