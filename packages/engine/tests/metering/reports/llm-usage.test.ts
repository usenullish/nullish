import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { LlmUsageReport } from "../../../src/metering/reports/llm-usage";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl, envLlmChatModel } from "@usenullish/nullish-env";
import { resetDb, seedUsers, TEST_OTHER_USER_ID, TEST_USER_ID } from "../../_test-utils";

const llmUsages = DbSchema.Metering.LlmUsages.LlmUsagesSchema;

const client = new BunSQL(envDbUrl(), { bigint: true });
const db = drizzle({ client });

const reportFor = (userId: DbStoreInitArgs["userId"]): LlmUsageReport =>
  LlmUsageReport.create({ db: db as unknown as DbStoreInitArgs["db"], userId });

describe("llm-usage report", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    await db.insert(llmUsages).values([
      {
        userId: TEST_USER_ID,
        model: "test-model",
        inputTokens: 100n,
        outputTokens: 10n,
        loggedAt: new Date("2026-01-15"),
      },
      {
        userId: TEST_USER_ID,
        model: envLlmChatModel(),
        inputTokens: 200n,
        outputTokens: 20n,
        loggedAt: new Date("2026-02-15"),
      },
      {
        userId: TEST_USER_ID,
        model: "previous-model",
        inputTokens: 300n,
        outputTokens: 30n,
        loggedAt: new Date("2026-02-20"),
      },
      {
        userId: TEST_OTHER_USER_ID,
        model: "test-model",
        inputTokens: 1000n,
        outputTokens: 100n,
        loggedAt: new Date("2026-02-20"),
      },
    ]);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("sums the usages of the user per model since the given date", async () => {
    const result = await reportFor(TEST_USER_ID).generate({ from: new Date("2026-02-01") });

    expect(result).toEqual({
      status: "success",
      result: [
        { model: envLlmChatModel(), inputTokens: 200n, outputTokens: 20n },
        { model: "previous-model", inputTokens: 300n, outputTokens: 30n },
      ],
    });
  });

  test("returns zero for the available model without usage", async () => {
    const result = await reportFor(TEST_USER_ID).generate({ from: new Date("2026-03-01") });

    expect(result).toEqual({
      status: "success",
      result: [{ model: envLlmChatModel(), inputTokens: 0n, outputTokens: 0n }],
    });
  });

  test("returns an error Result when the transaction cannot be opened", async () => {
    const unreachable = LlmUsageReport.create({
      db: drizzle({
        client: new BunSQL("postgresql://nope:nope@127.0.0.1:1/nope"),
      }) as unknown as DbStoreInitArgs["db"],
      userId: TEST_USER_ID,
    });

    const result = await unreachable.generate({
      from: new Date("2026-02-01"),
    });

    expect(result.status).toBe("error");
  });
});
