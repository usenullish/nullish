import { beforeAll, describe, expect, test } from "bun:test";
import * as z from "zod";
import { envDbUrl } from "@usenullish/nullish-env";
import { setupJobQueuesDb } from "../../src/_setup";
import { ScheduledJob } from "../../src/jobs/_job.scheduled";
import type { ScheduledJobKey } from "../../src/constants";
import type { JobArgs } from "../../src/_types";

const dbUrl = envDbUrl();

const TestJobPayloadSchema = z.never();
const TestJobResultSchema = z.null();

class TestScheduledJob extends ScheduledJob<
  typeof TestJobPayloadSchema,
  typeof TestJobResultSchema
> {
  runs = 0;

  private constructor(args: JobArgs & { key: ScheduledJobKey; intervalMs: number }) {
    super({ ...args, payloadSchema: TestJobPayloadSchema, resultSchema: TestJobResultSchema });
  }

  static create(args: JobArgs & { intervalMs: number }): TestScheduledJob {
    return new this({
      ...args,
      key: `test-scheduled-job-${crypto.randomUUID()}` as ScheduledJobKey,
    });
  }

  protected override worker = async (): Promise<null> => {
    this.runs++;
    return null;
  };
}

const waitFor = async (
  predicate: () => boolean,
  { timeoutMs = 8000, intervalMs = 50 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;

  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};

describe("ScheduledJob", () => {
  beforeAll(async () => {
    await setupJobQueuesDb({ dbUrl });
  });

  test("schedule runs the worker repeatedly", async () => {
    const job = TestScheduledJob.create({ dbUrl, intervalMs: 200 });

    try {
      await job.schedule();

      await waitFor(() => job.runs >= 2);
    } finally {
      await job.unschedule();
      await job.stop();
    }
  }, 10000);

  test("unschedule stops the repeated runs", async () => {
    const job = TestScheduledJob.create({ dbUrl, intervalMs: 200 });

    try {
      await job.schedule();
      await waitFor(() => job.runs >= 1);

      await job.unschedule();
      const runs = job.runs;
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(job.runs).toBeLessThanOrEqual(runs + 1);
    } finally {
      await job.stop();
    }
  }, 10000);
});
