import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { InstanceRulesService } from "../../src/instance/services/instance-rules";
import { openTestDb } from "../_test-utils";

const instanceRules = DbSchema.Instance.InstanceRules.InstanceRulesSchema;

const instance = await openTestDb();
const db = instance.connection;

const service = InstanceRulesService.create({ db });

describe("InstanceRulesService", () => {
  afterEach(async () => {
    await db.delete(instanceRules);
  });

  afterAll(async () => {
    await instance.close();
  });

  test("returns nothing without instance rules", async () => {
    expect(await service.get()).toEqual({ status: "success", result: undefined });
  });

  test("inserts the instance rules", async () => {
    const result = await service.upsert({ rules: { maxOrganizations: 10, maxMembers: 100 } });

    expect(result).toEqual({
      status: "success",
      result: { id: 1, maxOrganizations: 10, maxMembers: 100 },
    });
    expect(await service.get()).toEqual(result);
  });

  test("updates the instance rules already inserted", async () => {
    await service.upsert({ rules: { maxOrganizations: 10, maxMembers: 100 } });

    const result = await service.upsert({ rules: { maxOrganizations: 20, maxMembers: null } });

    expect(result).toEqual({
      status: "success",
      result: { id: 1, maxOrganizations: 20, maxMembers: null },
    });
  });

  test("returns an error Result for a maximum below one", async () => {
    const result = await service.upsert({ rules: { maxOrganizations: 0, maxMembers: null } });

    expect(result.status).toBe("error");
  });
});
