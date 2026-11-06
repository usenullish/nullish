import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import { defineApi } from "../../src/api";

describe("secure headers", () => {
  let instance: DbInstance;
  let response: Response;

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;

    const { fetch } = defineApi({
      db: instance,
      jobs: {} as TriggerJobs,
      storage: FsStorageProvider.create(),
    });

    response = await fetch(new Request("http://localhost/health"));
  });

  afterAll(async () => {
    await instance.close();
  });

  test("sets the same Strict-Transport-Security as the client", () => {
    expect(response.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
  });

  test.each([
    ["X-Content-Type-Options", "nosniff"],
    ["X-Frame-Options", "SAMEORIGIN"],
    ["Referrer-Policy", "no-referrer"],
    ["Cross-Origin-Resource-Policy", "same-origin"],
    ["Cross-Origin-Opener-Policy", "same-origin"],
  ])("sets %s to %s", (name, value) => {
    expect(response.headers.get(name)).toBe(value);
  });

  test("does not expose X-Powered-By", () => {
    expect(response.headers.has("X-Powered-By")).toBeFalse();
  });
});
