import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { DbOrganizationMembers } from "../../../src/core/composites/organization-members";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;
const users = DbSchema.Auth.Auth.users;

const TEST_OUTSIDER_ID = "user-22222222-2222-4222-8222-222222222222";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const find = ({
  userId,
  organizationId,
  memberId,
}: {
  userId: string;
  organizationId: string;
  memberId: string;
}) =>
  DbOrganizationMembers.create({
    db: db as unknown as DbStoreInitArgs["db"],
    userId,
  }).find({ organizationId, userId: memberId });

describe("DbOrganizationMembers", () => {
  let organizationId: string;
  let otherOrganizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    await db.insert(users).values({
      id: TEST_OUTSIDER_ID,
      name: TEST_OUTSIDER_ID,
      email: `${TEST_OUTSIDER_ID}@test.dev`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    organizationId = await createOrganization(db, TEST_USER_ID);
    otherOrganizationId = await createOrganization(db, TEST_OUTSIDER_ID);

    await db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: "accountant" });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("find", () => {
    test("returns a member of the organization to its admin", async () => {
      const result = await find({
        userId: TEST_USER_ID,
        organizationId,
        memberId: TEST_OTHER_USER_ID,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.userId).toBe(TEST_OTHER_USER_ID);
      expect(result.result?.role).toBe("accountant");
      expect(result.result?.name).toBe(TEST_OTHER_USER_ID);
      expect(result.result?.email).toBe(`${TEST_OTHER_USER_ID}@test.dev`);
    });

    test("returns the admin to themselves", async () => {
      const result = await find({ userId: TEST_USER_ID, organizationId, memberId: TEST_USER_ID });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.role).toBe("admin");
    });

    test("returns no member for a user who is not a member", async () => {
      const result = await find({
        userId: TEST_USER_ID,
        organizationId,
        memberId: TEST_OUTSIDER_ID,
      });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("returns no member to a member who is not an admin", async () => {
      const result = await find({
        userId: TEST_OTHER_USER_ID,
        organizationId,
        memberId: TEST_USER_ID,
      });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("returns no member of an organization the user does not own", async () => {
      const result = await find({
        userId: TEST_USER_ID,
        organizationId: otherOrganizationId,
        memberId: TEST_OUTSIDER_ID,
      });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });
});
