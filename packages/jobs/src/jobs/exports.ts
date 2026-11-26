import { JobFactory } from "./_job";
import type { Common } from "@usenullish/nullish-schema/primitives";
import { type Jobs, JobsSchema, TriggeredJobKey } from "@usenullish/nullish-schema/jobs";
import type { JobArgs } from "../_types";
import { ExportsWorker } from "./workers/exports/worker";
import { withDbContext } from "../_db";
import { TriggeredJob } from "./_job.triggered";

const ExportJobPayloadSchema = JobsSchema.ExportsSchema.ExportPayloadSchema;
const ExportJobResultSchema = JobsSchema.ExportsSchema.ExportResultSchema;

@JobFactory
export class ExportJob extends TriggeredJob<
  typeof ExportJobPayloadSchema,
  typeof ExportJobResultSchema
> {
  protected constructor(args: JobArgs) {
    super({
      ...args,
      key: TriggeredJobKey.Export,
      payloadSchema: ExportJobPayloadSchema,
      resultSchema: ExportJobResultSchema,
    });
  }

  static async start({ dbUrl }: { dbUrl: Common["PostgresUrl"] }): Promise<ExportJob> {
    return new this({ dbUrl });
  }

  protected override async worker({
    payload,
  }: {
    payload: Jobs["Exports"]["Payload"];
  }): Promise<Jobs["Exports"]["Result"]> {
    const result = await withDbContext(async (dbContext) => {
      return await ExportsWorker.create({
        db: dbContext.connection,
        payload,
      }).run();
    });

    if (result.status === "error") {
      throw result.err;
    }

    return result.result;
  }
}
