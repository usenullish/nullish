import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  BankMovementStatus,
  DbSchema,
  InvoiceStatus,
} from "@usenullish/nullish-schema/db";
import type { Services } from "@usenullish/nullish-schema/services";
import { envDbUrl } from "@usenullish/nullish-env";
import { ReconcileMovementService } from "../../../src/banking/services/movement.reconcile";
import { OpenInvoiceService } from "../../../src/billing/services/invoices/invoice.open";
import type { InvoiceServiceArgs } from "../../../src/billing/services/invoices/_invoice";
import {
  TEST_USER_ID,
  createBankRelation,
  createBankStatement,
  createClient,
  createDraftInvoice,
  createLine,
  createOrganization,
  leafAccountId,
  randomDedupeHash,
  resetDb,
  seedUsers,
} from "../../_test-utils";

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const invoices = DbSchema.Billing.Invoices.InvoicesSchema;
const movements = DbSchema.Banking.Movements.MovementsSchema;
const movementJournalEntries = DbSchema.Banking.MovementJournal.MovementJournalEntriesSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("ReconcileMovementService", () => {
  let orgId: string;
  let clientId: string;
  let bankRelationId: string;
  let statementId: string;
  let incomeAccountId: string;

  const reconcile = ({
    movementId,
    args,
  }: {
    movementId: string;
    args: Services["Banking"]["ReconcileMovement"]["Args"];
  }) => ReconcileMovementService.create({ db, userId: TEST_USER_ID, movementId }).reconcile(args);

  const createMovement = async ({
    amount,
    currency = "CHF",
  }: {
    amount: bigint;
    currency?: string;
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
      })
      .returning();
    assertNonNullish(row);
    return row.id;
  };

  const openInvoice = async (): Promise<string> => {
    const invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
    await createLine(db, invoiceId, "Item line", { unitPrice: 1000n });

    const result = await OpenInvoiceService.create({
      db: db as unknown as InvoiceServiceArgs["db"],
      userId: TEST_USER_ID,
      invoiceId: invoiceId as InvoiceServiceArgs["invoiceId"],
    }).open();
    if (result.status !== "success") {
      throw new Error(`Failed to open invoice ${invoiceId} for test setup`);
    }

    return invoiceId;
  };

  const loadMovementStatus = async (movementId: string): Promise<string> => {
    const [row] = await db.select().from(movements).where(eq(movements.id, movementId));
    assertNonNullish(row);
    return row.status;
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
    clientId = await createClient(db, orgId);

    bankRelationId = await createBankRelation(db, orgId);
    statementId = await createBankStatement(db, { organizationId: orgId, bankRelationId });

    incomeAccountId = await leafAccountId(db, orgId, AccountType.INCOME);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("invoice", () => {
    test("pays the invoice with the movement and returns the reconciled movement", async () => {
      const invoiceId = await openInvoice();
      const movementId = await createMovement({ amount: 1000n });

      const result = await reconcile({ movementId, args: { type: "invoice", invoiceId } });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.id).toBe(movementId);
      expect(result.result.status).toBe(BankMovementStatus.RECONCILED);

      const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
      expect(invoice?.status).toBe(InvoiceStatus.PAID);
    });

    test("returns an error Result when the invoice cannot be paid", async () => {
      const invoiceId = await createDraftInvoice(db, { organizationId: orgId, clientId });
      const movementId = await createMovement({ amount: 1000n });

      const result = await reconcile({ movementId, args: { type: "invoice", invoiceId } });

      expect(result.status).toBe("error");
      expect(await loadMovementStatus(movementId)).toBe(BankMovementStatus.UNRECONCILED);
    });
  });

  describe("account", () => {
    test("books the movement on the account and returns the reconciled movement", async () => {
      const movementId = await createMovement({ amount: 20000n });

      const result = await reconcile({
        movementId,
        args: { type: "account", accountId: incomeAccountId, description: null },
      });

      expect(result.status).toBe("success");
      if (result.status !== "success") return;
      expect(result.result.id).toBe(movementId);
      expect(result.result.status).toBe(BankMovementStatus.RECONCILED);

      const links = await db
        .select()
        .from(movementJournalEntries)
        .where(eq(movementJournalEntries.movementId, movementId));
      expect(links).toHaveLength(1);
    });
  });
});
