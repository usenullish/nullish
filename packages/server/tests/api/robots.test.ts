import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import { defineApi } from "../../src/api";

describe("robots", () => {
  let instance: DbInstance;
  let fetch: ReturnType<typeof defineApi>["fetch"];

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;

    ({ fetch } = defineApi({
      db: instance,
      jobs: {} as TriggerJobs,
      storage: FsStorageProvider.create(),
      mail: null,
    }));
  });

  afterAll(async () => {
    await instance.close();
  });

  test.each(["/health", "/swagger", "/doc", "/unknown"])("asks not to index %s", async (path) => {
    const response = await fetch(new Request(`http://localhost${path}`));

    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});
