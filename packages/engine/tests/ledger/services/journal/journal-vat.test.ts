import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish, nonNullish, type Nullable } from "@usenullish/nullish-common";
import {
  DbSchema,
  EXCHANGE_RATE_ONE,
  SystemAccountPurpose,
  VatPaymentMethod,
  VatRemunerationMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { DbJournal } from "../../../../src/ledger/composites/journal";
import { CreateJournalService } from "../../../../src/ledger/services/journal/journal.create";
import { UpdateJournalService } from "../../../../src/ledger/services/journal/journal.update";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  createOrganization,
  createVatSettings,
  resetDb,
  seedUsers,
  TEST_USER_ID,
} from "../../../_test-utils";

type SelectJournal = Composites["Journal"]["Select"];
type SelectPosting = SelectJournal["postings"][number];

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const postingsTable = DbSchema.Ledger.Journal.PostingsSchema;
const vatLinks = DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema;
const systemAccounts = DbSchema.Ledger.SystemAccounts.SystemAccountsSchema;
const vatRates = DbSchema.Core.Vat.VatRatesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

interface Case {
  organizationId: string;
  expenseId: string;
  bankId: string;
  taxPreMaterialId: string;
  taxPreInvestmentId: string;
  regardsTaxId: string;
}

const systemAccountId = async ({
  organizationId,
  purpose,
}: {
  organizationId: string;
  purpose: SystemAccountPurpose;
}): Promise<string> => {
  const [row] = await db
    .select()
    .from(systemAccounts)
    .where(
      and(eq(systemAccounts.organizationId, organizationId), eq(systemAccounts.purpose, purpose)),
    );
  assertNonNullish(row);
  return row.accountId;
};

const vatRateId = async ({
  organizationId,
  code,
}: {
  organizationId: string;
  code: string;
}): Promise<string> => {
  const [row] = await db
    .select()
    .from(vatRates)
    .where(and(eq(vatRates.organizationId, organizationId), eq(vatRates.code, code)));
  assertNonNullish(row);
  return row.id;
};

const createCase = async ({
  paymentMethod,
}: {
  paymentMethod?: VatPaymentMethod;
} = {}): Promise<Case> => {
  const organizationId = await createOrganization(db, TEST_USER_ID);

  await db.insert(periods).values({
    organizationId,
    startOn: new Date("2026-01-01"),
    endOn: new Date("2026-12-31"),
  });

  if (nonNullish(paymentMethod)) {
    await createVatSettings(db, {
      organizationId,
      remunerationMethod: VatRemunerationMethod.AGREED,
      paymentMethod,
    });
  }

  const [expenseId, bankId, taxPreMaterialId, taxPreInvestmentId, regardsTaxId] = await Promise.all(
    [
      SystemAccountPurpose.DEFAULT_EXPENSE,
      SystemAccountPurpose.BANK_ACCOUNT,
      SystemAccountPurpose.TAX_PRE_MATERIAL,
      SystemAccountPurpose.TAX_PRE_INVESTMENT,
      SystemAccountPurpose.REGARDS_TAX,
    ].map((purpose) => systemAccountId({ organizationId, purpose })),
  );
  assertNonNullish(expenseId);
  assertNonNullish(bankId);
  assertNonNullish(taxPreMaterialId);
  assertNonNullish(taxPreInvestmentId);
  assertNonNullish(regardsTaxId);

  return { organizationId, expenseId, bankId, taxPreMaterialId, taxPreInvestmentId, regardsTaxId };
};

const purchase = ({
  expenseId,
  bankId,
  amount,
  vatRateId: rateId,
  validOn = new Date("2026-06-15"),
}: {
  expenseId: string;
  bankId: string;
  amount: bigint;
  vatRateId: Nullable<string>;
  validOn?: Date;
}) => ({
  entry: {
    validOn,
    reference: "PURCHASE",
  },
  postings: [
    {
      accountId: expenseId,
      description: "Purchase",
      currency: "CHF",
      exchangeRate: EXCHANGE_RATE_ONE,
      vatRateId: rateId,
      debit: amount,
      credit: 0n,
    },
    {
      accountId: bankId,
      description: "Purchase",
      currency: "CHF",
      exchangeRate: EXCHANGE_RATE_ONE,
      vatRateId: null,
      debit: 0n,
      credit: amount,
    },
  ],
});

const insertJournal = async ({
  organizationId,
  values,
}: {
  organizationId: string;
  values: ReturnType<typeof purchase>;
}) =>
  await CreateJournalService.create({
    db,
    userId: TEST_USER_ID,
    organizationId,
  }).create({ values });

const insertOrThrow = async (args: {
  organizationId: string;
  values: ReturnType<typeof purchase>;
}): Promise<SelectJournal> => {
  const result = await insertJournal(args);

  if (result.status === "error") {
    throw result.err;
  }

  return result.result;
};

const vatLinksOf = (journalEntryId: string) =>
  db
    .select({ postingId: vatLinks.postingId, vatPostingId: vatLinks.vatPostingId })
    .from(vatLinks)
    .innerJoin(postingsTable, eq(postingsTable.id, vatLinks.postingId))
    .where(eq(postingsTable.journalEntryId, journalEntryId));

const vatPostingIdsOf = async (journalEntryId: string): Promise<string[]> =>
  (await vatLinksOf(journalEntryId)).map(({ vatPostingId }) => vatPostingId);

const generatedOf = async (journal: SelectJournal): Promise<SelectPosting[]> => {
  const vatPostingIds = await vatPostingIdsOf(journal.entry.id);
  return journal.postings.filter(({ id }) => vatPostingIds.includes(id));
};

const sourceOf = async ({
  journal,
  expenseId,
}: {
  journal: SelectJournal;
  expenseId: string;
}): Promise<SelectPosting> => {
  const vatPostingIds = await vatPostingIdsOf(journal.entry.id);
  const source = journal.postings.find(
    ({ id, accountId }) => accountId === expenseId && !vatPostingIds.includes(id),
  );
  assertNonNullish(source);
  return source;
};

const storedPostingsOf = (journalEntryId: string) =>
  db.select().from(postingsTable).where(eq(postingsTable.journalEntryId, journalEntryId));

const toUpdatePosting = ({
  id,
  version,
  accountId,
  description,
  currency,
  exchangeRate,
  vatRateId: rateId,
  debit,
  credit,
}: SelectPosting) => ({
  id,
  version,
  accountId,
  description,
  currency,
  exchangeRate,
  vatRateId: rateId,
  debit,
  credit,
});

const updateOrThrow = async ({
  journal: { entry },
  postings,
}: {
  journal: SelectJournal;
  postings: ReturnType<typeof toUpdatePosting>[];
}): Promise<SelectJournal> => {
  const result = await UpdateJournalService.create({
    db,
    userId: TEST_USER_ID,
    journalId: entry.id,
  }).update({
    values: {
      entry: { validOn: entry.validOn, reference: entry.reference, version: entry.version },
      postings,
    },
  });

  if (result.status === "error") {
    throw result.err;
  }

  return result.result;
};

describe("journal VAT postings", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("input tax with the effective method", () => {
    test("keeps the gross expense and books the input tax on 1170 against the expense", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "VM81" });

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10810n, vatRateId: rateId }),
      });

      const source = await sourceOf({ journal, expenseId: accounts.expenseId });
      const generated = await generatedOf(journal);

      expect(journal.postings).toHaveLength(4);
      expect(source.debit).toBe(10810n);
      expect(
        generated.map(({ accountId, debit, credit, vatRateId }) => ({
          accountId,
          debit,
          credit,
          vatRateId,
        })),
      ).toEqual([
        { accountId: accounts.taxPreMaterialId, debit: 810n, credit: 0n, vatRateId: rateId },
        { accountId: accounts.expenseId, debit: 0n, credit: 810n, vatRateId: null },
      ]);
      expect(await vatLinksOf(journal.entry.id)).toEqual(
        generated.map(({ id }) => ({ postingId: source.id, vatPostingId: id })),
      );
    });

    test("books the input tax on investments on 1171", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "VB81" });

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10810n, vatRateId: rateId }),
      });

      const taxLine = (await generatedOf(journal)).find(({ debit }) => debit > 0n);
      assertNonNullish(taxLine);

      expect(taxLine.accountId).toBe(accounts.taxPreInvestmentId);
      expect(taxLine.debit).toBe(810n);
    });

    test("returns an error Result for an input tax rate with the net rate method", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.NET_RATE });
      const [rate] = await db
        .insert(vatRates)
        .values({
          organizationId: accounts.organizationId,
          code: "VM81",
          type: VatType.INPUT_TAX_MATERIALS,
          rate: 8.1,
          startOn: new Date("2024-01-01"),
        })
        .returning();
      assertNonNullish(rate);

      const result = await insertJournal({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10810n, vatRateId: rate.id }),
      });

      expect(result.status).toBe("error");
    });
  });

  describe("acquisition tax", () => {
    test("books the acquisition tax as a cost on the expense against 2203 with the net rate method", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.NET_RATE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "BZB81" });

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10000n, vatRateId: rateId }),
      });

      const source = await sourceOf({ journal, expenseId: accounts.expenseId });

      expect(source.debit).toBe(10000n);
      expect(
        (await generatedOf(journal)).map(({ accountId, debit, credit, vatRateId }) => ({
          accountId,
          debit,
          credit,
          vatRateId,
        })),
      ).toEqual([
        { accountId: accounts.expenseId, debit: 810n, credit: 0n, vatRateId: rateId },
        { accountId: accounts.regardsTaxId, debit: 0n, credit: 810n, vatRateId: null },
      ]);
    });

    test("books the acquisition tax on 1170 against 2203 with the effective method", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "BZM81" });

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10000n, vatRateId: rateId }),
      });

      expect(
        (await generatedOf(journal)).map(({ accountId, debit, credit, vatRateId }) => ({
          accountId,
          debit,
          credit,
          vatRateId,
        })),
      ).toEqual([
        { accountId: accounts.taxPreMaterialId, debit: 810n, credit: 0n, vatRateId: rateId },
        { accountId: accounts.regardsTaxId, debit: 0n, credit: 810n, vatRateId: null },
      ]);
    });
  });

  describe("guardrails", () => {
    test("books no VAT postings for an entry without input tax or acquisition tax posting", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "CEX" });

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10000n, vatRateId: rateId }),
      });

      expect(journal.postings).toHaveLength(2);
      expect(await vatLinksOf(journal.entry.id)).toEqual([]);
    });

    test("books an entry without VAT rate for an organization without VAT methods", async () => {
      const accounts = await createCase();

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10000n, vatRateId: null }),
      });

      expect(journal.postings).toHaveLength(2);
    });

    test("returns an error Result when the organization has no VAT methods", async () => {
      const accounts = await createCase();
      const [rate] = await db
        .insert(vatRates)
        .values({
          organizationId: accounts.organizationId,
          code: "BZM81",
          type: VatType.ACQUISITION_TAX_MATERIALS,
          rate: 8.1,
          startOn: new Date("2024-01-01"),
        })
        .returning();
      assertNonNullish(rate);

      const result = await insertJournal({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10000n, vatRateId: rate.id }),
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result when the VAT rate is not valid on the entry date", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "VM81" });
      await db
        .update(vatRates)
        .set({ startOn: new Date("2026-07-01") })
        .where(eq(vatRates.id, rateId));

      const result = await insertJournal({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10810n, vatRateId: rateId }),
      });

      expect(result.status).toBe("error");
    });
  });

  describe("update and delete", () => {
    test("regenerates the VAT postings from the updated amount without duplicating them", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "VM81" });

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10810n, vatRateId: rateId }),
      });

      const result = await UpdateJournalService.create({
        db,
        userId: TEST_USER_ID,
        journalId: journal.entry.id,
      }).update({
        values: {
          entry: {
            validOn: journal.entry.validOn,
            reference: journal.entry.reference,
            version: journal.entry.version,
          },
          postings: journal.postings.map((posting) =>
            toUpdatePosting({
              ...posting,
              debit: posting.debit === 10810n ? 21620n : posting.debit,
              credit: posting.credit === 10810n ? 21620n : posting.credit,
            }),
          ),
        },
      });

      if (result.status === "error") {
        throw result.err;
      }

      const stored = await storedPostingsOf(journal.entry.id);
      const vatPostingIds = await vatPostingIdsOf(journal.entry.id);
      const generated = stored.filter(({ id }) => vatPostingIds.includes(id));

      expect(stored).toHaveLength(4);
      expect(generated.map(({ debit, credit }) => debit + credit)).toEqual([1620n, 1620n]);
    });

    test("removes the VAT postings and their links when the VAT rate is removed", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "VM81" });

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10810n, vatRateId: rateId }),
      });

      const vatPostingIds = await vatPostingIdsOf(journal.entry.id);

      const result = await UpdateJournalService.create({
        db,
        userId: TEST_USER_ID,
        journalId: journal.entry.id,
      }).update({
        values: {
          entry: {
            validOn: journal.entry.validOn,
            reference: journal.entry.reference,
            version: journal.entry.version,
          },
          postings: journal.postings
            .filter(({ id }) => !vatPostingIds.includes(id))
            .map((posting) => toUpdatePosting({ ...posting, vatRateId: null })),
        },
      });

      if (result.status === "error") {
        throw result.err;
      }

      expect(await storedPostingsOf(journal.entry.id)).toHaveLength(2);
      expect(await vatLinksOf(journal.entry.id)).toEqual([]);
    });

    test("removes the VAT postings and their links when the VAT rate is removed through the journal store", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "VM81" });

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10810n, vatRateId: rateId }),
      });

      const vatPostingIds = await vatPostingIdsOf(journal.entry.id);

      const result = await DbJournal.create({ db, userId: TEST_USER_ID }).update({
        pKey: journal.entry.id,
        values: {
          entry: {
            validOn: journal.entry.validOn,
            reference: journal.entry.reference,
            version: journal.entry.version,
          },
          postings: journal.postings
            .filter(({ id }) => !vatPostingIds.includes(id))
            .map((posting) => toUpdatePosting({ ...posting, vatRateId: null })),
        },
      });

      if (result.status === "error") {
        throw result.err;
      }

      expect(await storedPostingsOf(journal.entry.id)).toHaveLength(2);
      expect(await vatLinksOf(journal.entry.id)).toEqual([]);
    });

    test("deletes the VAT postings with the entry", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "VM81" });

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10810n, vatRateId: rateId }),
      });

      const result = await DbJournal.create({ db, userId: TEST_USER_ID }).delete({
        pKey: journal.entry.id,
      });

      expect(result.status).toBe("success");
      expect(await storedPostingsOf(journal.entry.id)).toEqual([]);
      expect(await vatLinksOf(journal.entry.id)).toEqual([]);
    });
  });
  describe("more cases", () => {
    test("updates an entry without VAT rate with no VAT postings", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10000n, vatRateId: null }),
      });

      const updated = await updateOrThrow({
        journal,
        postings: journal.postings.map((posting) =>
          toUpdatePosting({ ...posting, description: "Updated" }),
        ),
      });

      expect(updated.postings).toHaveLength(2);
      expect(updated.postings.every(({ description }) => description === "Updated")).toBeTrue();
      expect(await vatLinksOf(journal.entry.id)).toEqual([]);
    });

    test("books the postings of the new rate when the rate changes from input tax to acquisition tax", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const inputTaxRateId = await vatRateId({
        organizationId: accounts.organizationId,
        code: "VM81",
      });
      const acquisitionTaxRateId = await vatRateId({
        organizationId: accounts.organizationId,
        code: "BZM81",
      });

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10810n, vatRateId: inputTaxRateId }),
      });

      const vatPostingIds = await vatPostingIdsOf(journal.entry.id);

      const updated = await updateOrThrow({
        journal,
        postings: journal.postings
          .filter(({ id }) => !vatPostingIds.includes(id))
          .map((posting) =>
            toUpdatePosting({
              ...posting,
              vatRateId: posting.vatRateId === inputTaxRateId ? acquisitionTaxRateId : null,
              debit: posting.debit > 0n ? 10000n : 0n,
              credit: posting.credit > 0n ? 10000n : 0n,
            }),
          ),
      });

      expect(
        (await generatedOf(updated)).map(({ accountId, debit, credit, vatRateId }) => ({
          accountId,
          debit,
          credit,
          vatRateId,
        })),
      ).toEqual([
        {
          accountId: accounts.taxPreMaterialId,
          debit: 810n,
          credit: 0n,
          vatRateId: acquisitionTaxRateId,
        },
        { accountId: accounts.regardsTaxId, debit: 0n, credit: 810n, vatRateId: null },
      ]);
    });

    test("mirrors the VAT postings of a posting on the credit side", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "VM81" });

      const refund = purchase({ ...accounts, amount: 10810n, vatRateId: rateId });

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: {
          ...refund,
          postings: refund.postings.map(({ debit, credit, ...posting }) => ({
            ...posting,
            debit: credit,
            credit: debit,
          })),
        },
      });

      expect(
        (await generatedOf(journal)).map(({ accountId, debit, credit }) => ({
          accountId,
          debit,
          credit,
        })),
      ).toEqual([
        { accountId: accounts.taxPreMaterialId, debit: 0n, credit: 810n },
        { accountId: accounts.expenseId, debit: 810n, credit: 0n },
      ]);
    });

    test("books no VAT postings when the tax rounds to zero", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "VM81" });

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 1n, vatRateId: rateId }),
      });

      expect(journal.postings).toHaveLength(2);
      expect(await vatLinksOf(journal.entry.id)).toEqual([]);
    });

    test("books the VAT postings of each input tax and acquisition tax posting of an entry", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const inputTaxRateId = await vatRateId({
        organizationId: accounts.organizationId,
        code: "VM81",
      });
      const acquisitionTaxRateId = await vatRateId({
        organizationId: accounts.organizationId,
        code: "BZM81",
      });

      const [inputTax, bank] = purchase({
        ...accounts,
        amount: 10810n,
        vatRateId: inputTaxRateId,
      }).postings;
      assertNonNullish(inputTax);
      assertNonNullish(bank);

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: {
          entry: { validOn: new Date("2026-06-15"), reference: "PURCHASES" },
          postings: [
            inputTax,
            { ...inputTax, vatRateId: acquisitionTaxRateId, debit: 10000n },
            { ...bank, credit: 20810n },
          ],
        },
      });

      const links = await vatLinksOf(journal.entry.id);
      const sourceIds = [...new Set(links.map(({ postingId }) => postingId))];

      expect(journal.postings).toHaveLength(7);
      expect(links).toHaveLength(4);
      expect(sourceIds).toHaveLength(2);
      expect(
        (await generatedOf(journal))
          .map(({ accountId, debit, credit }) => `${accountId}:${debit}:${credit}`)
          .toSorted(),
      ).toEqual(
        [
          `${accounts.taxPreMaterialId}:810:0`,
          `${accounts.expenseId}:0:810`,
          `${accounts.taxPreMaterialId}:810:0`,
          `${accounts.regardsTaxId}:0:810`,
        ].toSorted(),
      );
    });

    test("returns an error Result when the regards tax system account is missing", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.NET_RATE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "BZB81" });

      await db
        .delete(systemAccounts)
        .where(
          and(
            eq(systemAccounts.organizationId, accounts.organizationId),
            eq(systemAccounts.purpose, SystemAccountPurpose.REGARDS_TAX),
          ),
        );

      const result = await insertJournal({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10000n, vatRateId: rateId }),
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result when the input tax system account is missing", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "VM81" });

      await db
        .delete(systemAccounts)
        .where(
          and(
            eq(systemAccounts.organizationId, accounts.organizationId),
            eq(systemAccounts.purpose, SystemAccountPurpose.TAX_PRE_MATERIAL),
          ),
        );

      const result = await insertJournal({
        organizationId: accounts.organizationId,
        values: purchase({ ...accounts, amount: 10810n, vatRateId: rateId }),
      });

      expect(result.status).toBe("error");
    });
  });
  describe("sales tax and net rate", () => {
    const sale = ({
      incomeId,
      bankId,
      amount,
      vatRateId: rateId,
    }: {
      incomeId: string;
      bankId: string;
      amount: bigint;
      vatRateId: string;
    }) => {
      const [income, bank] = purchase({
        expenseId: incomeId,
        bankId,
        amount,
        vatRateId: rateId,
      }).postings;
      assertNonNullish(income);
      assertNonNullish(bank);

      return {
        entry: { validOn: new Date("2026-06-15"), reference: "SALE" },
        postings: [
          { ...bank, debit: amount, credit: 0n },
          { ...income, debit: 0n, credit: amount },
        ],
      };
    };

    const incomeIdOf = (organizationId: string) =>
      systemAccountId({ organizationId, purpose: SystemAccountPurpose.DEFAULT_INCOME });

    const vatTaxDueIdOf = (organizationId: string) =>
      systemAccountId({ organizationId, purpose: SystemAccountPurpose.VAT_TAX_DUE });

    test("takes the sales tax out of the gross sale and owes it on the VAT tax due account with the effective method", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const rateId = await vatRateId({ organizationId: accounts.organizationId, code: "UN81" });
      const incomeId = await incomeIdOf(accounts.organizationId);
      const vatTaxDueId = await vatTaxDueIdOf(accounts.organizationId);

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: sale({ incomeId, bankId: accounts.bankId, amount: 10810n, vatRateId: rateId }),
      });

      expect(
        (await generatedOf(journal)).map(({ accountId, debit, credit, vatRateId }) => ({
          accountId,
          debit,
          credit,
          vatRateId,
        })),
      ).toEqual([
        { accountId: vatTaxDueId, debit: 0n, credit: 810n, vatRateId: rateId },
        { accountId: incomeId, debit: 810n, credit: 0n, vatRateId: null },
      ]);
    });

    test("owes the net rate of the gross sale on the VAT tax due account with the net rate method", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.NET_RATE });
      const incomeId = await incomeIdOf(accounts.organizationId);
      const vatTaxDueId = await vatTaxDueIdOf(accounts.organizationId);
      const [rate] = await db
        .insert(vatRates)
        .values({
          organizationId: accounts.organizationId,
          code: "NET81",
          type: VatType.NET_RATE_TAX,
          rate: 8.1,
          netRate: 6.2,
          startOn: new Date("2024-01-01"),
        })
        .returning();
      assertNonNullish(rate);

      const journal = await insertOrThrow({
        organizationId: accounts.organizationId,
        values: sale({ incomeId, bankId: accounts.bankId, amount: 10810n, vatRateId: rate.id }),
      });

      expect(
        (await generatedOf(journal)).map(({ accountId, debit, credit, vatRateId }) => ({
          accountId,
          debit,
          credit,
          vatRateId,
        })),
      ).toEqual([
        { accountId: vatTaxDueId, debit: 0n, credit: 670n, vatRateId: rate.id },
        { accountId: incomeId, debit: 670n, credit: 0n, vatRateId: null },
      ]);
    });

    test("returns an error Result for a sales tax rate with the net rate method", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.NET_RATE });
      const incomeId = await incomeIdOf(accounts.organizationId);
      const [rate] = await db
        .insert(vatRates)
        .values({
          organizationId: accounts.organizationId,
          code: "UN81",
          type: VatType.SALES_TAX_DUE,
          rate: 8.1,
          startOn: new Date("2024-01-01"),
        })
        .returning();
      assertNonNullish(rate);

      const result = await insertJournal({
        organizationId: accounts.organizationId,
        values: sale({ incomeId, bankId: accounts.bankId, amount: 10810n, vatRateId: rate.id }),
      });

      expect(result.status).toBe("error");
    });

    test("returns an error Result for a net rate with the effective method", async () => {
      const accounts = await createCase({ paymentMethod: VatPaymentMethod.EFFECTIVE });
      const incomeId = await incomeIdOf(accounts.organizationId);
      const [rate] = await db
        .insert(vatRates)
        .values({
          organizationId: accounts.organizationId,
          code: "NET81",
          type: VatType.NET_RATE_TAX,
          rate: 8.1,
          netRate: 6.2,
          startOn: new Date("2024-01-01"),
        })
        .returning();
      assertNonNullish(rate);

      const result = await insertJournal({
        organizationId: accounts.organizationId,
        values: sale({ incomeId, bankId: accounts.bankId, amount: 10810n, vatRateId: rate.id }),
      });

      expect(result.status).toBe("error");
    });
  });
});
