import type { JobArgs } from "../_types";
import * as z from "zod";
import { Job } from "./_job";
import type { ScheduledJobKey } from "../constants";

export abstract class ScheduledJob<
  PayloadSchema extends z.ZodType = z.ZodType,
  ResultSchema extends z.ZodType = z.ZodType,
> extends Job<PayloadSchema, ResultSchema> {
  readonly #intervalMs: number;

  protected constructor({
    intervalMs,
    ...args
  }: JobArgs & {
    key: ScheduledJobKey;
    payloadSchema: PayloadSchema;
    resultSchema: ResultSchema;
    attempts?: number;
    concurrency?: number;
    intervalMs: number;
  }) {
    super(args);

    this.#intervalMs = intervalMs;
  }

  async schedule(): Promise<void> {
    await this._queue.upsertJobScheduler(
      this._key,
      { every: this.#intervalMs },
      {
        name: this._key,
      },
    );
  }

  async unschedule(): Promise<void> {
    await this._queue.removeJobScheduler(this._key);
  }
}
