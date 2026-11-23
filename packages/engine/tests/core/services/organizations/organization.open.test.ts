import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { DbSchema, LegalForm, MembershipRole } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { OpenOrganizationService } from "../../../../src/core/services/organizations/organization.open";
import { resetDb, seedUsers, TEST_USER_ID } from "../../../_test-utils";

const memberships = DbSchema.Core.Memberships.MembershipsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("OpenOrganizationService", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("opens the organization", async () => {
    const result = await OpenOrganizationService.create({ db, userId: TEST_USER_ID }).open({
      values: { name: "Created Org", legalForm: LegalForm.LLC },
    });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.name).toBe("Created Org");
    expect(result.result.legalForm).toBe(LegalForm.LLC);
    expect(result.result.version).toBe(1);
  });

  test("makes the caller an admin of the organization", async () => {
    const result = await OpenOrganizationService.create({ db, userId: TEST_USER_ID }).open({
      values: { name: "Admin Org", legalForm: LegalForm.LLC },
    });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    const [membership] = await db
      .select()
      .from(memberships)
      .where(
        and(eq(memberships.organizationId, result.result.id), eq(memberships.userId, TEST_USER_ID)),
      );

    expect(membership?.role).toBe(MembershipRole.ADMIN);
  });
});
