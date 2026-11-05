import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { getUsedTokens, insertUsage } from "../../../src/metering/_helpers/usages";
import {
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const instance = await openTestDb();
const db = instance.connection;

const usages = DbSchema.Metering.LlmUsages.LlmUsagesSchema;

const MODEL = "test-model";

const usedTokens = ({ userId, from }: { userId: string; from: Date }) =>
  db.transaction((tx) => getUsedTokens({ tx, userId, model: MODEL, from }));

describe("usages helpers", () => {
  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("insertUsage", () => {
    test("inserts the usage", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);

      const usage = await db.transaction((tx) =>
        insertUsage({
          tx,
          usage: {
            userId: TEST_USER_ID,
            organizationId,
            conversationId: null,
            model: MODEL,
            inputTokens: 10n,
            outputTokens: 5n,
          },
        }),
      );

      expect(usage).toMatchObject({
        userId: TEST_USER_ID,
        organizationId,
        conversationId: null,
        model: MODEL,
        inputTokens: 10n,
        outputTokens: 5n,
      });
    });
  });

  describe("getUsedTokens", () => {
    test("returns zero without usage", async () => {
      expect(await usedTokens({ userId: TEST_USER_ID, from: new Date(0) })).toBe(0n);
    });

    test("returns the input and output tokens of the user for the model", async () => {
      await db.insert(usages).values([
        { userId: TEST_USER_ID, model: MODEL, inputTokens: 10n, outputTokens: 5n },
        { userId: TEST_USER_ID, model: MODEL, inputTokens: 20n, outputTokens: 1n },
        { userId: TEST_USER_ID, model: "other-model", inputTokens: 1000n, outputTokens: 1000n },
        { userId: TEST_OTHER_USER_ID, model: MODEL, inputTokens: 1000n, outputTokens: 1000n },
      ]);

      expect(await usedTokens({ userId: TEST_USER_ID, from: new Date(0) })).toBe(36n);
    });

    test("does not count the usages before the start of the period", async () => {
      await db.insert(usages).values([
        {
          userId: TEST_USER_ID,
          model: MODEL,
          inputTokens: 1000n,
          outputTokens: 1000n,
          loggedAt: new Date(Date.UTC(2020, 0, 1)),
        },
        { userId: TEST_USER_ID, model: MODEL, inputTokens: 10n, outputTokens: 5n },
      ]);

      expect(await usedTokens({ userId: TEST_USER_ID, from: new Date(Date.UTC(2021, 0, 1)) })).toBe(
        15n,
      );
    });
  });
});
