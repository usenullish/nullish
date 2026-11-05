import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { tryCatch } from "@usenullish/nullish-common";
import { eq } from "drizzle-orm";
import { assertNonNullish } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import type { Migration } from "@usenullish/nullish-schema/migration";
import {
  MigrateVatMethodsMissingError,
  MigrateVatMethodsNoVatSettingsError,
  MigrateVatMethodsService,
} from "../../src/services/vat-methods.migrate";
import {
  createOrganization,
  createPeriod,
  createVatSettings,
  insertVatMethods,
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

const entry = ({
  validOn,
  vat,
}: {
  validOn: Date;
  vat?: string;
}): Migration["Foreign"]["JournalEntry"] => ({
  reference: `REF-${validOn.toISOString()}`,
  validOn,
  lines: [
    {
      codes: { debit: "1020", credit: "3200" },
      amount: 100,
      currency: "CHF",
      exchangeRate: 1,
      vat,
    },
  ],
});

const VALID_ON = new Date(Date.UTC(2024, 5, 1));

describe("MigrateVatMethodsService", () => {
  let orgId: string;
  let periodId: string;

  const migrate = ({
    organizationId = orgId,
    ...args
  }: { organizationId?: string } & Omit<
    Parameters<MigrateVatMethodsService["migrate"]>[0],
    "tx"
  >) =>
    tryCatch(() =>
      withAuthenticatedUser(db, TEST_USER_ID, (tx) =>
        MigrateVatMethodsService.create({ organizationId }).migrate({ tx, ...args }),
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
        startOn: new Date(Date.UTC(2024, 0, 1)),
        endOn: new Date(Date.UTC(2024, 11, 31)),
      }),
    );

    const [period] = await db.select().from(periods).where(eq(periods.organizationId, orgId));
    assertNonNullish(period);
    periodId = period.id;
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("succeeds when the journal has no VAT", async () => {
    const result = await migrate({ journal: [entry({ validOn: VALID_ON })] });

    expect(result.status).toBe("success");
  });

  test("returns an error Result without VAT settings", async () => {
    const result = await migrate({
      journal: [entry({ validOn: VALID_ON, vat: "UN81" })],
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigrateVatMethodsNoVatSettingsError);
  });

  test("returns an error Result listing the periods without VAT methods", async () => {
    await createVatSettings(db, orgId);

    const result = await migrate({
      journal: [entry({ validOn: VALID_ON, vat: "UN81" })],
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigrateVatMethodsMissingError);
    expect(result.err).toHaveProperty("message", expect.stringContaining("2024"));
  });

  test("succeeds when the periods have their VAT methods", async () => {
    await insertVatMethods(db, orgId, { periodId });

    const result = await migrate({
      journal: [entry({ validOn: VALID_ON, vat: "UN81" })],
    });

    expect(result.status).toBe("success");
  });
});
