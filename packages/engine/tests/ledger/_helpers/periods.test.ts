import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, PeriodStatus } from "@usenullish/nullish-schema/db";
import {
  findNextPeriod,
  getPeriod,
  listOpenPeriodsBefore,
  updatePeriod,
} from "../../../src/ledger/_helpers/periods";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  resetDb,
  seedUsers,
  TEST_MISSING_ID,
  TEST_USER_ID,
} from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const createPeriod = async ({
  organizationId,
  year,
}: {
  organizationId: string;
  year: number;
}): Promise<string> => {
  const [period] = await db
    .insert(periods)
    .values({
      organizationId,
      startOn: new Date(`${year}-01-01`),
      endOn: new Date(`${year}-12-31`),
    })
    .returning();
  assertNonNullish(period);

  return period.id;
};

const closePeriod = (id: string): Promise<unknown> =>
  db.update(periods).set({ status: PeriodStatus.CLOSED }).where(eq(periods.id, id));

describe("ledger/_helpers/periods", () => {
  let orgId: string;
  let otherOrgId: string;
  let firstPeriodId: string;
  let secondPeriodId: string;
  let thirdPeriodId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  beforeEach(async () => {
    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_USER_ID);

    firstPeriodId = await createPeriod({ organizationId: orgId, year: 2025 });
    secondPeriodId = await createPeriod({ organizationId: orgId, year: 2026 });
    thirdPeriodId = await createPeriod({ organizationId: orgId, year: 2027 });
  });

  describe("getPeriod", () => {
    test("returns the period", async () => {
      const period = await db.transaction((tx) => getPeriod({ tx, id: secondPeriodId }));

      expect(period.id).toBe(secondPeriodId);
      expect(period.organizationId).toBe(orgId);
      expect(period.startOn).toEqual(new Date("2026-01-01"));
      expect(period.endOn).toEqual(new Date("2026-12-31"));
      expect(period.status).toBe(PeriodStatus.OPEN);
    });

    test("rejects when no period matches the id", async () => {
      await expect(
        db.transaction((tx) => getPeriod({ tx, id: TEST_MISSING_ID })),
      ).rejects.toThrow();
    });
  });

  describe("listOpenPeriodsBefore", () => {
    test("returns the open periods ending before the date", async () => {
      const result = await db.transaction((tx) =>
        listOpenPeriodsBefore({ tx, organizationId: orgId, startOn: new Date("2027-01-01") }),
      );

      expect(result.map(({ id }) => id).toSorted()).toEqual(
        [firstPeriodId, secondPeriodId].toSorted(),
      );
    });

    test("ignores the closed periods", async () => {
      await closePeriod(firstPeriodId);

      const result = await db.transaction((tx) =>
        listOpenPeriodsBefore({ tx, organizationId: orgId, startOn: new Date("2027-01-01") }),
      );

      expect(result.map(({ id }) => id)).toEqual([secondPeriodId]);
    });

    test("returns nothing when no period ends before the date", async () => {
      const result = await db.transaction((tx) =>
        listOpenPeriodsBefore({ tx, organizationId: orgId, startOn: new Date("2025-01-01") }),
      );

      expect(result).toEqual([]);
    });

    test("ignores the periods of another organization", async () => {
      await createPeriod({ organizationId: otherOrgId, year: 2024 });

      const result = await db.transaction((tx) =>
        listOpenPeriodsBefore({ tx, organizationId: orgId, startOn: new Date("2026-01-01") }),
      );

      expect(result.map(({ id }) => id)).toEqual([firstPeriodId]);
    });
  });

  describe("findNextPeriod", () => {
    test("returns the first period starting after the date", async () => {
      const period = await db.transaction((tx) =>
        findNextPeriod({ tx, organizationId: orgId, endOn: new Date("2025-12-31") }),
      );

      expect(period?.id).toBe(secondPeriodId);
    });

    test("returns a closed period too", async () => {
      await closePeriod(firstPeriodId);
      await closePeriod(secondPeriodId);

      const period = await db.transaction((tx) =>
        findNextPeriod({ tx, organizationId: orgId, endOn: new Date("2025-12-31") }),
      );

      expect(period?.id).toBe(secondPeriodId);
      expect(period?.status).toBe(PeriodStatus.CLOSED);
    });

    test("returns nothing when no period starts after the date", async () => {
      const period = await db.transaction((tx) =>
        findNextPeriod({ tx, organizationId: orgId, endOn: new Date("2027-12-31") }),
      );

      expect(period).toBeUndefined();
    });

    test("ignores the periods of another organization", async () => {
      await createPeriod({ organizationId: otherOrgId, year: 2028 });

      const period = await db.transaction((tx) =>
        findNextPeriod({ tx, organizationId: orgId, endOn: new Date("2027-12-31") }),
      );

      expect(period).toBeUndefined();
    });
  });

  describe("updatePeriod", () => {
    test("updates the period and returns it", async () => {
      const period = await db.transaction((tx) =>
        updatePeriod({ tx, id: thirdPeriodId, values: { status: PeriodStatus.CLOSED } }),
      );

      expect(period.id).toBe(thirdPeriodId);
      expect(period.status).toBe(PeriodStatus.CLOSED);

      const [row] = await db.select().from(periods).where(eq(periods.id, thirdPeriodId));

      expect(row?.status).toBe(PeriodStatus.CLOSED);
    });

    test("leaves the other periods untouched", async () => {
      await db.transaction((tx) =>
        updatePeriod({ tx, id: thirdPeriodId, values: { status: PeriodStatus.CLOSED } }),
      );

      const [row] = await db.select().from(periods).where(eq(periods.id, secondPeriodId));

      expect(row?.status).toBe(PeriodStatus.OPEN);
    });

    test("rejects when no period matches the id", async () => {
      await expect(
        db.transaction((tx) =>
          updatePeriod({ tx, id: TEST_MISSING_ID, values: { status: PeriodStatus.CLOSED } }),
        ),
      ).rejects.toThrow();
    });
  });
});
