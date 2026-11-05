import { Jobs } from "./jobs";
import type { ScheduledJobKey } from "./constants";
import type { JobArgs } from "./_types";
import { PdfCleanupJob } from "./jobs/pdf-cleanup";
import type { ScheduledJob } from "./jobs/_job.scheduled";
import { tryCatch } from "@usenullish/nullish-common";

export class ScheduledJobs extends Jobs<ScheduledJobKey, ScheduledJob> {
  protected constructor(args: { jobs: ScheduledJob[] }) {
    super(args);
  }

  static async start(args: JobArgs): Promise<ScheduledJobs> {
    const jobs = await Promise.all(
      [PdfCleanupJob].map(async (Job) => {
        return await Job.start(args);
      }),
    );

    const scheduled = await tryCatch(() =>
      Promise.all(
        jobs.map(async (job) => {
          await job.schedule();
        }),
      ),
    );

    // In case the scheduled jobs cannot start we should ensure triggered are stopped before returning an error
    // i.e. we deal with stopping jobs because the consumer assume none are started in case of error.
    if (scheduled.status === "error") {
      await Promise.all(
        jobs.map(async (job) => {
          await job.stop();
        }),
      );
      throw scheduled.err;
    }

    return new this({ jobs });
  }
}
