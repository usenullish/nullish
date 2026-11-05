import { type Result, tryCatch } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import { setupJobQueuesDb } from "./_setup";
import type { JobArgs } from "./_types";
import { TriggeredJobs } from "./jobs.triggered";
import { ScheduledJobs } from "./jobs.scheduled";

export interface StartedJobs {
  triggered: TriggeredJobs;
  scheduled: ScheduledJobs;
}

export const startJobs = async (): Promise<Result<StartedJobs>> => {
  return await tryCatch(async () => {
    const args: Pick<JobArgs, "dbUrl"> = {
      dbUrl: envDbUrl(),
    };

    await setupJobQueuesDb(args);

    const triggered = await TriggeredJobs.start(args);

    const scheduled = await tryCatch(() => ScheduledJobs.start(args));

    if (scheduled.status === "error") {
      await triggered.stop();
      throw scheduled.err;
    }

    return { triggered, scheduled: scheduled.result };
  });
};
