import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import type { Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { getOrganizationMember } from "../../../src/core/_helpers/organization-members";
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

const get = ({
  userId,
  organizationId,
  memberId,
}: {
  userId: string;
  organizationId: string;
  memberId: string;
}) =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);

    return await getOrganizationMember({
      tx: tx as unknown as Tx,
      organizationId,
      userId: memberId,
    });
  });

describe("core/_helpers/organization-members", () => {
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

  describe("getOrganizationMember", () => {
    test("returns a member of the organization with their name and email to its admin", async () => {
      const member = await get({
        userId: TEST_USER_ID,
        organizationId,
        memberId: TEST_OTHER_USER_ID,
      });

      expect(member?.userId).toBe(TEST_OTHER_USER_ID);
      expect(member?.role).toBe("accountant");
      expect(member?.name).toBe(TEST_OTHER_USER_ID);
      expect(member?.email).toBe(`${TEST_OTHER_USER_ID}@test.dev`);
    });

    test("returns the admin to themselves", async () => {
      const member = await get({ userId: TEST_USER_ID, organizationId, memberId: TEST_USER_ID });

      expect(member?.role).toBe("admin");
    });

    test("returns no member for a user who is not a member", async () => {
      const member = await get({
        userId: TEST_USER_ID,
        organizationId,
        memberId: TEST_OUTSIDER_ID,
      });

      expect(member).toBeUndefined();
    });

    test("returns no member to a member who is not an admin", async () => {
      const member = await get({
        userId: TEST_OTHER_USER_ID,
        organizationId,
        memberId: TEST_USER_ID,
      });

      expect(member).toBeUndefined();
    });

    test("returns no member of an organization the user does not own", async () => {
      const member = await get({
        userId: TEST_USER_ID,
        organizationId: otherOrganizationId,
        memberId: TEST_OUTSIDER_ID,
      });

      expect(member).toBeUndefined();
    });
  });
});
