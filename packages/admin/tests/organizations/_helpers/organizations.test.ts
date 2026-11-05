import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { deleteOrganization } from "../../../src/organizations/_helpers/organizations";
import {
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_MISSING_ORG_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const organizations = DbSchema.Core.Organizations.OrganizationsSchema;

const instance = await openTestDb();
const db = instance.connection;

const selectOrganization = (organizationId: string) =>
  db.select().from(organizations).where(eq(organizations.id, organizationId));

describe("deleteOrganization", () => {
  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("deletes the organization and returns its id", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    const result = await db.transaction((tx) => deleteOrganization({ tx, organizationId }));

    expect(result).toEqual({ id: organizationId });
    expect(await selectOrganization(organizationId)).toEqual([]);
  });

  test("returns undefined when the organization does not exist", async () => {
    const result = await db.transaction((tx) =>
      deleteOrganization({ tx, organizationId: TEST_MISSING_ORG_ID }),
    );

    expect(result).toBeUndefined();
  });

  test("keeps the other organizations", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    const otherOrganizationId = await createOrganization(db, TEST_USER_ID);

    await db.transaction((tx) => deleteOrganization({ tx, organizationId }));

    expect(await selectOrganization(otherOrganizationId)).toHaveLength(1);
  });
});
