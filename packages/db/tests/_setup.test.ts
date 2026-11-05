import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbInstance } from "../src/db/instance";
import { migrate } from "../src/_setup";

describe("migrate", () => {
  let instance: DbInstance;

  beforeEach(() => {
    instance = DbInstance.open({ url: envDbUrl() });
  });

  afterEach(async () => {
    await instance.close();
  });

  test("resolves against an already migrated database", async () => {
    await expect(migrate({ db: instance.connection })).resolves.toBeUndefined();
  });

  test("is safe to call more than once", async () => {
    await migrate({ db: instance.connection });

    await expect(migrate({ db: instance.connection })).resolves.toBeUndefined();
  });
});
