import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  BankMovementStatus,
  DbSchema,
  SystemAccountPurpose,
  VatPaymentMethod,
  VatRemunerationMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import { ReconcileAccountService } from "../../../src/banking/services/_account.reconcile";
import { EngineError } from "../../../src/errors";
import {
  TEST_MISSING_ID,
  TEST_USER_ID,
  createBankRelation,
  createBankStatement,
  createOrganization,
  createVatSettings,
  leafAccountId,
  randomDedupeHash,
  resetDb,
  seedUsers,
  systemAccountIdByPurpose,
  vatRateIdByCode,
} from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
const postings = DbSchema.Ledger.Journal.PostingsSchema;
const bankRelations = DbSchema.Core.Bank.BankRelationsSchema;
const movements = DbSchema.Banking.Movements.MovementsSchema;
const movementJournalEntries = DbSchema.Banking.MovementJournal.MovementJournalEntriesSchema;
const vatRates = DbSchema.Core.Vat.VatRatesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("ReconcileAccountService", () => {
  let orgId: string;
  let bankRelationId: string;
  let bankLedgerAccountId: string;
  let statementId: string;
  let incomeAccountId: string;
  let expenseAccountId: string;
  let taxPreMaterialId: string;
  let vatTaxDueId: string;

  const reconcile = ({
    movementId,
    accountId,
    description = null,
    vatRateId,
  }: {
    movementId: string;
    accountId: string;
    description?: string | null;
    vatRateId?: string | null;
  }) =>
    ReconcileAccountService.create({ db, userId: TEST_USER_ID, movementId }).reconcile({
      accountId,
      description,
      vatRateId,
    });

  const createMovement = async ({
    amount,
    currency = "CHF",
    status = BankMovementStatus.UNRECONCILED,
  }: {
    amount: bigint;
    currency?: string;
    status?: BankMovementStatus;
  }): Promise<string> => {
    const [row] = await db
      .insert(movements)
      .values({
        organizationId: orgId,
        bankRelationId,
        statementId,
        bankReference: crypto.randomUUID(),
        dedupeHash: randomDedupeHash(),
        bookedOn: new Date("2026-10-05"),
        amount,
        currency,
        status,
      })
      .returning();
    assertNonNullish(row);
    return row.id;
  };

  const loadMovementStatus = async (movementId: string): Promise<string> => {
    const [row] = await db.select().from(movements).where(eq(movements.id, movementId));
    assertNonNullish(row);
    return row.status;
  };

  const loadJournalEntry = async (movementId: string) => {
    const [link] = await db
      .select()
      .from(movementJournalEntries)
      .where(eq(movementJournalEntries.movementId, movementId));
    assertNonNullish(link);

    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, link.journalEntryId));
    assertNonNullish(entry);

    const rows = await db
      .select()
      .from(postings)
      .where(eq(postings.journalEntryId, link.journalEntryId));

    return { entry, postings: rows };
  };

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    await db.insert(periods).values({
      organizationId: orgId,
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    await createVatSettings(db, {
      organizationId: orgId,
      remunerationMethod: VatRemunerationMethod.AGREED,
      paymentMethod: VatPaymentMethod.EFFECTIVE,
    });

    bankRelationId = await createBankRelation(db, orgId);
    statementId = await createBankStatement(db, { organizationId: orgId, bankRelationId });

    const [bankRelation] = await db
      .select()
      .from(bankRelations)
      .where(eq(bankRelations.id, bankRelationId));
    assertNonNullish(bankRelation);
    bankLedgerAccountId = bankRelation.accountId;

    incomeAccountId = await leafAccountId(db, orgId, AccountType.INCOME);
    expenseAccountId = await leafAccountId(db, orgId, AccountType.EXPENSE);
    taxPreMaterialId = await systemAccountIdByPurpose(db, {
      organizationId: orgId,
      purpose: SystemAccountPurpose.TAX_PRE_MATERIAL,
    });
    vatTaxDueId = await systemAccountIdByPurpose(db, {
      organizationId: orgId,
      purpose: SystemAccountPurpose.VAT_TAX_DUE,
    });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("journal entry", () => {
    test("books an incoming movement on the bank ledger account against the account", async () => {
      const movementId = await createMovement({ amount: 20000n });

      await reconcile({
        movementId,
        accountId: incomeAccountId,
        description: "Capital contribution",
      });

      const { postings: rows } = await loadJournalEntry(movementId);
      expect(
        rows.map(({ accountId, debit, credit, description }) => ({
          accountId,
          debit,
          credit,
          description,
        })),
      ).toEqual(
        expect.arrayContaining([
          {
            accountId: bankLedgerAccountId,
            debit: 20000n,
            credit: 0n,
            description: "Capital contribution",
          },
          {
            accountId: incomeAccountId,
            debit: 0n,
            credit: 20000n,
            description: "Capital contribution",
          },
        ]),
      );
      expect(rows).toHaveLength(2);
    });

    test("books an outgoing movement on the account against the bank ledger account", async () => {
      const movementId = await createMovement({ amount: -500n });

      await reconcile({ movementId, accountId: expenseAccountId });

      const { postings: rows } = await loadJournalEntry(movementId);
      expect(rows.map(({ accountId, debit, credit }) => ({ accountId, debit, credit }))).toEqual(
        expect.arrayContaining([
          { accountId: bankLedgerAccountId, debit: 0n, credit: 500n },
          { accountId: expenseAccountId, debit: 500n, credit: 0n },
        ]),
      );
      expect(rows).toHaveLength(2);
    });

    test("dates the journal entry on the booking date of the movement", async () => {
      const movementId = await createMovement({ amount: 1000n });

      await reconcile({ movementId, accountId: incomeAccountId });

      const { entry } = await loadJournalEntry(movementId);
      expect(entry.validOn).toEqual(new Date("2026-10-05"));
    });
  });

  describe("VAT rate", () => {
    const rows = async (movementId: string) =>
      (await loadJournalEntry(movementId)).postings.map(
        ({ accountId, debit, credit, vatRateId }) => ({ accountId, debit, credit, vatRateId }),
      );

    test("books the input tax of an outgoing movement on the input tax account against the account", async () => {
      const vatRateId = await vatRateIdByCode(db, { organizationId: orgId, code: "VM81" });
      const movementId = await createMovement({ amount: -10810n });

      const result = await reconcile({ movementId, accountId: expenseAccountId, vatRateId });

      expect(result.status).toBe("success");
      const postingRows = await rows(movementId);
      expect(postingRows).toEqual(
        expect.arrayContaining([
          { accountId: bankLedgerAccountId, debit: 0n, credit: 10810n, vatRateId: null },
          { accountId: expenseAccountId, debit: 10810n, credit: 0n, vatRateId },
          { accountId: taxPreMaterialId, debit: 810n, credit: 0n, vatRateId },
          { accountId: expenseAccountId, debit: 0n, credit: 810n, vatRateId: null },
        ]),
      );
      expect(postingRows).toHaveLength(4);
    });

    test("books the sales tax of an incoming movement on the VAT due account against the account", async () => {
      const vatRateId = await vatRateIdByCode(db, { organizationId: orgId, code: "UN81" });
      const movementId = await createMovement({ amount: 10810n });

      const result = await reconcile({ movementId, accountId: incomeAccountId, vatRateId });

      expect(result.status).toBe("success");
      const postingRows = await rows(movementId);
      expect(postingRows).toEqual(
        expect.arrayContaining([
          { accountId: bankLedgerAccountId, debit: 10810n, credit: 0n, vatRateId: null },
          { accountId: incomeAccountId, debit: 0n, credit: 10810n, vatRateId },
          { accountId: vatTaxDueId, debit: 0n, credit: 810n, vatRateId },
          { accountId: incomeAccountId, debit: 810n, credit: 0n, vatRateId: null },
        ]),
      );
      expect(postingRows).toHaveLength(4);
    });

    test("returns an error Result for a VAT rate not valid on the booking date", async () => {
      const [rate] = await db
        .insert(vatRates)
        .values({
          organizationId: orgId,
          code: "VM81FUTURE",
          type: VatType.INPUT_TAX_MATERIALS,
          rate: 8.1,
          startOn: new Date("2027-01-01"),
        })
        .returning();
      assertNonNullish(rate);
      const movementId = await createMovement({ amount: -10810n });

      const result = await reconcile({
        movementId,
        accountId: expenseAccountId,
        vatRateId: rate.id,
      });

      expect(result.status).toBe("error");
      if (result.status !== "error") return;
      expect(result.err).toBeInstanceOf(EngineError);
      expect(await loadMovementStatus(movementId)).toBe(BankMovementStatus.UNRECONCILED);
    });
  });

  describe("movement", () => {
    test("returns the movement reconciled", async () => {
      const movementId = await createMovement({ amount: 1000n });

      const result = await reconcile({ movementId, accountId: incomeAccountId });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.id).toBe(movementId);
      expect(result.result.status).toBe(BankMovementStatus.RECONCILED);
      expect(await loadMovementStatus(movementId)).toBe(BankMovementStatus.RECONCILED);
    });
  });

  describe("guardrails", () => {
    test("returns an error Result for a movement already reconciled", async () => {
      const movementId = await createMovement({ amount: 1000n });
      await reconcile({ movementId, accountId: incomeAccountId });

      const result = await reconcile({ movementId, accountId: incomeAccountId });

      expect(result.status).toBe("error");
      if (result.status !== "error") return;
      expect(result.err).toBeInstanceOf(EngineError);
    });

    test("returns an error Result for an ignored movement", async () => {
      const movementId = await createMovement({
        amount: 1000n,
        status: BankMovementStatus.IGNORED,
      });

      const result = await reconcile({ movementId, accountId: incomeAccountId });

      expect(result.status).toBe("error");
      if (result.status !== "error") return;
      expect(result.err).toBeInstanceOf(EngineError);
      expect(await loadMovementStatus(movementId)).toBe(BankMovementStatus.IGNORED);
    });

    test("returns an error Result for the ledger account of the bank relation", async () => {
      const movementId = await createMovement({ amount: 1000n });

      const result = await reconcile({ movementId, accountId: bankLedgerAccountId });

      expect(result.status).toBe("error");
      expect(await loadMovementStatus(movementId)).toBe(BankMovementStatus.UNRECONCILED);
    });

    test("returns an error Result for a movement in another currency than the base currency", async () => {
      const movementId = await createMovement({ amount: 1000n, currency: "EUR" });

      const result = await reconcile({ movementId, accountId: incomeAccountId });

      expect(result.status).toBe("error");
      if (result.status !== "error") return;
      expect(result.err).toBeInstanceOf(EngineError);
      expect(await loadMovementStatus(movementId)).toBe(BankMovementStatus.UNRECONCILED);
    });

    test("returns an error Result for an unknown movement", async () => {
      const result = await reconcile({ movementId: TEST_MISSING_ID, accountId: incomeAccountId });

      expect(result.status).toBe("error");
    });
  });
});
