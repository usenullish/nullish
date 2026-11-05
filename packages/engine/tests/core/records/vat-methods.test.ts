import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import { DbSchema, VatPaymentMethod, VatRemunerationMethod } from "@usenullish/nullish-schema/db";
import { DbCollectionVatMethods, DbVatMethods } from "../../../src/core/records/vat-methods";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const vatSettings = DbSchema.Core.Vat.VatSettingsSchema;
const vatMethods = DbSchema.Core.Vat.VatMethodsSchema;
const periods = DbSchema.Ledger.Periods.PeriodsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const seedOrganization = async (userId: string): Promise<{ id: string; periodId: string }> => {
  const id = await createOrganization(db, userId);

  await db.insert(vatSettings).values({ organizationId: id, vatNumber: "CHE-123.456.789 MWST" });

  const [period] = await db
    .insert(periods)
    .values({
      organizationId: id,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    })
    .returning();
  assertNonNullish(period);

  return { id, periodId: period.id };
};

const seedMethods = async ({
  organizationId,
  periodId,
}: {
  organizationId: string;
  periodId: string;
}): Promise<string> => {
  const [row] = await db
    .insert(vatMethods)
    .values({
      organizationId,
      periodId,
      remunerationMethod: VatRemunerationMethod.AGREED,
      paymentMethod: VatPaymentMethod.NET_RATE,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

describe("vat-methods", () => {
  let org: { id: string; periodId: string };
  let siblingOrg: { id: string; periodId: string };
  let otherOrg: { id: string; periodId: string };
  let store: DbVatMethods;
  let collectionStore: DbCollectionVatMethods;
  let vatMethodsId: string;
  let siblingVatMethodsId: string;
  let otherVatMethodsId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    org = await seedOrganization(TEST_USER_ID);
    siblingOrg = await seedOrganization(TEST_USER_ID);
    otherOrg = await seedOrganization(TEST_OTHER_USER_ID);

    store = DbVatMethods.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionVatMethods.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: org.id,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE core.vat_methods, core.vat_periods CASCADE;`);

    vatMethodsId = await seedMethods({ organizationId: org.id, periodId: org.periodId });
    siblingVatMethodsId = await seedMethods({
      organizationId: siblingOrg.id,
      periodId: siblingOrg.periodId,
    });
    otherVatMethodsId = await seedMethods({
      organizationId: otherOrg.id,
      periodId: otherOrg.periodId,
    });
  });

  describe("findById", () => {
    test("returns the methods of the caller's organization", async () => {
      const result = await store.find({ pKey: vatMethodsId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(vatMethodsId);
      expect(result.result?.organizationId).toBe(org.id);
      expect(result.result?.periodId).toBe(org.periodId);
    });

    test("returns the methods of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingVatMethodsId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingVatMethodsId);
      expect(result.result?.organizationId).toBe(siblingOrg.id);
    });

    test("resolves to undefined for the methods of another organization", async () => {
      const result = await store.find({ pKey: otherVatMethodsId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("update", () => {
    test("changes the methods and bumps the version", async () => {
      const result = await store.update({
        pKey: vatMethodsId,
        values: {
          version: 1,
          remunerationMethod: VatRemunerationMethod.RECEIVED,
          paymentMethod: VatPaymentMethod.EFFECTIVE,
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.remunerationMethod).toBe(VatRemunerationMethod.RECEIVED);
      expect(result.result.paymentMethod).toBe(VatPaymentMethod.EFFECTIVE);
      expect(result.result.version).toBe(2);
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: vatMethodsId,
        values: {
          version: 999,
          remunerationMethod: VatRemunerationMethod.RECEIVED,
        },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError when the id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: {
          version: 1,
          remunerationMethod: VatRemunerationMethod.RECEIVED,
        },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors with InvalidArrayLengthError for the methods of another organization", async () => {
      const result = await store.update({
        pKey: otherVatMethodsId,
        values: {
          version: 1,
          remunerationMethod: VatRemunerationMethod.RECEIVED,
        },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe("list", () => {
    test("returns only the methods of the parent organization", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
      expect(result.result[0]?.id).toBe(vatMethodsId);
      expect(result.result[0]?.organizationId).toBe(org.id);
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id and returns it parsed", async () => {
      await db.delete(vatMethods).where(eq(vatMethods.organizationId, org.id));

      const result = await collectionStore.insert({
        values: {
          periodId: org.periodId,
          remunerationMethod: VatRemunerationMethod.RECEIVED,
          paymentMethod: VatPaymentMethod.NET_RATE,
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(org.id);
      expect(result.result.periodId).toBe(org.periodId);
      expect(result.result.remunerationMethod).toBe(VatRemunerationMethod.RECEIVED);
      expect(result.result.version).toBe(1);
    });
  });
});
