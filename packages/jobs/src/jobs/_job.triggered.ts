import type { JobArgs } from "../_types";
import * as z from "zod";
import { type Jobs, TriggeredJobKey } from "@usenullish/nullish-schema/jobs";
import { Job } from "./_job";

export abstract class TriggeredJob<
  PayloadSchema extends z.ZodType = z.ZodType,
  ResultSchema extends z.ZodType = z.ZodType,
> extends Job<PayloadSchema, ResultSchema> {
  protected constructor(
    args: JobArgs & {
      key: TriggeredJobKey;
      payloadSchema: PayloadSchema;
      resultSchema: ResultSchema;
      attempts?: number;
      concurrency?: number;
    },
  ) {
    super(args);
  }

  async trigger({
    payload,
    delay,
  }: {
    payload: z.infer<PayloadSchema>;
    delay?: number;
  }): Promise<Jobs["Common"]["ScheduledJobs"]> {
    const jobId = crypto.randomUUID();

    // We use the same name for the queue as the worker - i.e. one worker === one queue
    await this._queue.add(this._key, this._payloadSchema.parse(payload), {
      jobId,
      delay,
    });

    return { jobId };
  }
}
