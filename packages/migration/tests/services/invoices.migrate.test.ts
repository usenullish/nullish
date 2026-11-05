import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { tryCatch } from "@usenullish/nullish-common";
import { eq } from "drizzle-orm";
import {
  ClientType,
  DbSchema,
  InvoiceJournalEntryType,
  InvoiceStatus,
} from "@usenullish/nullish-schema/db";
import type { Migration } from "@usenullish/nullish-schema/migration";
import { MigrateClientsService } from "../../src/services/clients.migrate";
import { MigrateInvoicesService } from "../../src/services/invoices.migrate";
import { MigrateJournalService } from "../../src/services/journal.migrate";
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

const invoices = DbSchema.Billing.Invoices.InvoicesSchema;
const invoiceJournal = DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema;

const ISSUE_ON = new Date(Date.UTC(2026, 2, 1));
const PAID_ON = new Date(Date.UTC(2026, 2, 15));

const invoice = ({
  number,
  clientName = "Muster AG",
}: {
  number: string;
  clientName?: string;
}): Migration["Foreign"]["Invoice"] => ({
  number,
  status: "paid",
  clientName,
  currency: "CHF",
  netAmount: 100,
  grossAmount: 100,
  issueOn: ISSUE_ON,
  payments: [{ paidOn: PAID_ON, amount: 100 }],
});

describe("MigrateInvoicesService", () => {
  let orgId: string;

  const migrate = ({ invoices }: { invoices: Migration["Foreign"]["Invoices"] }) =>
    tryCatch(() =>
      withAuthenticatedUser(db, TEST_USER_ID, (tx) =>
        MigrateInvoicesService.create({ organizationId: orgId }).migrate({ tx, invoices }),
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

    await withUser(db, TEST_USER_ID, (tx) =>
      MigrateClientsService.create({ organizationId: orgId }).migrate({
        tx,
        clients: [{ type: ClientType.COMPANY, name: "Muster AG", contacts: [] }],
      }),
    );

    await withUser(db, TEST_USER_ID, (tx) =>
      MigrateJournalService.create({ organizationId: orgId }).migrate({
        tx,
        journal: [
          {
            reference: "Facture RE-1",
            validOn: ISSUE_ON,
            lines: [
              {
                codes: { debit: "1100", credit: "3200" },
                amount: 100,
                currency: "CHF",
                exchangeRate: 1,
              },
            ],
          },
          {
            reference: "Facture RE-1",
            validOn: PAID_ON,
            lines: [
              {
                codes: { debit: "1020", credit: "1100" },
                amount: 100,
                currency: "CHF",
                exchangeRate: 1,
              },
            ],
          },
        ],
      }),
    );
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("ignores the invoices that are not paid", async () => {
    const result = await migrate({
      invoices: [{ ...invoice({ number: "RE-0" }), status: "other" }],
    });

    expect(result).toEqual({ status: "success", result: { skipped: [], failed: [] } });
  });

  test("creates a paid invoice linked to its sale and payment entries, skipping the unmatched ones", async () => {
    const result = await migrate({
      invoices: [
        invoice({ number: "RE-1" }),
        invoice({ number: "RE-2", clientName: "Unknown AG" }),
      ],
    });

    expect(result).toEqual({
      status: "success",
      result: {
        skipped: [{ number: "RE-2", reason: 'Unknown client "Unknown AG"' }],
        failed: [],
      },
    });

    const created = await db.select().from(invoices).where(eq(invoices.organizationId, orgId));

    expect(created.map(({ status }) => status)).toEqual([InvoiceStatus.PAID]);

    const links = await db
      .select({ type: invoiceJournal.type })
      .from(invoiceJournal)
      .where(eq(invoiceJournal.invoiceId, created[0]?.id ?? ""));

    expect(links.map(({ type }) => type).toSorted()).toEqual(
      [InvoiceJournalEntryType.OPEN, InvoiceJournalEntryType.PAYMENT].toSorted(),
    );
  });

  test("skips an invoice whose journal entries are already linked", async () => {
    const result = await migrate({
      invoices: [invoice({ number: "RE-1" })],
    });

    if (result.status === "error") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.result.skipped.map(({ number }) => number)).toEqual(["RE-1"]);
  });
});
