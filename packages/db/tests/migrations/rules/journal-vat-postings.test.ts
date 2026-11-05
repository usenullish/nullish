import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import {
  DbSchema,
  EXCHANGE_RATE_ONE,
  InvoiceJournalEntryType,
  SystemAccountPurpose,
  VatPaymentMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
import { assertNonNullish, type Nullable } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  causeMessage,
  createClient,
  createDraftInvoice,
  createJournalEntry,
  createOrganization,
  createPeriod,
  createVatMethods,
  createVatRate,
  createVatSettings,
  invoiceJournalEntries,
  journalEntries,
  postings,
  resetDb,
  seedUsers,
  systemAccountByPurpose,
  vatRates,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

interface Case {
  organizationId: string;
  expenseId: string;
  bankId: string;
  taxPreMaterialId: string;
  regardsTaxId: string;
  incomeId: string;
  taxDueId: string;
}

interface Line {
  accountId: string;
  debit?: bigint;
  credit?: bigint;
  vatRateId?: Nullable<string>;
}

const createCase = async (paymentMethod: VatPaymentMethod): Promise<Case> => {
  const organizationId = await createOrganization(db);
  await createVatSettings(db, organizationId);
  const periodId = await createPeriod(db, organizationId, { startOn: new Date("2026-01-01") });
  await createVatMethods(db, organizationId, { periodId, paymentMethod });

  const accountOf = async (purpose: SystemAccountPurpose) =>
    (await systemAccountByPurpose(db, organizationId, purpose)).accountId;

  return {
    organizationId,
    expenseId: await accountOf(SystemAccountPurpose.DEFAULT_EXPENSE),
    bankId: await accountOf(SystemAccountPurpose.BANK_ACCOUNT),
    taxPreMaterialId: await accountOf(SystemAccountPurpose.TAX_PRE_MATERIAL),
    regardsTaxId: await accountOf(SystemAccountPurpose.REGARDS_TAX),
    incomeId: await accountOf(SystemAccountPurpose.DEFAULT_INCOME),
    taxDueId: await accountOf(SystemAccountPurpose.VAT_TAX_DUE),
  };
};

const rateIdOf = async (organizationId: string, code: string): Promise<string> => {
  const [row] = await db
    .select({ id: vatRates.id })
    .from(vatRates)
    .where(and(eq(vatRates.organizationId, organizationId), eq(vatRates.code, code)));
  assertNonNullish(row);
  return row.id;
};

const postingManualVatPostings =
  DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema;

const toRow = ({
  organizationId,
  journalEntryId,
  line: { accountId, debit, credit, vatRateId },
}: {
  organizationId: string;
  journalEntryId: string;
  line: Line;
}) => ({
  organizationId,
  journalEntryId,
  accountId,
  description: "line",
  debit: debit ?? 0n,
  credit: credit ?? 0n,
  currency: "CHF",
  exchangeRate: EXCHANGE_RATE_ONE,
  vatRateId: vatRateId ?? null,
});

const book = async ({
  organizationId,
  source,
  others,
  generated,
}: {
  organizationId: string;
  source: Line;
  others: Line[];
  generated: Line[];
}): Promise<unknown> => {
  const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-06-15"));

  return await db
    .transaction(async (tx) => {
      const [sourceRow] = await tx
        .insert(postings)
        .values(toRow({ organizationId, journalEntryId, line: source }))
        .returning();
      assertNonNullish(sourceRow);

      await tx
        .insert(postings)
        .values(others.map((line) => toRow({ organizationId, journalEntryId, line })));

      for (const line of generated) {
        const [vatRow] = await tx
          .insert(postings)
          .values(toRow({ organizationId, journalEntryId, line }))
          .returning();
        assertNonNullish(vatRow);

        await tx
          .insert(postingManualVatPostings)
          .values({ organizationId, postingId: sourceRow.id, vatPostingId: vatRow.id });
      }

      return sourceRow.id;
    })
    .catch((e: unknown) => e);
};

const NOT_AS_EXPECTED = "does not book the VAT of rate";

describe("check_journal_vat_postings", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  describe("input tax", () => {
    test("accepts the tax on the input tax account against the expense", async () => {
      const c = await createCase(VatPaymentMethod.EFFECTIVE);
      const rateId = await rateIdOf(c.organizationId, "VM81");

      const result = await book({
        organizationId: c.organizationId,
        source: { accountId: c.expenseId, debit: 10810n, vatRateId: rateId },
        others: [{ accountId: c.bankId, credit: 10810n }],
        generated: [
          { accountId: c.taxPreMaterialId, debit: 810n, vatRateId: rateId },
          { accountId: c.expenseId, credit: 810n },
        ],
      });

      expect(typeof result).toBe("string");
    });

    test("rejects an input tax line without its VAT lines", async () => {
      const c = await createCase(VatPaymentMethod.EFFECTIVE);
      const rateId = await rateIdOf(c.organizationId, "VM81");

      const error = await book({
        organizationId: c.organizationId,
        source: { accountId: c.expenseId, debit: 10810n, vatRateId: rateId },
        others: [{ accountId: c.bankId, credit: 10810n }],
        generated: [],
      });

      expect(causeMessage(error)).toContain(NOT_AS_EXPECTED);
    });

    test("rejects a wrong tax amount", async () => {
      const c = await createCase(VatPaymentMethod.EFFECTIVE);
      const rateId = await rateIdOf(c.organizationId, "VM81");

      const error = await book({
        organizationId: c.organizationId,
        source: { accountId: c.expenseId, debit: 10810n, vatRateId: rateId },
        others: [{ accountId: c.bankId, credit: 10810n }],
        generated: [
          { accountId: c.taxPreMaterialId, debit: 876n, vatRateId: rateId },
          { accountId: c.expenseId, credit: 876n },
        ],
      });

      expect(causeMessage(error)).toContain(NOT_AS_EXPECTED);
    });

    test("rejects two VAT lines on the same side", async () => {
      const c = await createCase(VatPaymentMethod.EFFECTIVE);
      const rateId = await rateIdOf(c.organizationId, "VM81");

      const error = await book({
        organizationId: c.organizationId,
        source: { accountId: c.expenseId, debit: 10810n, vatRateId: rateId },
        others: [{ accountId: c.bankId, credit: 12430n }],
        generated: [
          { accountId: c.taxPreMaterialId, debit: 810n, vatRateId: rateId },
          { accountId: c.expenseId, debit: 810n },
        ],
      });

      expect(causeMessage(error)).toContain(NOT_AS_EXPECTED);
    });

    test("rejects VAT lines of different amounts", async () => {
      const c = await createCase(VatPaymentMethod.EFFECTIVE);
      const rateId = await rateIdOf(c.organizationId, "VM81");

      const error = await book({
        organizationId: c.organizationId,
        source: { accountId: c.expenseId, debit: 10810n, vatRateId: rateId },
        others: [
          { accountId: c.bankId, credit: 10810n },
          { accountId: c.bankId, debit: 1n },
        ],
        generated: [
          { accountId: c.taxPreMaterialId, debit: 810n, vatRateId: rateId },
          { accountId: c.expenseId, credit: 811n },
        ],
      });

      expect(causeMessage(error)).toContain(NOT_AS_EXPECTED);
    });

    test("accepts no VAT lines when the tax rounds to zero", async () => {
      const c = await createCase(VatPaymentMethod.EFFECTIVE);
      const rateId = await rateIdOf(c.organizationId, "VM81");

      const result = await book({
        organizationId: c.organizationId,
        source: { accountId: c.expenseId, debit: 1n, vatRateId: rateId },
        others: [{ accountId: c.bankId, credit: 1n }],
        generated: [],
      });

      expect(typeof result).toBe("string");
    });
  });

  describe("acquisition tax", () => {
    test("accepts the tax as a cost on the purchase account against 2203 with the net rate method", async () => {
      const c = await createCase(VatPaymentMethod.NET_RATE);
      const rateId = await rateIdOf(c.organizationId, "BZM81");

      const result = await book({
        organizationId: c.organizationId,
        source: { accountId: c.expenseId, debit: 10000n, vatRateId: rateId },
        others: [{ accountId: c.bankId, credit: 10000n }],
        generated: [
          { accountId: c.expenseId, debit: 810n, vatRateId: rateId },
          { accountId: c.regardsTaxId, credit: 810n },
        ],
      });

      expect(typeof result).toBe("string");
    });

    test("accepts the tax on the input tax account against 2203 with the effective method", async () => {
      const c = await createCase(VatPaymentMethod.EFFECTIVE);
      const rateId = await rateIdOf(c.organizationId, "BZM81");

      const result = await book({
        organizationId: c.organizationId,
        source: { accountId: c.expenseId, debit: 10000n, vatRateId: rateId },
        others: [{ accountId: c.bankId, credit: 10000n }],
        generated: [
          { accountId: c.taxPreMaterialId, debit: 810n, vatRateId: rateId },
          { accountId: c.regardsTaxId, credit: 810n },
        ],
      });

      expect(typeof result).toBe("string");
    });
  });

  describe("sales tax", () => {
    test("accepts the tax on the tax due account against the income", async () => {
      const c = await createCase(VatPaymentMethod.EFFECTIVE);
      const rateId = await rateIdOf(c.organizationId, "UN81");

      const result = await book({
        organizationId: c.organizationId,
        source: { accountId: c.incomeId, credit: 10810n, vatRateId: rateId },
        others: [{ accountId: c.bankId, debit: 10810n }],
        generated: [
          { accountId: c.taxDueId, credit: 810n, vatRateId: rateId },
          { accountId: c.incomeId, debit: 810n },
        ],
      });

      expect(typeof result).toBe("string");
    });

    test("rejects a sales tax line without its VAT lines", async () => {
      const c = await createCase(VatPaymentMethod.EFFECTIVE);
      const rateId = await rateIdOf(c.organizationId, "UN81");

      const result = await book({
        organizationId: c.organizationId,
        source: { accountId: c.incomeId, credit: 10810n, vatRateId: rateId },
        others: [{ accountId: c.bankId, debit: 10810n }],
        generated: [],
      });

      expect(causeMessage(result)).toContain(NOT_AS_EXPECTED);
    });
  });

  describe("net rate tax", () => {
    const createNetRate = (organizationId: string): Promise<string> =>
      createVatRate(db, organizationId, {
        code: "NET81",
        type: VatType.NET_RATE_TAX,
        rate: 8.1,
        netRate: 6.2,
      });

    test("accepts the net rate of the gross amount on the tax due account against the income", async () => {
      const c = await createCase(VatPaymentMethod.NET_RATE);
      const rateId = await createNetRate(c.organizationId);

      const result = await book({
        organizationId: c.organizationId,
        source: { accountId: c.incomeId, credit: 10810n, vatRateId: rateId },
        others: [{ accountId: c.bankId, debit: 10810n }],
        generated: [
          { accountId: c.taxDueId, credit: 670n, vatRateId: rateId },
          { accountId: c.incomeId, debit: 670n },
        ],
      });

      expect(typeof result).toBe("string");
    });

    test("rejects a net rate line without its VAT lines", async () => {
      const c = await createCase(VatPaymentMethod.NET_RATE);
      const rateId = await createNetRate(c.organizationId);

      const result = await book({
        organizationId: c.organizationId,
        source: { accountId: c.incomeId, credit: 10810n, vatRateId: rateId },
        others: [{ accountId: c.bankId, debit: 10810n }],
        generated: [],
      });

      expect(causeMessage(result)).toContain(NOT_AS_EXPECTED);
    });

    test("accepts the entry of an invoice without VAT lines", async () => {
      const c = await createCase(VatPaymentMethod.NET_RATE);
      const rateId = await createNetRate(c.organizationId);
      const clientId = await createClient(db, c.organizationId);
      const invoiceId = await createDraftInvoice(db, c.organizationId, clientId, {
        vatRateId: rateId,
      });
      const journalEntryId = await createJournalEntry(db, c.organizationId, new Date("2026-06-15"));

      const result = await db
        .transaction(async (tx) => {
          await tx.insert(postings).values([
            toRow({
              organizationId: c.organizationId,
              journalEntryId,
              line: { accountId: c.bankId, debit: 10810n },
            }),
            toRow({
              organizationId: c.organizationId,
              journalEntryId,
              line: { accountId: c.incomeId, credit: 10810n, vatRateId: rateId },
            }),
          ]);

          await tx.insert(invoiceJournalEntries).values({
            organizationId: c.organizationId,
            invoiceId,
            journalEntryId,
            type: InvoiceJournalEntryType.OPEN,
          });

          return journalEntryId;
        })
        .catch((e: unknown) => e);

      expect(result).toBe(journalEntryId);
    });

    test("checks the entry of an invoice once it is unlinked from it", async () => {
      const c = await createCase(VatPaymentMethod.NET_RATE);
      const rateId = await createNetRate(c.organizationId);
      const clientId = await createClient(db, c.organizationId);
      const invoiceId = await createDraftInvoice(db, c.organizationId, clientId, {
        vatRateId: rateId,
      });
      const journalEntryId = await createJournalEntry(db, c.organizationId, new Date("2026-06-15"));

      await db.transaction(async (tx) => {
        await tx.insert(postings).values([
          toRow({
            organizationId: c.organizationId,
            journalEntryId,
            line: { accountId: c.bankId, debit: 10810n },
          }),
          toRow({
            organizationId: c.organizationId,
            journalEntryId,
            line: { accountId: c.incomeId, credit: 10810n, vatRateId: rateId },
          }),
        ]);

        await tx.insert(invoiceJournalEntries).values({
          organizationId: c.organizationId,
          invoiceId,
          journalEntryId,
          type: InvoiceJournalEntryType.OPEN,
        });
      });

      const error = await db
        .delete(invoiceJournalEntries)
        .where(eq(invoiceJournalEntries.journalEntryId, journalEntryId))
        .catch((e: unknown) => e);

      expect(causeMessage(error)).toContain(NOT_AS_EXPECTED);
    });
  });

  test("accepts a migrated entry with its VAT booked as plain lines", async () => {
    const c = await createCase(VatPaymentMethod.EFFECTIVE);
    const rateId = await rateIdOf(c.organizationId, "VM81");

    const result = await db
      .transaction(async (tx) => {
        const [entry] = await tx
          .insert(journalEntries)
          .values({
            organizationId: c.organizationId,
            validOn: new Date("2026-06-15"),
            migrated: true,
          })
          .returning();
        assertNonNullish(entry);

        await tx.insert(postings).values(
          [
            { accountId: c.expenseId, debit: 10810n, vatRateId: rateId },
            { accountId: c.bankId, credit: 10810n },
            { accountId: c.taxPreMaterialId, debit: 810n },
            { accountId: c.expenseId, credit: 810n },
          ].map((line) =>
            toRow({ organizationId: c.organizationId, journalEntryId: entry.id, line }),
          ),
        );

        return entry.id;
      })
      .catch((e: unknown) => e);

    expect(typeof result).toBe("string");
  });

  test("rejects deleting the link of a VAT line", async () => {
    const c = await createCase(VatPaymentMethod.EFFECTIVE);
    const rateId = await rateIdOf(c.organizationId, "VM81");

    const sourceId = await book({
      organizationId: c.organizationId,
      source: { accountId: c.expenseId, debit: 10810n, vatRateId: rateId },
      others: [{ accountId: c.bankId, credit: 10810n }],
      generated: [
        { accountId: c.taxPreMaterialId, debit: 810n, vatRateId: rateId },
        { accountId: c.expenseId, credit: 810n },
      ],
    });
    if (typeof sourceId !== "string") {
      throw sourceId;
    }

    const [link] = await db
      .select()
      .from(postingManualVatPostings)
      .where(eq(postingManualVatPostings.postingId, sourceId));
    assertNonNullish(link);

    const error = await db
      .delete(postingManualVatPostings)
      .where(eq(postingManualVatPostings.id, link.id))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(NOT_AS_EXPECTED);
  });

  test("rejects a VAT line linked to a line of another entry", async () => {
    const c = await createCase(VatPaymentMethod.EFFECTIVE);

    const otherEntryId = await createJournalEntry(db, c.organizationId, new Date("2026-06-15"));
    const [otherSource] = await db
      .insert(postings)
      .values([
        toRow({
          organizationId: c.organizationId,
          journalEntryId: otherEntryId,
          line: { accountId: c.expenseId, debit: 1000n },
        }),
        toRow({
          organizationId: c.organizationId,
          journalEntryId: otherEntryId,
          line: { accountId: c.bankId, credit: 1000n },
        }),
      ])
      .returning();
    assertNonNullish(otherSource);

    const journalEntryId = await createJournalEntry(db, c.organizationId, new Date("2026-06-15"));

    const error = await db
      .transaction(async (tx) => {
        const vatRows = await tx
          .insert(postings)
          .values([
            toRow({
              organizationId: c.organizationId,
              journalEntryId,
              line: { accountId: c.taxPreMaterialId, debit: 81n },
            }),
            toRow({
              organizationId: c.organizationId,
              journalEntryId,
              line: { accountId: c.expenseId, credit: 81n },
            }),
          ])
          .returning();

        await tx.insert(postingManualVatPostings).values(
          vatRows.map(({ id }) => ({
            organizationId: c.organizationId,
            postingId: otherSource.id,
            vatPostingId: id,
          })),
        );
      })
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("linked to a posting of another entry");
  });
});
