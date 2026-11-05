import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { Queue } from "bullmq";
import { envDbUrl } from "@usenullish/nullish-env";
import { NullishError } from "@usenullish/nullish-common";
import { setupJobQueuesDb } from "../src/_setup";
import { ScheduledJobs } from "../src/jobs.scheduled";
import { JOB_QUEUES_SCHEMA, ScheduledJobKey } from "../src/constants";
import { CLEANUP_INTERVAL_MS, PdfCleanupJob } from "../src/jobs/pdf-cleanup";

const dbUrl = envDbUrl();

const connection = { connectionString: dbUrl, schema: JOB_QUEUES_SCHEMA };

describe("ScheduledJobs", () => {
  let jobs: ScheduledJobs;
  let queue: Queue;

  beforeAll(async () => {
    await setupJobQueuesDb({ dbUrl });
    jobs = await ScheduledJobs.start({ dbUrl });
    queue = new Queue(ScheduledJobKey.PdfCleanup, { connection });
  });

  afterAll(async () => {
    await queue.removeJobScheduler(ScheduledJobKey.PdfCleanup);
    await queue.close();
    await jobs.stop();
  });

  test("start registers the schedule of every scheduled job", async () => {
    const scheduler = await queue.getJobScheduler(ScheduledJobKey.PdfCleanup);

    expect(scheduler?.every).toBe(CLEANUP_INTERVAL_MS);
  });

  test("start stops the started jobs and rejects when a schedule cannot be registered", async () => {
    const schedule = spyOn(PdfCleanupJob.prototype, "schedule").mockRejectedValue(
      new Error("boom"),
    );
    const stop = spyOn(PdfCleanupJob.prototype, "stop");

    try {
      await expect(ScheduledJobs.start({ dbUrl })).rejects.toThrow("boom");
      expect(stop).toHaveBeenCalledTimes(1);
    } finally {
      schedule.mockRestore();
      stop.mockRestore();
    }
  });

  test("start registers the schedule once when started twice", async () => {
    const again = await ScheduledJobs.start({ dbUrl });

    try {
      expect(await queue.getJobSchedulersCount()).toBe(1);
    } finally {
      await again.stop();
    }
  });

  test("getState throws for an unregistered key", async () => {
    await expect(
      jobs.getState({ key: "unknown-job" as ScheduledJobKey, jobId: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(NullishError);
  });

  test("getPayload throws for an unregistered key", async () => {
    await expect(
      jobs.getPayload({ key: "unknown-job" as ScheduledJobKey, jobId: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(NullishError);
  });

  test("stop resolves without throwing", async () => {
    const stoppable = await ScheduledJobs.start({ dbUrl });

    await expect(stoppable.stop()).resolves.toBeUndefined();
  });
});
