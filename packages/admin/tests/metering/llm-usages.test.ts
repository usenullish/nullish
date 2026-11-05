import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { LlmUsagesService } from "../../src/metering/services/llm-usages";
import {
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_USER_ID,
  withAuthenticatedUser,
} from "../_test-utils";
import { DbSchema } from "@usenullish/nullish-schema/db";

const llmUsages = DbSchema.Metering.LlmUsages.LlmUsagesSchema;

const instance = await openTestDb();
const db = instance.connection;

describe("LlmUsagesService", () => {
  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("record", () => {
    test("records the usage of the user", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);

      const result = await LlmUsagesService.create({ db }).record({
        usage: {
          userId: TEST_USER_ID,
          organizationId,
          conversationId: null,
          model: "test-model",
          inputTokens: 10n,
          outputTokens: 5n,
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toMatchObject({
        userId: TEST_USER_ID,
        organizationId,
        conversationId: null,
        model: "test-model",
        inputTokens: 10n,
        outputTokens: 5n,
      });
    });

    test("records a usage without organization", async () => {
      const result = await LlmUsagesService.create({ db }).record({
        usage: {
          userId: TEST_USER_ID,
          organizationId: null,
          conversationId: null,
          model: "test-model",
          inputTokens: 1n,
          outputTokens: 1n,
        },
      });

      expect(result.status).toBe("success");
    });
  });

  describe("permissions", () => {
    test("the user cannot record a usage", async () => {
      const inserted = withAuthenticatedUser(db, TEST_USER_ID, (tx) =>
        tx.insert(llmUsages).values({
          userId: TEST_USER_ID,
          model: "test-model",
          inputTokens: 1n,
          outputTokens: 1n,
        }),
      );

      await expect(inserted).rejects.toThrow();
    });
  });
});
