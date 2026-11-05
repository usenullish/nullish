import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import * as z from "zod";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, InvalidArrayLengthError } from "@usenullish/nullish-common";
import { DbSchema, PeriodStatus } from "@usenullish/nullish-schema/db";
import { DbCollectionPeriods, DbPeriods } from "../../../src/ledger/records/periods";
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

const periods = DbSchema.Ledger.Periods.PeriodsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const insertPeriod = async (organizationId: string): Promise<string> => {
  const [row] = await db
    .insert(periods)
    .values({
      organizationId,
      startOn: new Date("2020-01-01"),
      endOn: new Date("2020-12-31"),
    })
    .returning();
  assertNonNullish(row);
  return row.id;
};

describe("periods", () => {
  let orgId: string;
  let siblingOrgId: string;
  let otherOrgId: string;
  let store: DbPeriods;
  let collectionStore: DbCollectionPeriods;
  let periodId: string;
  let siblingPeriodId: string;
  let otherPeriodId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    siblingOrgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    store = DbPeriods.create({ db, userId: TEST_USER_ID });
    collectionStore = DbCollectionPeriods.create({
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
    await db.execute(sql`TRUNCATE ledger.periods CASCADE;`);
    periodId = await insertPeriod(orgId);
    siblingPeriodId = await insertPeriod(siblingOrgId);
    otherPeriodId = await insertPeriod(otherOrgId);
  });

  describe("findById", () => {
    test("returns a period of the parent organization", async () => {
      const result = await store.find({ pKey: periodId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(periodId);
    });

    test("returns a period of a sibling organization of the caller", async () => {
      const result = await store.find({ pKey: siblingPeriodId });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result?.id).toBe(siblingPeriodId);
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
    test("closes the period and bumps the version", async () => {
      const created = await collectionStore.insert({
        values: {
          startOn: new Date("2026-01-01"),
          endOn: new Date("2026-12-31"),
          status: PeriodStatus.OPEN,
        },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await store.update({
        pKey: created.result.id,
        values: { version: created.result.version, status: PeriodStatus.CLOSED },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.status).toBe(PeriodStatus.CLOSED);
      expect(result.result.version).toBe(2);
    });

    test("returns an error Result on a stale version", async () => {
      const created = await collectionStore.insert({
        values: {
          startOn: new Date("2026-01-01"),
          endOn: new Date("2026-12-31"),
          status: PeriodStatus.OPEN,
        },
      });

      if (created.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      const result = await store.update({
        pKey: created.result.id,
        values: { version: 999, status: PeriodStatus.CLOSED },
      });

      expect(result.status).toBe("error");
    });

    test("errors with InvalidArrayLengthError when the id matches nothing", async () => {
      const result = await store.update({
        pKey: TEST_MISSING_ID,
        values: { version: 1, status: PeriodStatus.CLOSED },
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
        values: { version: 1, status: PeriodStatus.CLOSED },
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
    });
  });

  describe("insert", () => {
    test("stamps the parent organization id and returns the open period parsed", async () => {
      const result = await collectionStore.insert({
        values: {
          startOn: new Date("2026-01-01"),
          endOn: new Date("2026-12-31"),
          status: PeriodStatus.OPEN,
        },
      });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.organizationId).toBe(orgId);
      expect(result.result.endOn).toEqual(new Date("2026-12-31"));
      expect(result.result.status).toBe(PeriodStatus.OPEN);
      expect(result.result.version).toBe(1);
    });
  });

  describe("list filters", () => {
    let filtersStore: DbCollectionPeriods;
    let closedPeriodId: string;
    let openPeriodId: string;

    const list = (filters: Records["Ledger"]["Periods"]["Filter"]) =>
      filtersStore.list({
        pagination: { limit: 100, offset: 0 },
        sort: { field: "startOn", direction: "asc" },
        filters,
      });

    beforeEach(async () => {
      const filtersOrgId = await createOrganization(db, TEST_USER_ID);

      filtersStore = DbCollectionPeriods.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: filtersOrgId,
      });

      const closed = await filtersStore.insert({
        values: {
          startOn: new Date("2024-01-01"),
          endOn: new Date("2024-12-31"),
          status: PeriodStatus.OPEN,
        },
      });

      if (closed.status === "error") {
        throw closed.err;
      }

      const closing = await DbPeriods.create({ db, userId: TEST_USER_ID }).update({
        pKey: closed.result.id,
        values: { version: closed.result.version, status: PeriodStatus.CLOSED },
      });

      if (closing.status === "error") {
        throw closing.err;
      }

      const open = await filtersStore.insert({
        values: {
          startOn: new Date("2025-01-01"),
          endOn: new Date("2025-12-31"),
          status: PeriodStatus.OPEN,
        },
      });

      if (open.status === "error") {
        throw open.err;
      }

      closedPeriodId = closed.result.id;
      openPeriodId = open.result.id;
    });

    test.each([
      [PeriodStatus.CLOSED, () => [closedPeriodId]],
      [PeriodStatus.OPEN, () => [openPeriodId]],
    ])("returns the periods with the status %p", async (status, expected) => {
      const result = await list({ status });

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.result.map(({ id }) => id)).toEqual(expected());
    });

    test("returns a ZodError Result for an unknown status", async () => {
      const result = await list({ status: "archived" as PeriodStatus });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(z.ZodError);
    });
  });
});
