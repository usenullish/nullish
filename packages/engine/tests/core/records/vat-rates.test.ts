import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import { DbSchema, VatType } from "@usenullish/nullish-schema/db";
import { DbCollectionVatRates, DbVatRates } from "../../../src/core/records/vat-rates";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../_test-utils";
import type { Records } from "@usenullish/nullish-schema/records";

const vatRates = DbSchema.Core.Vat.VatRatesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const seedRate = async (organizationId: string, code: string): Promise<string> => {
  const [row] = await db
    .insert(vatRates)
    .values({
      organizationId,
      code,
      type: VatType.NET_RATE_TAX,
      rate: 8.1,
      netRate: 6.2,
      startOn: new Date("2026-01-01"),
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

describe("vat-rates", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let store: DbVatRates;
  let collectionStore: DbCollectionVatRates;
  let rateId: string;
  let siblingRateId: string;
  let otherRateId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    store = DbVatRates.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionVatRates.create({
      db,
      userId: TEST_USER_ID,
      foreignKeyId: orgId,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE core.vat_rates CASCADE;`);
    rateId = await seedRate(orgId, "UN81");
    siblingRateId = await seedRate(siblingOrgId, "UN81");
    otherRateId = await seedRate(otherOrgId, "UN81");
  });

  describe("findById", () => {
    test("returns the rate of the caller's organization", async () => {
      const result = await store.find({ pKey: rateId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(rateId);
      expect(result.result?.organizationId).toBe(orgId);
    });

    test("returns a rate of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingRateId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingRateId);
      expect(result.result?.organizationId).toBe(siblingOrgId);
    });

    test("resolves to undefined for a rate of another organization", async () => {
      const result = await store.find({ pKey: otherRateId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("update", () => {
    test("changes the code and bumps the version", async () => {
      const result = await store.update({
        pKey: rateId,
        values: { version: 1, type: VatType.NET_RATE_TAX, code: "UN81-updated" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.code).toBe("UN81-updated");
      expect(result.result.version).toBe(2);
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: rateId,
        values: { version: 999, type: VatType.NET_RATE_TAX },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError when the id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: { version: 1, type: VatType.NET_RATE_TAX },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors with InvalidArrayLengthError for a rate of another organization", async () => {
      const result = await store.update({
        pKey: otherRateId,
        values: { version: 1, type: VatType.NET_RATE_TAX },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe("list", () => {
    test("returns only the rates of the parent organization", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
      expect(result.result[0]?.id).toBe(rateId);
      expect(result.result[0]?.organizationId).toBe(orgId);
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id and returns the rate parsed", async () => {
      const result = await collectionStore.insert({
        values: {
          code: "CEX",
          type: VatType.NON_TAXABLE_TURNOVER,
          rate: 0,
          startOn: new Date("2026-01-01"),
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.code).toBe("CEX");
      expect(result.result.version).toBe(1);
    });
  });

  describe("list filters", () => {
    let filtersStore: DbCollectionVatRates;

    const list = (filters: Records["Core"]["VatRates"]["Filter"]) =>
      filtersStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
        filters,
      });

    const codesOf = (rates: readonly { code: string }[]): string[] =>
      rates.map(({ code }) => code).sort();

    beforeEach(async () => {
      const filtersOrgId = await createOrganization(db, TEST_USER_ID);

      filtersStore = DbCollectionVatRates.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: filtersOrgId,
      });

      for (const values of [
        {
          code: "FIRST-HALF",
          type: VatType.NET_RATE_TAX,
          rate: 8.1,
          netRate: 6.2,
          startOn: new Date("2026-01-01"),
          endOn: new Date("2026-06-30"),
        },
        {
          code: "SECOND-HALF",
          type: VatType.NET_RATE_TAX,
          rate: 8.1,
          netRate: 6.5,
          startOn: new Date("2026-07-01"),
        },
        {
          code: "NON-TAXABLE",
          type: VatType.NON_TAXABLE_TURNOVER,
          rate: 0,
          startOn: new Date("2026-01-01"),
        },
      ]) {
        const result = await filtersStore.insert({ values });

        if (result.status === "error") {
          throw result.err;
        }
      }
    });

    test("returns only the rates of the type", async () => {
      const result = await list({ type: VatType.NON_TAXABLE_TURNOVER });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(codesOf(result.result)).toEqual(["NON-TAXABLE"]);
    });

    test.each([
      ["2025-12-31", []],
      ["2026-03-01", ["FIRST-HALF", "NON-TAXABLE"]],
      ["2026-06-30", ["FIRST-HALF", "NON-TAXABLE"]],
      ["2026-07-01", ["NON-TAXABLE", "SECOND-HALF"]],
      ["2030-01-01", ["NON-TAXABLE", "SECOND-HALF"]],
    ])("returns the rates valid on %p", async (validOn, expected) => {
      const result = await list({ validOn: new Date(validOn) });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(codesOf(result.result)).toEqual(expected);
    });

    test("combines the type and the validity", async () => {
      const result = await list({ type: VatType.NET_RATE_TAX, validOn: new Date("2026-08-01") });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(codesOf(result.result)).toEqual(["SECOND-HALF"]);
    });
  });
});
