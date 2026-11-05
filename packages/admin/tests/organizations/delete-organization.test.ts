import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { DbSchema, InvoiceLineType } from "@usenullish/nullish-schema/db";
import { DeleteOrganizationService } from "../../src/organizations/services/delete-organization";
import {
  createClient,
  createInvoice,
  createOrganization,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../_test-utils";

const organizations = DbSchema.Core.Organizations.OrganizationsSchema;
const lines = DbSchema.Billing.Invoices.LinesSchema;

const instance = await openTestDb();
const db = instance.connection;

const service = DeleteOrganizationService.create({ db });

const markDeleted = async ({
  organizationId,
  daysAgo,
}: {
  organizationId: string;
  daysAgo: number;
}): Promise<Date> => {
  const deletedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  await db.update(organizations).set({ deletedAt }).where(eq(organizations.id, organizationId));

  return deletedAt;
};

const countAuditLogs = async ({ recordIds }: { recordIds: string[] }): Promise<number> => {
  const rows = await db.execute<{ count: string }>(
    sql`SELECT count(*)::text AS count FROM audit.logs WHERE record_id::text IN (${sql.join(
      recordIds.map((id) => sql`${id}`),
      sql`, `,
    )})`,
  );

  return Number(rows[0]?.count ?? 0);
};

describe("DeleteOrganizationService", () => {
  beforeEach(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  describe("list", () => {
    test("lists an organization marked deleted with its name and the date", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      const deletedAt = await markDeleted({ organizationId, daysAgo: 31 });

      const result = await service.list();

      expect(result).toEqual({
        status: "success",
        result: [{ id: organizationId, name: `Org ${TEST_USER_ID}`, deletedAt }],
      });
    });

    test("lists an organization marked deleted less than 30 days ago", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      await markDeleted({ organizationId, daysAgo: 1 });

      const result = await service.list();

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ id }) => id)).toEqual([organizationId]);
    });

    test("lists the organizations in the order they were marked deleted", async () => {
      const recentId = await createOrganization(db, TEST_USER_ID);
      await markDeleted({ organizationId: recentId, daysAgo: 1 });
      const oldestId = await createOrganization(db, TEST_USER_ID);
      await markDeleted({ organizationId: oldestId, daysAgo: 40 });

      const result = await service.list();

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ id }) => id)).toEqual([oldestId, recentId]);
    });

    test("does not list an organization that is not deleted", async () => {
      await createOrganization(db, TEST_USER_ID);

      const result = await service.list();

      expect(result).toEqual({ status: "success", result: [] });
    });
  });

  describe("delete", () => {
    test("deletes the organization", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);

      const result = await service.delete({ organizationId });

      expect(result).toEqual({ status: "success", result: { id: organizationId } });

      const rows = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId));

      expect(rows).toEqual([]);
    });

    test("deletes the audit logs of the organization and of its records", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      const clientId = await createClient(db, organizationId);
      const invoiceId = await createInvoice(db, { organizationId, clientId });
      const [line] = await db
        .insert(lines)
        .values({
          organizationId,
          invoiceId,
          type: InvoiceLineType.ITEM,
          description: "Line",
          quantity: 1,
          unitPrice: 1000n,
        })
        .returning();

      const recordIds = [organizationId, clientId, invoiceId, line?.id ?? ""];

      expect(await countAuditLogs({ recordIds })).toBeGreaterThan(0);

      await service.delete({ organizationId });

      expect(await countAuditLogs({ recordIds })).toBe(0);
    });

    test("keeps the audit logs of another organization", async () => {
      const organizationId = await createOrganization(db, TEST_USER_ID);
      const otherOrganizationId = await createOrganization(db, TEST_USER_ID);
      const otherClientId = await createClient(db, otherOrganizationId);

      await service.delete({ organizationId });

      expect(
        await countAuditLogs({ recordIds: [otherOrganizationId, otherClientId] }),
      ).toBeGreaterThan(0);
    });
  });
});
