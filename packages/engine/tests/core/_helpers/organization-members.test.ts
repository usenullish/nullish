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

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const asUser = <T>({ userId, fn }: { userId: string; fn: (tx: Tx) => Promise<T> }) =>
  db.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    return await fn(tx as unknown as Tx);
  });

describe("core/_helpers/organization-members", () => {
  let organizationId: string;
  let otherOrganizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);
    otherOrganizationId = await createOrganization(db, TEST_OTHER_USER_ID);

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
      const member = await asUser({
        userId: TEST_USER_ID,
        fn: (tx) => getOrganizationMember({ tx, organizationId, userId: TEST_OTHER_USER_ID }),
      });

      expect(member.userId).toBe(TEST_OTHER_USER_ID);
      expect(member.role).toBe("accountant");
      expect(member.name).toBe(TEST_OTHER_USER_ID);
      expect(member.email).toBe(`${TEST_OTHER_USER_ID}@test.dev`);
    });

    test("returns the admin to themselves", async () => {
      const member = await asUser({
        userId: TEST_USER_ID,
        fn: (tx) => getOrganizationMember({ tx, organizationId, userId: TEST_USER_ID }),
      });

      expect(member.role).toBe("admin");
      expect(member.email).toBe(`${TEST_USER_ID}@test.dev`);
    });

    test("rejects for a member who is not an admin", async () => {
      await expect(
        asUser({
          userId: TEST_OTHER_USER_ID,
          fn: (tx) => getOrganizationMember({ tx, organizationId, userId: TEST_OTHER_USER_ID }),
        }),
      ).rejects.toThrow();
    });

    test("rejects for a user who is not a member of the organization", async () => {
      await expect(
        asUser({
          userId: TEST_USER_ID,
          fn: (tx) =>
            getOrganizationMember({
              tx,
              organizationId: otherOrganizationId,
              userId: TEST_OTHER_USER_ID,
            }),
        }),
      ).rejects.toThrow();
    });

    test("rejects for an organization the user does not administer", async () => {
      await expect(
        asUser({
          userId: TEST_USER_ID,
          fn: (tx) =>
            getOrganizationMember({
              tx,
              organizationId: otherOrganizationId,
              userId: TEST_USER_ID,
            }),
        }),
      ).rejects.toThrow();
    });
  });
});
