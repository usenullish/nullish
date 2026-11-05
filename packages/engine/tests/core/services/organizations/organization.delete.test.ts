import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DeleteOrganizationService } from "../../../../src/core/services/organizations/organization.delete";
import { EngineError } from "../../../../src/errors";
import { InvalidArrayLengthError } from "@usenullish/nullish-common";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../_test-utils";

const organizations = DbSchema.Core.Organizations.OrganizationsSchema;
const memberships = DbSchema.Core.Memberships.MembershipsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const deleteOrganization = ({
  organizationId,
  userId = TEST_USER_ID,
}: {
  organizationId: string;
  userId?: string;
}) => DeleteOrganizationService.create({ db, userId, organizationId }).delete();

const deletedAtOf = async (organizationId: string): Promise<Date | null | undefined> => {
  const [row] = await db
    .select({ deletedAt: organizations.deletedAt })
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  return row?.deletedAt;
};

describe("DeleteOrganizationService", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("marks the organization of the admin as deleted and returns it", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    const result = await deleteOrganization({ organizationId });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.id).toBe(organizationId);
    expect(result.result.deletedAt).toBeInstanceOf(Date);
    expect(await deletedAtOf(organizationId)).toEqual(result.result.deletedAt);
  });

  test("returns an error Result for an organization already marked as deleted", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    await deleteOrganization({ organizationId });
    const deletedAt = await deletedAtOf(organizationId);

    const result = await deleteOrganization({ organizationId });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(EngineError);
    expect(result.err instanceof Error && result.err.message).toContain(
      "is already marked as deleted",
    );
    expect(await deletedAtOf(organizationId)).toEqual(deletedAt);
  });

  test("returns an error Result for a member who is not an admin", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);
    await db
      .insert(memberships)
      .values({ organizationId, userId: TEST_OTHER_USER_ID, role: "accountant" });

    const result = await deleteOrganization({ organizationId, userId: TEST_OTHER_USER_ID });

    expect(result.status === "error" && result.err).toBeInstanceOf(InvalidArrayLengthError);
    expect(await deletedAtOf(organizationId)).toBeNull();
  });

  test("returns an error Result for a user outside the organization", async () => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    const result = await deleteOrganization({ organizationId, userId: TEST_OTHER_USER_ID });

    expect(result.status === "error" && result.err).toBeInstanceOf(InvalidArrayLengthError);
    expect(await deletedAtOf(organizationId)).toBeNull();
  });

  test("returns an error Result when nothing matches", async () => {
    const result = await deleteOrganization({ organizationId: TEST_MISSING_ID });

    expect(result.status === "error" && result.err).toBeInstanceOf(InvalidArrayLengthError);
  });
});
