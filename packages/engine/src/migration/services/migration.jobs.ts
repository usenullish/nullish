import type { DbUserContextArgs } from "@usenullish/nullish-db";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { MigrationStatus } from "@usenullish/nullish-schema/db";
import {
  type Jobs as JobsType,
  type TriggerJobs,
  TriggeredJobKey,
} from "@usenullish/nullish-schema/jobs";
import type { Records } from "@usenullish/nullish-schema/records";
import { EngineError } from "../../errors";
import { ServiceContext } from "../../_service/service";
import { getMigration } from "../_helpers/migrations";

type Migration = Records["Migration"]["Migrations"]["Select"];
type UserId = Records["Auth"]["Users"]["Select"]["id"];

export type JobsMigrationServiceArgs = DbUserContextArgs & {
  migrationId: Migration["id"];
  jobs: TriggerJobs;
};

class MigrationAlreadySucceededError extends EngineError {}

export class JobsMigrationService extends ServiceContext {
  readonly #migrationId: Migration["id"];
  readonly #jobs: TriggerJobs;
  readonly #userId: UserId;

  private constructor({ migrationId, jobs, userId, ...rest }: JobsMigrationServiceArgs) {
    super({ userId, ...rest });

    this.#migrationId = migrationId;
    this.#jobs = jobs;
    this.#userId = userId;
  }

  static create(args: JobsMigrationServiceArgs): JobsMigrationService {
    return new this(args);
  }

  start(): Promise<Result<JobsType["Common"]["ScheduledJobs"]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 1. Ensure the user has access to the migration and that it can run it
        const migration = await getMigration({ tx, id: this.#migrationId });

        this.#assertRunnable({ migration });

        // 2. Trigger the job
        return await this.#jobs.trigger({
          key: TriggeredJobKey.Migration,
          payload: {
            migrationId: migration.id,
            userId: this.#userId,
          },
        });
      });
    });
  }

  jobState({
    jobId,
  }: Pick<JobsType["Common"]["ScheduledJobs"], "jobId">): Promise<
    Result<JobsType["Migrations"]["State"]>
  > {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 1. Ensure the user has access to the migration
        const migration = await getMigration({ tx, id: this.#migrationId });

        // 2. Ensure the job is the one of the migration
        const { migrationId } = await this.#jobs.getPayload<JobsType["Migrations"]["Payload"]>({
          key: TriggeredJobKey.Migration,
          jobId,
        });

        if (migrationId !== migration.id) {
          throw new Error(`Job ${jobId} does not exist`);
        }

        // 3. Retrieve the job state
        return await this.#jobs.getState<JobsType["Migrations"]["State"]>({
          key: TriggeredJobKey.Migration,
          jobId,
        });
      });
    });
  }

  #assertRunnable({ migration: { id, status } }: { migration: Migration }) {
    if (status === MigrationStatus.SUCCEEDED) {
      throw new MigrationAlreadySucceededError(
        `Migration ${id} has already succeeded and cannot be run again`,
      );
    }
  }
}
