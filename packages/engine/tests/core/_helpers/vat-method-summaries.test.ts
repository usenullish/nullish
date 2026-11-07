import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { asc, desc } from "drizzle-orm";
import { DbSchema, VatPaymentMethod, VatRemunerationMethod } from "@usenullish/nullish-schema/db";
import { listVatMethodSummaries } from "../../../src/core/_helpers/vat-method-summaries";
import { envDbUrl } from "@usenullish/nullish-env";
import { createOrganization, resetDb, seedUsers, TEST_USER_ID } from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("core/_helpers/vat-method-summaries", () => {
  const vatSettings = DbSchema.Core.Vat.VatSettingsSchema;
  const vatMethods = DbSchema.Core.Vat.VatMethodsSchema;
  const periods = DbSchema.Ledger.Periods.PeriodsSchema;

  const seedOrganization = async ({ years }: { years: number[] }): Promise<string> => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    await db.insert(vatSettings).values({ organizationId, vatNumber: "CHE-123.456.789 MWST" });

    const rows = await db
      .insert(periods)
      .values(
        years.map((year) => ({
          organizationId,
          startOn: new Date(`${year}-01-01`),
          endOn: new Date(`${year}-12-31`),
        })),
      )
      .returning();

    await db.insert(vatMethods).values(
      rows.map(({ id }) => ({
        organizationId,
        periodId: id,
        remunerationMethod: VatRemunerationMethod.AGREED,
        paymentMethod: VatPaymentMethod.NET_RATE,
      })),
    );

    return organizationId;
  };

  const startYears = (summaries: Awaited<ReturnType<typeof listVatMethodSummaries>>): number[] =>
    summaries.map(({ period }) => period.startOn.getUTCFullYear());

  let organizationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await seedOrganization({ years: [2025, 2023, 2024] });
    await seedOrganization({ years: [2022] });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("listVatMethodSummaries", () => {
    test("returns each VAT method of the organization with its period", async () => {
      const result = await db.transaction((tx) =>
        listVatMethodSummaries({
          tx,
          organizationId,
          orderBy: [asc(periods.startOn)],
          pagination: { limit: 100, offset: 0 },
        }),
      );

      expect(result).toHaveLength(3);

      for (const { vatMethod, period } of result) {
        expect(vatMethod.organizationId).toBe(organizationId);
        expect(period.id).toBe(vatMethod.periodId);
      }
    });

    test("orders by the given column of the period", async () => {
      const ascending = await db.transaction((tx) =>
        listVatMethodSummaries({
          tx,
          organizationId,
          orderBy: [asc(periods.startOn)],
          pagination: { limit: 100, offset: 0 },
        }),
      );
      const descending = await db.transaction((tx) =>
        listVatMethodSummaries({
          tx,
          organizationId,
          orderBy: [desc(periods.startOn)],
          pagination: { limit: 100, offset: 0 },
        }),
      );

      expect(startYears(ascending)).toEqual([2023, 2024, 2025]);
      expect(startYears(descending)).toEqual([2025, 2024, 2023]);
    });

    test("applies the limit and the offset", async () => {
      const result = await db.transaction((tx) =>
        listVatMethodSummaries({
          tx,
          organizationId,
          orderBy: [asc(periods.startOn)],
          pagination: { limit: 1, offset: 1 },
        }),
      );

      expect(startYears(result)).toEqual([2024]);
    });
  });
});
