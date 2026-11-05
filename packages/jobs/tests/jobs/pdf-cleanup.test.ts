import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  spyOn,
  test,
} from "bun:test";
import { envDbUrl } from "@usenullish/nullish-env";
import type { Jobs } from "@usenullish/nullish-schema/jobs";
import type { Common } from "@usenullish/nullish-schema/primitives";
import { setupJobQueuesDb } from "../../src/_setup";
import { PdfCleanupJob } from "../../src/jobs/pdf-cleanup";
import { PdfCleanupWorker } from "../../src/jobs/workers/pdf-cleanup/worker";

const dbUrl = envDbUrl();

class TestPdfCleanupJob extends PdfCleanupJob {
  static create({ dbUrl }: { dbUrl: Common["PostgresUrl"] }): TestPdfCleanupJob {
    return new this({ dbUrl });
  }

  run(): Promise<Jobs["PdfCleanup"]["Result"]> {
    return this.worker();
  }
}

describe("PdfCleanupJob", () => {
  let job: TestPdfCleanupJob;

  beforeAll(async () => {
    await setupJobQueuesDb({ dbUrl });
    job = TestPdfCleanupJob.create({ dbUrl });
  });

  afterAll(async () => {
    await job.stop();
  });

  let runWorker: ReturnType<typeof spyOn<PdfCleanupWorker, "run">>;

  beforeEach(() => {
    runWorker = spyOn(PdfCleanupWorker.prototype, "run");
  });

  afterEach(() => {
    runWorker.mockRestore();
  });

  test("runs the cleanup worker and returns null", async () => {
    runWorker.mockResolvedValue({ status: "success", result: undefined });

    const result = await job.run();

    expect(runWorker).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  test("throws the error of the cleanup worker", async () => {
    runWorker.mockResolvedValue({ status: "error", err: new Error("boom") });

    await expect(job.run()).rejects.toThrow("boom");
  });
});
