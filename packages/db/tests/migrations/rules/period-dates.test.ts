import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { VatPaymentMethod, VatPeriodStatus } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createJournalEntry,
  createOrganization,
  createPeriod,
  createVatMethods,
  createVatPeriod,
  createVatSettings,
  periods,
  resetDb,
  seedUsers,
  vatPeriods,
  vatPeriodsOf,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const updateDates = ({
  periodId,
  startOn,
  endOn,
}: {
  periodId: string;
  startOn: Date;
  endOn: Date;
}) => db.update(periods).set({ startOn, endOn }).where(eq(periods.id, periodId)).returning();

describe("check_period_dates", () => {
  let organizationId: string;
  let periodId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
  });

  describe("journal entries", () => {
    test("allows changing the dates when the journal entries still fall within them", async () => {
      await createJournalEntry(db, organizationId, new Date("2026-05-10"));

      const [updated] = await updateDates({
        periodId,
        startOn: new Date("2026-04-01"),
        endOn: new Date("2027-03-31"),
      });

      expect(updated?.startOn).toEqual(new Date("2026-04-01"));
      expect(updated?.endOn).toEqual(new Date("2027-03-31"));
    });

    test("rejects a start date after a journal entry", async () => {
      await createJournalEntry(db, organizationId, new Date("2026-02-10"));

      const error = await updateDates({
        periodId,
        startOn: new Date("2026-03-01"),
        endOn: new Date("2026-12-31"),
      }).catch((err: unknown) => err);

      expect(causeMessage(error)).toContain("has journal entries outside");
    });

    test("rejects an end date before a journal entry", async () => {
      await createJournalEntry(db, organizationId, new Date("2026-11-20"));

      const error = await updateDates({
        periodId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-10-31"),
      }).catch((err: unknown) => err);

      expect(causeMessage(error)).toContain("has journal entries outside");
    });

    test("ignores the journal entries of another period", async () => {
      await createPeriod(db, organizationId, {
        startOn: new Date("2027-01-01"),
        endOn: new Date("2027-12-31"),
      });
      await createJournalEntry(db, organizationId, new Date("2027-02-10"));

      const [updated] = await updateDates({
        periodId,
        startOn: new Date("2026-03-01"),
        endOn: new Date("2026-12-31"),
      });

      expect(updated?.startOn).toEqual(new Date("2026-03-01"));
    });
  });

  describe("with VAT methods", () => {
    beforeEach(async () => {
      await createVatSettings(db, organizationId);
    });

    test("generates the VAT periods again for the new dates", async () => {
      await createVatMethods(db, organizationId, { periodId });

      await updateDates({
        periodId,
        startOn: new Date("2026-04-01"),
        endOn: new Date("2026-12-31"),
      });

      expect(await vatPeriodsOf(db, organizationId)).toEqual([
        {
          startOn: new Date("2026-04-01"),
          endOn: new Date("2026-06-30"),
          status: VatPeriodStatus.OPEN,
        },
        {
          startOn: new Date("2026-07-01"),
          endOn: new Date("2026-12-31"),
          status: VatPeriodStatus.OPEN,
        },
      ]);
    });

    test("generates the VAT periods again with the payment method of the period", async () => {
      await createVatMethods(db, organizationId, {
        periodId,
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      });

      await updateDates({
        periodId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-09-30"),
      });

      const rows = await vatPeriodsOf(db, organizationId);

      expect(rows.map(({ startOn, endOn }) => ({ startOn, endOn }))).toEqual([
        { startOn: new Date("2026-01-01"), endOn: new Date("2026-03-31") },
        { startOn: new Date("2026-04-01"), endOn: new Date("2026-06-30") },
        { startOn: new Date("2026-07-01"), endOn: new Date("2026-09-30") },
      ]);
    });

    test("rejects changing the dates of a period with a closed VAT period", async () => {
      await createVatMethods(db, organizationId, { periodId });
      await db
        .update(vatPeriods)
        .set({ status: VatPeriodStatus.CLOSED })
        .where(eq(vatPeriods.organizationId, organizationId));

      const error = await updateDates({
        periodId,
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-11-30"),
      }).catch((err: unknown) => err);

      expect(causeMessage(error)).toContain("has closed VAT periods");
    });
  });

  describe("without VAT methods", () => {
    test("keeps the VAT periods that still fall within the new dates", async () => {
      await createVatPeriod(db, organizationId, {
        startOn: new Date("2026-07-01"),
        endOn: new Date("2026-12-31"),
      });

      await updateDates({
        periodId,
        startOn: new Date("2026-04-01"),
        endOn: new Date("2026-12-31"),
      });

      expect(await vatPeriodsOf(db, organizationId)).toEqual([
        {
          startOn: new Date("2026-07-01"),
          endOn: new Date("2026-12-31"),
          status: VatPeriodStatus.OPEN,
        },
      ]);
    });

    test("rejects new dates that leave a VAT period outside", async () => {
      await createVatPeriod(db, organizationId, {
        startOn: new Date("2026-01-01"),
        endOn: new Date("2026-06-30"),
      });

      const error = await updateDates({
        periodId,
        startOn: new Date("2026-04-01"),
        endOn: new Date("2026-12-31"),
      }).catch((err: unknown) => err);

      expect(causeMessage(error)).toContain("has VAT periods outside");
    });
  });
});
