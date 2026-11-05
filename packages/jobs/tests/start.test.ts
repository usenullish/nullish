import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { TriggeredJobs } from "../src/jobs.triggered";
import { ScheduledJobs } from "../src/jobs.scheduled";
import { startJobs } from "../src/start";

describe("startJobs", () => {
  test("resolves to a success Result wrapping the started triggered and scheduled jobs", async () => {
    const result = await startJobs();

    if (result.status === "error") {
      throw result.err;
    }

    expect(result.result.triggered).toBeInstanceOf(TriggeredJobs);
    expect(result.result.scheduled).toBeInstanceOf(ScheduledJobs);

    await result.result.triggered.stop();
    await result.result.scheduled.stop();
  }, 15000);

  test("stops the started triggered jobs and returns the error when the scheduled jobs cannot start", async () => {
    const start = spyOn(ScheduledJobs, "start").mockRejectedValue(new Error("boom"));
    const stop = spyOn(TriggeredJobs.prototype, "stop");

    try {
      const result = await startJobs();

      expect(result.status).toBe("error");
      expect(stop).toHaveBeenCalledTimes(1);
    } finally {
      start.mockRestore();
      stop.mockRestore();
    }
  }, 15000);

  describe("when the database url cannot be built", () => {
    const KEYS = ["NULLISH_DB_USERNAME"] as const;
    const saved = new Map<string, string | undefined>();

    beforeEach(() => {
      for (const key of KEYS) {
        saved.set(key, process.env[key]);
        delete process.env[key];
      }
    });

    afterEach(() => {
      for (const key of KEYS) {
        const value = saved.get(key);
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });

    test("returns the thrown error untouched instead of throwing", async () => {
      const result = await startJobs();

      if (result.status === "success") {
        throw new Error("expected startJobs to fail");
      }

      expect(result.err).toBeInstanceOf(Error);
      expect((result.err as Error).message).toBe(
        "Missing or empty required field A username for the DB must be defined.",
      );
    });
  });
});
