import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import { DbSchema, VatPeriodStatus } from "@usenullish/nullish-schema/db";
import { DbCollectionVatPeriods, DbVatPeriods } from "../../../src/core/records/vat-periods";
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

const vatPeriods = DbSchema.Core.Vat.VatPeriodsSchema;
const ledgerPeriods = DbSchema.Ledger.Periods.PeriodsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const seedLedgerPeriod = async (organizationId: string): Promise<void> => {
  await db
    .insert(ledgerPeriods)
    .values({ organizationId, startOn: new Date("2026-01-01"), endOn: new Date("2026-12-31") });
};

const seedPeriod = async (
  organizationId: string,
  startOn: string,
  endOn: string,
): Promise<string> => {
  const [row] = await db
    .insert(vatPeriods)
    .values({
      organizationId,
      startOn: new Date(startOn),
      endOn: new Date(endOn),
      status: VatPeriodStatus.OPEN,
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

describe("vat-periods", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let store: DbVatPeriods;
  let collectionStore: DbCollectionVatPeriods;
  let periodId: string;
  let siblingPeriodId: string;
  let otherPeriodId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    await seedLedgerPeriod(orgId);
    await seedLedgerPeriod(siblingOrgId);
    await seedLedgerPeriod(otherOrgId);

    store = DbVatPeriods.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionVatPeriods.create({
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
    await db.execute(sql`TRUNCATE core.vat_periods CASCADE;`);
    periodId = await seedPeriod(orgId, "2026-01-01", "2026-06-30");
    siblingPeriodId = await seedPeriod(siblingOrgId, "2026-01-01", "2026-06-30");
    otherPeriodId = await seedPeriod(otherOrgId, "2026-01-01", "2026-06-30");
  });

  describe("findById", () => {
    test("returns the period of the caller's organization", async () => {
      const result = await store.find({ pKey: periodId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(periodId);
      expect(result.result?.organizationId).toBe(orgId);
    });

    test("returns a period of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingPeriodId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingPeriodId);
      expect(result.result?.organizationId).toBe(siblingOrgId);
    });

    test("resolves to undefined for a period of another organization", async () => {
      const result = await store.find({ pKey: otherPeriodId });

      expect(result).toEqual({ status: "success", result: undefined });
    });

    test("resolves to undefined when nothing matches", async () => {
      const result = await store.find({ pKey: TEST_MISSING_ID });

      expect(result).toEqual({ status: "success", result: undefined });
    });
  });

  describe("update", () => {
    test("changes the status and bumps the version", async () => {
      const result = await store.update({
        pKey: periodId,
        values: { version: 1, status: VatPeriodStatus.CLOSED },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.status).toBe(VatPeriodStatus.CLOSED);
      expect(result.result.version).toBe(2);
    });

    test("returns an error Result on a stale version", async () => {
      const result = await store.update({
        pKey: periodId,
        values: { version: 999, status: VatPeriodStatus.CLOSED },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError when the id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: { version: 1, status: VatPeriodStatus.CLOSED },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });

    test("errors with InvalidArrayLengthError for a period of another organization", async () => {
      const result = await store.update({
        pKey: otherPeriodId,
        values: { version: 1, status: VatPeriodStatus.CLOSED },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(InvalidArrayLengthError);
    });
  });

  describe("list", () => {
    test("returns only the periods of the parent organization", async () => {
      const result = await collectionStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "createdAt", direction: "asc" },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result).toHaveLength(1);
      expect(result.result[0]?.id).toBe(periodId);
      expect(result.result[0]?.organizationId).toBe(orgId);
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id and returns the period parsed", async () => {
      const result = await collectionStore.insert({
        values: {
          startOn: new Date("2026-07-01"),
          endOn: new Date("2026-12-31"),
          status: VatPeriodStatus.OPEN,
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.status).toBe(VatPeriodStatus.OPEN);
      expect(result.result.version).toBe(1);
    });

    test("creates the period open when no status is given", async () => {
      const result = await collectionStore.insert({
        values: {
          startOn: new Date("2026-07-01"),
          endOn: new Date("2026-12-31"),
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.status).toBe(VatPeriodStatus.OPEN);
    });

    test("returns an error Result when the period overlaps an existing one", async () => {
      const result = await collectionStore.insert({
        values: {
          startOn: new Date("2026-03-01"),
          endOn: new Date("2026-09-30"),
          status: VatPeriodStatus.OPEN,
        },
      });

      expect(result.status).toBe("error");
    });
  });

  describe("list filters", () => {
    let filtersStore: DbCollectionVatPeriods;
    let openPeriodId: string;
    let closedPeriodId: string;

    const list = (filters: Records["Core"]["VatPeriods"]["Filter"]) =>
      filtersStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "startOn", direction: "asc" },
        filters,
      });

    beforeEach(async () => {
      const filtersOrgId = await createOrganization(db, TEST_USER_ID);

      await db.insert(DbSchema.Ledger.Periods.PeriodsSchema).values({
        organizationId: filtersOrgId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-12-31"),
      });

      filtersStore = DbCollectionVatPeriods.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: filtersOrgId,
      });

      const open = await filtersStore.insert({
        values: {
          startOn: new Date("2026-01-01"),
          endOn: new Date("2026-06-30"),
          status: VatPeriodStatus.OPEN,
        },
      });

      if (open.status === "error") {
        throw open.err;
      }

      const closed = await filtersStore.insert({
        values: {
          startOn: new Date("2026-07-01"),
          endOn: new Date("2026-12-31"),
          status: VatPeriodStatus.OPEN,
        },
      });

      if (closed.status === "error") {
        throw closed.err;
      }

      const closing = await DbVatPeriods.create({ db, userId: TEST_USER_ID }).update({
        pKey: closed.result.id,
        values: { version: closed.result.version, status: VatPeriodStatus.CLOSED },
      });

      if (closing.status === "error") {
        throw closing.err;
      }

      openPeriodId = open.result.id;
      closedPeriodId = closed.result.id;
    });

    test.each([
      [VatPeriodStatus.OPEN, () => [openPeriodId]],
      [VatPeriodStatus.CLOSED, () => [closedPeriodId]],
    ])("returns the VAT periods with the status %p", async (status, expected) => {
      const result = await list({ status });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ id }) => id)).toEqual(expected());
    });
  });
});
