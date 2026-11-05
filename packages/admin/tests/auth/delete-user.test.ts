import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { DeleteUserService } from "../../src/auth/services/delete-user";
import { openTestDb, resetDb, seedUsers, TEST_OTHER_USER_ID, TEST_USER_ID } from "../_test-utils";

const apikeys = DbSchema.Auth.Auth.apikeys;

const instance = await openTestDb();
const db = instance.connection;

const createApiKey = ({ userId }: { userId: string }): Promise<unknown> =>
  db.insert(apikeys).values({
    id: crypto.randomUUID(),
    referenceId: userId,
    key: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe("DeleteUserService", () => {
  beforeEach(async () => {
    await resetDb(db);
    await db.delete(apikeys);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await db.delete(apikeys);
    await instance.close();
  });

  describe("hasApiKeys", () => {
    test("returns false when the user has no API key", async () => {
      const result = await DeleteUserService.create({ db }).hasApiKeys({ userId: TEST_USER_ID });

      expect(result).toEqual({ status: "success", result: false });
    });

    test("returns true when the user has an API key", async () => {
      await createApiKey({ userId: TEST_USER_ID });

      const result = await DeleteUserService.create({ db }).hasApiKeys({ userId: TEST_USER_ID });

      expect(result).toEqual({ status: "success", result: true });
    });

    test("ignores the API keys of other users", async () => {
      await createApiKey({ userId: TEST_OTHER_USER_ID });

      const result = await DeleteUserService.create({ db }).hasApiKeys({ userId: TEST_USER_ID });

      expect(result).toEqual({ status: "success", result: false });
    });
  });
});
