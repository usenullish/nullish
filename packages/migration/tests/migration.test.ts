import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { and, eq } from "drizzle-orm";
import { encodeWithCodecs, tryCatch } from "@usenullish/nullish-common";
import {
  AccountType,
  ClientType,
  DbSchema,
  InvoiceStatus,
  MigrationDatasetType,
} from "@usenullish/nullish-schema/db";
import { type Migration, MigrationSchema } from "@usenullish/nullish-schema/migration";
import { MigrationService } from "../src/migration";
import { MigratePeriodsMissingError } from "../src/services/periods.migrate";
import {
  accountByCode,
  clientByName,
  createOrganization,
  createPeriod,
  openTestDb,
  resetDb,
  seedUsers,
  TEST_USER_ID,
  withAuthenticatedUser,
  withUser,
} from "../../admin/tests/_test-utils";

const instance = await openTestDb();
const db = instance.connection;

const accounts = DbSchema.Ledger.Accounts.AccountsSchema;
const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
const invoices = DbSchema.Billing.Invoices.InvoicesSchema;

const ISSUE_ON = new Date(Date.UTC(2026, 2, 1));
const PAID_ON = new Date(Date.UTC(2026, 2, 15));

const accountsDataset = {
  type: MigrationDatasetType.ACCOUNTS,
  data: encodeWithCodecs({
    schema: MigrationSchema.Foreign.ForeignAccountsSchema,
    value: [{ code: "9700", type: AccountType.ASSET, name: "Migrated" }],
  }),
};

const journalDataset = (journal: Migration["Foreign"]["Journal"]) => ({
  type: MigrationDatasetType.JOURNAL,
  data: encodeWithCodecs({ schema: MigrationSchema.Foreign.ForeignJournalSchema, value: journal }),
});

const entry = ({
  reference,
  validOn,
  debit,
  credit,
}: {
  reference: string;
  validOn: Date;
  debit: string;
  credit: string;
}): Migration["Foreign"]["JournalEntry"] => ({
  reference,
  validOn,
  lines: [{ codes: { debit, credit }, amount: 100, currency: "CHF", exchangeRate: 1 }],
});

describe("MigrationService", () => {
  const createOrganizationWithPeriod = async (): Promise<string> => {
    const organizationId = await createOrganization(db, TEST_USER_ID);

    await withUser(db, TEST_USER_ID, (tx) =>
      createPeriod({
        tx,
        organizationId,
        startOn: new Date(Date.UTC(2026, 0, 1)),
        endOn: new Date(Date.UTC(2026, 11, 31)),
      }),
    );

    return organizationId;
  };

  const run = ({
    organizationId,
    datasets,
  }: {
    organizationId: string;
    datasets: Parameters<MigrationService["run"]>[0]["datasets"];
  }) =>
    tryCatch(() =>
      withAuthenticatedUser(db, TEST_USER_ID, (tx) =>
        MigrationService.create({ organizationId }).run({ tx, datasets }),
      ),
    );

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await instance.close();
  });

  test("imports every dataset, the journal spanning several datasets", async () => {
    const organizationId = await createOrganizationWithPeriod();

    const result = await run({
      organizationId,
      datasets: [
        accountsDataset,
        {
          type: MigrationDatasetType.CLIENTS,
          data: encodeWithCodecs({
            schema: MigrationSchema.Foreign.ForeignClientsSchema,
            value: [{ type: ClientType.COMPANY, name: "Muster AG", contacts: [] }],
          }),
        },
        {
          type: MigrationDatasetType.BALANCES,
          data: encodeWithCodecs({
            schema: MigrationSchema.Foreign.ForeignOpeningBalancesSchema,
            value: {
              validOn: new Date(Date.UTC(2026, 0, 1)),
              balances: [
                { code: "1020", amount: 1000 },
                { code: "2800", amount: -1000 },
              ],
            },
          }),
        },
        journalDataset([
          entry({ reference: "Facture RE-1", validOn: ISSUE_ON, debit: "1100", credit: "3200" }),
        ]),
        journalDataset([
          entry({ reference: "Facture RE-1", validOn: PAID_ON, debit: "1020", credit: "1100" }),
        ]),
        {
          type: MigrationDatasetType.INVOICES,
          data: encodeWithCodecs({
            schema: MigrationSchema.Foreign.ForeignInvoicesSchema,
            value: [
              {
                number: "RE-1",
                status: "paid",
                clientName: "Muster AG",
                currency: "CHF",
                netAmount: 100,
                grossAmount: 100,
                issueOn: ISSUE_ON,
                payments: [{ paidOn: PAID_ON, amount: 100 }],
              },
            ],
          }),
        },
      ],
    });

    expect(result).toEqual({ status: "success", result: undefined });

    expect((await accountByCode(db, organizationId, "9700")).name).toBe("Migrated");
    expect((await clientByName(db, organizationId, "Muster AG")).type).toBe(ClientType.COMPANY);

    const migratedEntries = await db
      .select()
      .from(journalEntries)
      .where(
        and(eq(journalEntries.organizationId, organizationId), eq(journalEntries.migrated, true)),
      );

    expect(migratedEntries).toHaveLength(3);

    const created = await db
      .select()
      .from(invoices)
      .where(eq(invoices.organizationId, organizationId));

    expect(created.map(({ status }) => status)).toEqual([InvoiceStatus.PAID]);
  });

  test("throws and imports nothing when a step fails", async () => {
    const organizationId = await createOrganizationWithPeriod();

    const result = await run({
      organizationId,
      datasets: [
        accountsDataset,
        journalDataset([
          entry({
            reference: "R-1",
            validOn: new Date(Date.UTC(2025, 5, 1)),
            debit: "1020",
            credit: "3200",
          }),
        ]),
      ],
    });

    if (result.status === "success") {
      expect(true).toBeFalse();
      return;
    }

    expect(result.err).toBeInstanceOf(MigratePeriodsMissingError);

    const migratedAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.organizationId, organizationId), eq(accounts.code, "9700")));

    expect(migratedAccounts).toHaveLength(0);
  });

  test("throws for a dataset that cannot be parsed", async () => {
    const organizationId = await createOrganizationWithPeriod();

    const result = await run({
      organizationId,
      datasets: [{ type: MigrationDatasetType.ACCOUNTS, data: [{ code: "" }] }],
    });

    expect(result.status).toBe("error");
  });
});
