import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { DbSchema, MembershipRole } from "@usenullish/nullish-schema/db";
import { assertAdminMembership, getMembership } from "../../../src/services/_helpers/memberships";
import {
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_MISSING_ORG_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../../admin/tests/_test-utils";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;

const instance = await openTestDb();
const db = instance.connection;

describe("memberships helpers", () => {
  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);

    await db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: MembershipRole.ACCOUNTANT });
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("getMembership", () => {
    test("returns the membership of the user in the organization", async () => {
      const membership = await db.transaction((tx) =>
        getMembership({ tx, organizationId, userId: TEST_OTHER_USER_ID }),
      );

      expect(membership.organizationId).toBe(organizationId);
      expect(membership.userId).toBe(TEST_OTHER_USER_ID);
      expect(membership.role).toBe(MembershipRole.ACCOUNTANT);
    });

    test("throws for an organization the user is not a member of", async () => {
      await expect(
        db.transaction((tx) =>
          getMembership({ tx, organizationId: TEST_MISSING_ORG_ID, userId: TEST_USER_ID }),
        ),
      ).rejects.toThrow();
    });
  });

  describe("assertAdminMembership", () => {
    test("accepts an admin of the organization", async () => {
      await expect(
        db.transaction((tx) => assertAdminMembership({ tx, organizationId, userId: TEST_USER_ID })),
      ).resolves.toBeUndefined();
    });

    test("throws for a member who is not an admin", async () => {
      await expect(
        db.transaction((tx) =>
          assertAdminMembership({ tx, organizationId, userId: TEST_OTHER_USER_ID }),
        ),
      ).rejects.toThrow("is not an admin");
    });

    test("throws for an organization the user is not a member of", async () => {
      await expect(
        db.transaction((tx) =>
          assertAdminMembership({ tx, organizationId: TEST_MISSING_ORG_ID, userId: TEST_USER_ID }),
        ),
      ).rejects.toThrow();
    });
  });
});
