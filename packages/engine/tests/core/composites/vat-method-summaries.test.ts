import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, VatPaymentMethod, VatRemunerationMethod } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbCollectionVatMethodSummaries } from "../../../src/core/composites/vat-method-summaries";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const vatSettings = DbSchema.Core.Vat.VatSettingsSchema;
const vatMethods = DbSchema.Core.Vat.VatMethodsSchema;
const periods = DbSchema.Ledger.Periods.PeriodsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const seedMethod = async ({
  organizationId,
  year,
}: {
  organizationId: string;
  year: number;
}): Promise<{ vatMethodId: string; periodId: string }> => {
  const [period] = await db
    .insert(periods)
    .values({
      organizationId,
      startOn: new Date(`${year}-01-01`),
      endOn: new Date(`${year}-12-31`),
    })
    .returning();
  assertNonNullish(period);

  const [vatMethod] = await db
    .insert(vatMethods)
    .values({
      organizationId,
      periodId: period.id,
      remunerationMethod: VatRemunerationMethod.AGREED,
      paymentMethod: VatPaymentMethod.NET_RATE,
    })
    .returning();
  assertNonNullish(vatMethod);

  return { vatMethodId: vatMethod.id, periodId: period.id };
};

describe("DbCollectionVatMethodSummaries", () => {
  let organizationId: string;
  let methods: { vatMethodId: string; periodId: string }[];

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);

    await db.insert(vatSettings).values({ organizationId, vatNumber: "CHE-123.456.789 MWST" });

    methods = [];

    for (const year of [2025, 2023, 2024]) {
      methods.push(await seedMethod({ organizationId, year }));
    }
  });

  afterAll(async () => {
    await resetDb(db);
  });

  const list = ({
    userId = TEST_USER_ID,
    field = "startOn",
    direction = "desc",
    limit = 10,
    offset = 0,
  }: {
    userId?: string;
    field?: string;
    direction?: "asc" | "desc";
    limit?: number;
    offset?: number;
  } = {}) =>
    DbCollectionVatMethodSummaries.create({ db, userId, foreignKeyId: organizationId }).list({
      pagination: { limit, offset },
      sort: { field, direction },
    });

  test("lists the VAT methods with their period", async () => {
    const result = await list();

    if (result.status === "error") {
      throw result.err;
    }

    expect(result.result).toHaveLength(3);

    for (const { vatMethod, period } of result.result) {
      expect(period.id).toBe(vatMethod.periodId);
    }
  });

  test("sorts by the start of the period, newest first", async () => {
    const result = await list();

    if (result.status === "error") {
      throw result.err;
    }

    expect(result.result.map(({ period }) => period.startOn.getUTCFullYear())).toEqual([
      2025, 2024, 2023,
    ]);
  });

  test("sorts by the start of the period, oldest first", async () => {
    const result = await list({ direction: "asc" });

    if (result.status === "error") {
      throw result.err;
    }

    expect(result.result.map(({ period }) => period.startOn.getUTCFullYear())).toEqual([
      2023, 2024, 2025,
    ]);
  });

  test("paginates", async () => {
    const result = await list({ limit: 1, offset: 1 });

    if (result.status === "error") {
      throw result.err;
    }

    expect(result.result.map(({ period }) => period.startOn.getUTCFullYear())).toEqual([2024]);
  });

  test("returns an error Result for a field that is not a column of the period", async () => {
    const result = await list({ field: "paymentMethod" });

    expect(result.status).toBe("error");
  });

  test("lists nothing to a user outside the organization", async () => {
    const result = await list({ userId: TEST_OTHER_USER_ID });

    if (result.status === "error") {
      throw result.err;
    }

    expect(result.result).toEqual([]);
  });
});
