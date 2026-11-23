import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { DbSchema } from "@usenullish/nullish-schema/db";
import {
  getInstanceRules,
  upsertInstanceRules,
} from "../../../src/instance/_helpers/instance-rules";
import { openTestDb } from "../../_test-utils";

const instanceRules = DbSchema.Instance.InstanceRules.InstanceRulesSchema;

const instance = await openTestDb();
const db = instance.connection;

describe("instance rules helpers", () => {
  afterEach(async () => {
    await db.delete(instanceRules);
  });

  afterAll(async () => {
    await instance.close();
  });

  describe("getInstanceRules", () => {
    test("returns nothing without instance rules", async () => {
      expect(await db.transaction((tx) => getInstanceRules({ tx }))).toBeUndefined();
    });

    test("returns the instance rules", async () => {
      await db.insert(instanceRules).values({ maxOrganizations: 10, maxMembers: 100 });

      expect(await db.transaction((tx) => getInstanceRules({ tx }))).toEqual({
        id: 1,
        maxOrganizations: 10,
        maxMembers: 100,
      });
    });
  });

  describe("upsertInstanceRules", () => {
    test("inserts the instance rules and returns them", async () => {
      const rules = await db.transaction((tx) =>
        upsertInstanceRules({ tx, rules: { maxOrganizations: 10, maxMembers: 100 } }),
      );

      expect(rules).toEqual({ id: 1, maxOrganizations: 10, maxMembers: 100 });
    });

    test("updates the instance rules already inserted and returns them", async () => {
      await db.insert(instanceRules).values({ maxOrganizations: 10, maxMembers: 100 });

      const rules = await db.transaction((tx) =>
        upsertInstanceRules({ tx, rules: { maxOrganizations: null, maxMembers: 50 } }),
      );

      expect(rules).toEqual({ id: 1, maxOrganizations: null, maxMembers: 50 });
      expect(await db.select().from(instanceRules)).toHaveLength(1);
    });

    test("throws for a maximum below one", async () => {
      await expect(
        db.transaction((tx) =>
          upsertInstanceRules({ tx, rules: { maxOrganizations: null, maxMembers: 0 } }),
        ),
      ).rejects.toThrow();
    });
  });
});
