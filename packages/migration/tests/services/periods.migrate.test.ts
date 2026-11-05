import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { tryCatch } from "@usenullish/nullish-common";
import { eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema, PeriodStatus } from "@usenullish/nullish-schema/db";
import type { Migration } from "@usenullish/nullish-schema/migration";
import {
  MigratePeriodsClosedError,
  MigratePeriodsMissingError,
  MigratePeriodsService,
} from "../../src/services/periods.migrate";
import {
  createOrganization,
  createPeriod,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_USER_ID,
  withAuthenticatedUser,
  withUser,
} from "../../../admin/tests/_test-utils";

const instance = await openTestDb();
const db = instance.connection;

const periods = DbSchema.Ledger.Periods.PeriodsSchema;

const entry = (validOn: Date): Migration["Foreign"]["JournalEntry"] => ({
  reference: `REF-${validOn.toISOString()}`,
  validOn,
  lines: [
    {
      codes: { debit: "1020", credit: "3200" },
      amount: 100,
      currency: "CHF",
      exchangeRate: 1,
    },
  ],
});

describe("MigratePeriodsService", () => {
  let orgId: string;

  const migrate = ({
    organizationId = orgId,
    ...args
  }: { organizationId?: string } & Omit<Parameters<MigratePeriodsService["migrate"]>[0], "tx">) =>
    tryCatch(() =>
      withAuthenticatedUser(db, TEST_USER_ID, (tx) =>
        MigratePeriodsService.create({ organizationId }).migrate({ tx, ...args }),
      ),
    );

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);

    await withUser(db, TEST_USER_ID, (tx) =>
      createPeriod({
        tx,
        organizationId: orgId,
        startOn: new Date(Date.UTC(2026, 0, 1)),
        endOn: new Date(Date.UTC(2026, 11, 31)),
      }),
    );
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("succeeds when every entry falls in an open period", async () => {
    const result = await migrate({
      journal: [entry(new Date(Date.UTC(2026, 2, 1))), entry(new Date(Date.UTC(2026, 9, 1)))],
    });

    expect(result.status).toBe("success");
  });

  test("returns an error Result listing the yearly periods to open", async () => {
    const result = await migrate({
      journal: [
        entry(new Date(Date.UTC(2024, 2, 1))),
        entry(new Date(Date.UTC(2025, 2, 1))),
        entry(new Date(Date.UTC(2025, 5, 1))),
      ],
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigratePeriodsMissingError);
    expect(result.err).toHaveProperty(
      "message",
      expect.stringContaining("01.01.2024 – 31.12.2024, 01.01.2025 – 31.12.2025"),
    );
  });

  test("returns an error Result for entries in a closed period", async () => {
    const [period] = await db.select().from(periods).where(eq(periods.organizationId, orgId));
    assertNonNullish(period);

    await db.update(periods).set({ status: PeriodStatus.CLOSED }).where(eq(periods.id, period.id));

    const result = await migrate({
      journal: [entry(new Date(Date.UTC(2026, 2, 1)))],
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigratePeriodsClosedError);
  });
});
