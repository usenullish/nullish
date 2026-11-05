import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { getOrganization, updateOrganization } from "../../../src/core/_helpers/organizations";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const organizations = DbSchema.Core.Organizations.OrganizationsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("core/_helpers/organizations", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("getOrganization", () => {
    test("returns the organization", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);

      const organization = await db.transaction((tx) =>
        getOrganization({ tx, id: organizationId }),
      );

      expect(organization.id).toBe(organizationId);
      expect(organization.deletedAt).toBeNull();
    });

    test("rejects when no organization matches the id", async () => {
      await expect(
        db.transaction((tx) => getOrganization({ tx, id: TEST_MISSING_ID })),
      ).rejects.toThrow();
    });
  });

  describe("updateOrganization", () => {
    test("updates the organization and returns it", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      const deletedAt = new Date();

      const organization = await db.transaction((tx) =>
        updateOrganization({ tx, id: organizationId, values: { deletedAt } }),
      );

      expect(organization.deletedAt).toEqual(deletedAt);

      const [row] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      expect(row?.deletedAt).toEqual(deletedAt);
    });

    test("leaves the other organizations untouched", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      const otherOrganizationId = await createOrganization(db, TEST_USER_ID);

      await db.transaction((tx) =>
        updateOrganization({ tx, id: organizationId, values: { deletedAt: new Date() } }),
      );

      const [row] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, otherOrganizationId));

      expect(row?.deletedAt).toBeNull();
    });

    test("rejects when no organization matches the id", async () => {
      await expect(
        db.transaction((tx) =>
          updateOrganization({ tx, id: TEST_MISSING_ID, values: { deletedAt: new Date() } }),
        ),
      ).rejects.toThrow();
    });
  });
});
