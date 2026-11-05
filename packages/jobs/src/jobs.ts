import type { ScheduledJobKey } from "./constants";
import type { Job } from "./jobs/_job";
import { assertNonNullish } from "@usenullish/nullish-common";
import { type Jobs as JobsType, type TriggeredJobKey } from "@usenullish/nullish-schema/jobs";

type JobQueues<Key extends TriggeredJobKey | ScheduledJobKey, J extends Job> = {
  [key in Key]: J;
};

export abstract class Jobs<Key extends TriggeredJobKey | ScheduledJobKey, J extends Job> {
  readonly #jobs: JobQueues<Key, J>;

  protected constructor({ jobs }: { jobs: J[] }) {
    this.#jobs = jobs.reduce<JobQueues<Key, J>>(
      (acc, job) => ({
        ...acc,
        [job.queueName]: job,
      }),
      {} as JobQueues<Key, J>,
    );
  }

  protected get _jobs(): JobQueues<Key, J> {
    return this.#jobs;
  }

  async getPayload<Payload>({ key, jobId }: { key: Key; jobId: string }): Promise<Payload> {
    const job = this.#getJob({ key });

    // TODO: find another solution which does not require a cast
    return (await job.getPayload({ jobId })) as Payload;
  }

  async getState<State = JobsType["Common"]["ScheduledJobState"]>({
    key,
    jobId,
  }: {
    key: Key;
    jobId: string;
  }): Promise<State> {
    const job = this.#getJob({ key });

    // TODO: find another solution which does not require a cast
    return (await job.getState({ jobId })) as State;
  }

  #getJob({ key }: { key: Key }): J {
    const job = this.#jobs[key];

    assertNonNullish(job, `Job queue ${key} is not registered`);

    return job;
  }

  async stop(): Promise<void> {
    await Promise.all(
      Object.values<J>(this.#jobs).map(async (job) => {
        await job.stop();
      }),
    );
  }
}
