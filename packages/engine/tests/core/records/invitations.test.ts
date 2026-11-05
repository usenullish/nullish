import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL, CryptoHasher } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCollectionInvitations, DbInvitations } from "../../../src/core/records/invitations";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const invitations = DbSchema.Core.Invitations.InvitationsSchema;
const memberships = DbSchema.Core.Memberships.MembershipsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const LIST_ARGS = {
  pagination: { limit: 100, offset: 0 },
  sort: { field: "createdAt", direction: "asc" },
} as const;

const insertInvitation = async ({
  organizationId,
  email,
}: {
  organizationId: string;
  email: string;
}): Promise<string> => {
  const [row] = await db
    .insert(invitations)
    .values({
      organizationId,
      email,
      role: "accountant",
      tokenHash: new CryptoHasher("sha256").update(crypto.randomUUID()).digest("hex"),
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

const invitationExists = async (id: string): Promise<boolean> => {
  const rows = await db.select().from(invitations).where(eq(invitations.id, id));
  return rows.length === 1;
};

describe("invitations", () => {
  let organizationId: string;
  let invitationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);
    invitationId = await insertInvitation({ organizationId, email: "invited@test.dev" });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("list", () => {
    test("returns the invitations of the organization to its admin", async () => {
      const result = await DbCollectionInvitations.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: organizationId,
      }).list(LIST_ARGS);

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ id, email }) => ({ id, email }))).toEqual([
        { id: invitationId, email: "invited@test.dev" },
      ]);
    });

    test("does not return the token hash", async () => {
      const result = await DbCollectionInvitations.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: organizationId,
      }).list(LIST_ARGS);

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result[0]).not.toHaveProperty("tokenHash");
    });

    test("returns no invitation to a member who is not an admin", async () => {
      const memberOrgId = await createOrganization(db, TEST_USER_ID);
      await insertInvitation({ organizationId: memberOrgId, email: "invited@test.dev" });
      await db
        .insert(memberships)
        .values({ organizationId: memberOrgId, userId: TEST_OTHER_USER_ID, role: "accountant" });

      const result = await DbCollectionInvitations.create({
        db,
        userId: TEST_OTHER_USER_ID,
        foreignKeyId: memberOrgId,
      }).list(LIST_ARGS);

      expect(result).toEqual({ status: "success", result: [] });
    });

    test("returns no invitation to a user outside the organization", async () => {
      const result = await DbCollectionInvitations.create({
        db,
        userId: TEST_OTHER_USER_ID,
        foreignKeyId: organizationId,
      }).list(LIST_ARGS);

      expect(result).toEqual({ status: "success", result: [] });
    });
  });

  describe("find", () => {
    test("returns the invitation to the admin", async () => {
      const result = await DbInvitations.create({ db, userId: TEST_USER_ID }).find({
        pKey: invitationId,
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(invitationId);
      expect(result.result?.role).toBe("accountant");
    });

    test("resolves to undefined for a user outside the organization", async () => {
      const result = await DbInvitations.create({ db, userId: TEST_OTHER_USER_ID }).find({
        pKey: invitationId,
      });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("delete", () => {
    test("revokes the invitation and returns it", async () => {
      const id = await insertInvitation({ organizationId, email: "revoked@test.dev" });

      const result = await DbInvitations.create({ db, userId: TEST_USER_ID }).delete({ pKey: id });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(id);
      expect(await invitationExists(id)).toBeFalse();
    });

    test("resolves to undefined for a user outside the organization", async () => {
      const id = await insertInvitation({ organizationId, email: "kept@test.dev" });

      const result = await DbInvitations.create({ db, userId: TEST_OTHER_USER_ID }).delete({
        pKey: id,
      });

      expect(result).toEqual({ status: "success", result: undefined });
      expect(await invitationExists(id)).toBeTrue();
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await DbInvitations.create({ db, userId: TEST_USER_ID }).delete({
        pKey: TEST_MISSING_ID,
      });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });
});
