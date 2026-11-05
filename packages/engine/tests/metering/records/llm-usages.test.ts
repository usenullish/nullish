import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { DbLlmUsages } from "../../../src/metering/records/llm-usages";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import { resetDb, seedUsers, TEST_OTHER_USER_ID, TEST_USER_ID } from "../../_test-utils";

const llmUsages = DbSchema.Metering.LlmUsages.LlmUsagesSchema;

const client = new BunSQL(envDbUrl(), { bigint: true });
const db = drizzle({ client });

const storeFor = (userId: DbStoreInitArgs["userId"]): DbLlmUsages =>
  DbLlmUsages.create({ db: db as unknown as DbStoreInitArgs["db"], userId });

describe("llm-usages", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("list", () => {
    test("returns only the usages of the current user", async () => {
      await db.insert(llmUsages).values([
        { userId: TEST_USER_ID, model: "test-model", inputTokens: 1n, outputTokens: 1n },
        { userId: TEST_USER_ID, model: "test-model", inputTokens: 1n, outputTokens: 1n },
        { userId: TEST_OTHER_USER_ID, model: "test-model", inputTokens: 1n, outputTokens: 1n },
      ]);

      const result = await storeFor(TEST_USER_ID).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "loggedAt", direction: "desc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.length).toBeGreaterThan(0);
      expect(result.result.every(({ userId }) => userId === TEST_USER_ID)).toBeTrue();
    });

    test("returns at most limit usages", async () => {
      const result = await storeFor(TEST_USER_ID).list({
        pagination: { limit: 1, offset: 0 },
        sort: { field: "loggedAt", direction: "desc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
    });
  });
});
