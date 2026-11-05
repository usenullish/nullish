import { JobFactory } from "./_job";
import type { Common } from "@usenullish/nullish-schema/primitives";
import { type Jobs, JobsSchema, TriggeredJobKey } from "@usenullish/nullish-schema/jobs";
import type { JobArgs } from "../_types";
import { MigrationsWorker } from "./workers/migrations/worker";
import { withDbContext } from "../_db";
import { TriggeredJob } from "./_job.triggered";

const MigrationJobPayloadSchema = JobsSchema.MigrationsSchema.MigrationPayloadSchema;
const MigrationJobResultSchema = JobsSchema.MigrationsSchema.MigrationResultSchema;

@JobFactory
export class MigrationJob extends TriggeredJob<
  typeof MigrationJobPayloadSchema,
  typeof MigrationJobResultSchema
> {
  protected constructor(args: JobArgs) {
    super({
      ...args,
      key: TriggeredJobKey.Migration,
      payloadSchema: MigrationJobPayloadSchema,
      resultSchema: MigrationJobResultSchema,
      // We don't want to retry automatically migration jobs given
      // the migration itself either ends in failed or succeeded and
      // is deferred to the user to retry or not.
      attempts: 1,
    });
  }

  static async start({ dbUrl }: { dbUrl: Common["PostgresUrl"] }): Promise<MigrationJob> {
    return new this({ dbUrl });
  }

  protected override async worker({
    payload,
  }: {
    payload: Jobs["Migrations"]["Payload"];
  }): Promise<Jobs["Migrations"]["Result"]> {
    const result = await withDbContext(async (dbContext) => {
      return await MigrationsWorker.create({
        db: dbContext.connection,
        payload,
      }).run();
    });

    if (result.status === "error") {
      throw result.err;
    }

    return null;
  }
}
