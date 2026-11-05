import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { DbMemberships } from "../../../src/core/records/memberships";
import type { DbStoreInitArgs } from "../../../src/store";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;
const users = DbSchema.Auth.Auth.users;

const TEST_INVITEE_ID = "user-33333333-3333-4333-8333-333333333333";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const store = DbMemberships.create({
  db: db as unknown as DbStoreInitArgs["db"],
  userId: TEST_USER_ID,
});

const adminMembershipId = async (organizationId: string): Promise<string> => {
  const [row] = await db
    .select()
    .from(memberships)
    .where(eq(memberships.organizationId, organizationId));
  assertNonNullish(row);
  return row.id;
};

describe("memberships", () => {
  let orgId: string;
  let otherOrgId: string;
  let membershipId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    membershipId = await adminMembershipId(orgId);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("list", () => {
    test("returns only the memberships of the user", async () => {
      const result = await store.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ organizationId }) => organizationId)).toEqual([orgId]);
      expect(result.result.every(({ userId }) => userId === TEST_USER_ID)).toBeTrue();
    });

    test("returns at most limit memberships", async () => {
      const result = await store.list({
        pagination: { limit: 1, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
    });
  });

  describe("listAll", () => {
    test("returns the same memberships as a single page when they all fit", async () => {
      const page = await store.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });
      const all = await store.listAll();

      if (page.status === "error" || all.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(all.result.map(({ id }) => id).sort()).toEqual(page.result.map(({ id }) => id).sort());
    });

    test("returns an error Result when the transaction cannot be opened", async () => {
      const unreachable = DbMemberships.create({
        db: drizzle({
          client: new BunSQL("postgresql://nope:nope@127.0.0.1:1/nope"),
        }) as unknown as DbStoreInitArgs["db"],
        userId: TEST_USER_ID,
      });

      const result = await unreachable.listAll();

      expect(result.status).toBe("error");
    });
  });

  describe("findById", () => {
    test("returns the membership by its id", async () => {
      const result = await store.find({ pKey: membershipId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(membershipId);
      expect(result.result?.organizationId).toBe(orgId);
      expect(result.result?.userId).toBe(TEST_USER_ID);
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined for a membership of another user", async () => {
      const otherMembershipId = await adminMembershipId(otherOrgId);

      const result = await store.find({ pKey: otherMembershipId });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("insert", () => {
    test("returns an error Result for an organization the user does not own", async () => {
      const result = await store.insert({
        values: { organizationId: otherOrgId, userId: TEST_USER_ID, role: "reviewer" },
      });

      expect(result.status).toBe("error");

      const rows = await db
        .select()
        .from(memberships)
        .where(eq(memberships.organizationId, otherOrgId));

      expect(rows.map(({ userId }) => userId)).toEqual([TEST_OTHER_USER_ID]);
    });
  });

  describe("update", () => {
    test("applies the role change and returns the parsed row", async () => {
      const sharedOrgId = await createOrganization(db, TEST_USER_ID);
      const ownMembershipId = await adminMembershipId(sharedOrgId);

      await db
        .insert(memberships)
        .values({ organizationId: sharedOrgId, userId: TEST_OTHER_USER_ID, role: "admin" });

      const result = await store.update({
        pKey: ownMembershipId,
        values: { version: 1, role: "accountant" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.id).toBe(ownMembershipId);
      expect(result.result.role).toBe("accountant");
    });

    test("increments the version on a role change", async () => {
      const sharedOrgId = await createOrganization(db, TEST_USER_ID);
      const ownMembershipId = await adminMembershipId(sharedOrgId);

      await db
        .insert(memberships)
        .values({ organizationId: sharedOrgId, userId: TEST_OTHER_USER_ID, role: "admin" });

      const result = await store.update({
        pKey: ownMembershipId,
        values: { version: 1, role: "reviewer" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.version).toBe(2);
    });

    test("returns an error Result on a stale version", async () => {
      const sharedOrgId = await createOrganization(db, TEST_USER_ID);
      const ownMembershipId = await adminMembershipId(sharedOrgId);

      await db
        .insert(memberships)
        .values({ organizationId: sharedOrgId, userId: TEST_OTHER_USER_ID, role: "admin" });

      const result = await store.update({
        pKey: ownMembershipId,
        values: { version: 999, role: "accountant" },
      });

      expect(result.status).toBe("error");

      const [row] = await db.select().from(memberships).where(eq(memberships.id, ownMembershipId));

      expect(row?.role).toBe("admin");
    });

    test("returns an error Result when the last admin changes their role", async () => {
      const result = await store.update({
        pKey: membershipId,
        values: { version: 1, role: "accountant" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err instanceof Error && result.err.cause instanceof Error).toBeTrue();
      expect((result.err as Error & { cause: Error }).cause.message).toContain(
        "An organization needs at least one admin",
      );
    });

    test("errors with InvalidArrayLengthError for a membership of another user", async () => {
      const otherMembershipId = await adminMembershipId(otherOrgId);

      const result = await store.update({
        pKey: otherMembershipId,
        values: { version: 1, role: "reviewer" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors with InvalidArrayLengthError when the id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: { version: 1, role: "reviewer" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe.each(["accountant", "reviewer"] as const)("as a member with the %s role", (role) => {
    let memberOrgId: string;
    let ownMembershipId: string;

    beforeAll(async () => {
      await db
        .insert(users)
        .values({
          id: TEST_INVITEE_ID,
          name: TEST_INVITEE_ID,
          email: `${TEST_INVITEE_ID}@test.dev`,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing();
    });

    beforeEach(async () => {
      memberOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

      const [row] = await db
        .insert(memberships)
        .values({ organizationId: memberOrgId, userId: TEST_USER_ID, role })
        .returning();
      assertNonNullish(row);
      ownMembershipId = row.id;
    });

    test("cannot add a membership to the organization", async () => {
      const result = await store.insert({
        values: { organizationId: memberOrgId, userId: TEST_INVITEE_ID, role: "reviewer" },
      });

      expect(result.status).toBe("error");

      const rows = await db
        .select()
        .from(memberships)
        .where(eq(memberships.organizationId, memberOrgId));

      expect(rows.map(({ userId }) => userId).sort()).toEqual(
        [TEST_OTHER_USER_ID, TEST_USER_ID].sort(),
      );
    });

    test("cannot change its own role", async () => {
      const result = await store.update({
        pKey: ownMembershipId,
        values: { version: 1, role: "admin" },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);

      const [row] = await db.select().from(memberships).where(eq(memberships.id, ownMembershipId));

      expect(row?.role).toBe(role);
    });

    test("cannot delete its own membership", async () => {
      const deleted = await db.transaction(async (tx) => {
        await tx.execute(sql`SET LOCAL ROLE authenticated_user`);
        await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_USER_ID})`);
        return tx.delete(memberships).where(eq(memberships.id, ownMembershipId)).returning();
      });

      expect(deleted).toHaveLength(0);

      const rows = await db.select().from(memberships).where(eq(memberships.id, ownMembershipId));

      expect(rows).toHaveLength(1);
    });
  });
});
