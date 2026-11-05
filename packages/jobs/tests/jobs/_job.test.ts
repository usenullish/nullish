import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import * as z from "zod";
import { envDbUrl } from "@usenullish/nullish-env";
import { setupJobQueuesDb } from "../../src/_setup";
import { TriggeredJob } from "../../src/jobs/_job.triggered";
import type { TriggeredJobKey } from "@usenullish/nullish-schema/jobs";
import type { JobArgs } from "../../src/_types";

const dbUrl = envDbUrl();

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TestJobPayloadSchema = z.strictObject({
  value: z.string(),
  shouldFail: z.boolean().optional(),
});
const TestJobResultSchema = z.strictObject({ processedValue: z.string() });
type TestJobPayload = z.infer<typeof TestJobPayloadSchema>;
type TestJobResult = z.infer<typeof TestJobResultSchema>;

class TestJob extends TriggeredJob<typeof TestJobPayloadSchema, typeof TestJobResultSchema> {
  readonly processed: TestJobPayload[] = [];
  readonly attempted: TestJobPayload[] = [];

  private constructor(args: JobArgs & { key: TriggeredJobKey; attempts?: number }) {
    super({ ...args, payloadSchema: TestJobPayloadSchema, resultSchema: TestJobResultSchema });
  }

  static async start(args: JobArgs & { attempts?: number }): Promise<TestJob> {
    return new this({ ...args, key: `test-job-${crypto.randomUUID()}` as TriggeredJobKey });
  }

  protected override worker = async ({
    payload,
  }: {
    payload: TestJobPayload;
  }): Promise<TestJobResult> => {
    this.attempted.push(payload);

    if (payload.shouldFail) {
      throw new Error("boom");
    }

    this.processed.push(payload);
    return { processedValue: payload.value };
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

const waitForValue = async <T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  { timeoutMs = 15000, intervalMs = 100 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let value = await fn();

  while (!predicate(value)) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    value = await fn();
  }

  return value;
};

describe("Job", () => {
  let job: TestJob;

  beforeAll(async () => {
    await setupJobQueuesDb({ dbUrl });
    job = await TestJob.start({ dbUrl });
  });

  afterAll(async () => {
    await job.stop();
  });

  test("queueName returns the queue key the job was started with", () => {
    expect(job.queueName).toStartWith("test-job-");
  });

  test("trigger enqueues a job and returns a scheduled job id", async () => {
    const result = await job.trigger({ payload: { value: "hello" } });

    expect(result.jobId).toMatch(UUID_PATTERN);
  });

  test("trigger runs the job through the worker", async () => {
    await job.trigger({ payload: { value: "processed-by-worker" } });

    await waitFor(() => job.processed.some((payload) => payload.value === "processed-by-worker"));
  }, 10000);

  test("trigger rejects a payload that fails schema validation", async () => {
    await expect(
      job.trigger({ payload: { value: 42 } as unknown as TestJobPayload }),
    ).rejects.toThrow();
  });
});

describe("Job getState", () => {
  let job: TestJob;

  beforeAll(async () => {
    await setupJobQueuesDb({ dbUrl });
    job = await TestJob.start({ dbUrl });
  });

  afterAll(async () => {
    await job.stop();
  });

  test("returns the completed state with the parsed result once the worker finishes", async () => {
    const { jobId } = await job.trigger({ payload: { value: "get-state-completed" } });

    const state = await waitForValue(
      () => job.getState({ jobId }),
      (value) => value.status === "completed",
    );

    expect(state).toEqual({
      status: "completed",
      result: { processedValue: "get-state-completed" },
    });
  }, 15000);

  test("returns the failed state with a reason once retries are exhausted", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});

    try {
      const { jobId } = await job.trigger({
        payload: { value: "get-state-failed", shouldFail: true },
      });

      const state = await waitForValue(
        () => job.getState({ jobId }),
        (value) => value.status === "failed",
      );

      expect(state.status).toBe("failed");
      if (state.status !== "failed") return;
      expect(state.reason).toContain("boom");
    } finally {
      consoleError.mockRestore();
    }
  }, 15000);

  test("throws for a job id that does not exist", async () => {
    await expect(job.getState({ jobId: crypto.randomUUID() })).rejects.toThrow();
  });
});

describe("Job getPayload", () => {
  let job: TestJob;

  beforeAll(async () => {
    job = await TestJob.start({ dbUrl });
  });

  afterAll(async () => {
    await job.stop();
  });

  test("returns the payload the job was triggered with", async () => {
    const { jobId } = await job.trigger({ payload: { value: "get-payload" } });

    expect(await job.getPayload({ jobId })).toEqual({ value: "get-payload" });
  });

  test("throws for a job id that does not exist", async () => {
    await expect(job.getPayload({ jobId: crypto.randomUUID() })).rejects.toThrow("does not exist");
  });
});

describe("Job attempts", () => {
  const runFailingJob = async ({ job, value }: { job: TestJob; value: string }) => {
    const { jobId } = await job.trigger({ payload: { value, shouldFail: true } });

    await waitForValue(
      () => job.getState({ jobId }),
      (state) => state.status === "failed",
    );

    return job.attempted.filter((payload) => payload.value === value);
  };

  test("runs a failing job three times by default", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});
    const job = await TestJob.start({ dbUrl });

    try {
      const attempts = await runFailingJob({ job, value: "attempts-default" });

      expect(attempts).toHaveLength(3);
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      await job.stop();
    }
  }, 15000);

  test("runs a failing job once when started with a single attempt", async () => {
    const consoleError = spyOn(console, "error").mockImplementation(() => {});
    const job = await TestJob.start({ dbUrl, attempts: 1 });

    try {
      const attempts = await runFailingJob({ job, value: "attempts-single" });

      expect(attempts).toHaveLength(1);
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      await job.stop();
    }
  }, 15000);
});

describe("Job stop", () => {
  test("resolves a success Result", async () => {
    const closable = await TestJob.start({ dbUrl });

    const result = await closable.stop();

    expect(result.status).toBe("success");
  });

  test("is safe to call more than once", async () => {
    const closable = await TestJob.start({ dbUrl });

    await closable.stop();
    const second = await closable.stop();

    expect(["success", "error"]).toContain(second.status);
  });
});
