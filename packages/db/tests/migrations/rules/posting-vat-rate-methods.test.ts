import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import {
  AccountType,
  EXCHANGE_RATE_ONE,
  VatPaymentMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
import type { Nullable } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createJournalEntry,
  createOrganization,
  createPeriod,
  createVatMethods,
  createVatRate,
  createVatSettings,
  journalEntries,
  leafAccountId,
  postings,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const createOrganizationWithMethods = async ({
  paymentMethod,
}: {
  paymentMethod: Nullable<VatPaymentMethod>;
}): Promise<string> => {
  const organizationId = await createOrganization(db);
  await createVatSettings(db, organizationId);
  const periodId = await createPeriod(db, organizationId, {
    startOn: new Date("2026-01-01"),
    endOn: new Date("2026-12-31"),
  });

  if (paymentMethod !== null) {
    await createVatMethods(db, organizationId, { periodId, paymentMethod });
  }

  return organizationId;
};

const postWithVatRate = async ({
  organizationId,
  type,
}: {
  organizationId: string;
  type: Nullable<VatType>;
}): Promise<unknown> => {
  const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-06-15"));
  const vatRateId =
    type === null
      ? null
      : await createVatRate(db, organizationId, {
          code: "TEST",
          type,
          netRate: type === VatType.NET_RATE_TAX ? 6.2 : undefined,
        });
  const debitAccountId = await leafAccountId(db, organizationId, AccountType.ASSET);
  const creditAccountId = await leafAccountId(db, organizationId, AccountType.INCOME);

  return await db.transaction((tx) =>
    tx.insert(postings).values([
      {
        organizationId,
        journalEntryId,
        accountId: debitAccountId,
        description: "debit leg",
        debit: 1000n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
      },
      {
        organizationId,
        journalEntryId,
        accountId: creditAccountId,
        description: "credit leg",
        credit: 1000n,
        currency: "CHF",
        exchangeRate: EXCHANGE_RATE_ONE,
        vatRateId,
      },
    ]),
  );
};

describe("check_posting_vat_rate_methods", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("rejects a VAT rate in a year without VAT methods", async () => {
    const organizationId = await createOrganizationWithMethods({ paymentMethod: null });

    const error = await postWithVatRate({
      organizationId,
      type: VatType.NON_TAXABLE_TURNOVER,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("the organization has no VAT methods for that date");
  });

  test("accepts a posting without VAT rate in a year without VAT methods", async () => {
    const organizationId = await createOrganizationWithMethods({ paymentMethod: null });

    const result = await postWithVatRate({ organizationId, type: null });

    expect(result).toBeDefined();
  });

  test.each([
    VatType.SALES_TAX_DUE,
    VatType.INPUT_TAX_MATERIALS,
    VatType.INPUT_TAX_INVESTMENTS,
    VatType.IMPORT_TAX_MATERIALS,
    VatType.IMPORT_TAX_INVESTMENTS,
  ])("rejects a %s rate with the net rate method", async (type) => {
    const organizationId = await createOrganizationWithMethods({
      paymentMethod: VatPaymentMethod.NET_RATE,
    });

    const error = await postWithVatRate({ organizationId, type }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is not supported with the net_rate payment method");
  });

  test("rejects a net rate tax with the effective method", async () => {
    const organizationId = await createOrganizationWithMethods({
      paymentMethod: VatPaymentMethod.EFFECTIVE,
    });

    const error = await postWithVatRate({
      organizationId,
      type: VatType.NET_RATE_TAX,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("is not supported with the effective payment method");
  });

  test.each([
    VatType.ACQUISITION_TAX_MATERIALS,
    VatType.NON_TAXABLE_TURNOVER,
    VatType.NON_CONSIDERATION,
  ])("accepts a %s rate with both methods", async (type) => {
    const netRateOrganizationId = await createOrganizationWithMethods({
      paymentMethod: VatPaymentMethod.NET_RATE,
    });
    const effectiveOrganizationId = await createOrganizationWithMethods({
      paymentMethod: VatPaymentMethod.EFFECTIVE,
    });

    const results = await Promise.all([
      postWithVatRate({ organizationId: netRateOrganizationId, type }),
      postWithVatRate({ organizationId: effectiveOrganizationId, type }),
    ]);

    expect(results).toHaveLength(2);
  });

  test("accepts an input tax rate with the effective method", async () => {
    const organizationId = await createOrganizationWithMethods({
      paymentMethod: VatPaymentMethod.EFFECTIVE,
    });

    const result = await postWithVatRate({ organizationId, type: VatType.INPUT_TAX_MATERIALS });

    expect(result).toBeDefined();
  });

  describe("when the date of the entry changes", () => {
    const createOrganizationWithTwoYears = async ({
      previousPaymentMethod,
    }: {
      previousPaymentMethod: Nullable<VatPaymentMethod>;
    }): Promise<string> => {
      const organizationId = await createOrganizationWithMethods({
        paymentMethod: VatPaymentMethod.EFFECTIVE,
      });
      const periodId = await createPeriod(db, organizationId, {
        startOn: new Date("2025-01-01"),
        endOn: new Date("2025-12-31"),
      });

      if (previousPaymentMethod !== null) {
        await createVatMethods(db, organizationId, {
          periodId,
          paymentMethod: previousPaymentMethod,
        });
      }

      return organizationId;
    };

    const entryOf = async (organizationId: string): Promise<string> => {
      const [row] = await db
        .select({ id: journalEntries.id })
        .from(journalEntries)
        .where(eq(journalEntries.organizationId, organizationId));
      if (row === undefined) {
        throw new Error("No journal entry");
      }
      return row.id;
    };

    const moveTo = async ({
      organizationId,
      validOn,
    }: {
      organizationId: string;
      validOn: Date;
    }): Promise<unknown> => {
      const journalEntryId = await entryOf(organizationId);

      return await db
        .update(journalEntries)
        .set({ validOn })
        .where(eq(journalEntries.id, journalEntryId))
        .returning();
    };

    test("rejects moving an entry to a year whose payment method does not allow its rate", async () => {
      const organizationId = await createOrganizationWithTwoYears({
        previousPaymentMethod: VatPaymentMethod.NET_RATE,
      });
      await postWithVatRate({ organizationId, type: VatType.INPUT_TAX_MATERIALS });

      const error = await moveTo({ organizationId, validOn: new Date("2025-06-15") }).catch(
        (e: unknown) => e,
      );

      expect(causeMessage(error)).toContain("is not supported with the net_rate payment method");
    });

    test("rejects moving an entry with a VAT rate to a year without VAT methods", async () => {
      const organizationId = await createOrganizationWithTwoYears({
        previousPaymentMethod: null,
      });
      await postWithVatRate({ organizationId, type: VatType.INPUT_TAX_MATERIALS });

      const error = await moveTo({ organizationId, validOn: new Date("2025-06-15") }).catch(
        (e: unknown) => e,
      );

      expect(causeMessage(error)).toContain("the organization has no VAT methods for that date");
    });

    test("accepts moving an entry to a year whose payment method allows its rate", async () => {
      const organizationId = await createOrganizationWithTwoYears({
        previousPaymentMethod: VatPaymentMethod.NET_RATE,
      });
      await postWithVatRate({ organizationId, type: VatType.NON_TAXABLE_TURNOVER });

      const result = await moveTo({ organizationId, validOn: new Date("2025-06-15") });

      expect(result).toHaveLength(1);
    });
  });
});
