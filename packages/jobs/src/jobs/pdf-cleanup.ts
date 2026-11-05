import { JobFactory } from "./_job";
import { ScheduledJob } from "./_job.scheduled";
import type { Common } from "@usenullish/nullish-schema/primitives";
import { type Jobs, JobsSchema } from "@usenullish/nullish-schema/jobs";
import { PdfCleanupWorker } from "./workers/pdf-cleanup/worker";
import type { JobArgs } from "../_types";
import { ScheduledJobKey } from "../constants";

const PdfCleanupJobPayloadSchema = JobsSchema.PdfCleanupSchema.PdfCleanupPayloadSchema;
const PdfCleanupJobResultSchema = JobsSchema.PdfCleanupSchema.PdfCleanupResultSchema;

export const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

@JobFactory
export class PdfCleanupJob extends ScheduledJob<
  typeof PdfCleanupJobPayloadSchema,
  typeof PdfCleanupJobResultSchema
> {
  protected constructor(args: JobArgs) {
    super({
      ...args,
      key: ScheduledJobKey.PdfCleanup,
      payloadSchema: PdfCleanupJobPayloadSchema,
      resultSchema: PdfCleanupJobResultSchema,
      intervalMs: CLEANUP_INTERVAL_MS,
    });
  }

  static async start({ dbUrl }: { dbUrl: Common["PostgresUrl"] }): Promise<PdfCleanupJob> {
    return new this({ dbUrl });
  }

  protected override async worker(): Promise<Jobs["PdfCleanup"]["Result"]> {
    const result = await PdfCleanupWorker.create().run();

    if (result.status === "error") {
      throw result.err;
    }

    return null;
  }
}
