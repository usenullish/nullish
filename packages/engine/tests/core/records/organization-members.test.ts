import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { DbCollectionOrganizationMembers } from "../../../src/core/records/organization-members";
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
const TEST_IMAGE = "https://example.com/avatar.png";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const list = ({
  userId,
  organizationId,
  limit = 100,
  field = "createdAt",
  direction = "asc",
}: {
  userId: string;
  organizationId: string;
  limit?: number;
  field?: string;
  direction?: "asc" | "desc";
}) =>
  DbCollectionOrganizationMembers.create({
    db: db as unknown as DbStoreInitArgs["db"],
    userId,
    foreignKeyId: organizationId,
  }).list({
    pagination: { limit, offset: 0 },
    sort: { field, direction },
  });

describe("organization-members", () => {
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

    await db.update(users).set({ image: TEST_IMAGE }).where(eq(users.id, TEST_OTHER_USER_ID));

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
    const find = ({
      userId,
      organizationId,
      memberId,
    }: {
      userId: string;
      organizationId: string;
      memberId: string;
    }) =>
      DbCollectionOrganizationMembers.create({
        db: db as unknown as DbStoreInitArgs["db"],
        userId,
        foreignKeyId: organizationId,
      }).find({ userId: memberId });

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

  describe("list", () => {
    test("returns the members of an organization to its admin", async () => {
      const result = await list({ userId: TEST_USER_ID, organizationId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ userId, role }) => ({ userId, role }))).toEqual([
        { userId: TEST_USER_ID, role: "admin" },
        { userId: TEST_OTHER_USER_ID, role: "accountant" },
      ]);
    });

    test("returns the name, email and image of each member", async () => {
      const result = await list({ userId: TEST_USER_ID, organizationId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const member = result.result.find(({ userId }) => userId === TEST_OTHER_USER_ID);

      expect(member?.name).toBe(TEST_OTHER_USER_ID);
      expect(member?.email).toBe(`${TEST_OTHER_USER_ID}@test.dev`);
      expect(member?.image).toBe(TEST_IMAGE);
    });

    test("returns no member to a member who is not an admin", async () => {
      const result = await list({ userId: TEST_OTHER_USER_ID, organizationId });

      expect(result).toEqual({ status: "success", result: [] });
    });

    test("returns no member to an admin of another organization", async () => {
      const result = await list({ userId: TEST_OUTSIDER_ID, organizationId });

      expect(result).toEqual({ status: "success", result: [] });
    });

    test("returns no member of an organization the user does not own", async () => {
      const result = await list({ userId: TEST_USER_ID, organizationId: otherOrganizationId });

      expect(result).toEqual({ status: "success", result: [] });
    });

    test("returns at most limit members", async () => {
      const result = await list({ userId: TEST_USER_ID, organizationId, limit: 1 });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
    });

    test("sorts the members by a column of the view", async () => {
      const asc = await list({ userId: TEST_USER_ID, organizationId, field: "email" });
      const desc = await list({
        userId: TEST_USER_ID,
        organizationId,
        field: "email",
        direction: "desc",
      });

      if (asc.status === "error" || desc.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const emails = asc.result.map(({ email }) => email);

      expect(emails).toEqual([...emails].sort());
      expect(desc.result.map(({ email }) => email)).toEqual([...emails].reverse());
    });

    test("returns an error Result for an unknown sort field", async () => {
      const result = await list({ userId: TEST_USER_ID, organizationId, field: "unknown" });

      expect(result.status).toBe("error");
    });
  });
});
