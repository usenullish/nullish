import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCollectionSubscriptions } from "../../../src/subscription/records/subscriptions";
import { EngineError } from "../../../src/errors";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("subscriptions", () => {
  let orgId: string;
  let otherOrgId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("list", () => {
    test("returns the subscription of the organization", async () => {
      const result = await DbCollectionSubscriptions.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
      expect(result.result[0]?.organizationId).toBe(orgId);
      expect(result.result[0]?.status).toBe(SubscriptionStatus.ACTIVE);
    });

    test("returns nothing for an organization the user is not a member of", async () => {
      const result = await DbCollectionSubscriptions.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: otherOrgId,
      }).list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      expect(result).toEqual({ status: "success", result: [] });
    });
  });

  describe("insert", () => {
    test("rejects creating a subscription", async () => {
      const result = await DbCollectionSubscriptions.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).insert({ values: {} });

      expect(result.status).toBe("error");
      expect(result.status === "error" ? result.err : undefined).toBeInstanceOf(EngineError);
    });
  });
});
