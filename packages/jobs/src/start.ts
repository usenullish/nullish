import { type Result, tryCatch } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import { setupJobQueuesDb } from "./_setup";
import type { JobArgs } from "./_types";
import { TriggeredJobs } from "./jobs.triggered";
import { ScheduledJobs } from "./jobs.scheduled";
import { PdfGenerator } from "./jobs/workers/pdf-invoices/_helpers/pdf-generator";

export interface StartedJobs {
  triggered: TriggeredJobs;
  scheduled: ScheduledJobs;

  close: () => Promise<void>;
}

export const startJobs = async (): Promise<Result<StartedJobs>> => {
  return await tryCatch(async () => {
    const args: Pick<JobArgs, "dbUrl"> = {
      dbUrl: envDbUrl(),
    };

    await setupJobQueuesDb(args);

    const triggered = await TriggeredJobs.start(args);

    const scheduledResult = await tryCatch(() => ScheduledJobs.start(args));

    if (scheduledResult.status === "error") {
      await triggered.stop();
      throw scheduledResult.err;
    }

    const { result: scheduled } = scheduledResult;

    const close = async () => {
      // Close jobs
      await triggered.stop();
      await scheduled.stop();

      // Close shared resources that need cleanup on exist
      await PdfGenerator.close();
    };

    return { triggered, scheduled, close };
  });
};
