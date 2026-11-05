import type { z } from "zod";
import type { JobsSchema } from "./_schemas";
import type { TriggeredJobKey } from "./_constants";
import type { createScheduledJobStateSchema } from "./_builders";

type ScheduledJobs = z.infer<typeof JobsSchema.CommonSchema.ScheduledJobSchema>;
type JobId = ScheduledJobs["jobId"];

export type ScheduledJobState<T = unknown> = z.infer<
  ReturnType<typeof createScheduledJobStateSchema<z.ZodType<T>>>
>;

export interface TriggerJobs {
  trigger<P>(args: { key: TriggeredJobKey; payload: P }): Promise<ScheduledJobs>;
  getPayload<P>(args: { key: TriggeredJobKey; jobId: JobId }): Promise<P>;
  getState<S = ScheduledJobState>(args: { key: TriggeredJobKey; jobId: JobId }): Promise<S>;
}
