import { ExportService, type ExportServiceArgs } from "./_export";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import {
  type Jobs as JobsType,
  type TriggerJobs,
  TriggeredJobKey,
} from "@usenullish/nullish-schema/jobs";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Services } from "@usenullish/nullish-schema/services";

interface JobContextArgs {
  jobs: TriggerJobs;
}

type JobsExportServiceArgs = ExportServiceArgs & JobContextArgs;
type UserId = Records["Auth"]["Users"]["Select"]["id"];

export class JobsExportService extends ExportService {
  readonly #jobs: TriggerJobs;
  readonly #userId: UserId;

  private constructor({ jobs, userId, ...rest }: JobsExportServiceArgs) {
    super({ userId, ...rest });

    this.#jobs = jobs;
    this.#userId = userId;
  }

  static create(args: JobsExportServiceArgs): JobsExportService {
    return new this(args);
  }

  generate(): Promise<Result<JobsType["Common"]["ScheduledJobs"]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 1. Ensure the user has privileges to access the organization
        const organization = await this._loadOrganization({ tx });

        // 2. Trigger the job
        return await this.#jobs.trigger({
          key: TriggeredJobKey.Export,
          payload: {
            organizationId: organization.id,
            userId: this.#userId,
          },
        });
      });
    });
  }

  jobState(
    args: Services["Exports"]["JobState"]["Args"],
  ): Promise<Result<Services["Exports"]["JobState"]["Result"]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 1. Ensure the user has privileges to access the organization
        const organization = await this._loadOrganization({ tx });

        // 2. Ensure the job is an export of the organization
        const { organizationId } = await this.#jobs.getPayload<JobsType["Exports"]["Payload"]>({
          key: TriggeredJobKey.Export,
          ...args,
        });

        if (organizationId !== organization.id) {
          throw new Error(`Job ${args.jobId} does not exist`);
        }

        // 3. Retrieve the job state
        return await this.#jobs.getState({
          key: TriggeredJobKey.Export,
          ...args,
        });
      });
    });
  }
}
