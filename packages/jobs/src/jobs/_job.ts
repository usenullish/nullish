import { Queue, Worker, type Job as BullJob, type PostgresPoolConfig } from "bullmq";
import { assertNonNullish, type Result, tryCatch } from "@usenullish/nullish-common";
import { JOB_QUEUES_SCHEMA, ScheduledJobKey } from "../constants";
import type { JobArgs } from "../_types";
import * as z from "zod";
import { createScheduledJobStateSchema, TriggeredJobKey } from "@usenullish/nullish-schema/jobs";

interface Factory<T> {
  start(args: JobArgs): Promise<T>;
}

export function JobFactory<PayloadSchema extends z.ZodType>(
  _constructor: Factory<Job<PayloadSchema>>,
) {}

export abstract class Job<
  PayloadSchema extends z.ZodType = z.ZodType,
  ResultSchema extends z.ZodType = z.ZodType,
> {
  readonly #key: TriggeredJobKey | ScheduledJobKey;

  readonly #payloadSchema: PayloadSchema;
  readonly #resultSchema: ResultSchema;

  readonly #queue: Queue;
  readonly #worker: Worker;

  protected constructor({
    dbUrl,
    key,
    payloadSchema,
    resultSchema,
    attempts = 3,
    concurrency = 3,
  }: JobArgs & {
    key: TriggeredJobKey | ScheduledJobKey;
    payloadSchema: PayloadSchema;
    resultSchema: ResultSchema;
    attempts?: number;
    concurrency?: number;
  }) {
    this.#key = key;
    this.#payloadSchema = payloadSchema;
    this.#resultSchema = resultSchema;

    // BullMQ opens a Postgres pool per queue and per worker, 10 connections each by default, which adds up
    // against the database's connection limit shared with the app. A worker never needs more than one per
    // job it processes at the same time.
    const connection: PostgresPoolConfig = {
      connectionString: dbUrl,
      schema: JOB_QUEUES_SCHEMA,
      max: concurrency,
    };

    this.#queue = new Queue(key, {
      connection,
      defaultJobOptions: {
        attempts,
        backoff: {
          type: "exponential",
          delay: 2000, // Wait 2s, 4s, 8s between retries
        },
        removeOnComplete: {
          age: 3600, // keep up to 1 hour. Needed e.g. to retrieve the job and when completed the result such as the generated document ID
        },
        removeOnFail: {
          age: 24 * 3600, // keep up to 24 hours
        },
      },
    });

    this.#worker = new Worker(
      key,
      async (job: BullJob<z.infer<PayloadSchema>>): Promise<z.infer<ResultSchema>> => {
        const result = await this.worker({ payload: job.data });
        return this.#resultSchema.parse(result);
      },
      {
        // We must duplicate the connection in the worker otherwise bullmq crashes with:
        // Cannot destructure property 'schema' from null or undefined value
        connection,
        concurrency,
      },
    );

    this.#worker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} failed after ${job?.attemptsMade ?? "unknown"} attempts`, err);
    });

    this.#worker.on("error", (err) => {
      console.error("Worker error", err);
    });
  }

  protected abstract worker(args: {
    payload: z.infer<PayloadSchema>;
  }): Promise<z.infer<ResultSchema>>;

  protected get _key(): TriggeredJobKey | ScheduledJobKey {
    return this.#key;
  }

  protected get _queue(): Queue {
    return this.#queue;
  }

  protected get _payloadSchema(): PayloadSchema {
    return this.#payloadSchema;
  }

  get queueName(): TriggeredJobKey | ScheduledJobKey {
    return this.#key;
  }

  async getPayload({ jobId }: { jobId: string }): Promise<z.infer<PayloadSchema>> {
    const job = await this.#getJob({ jobId });

    return this.#payloadSchema.parse(job.data);
  }

  async getState({
    jobId,
  }: {
    jobId: string;
  }): Promise<z.infer<ReturnType<typeof createScheduledJobStateSchema<ResultSchema>>>> {
    const job = await this.#getJob({ jobId });

    const status = await job.getState();

    const stateSchema = createScheduledJobStateSchema({
      schema: this.#resultSchema,
    });

    switch (status) {
      case "completed":
        return stateSchema.parse({
          status: "completed",
          result: job.returnvalue,
        });

      case "failed":
        return stateSchema.parse({
          status: "failed",
          reason: job.failedReason,
        });

      default:
        return stateSchema.parse({
          status,
        });
    }
  }

  async #getJob({ jobId }: { jobId: string }): Promise<BullJob<z.infer<PayloadSchema>>> {
    const job = await this.#queue.getJob(jobId);

    assertNonNullish(job, `Job ${jobId} does not exist`);

    return job;
  }

  stop(): Promise<Result<void>> {
    return tryCatch(async () => {
      await this.#worker.close();
      await this.#queue.close();
    });
  }
}
