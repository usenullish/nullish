import { eq, sql } from "drizzle-orm";
import type { drizzle } from "drizzle-orm/bun-sql";
import { assertNonNullish } from "@usenullish/nullish-common";
import {
  AccountType,
  DbSchema,
  DocumentType,
  InvoiceLineType,
  InvoiceStatus,
  VatType,
  LegalForm,
  MigrationProvider,
} from "@usenullish/nullish-schema/db";

type TestDb = ReturnType<typeof drizzle>;

export const TEST_USER_ID = "user-00000000-0000-4000-8000-000000000000";
export const TEST_OTHER_USER_ID = "user-11111111-1111-4111-8111-111111111111";

const users = DbSchema.Auth.Auth.users;
const organizations = DbSchema.Core.Organizations.OrganizationsSchema;
const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const clients = DbSchema.Billing.Clients.ClientsSchema;
const invoices = DbSchema.Billing.Invoices.InvoicesSchema;
const lines = DbSchema.Billing.Invoices.LinesSchema;
const documentTemplates = DbSchema.Core.Documents.DocumentTemplatesSchema;
const templateContents = DbSchema.Core.Documents.TemplateContentsSchema;
const accounts = DbSchema.Ledger.Accounts.AccountsSchema;
const bankRelations = DbSchema.Core.Bank.BankRelationsSchema;
const vatRates = DbSchema.Core.Vat.VatRatesSchema;
const migrations = DbSchema.Migration.Migrations.MigrationsSchema;

export const waitFor = async <T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  { timeoutMs = 8000, intervalMs = 25 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let value = await fn();
  while (!predicate(value)) {
    if (Date.now() >= deadline) {
      throw new Error("waitFor: condition was not met before the timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    value = await fn();
  }
  return value;
};

export const resetDb = async ({ db }: { db: TestDb }): Promise<void> => {
  await db.execute(sql`TRUNCATE auth.users, core.organizations, audit.logs CASCADE;`);
};

export const seedUser = async ({
  db,
  userId = TEST_USER_ID,
}: {
  db: TestDb;
  userId?: string;
}): Promise<void> => {
  await db.insert(users).values({
    id: userId,
    name: userId,
    email: `${userId}@test.dev`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

export const createOrganization = async ({
  db,
  withAddress,
  userId = TEST_USER_ID,
}: {
  db: TestDb;
  withAddress: boolean;
  userId?: string;
}): Promise<string> => {
  const [org] = await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT auth.set_current_user_id(${userId})`);
    return tx
      .insert(organizations)
      .values({
        name: `Org ${crypto.randomUUID()}`,
        legalForm: LegalForm.LLC,
        ...(withAddress
          ? { address: "Bahnhofstrasse 1", postalCode: "8001", city: "Zürich", country: "CH" }
          : {}),
      })
      .returning();
  });
  assertNonNullish(org);
  await db.delete(periods).where(eq(periods.organizationId, org.id));
  return org.id;
};

export const createInvoice = async ({
  db,
  organizationId,
  vatRateId = null,
}: {
  db: TestDb;
  organizationId: string;
  vatRateId?: string | null;
}): Promise<string> => {
  const [clientRow] = await db
    .insert(clients)
    .values({ organizationId, name: "Test Client" })
    .returning();
  assertNonNullish(clientRow);

  const [invoice] = await db
    .insert(invoices)
    .values({
      organizationId,
      clientId: clientRow.id,
      issueOn: new Date("2026-01-01"),
      currency: "CHF",
      vatRateId,
    })
    .returning();
  assertNonNullish(invoice);
  return invoice.id;
};

export const openInvoice = async ({
  db,
  invoiceId,
}: {
  db: TestDb;
  invoiceId: string;
}): Promise<void> => {
  await db.update(invoices).set({ status: InvoiceStatus.OPEN }).where(eq(invoices.id, invoiceId));
};

export const createLine = async ({
  db,
  invoiceId,
  description,
}: {
  db: TestDb;
  invoiceId: string;
  description: string;
}): Promise<void> => {
  await db.insert(lines).values({
    organizationId: sql`(SELECT organization_id FROM billing.invoices WHERE id = ${invoiceId})`,
    invoiceId,
    type: InvoiceLineType.ITEM,
    description,
    quantity: 2,
    unitPrice: 1250n,
  });
};

export const createVatRate = async ({
  db,
  organizationId,
}: {
  db: TestDb;
  organizationId: string;
}): Promise<string> => {
  const [rate] = await db
    .insert(vatRates)
    .values({
      organizationId,
      code: "UN81",
      type: VatType.NET_RATE_TAX,
      rate: 8.1,
      netRate: 6.2,
      startOn: new Date("2024-01-01"),
    })
    .returning();
  assertNonNullish(rate);
  return rate.id;
};

export const createTemplate = async ({
  db,
  organizationId,
  language = "en",
}: {
  db: TestDb;
  organizationId: string;
  language?: string;
}): Promise<string> => {
  const [template] = await db
    .insert(documentTemplates)
    .values({
      organizationId,
      type: DocumentType.INVOICE,
      name: `Invoice ${crypto.randomUUID()}`,
    })
    .returning();
  assertNonNullish(template);

  const [content] = await db
    .insert(templateContents)
    .values({
      organizationId: template.organizationId,
      templateId: template.id,
      language,
      html: "<html><body>Invoice [[ nullish.invoice.number ]] [% if nullish.qrBill %][[ nullish.qrBill | raw ]][% endif %]</body></html>",
    })
    .returning();
  assertNonNullish(content);

  return content.id;
};

export const createMigration = async ({
  db,
  organizationId,
  userId = TEST_USER_ID,
}: {
  db: TestDb;
  organizationId: string;
  userId?: string;
}): Promise<string> => {
  const [migration] = await db
    .insert(migrations)
    .values({ organizationId, userId, provider: MigrationProvider.BEXIO })
    .returning();
  assertNonNullish(migration);
  return migration.id;
};

export const createBankRelation = async ({
  db,
  organizationId,
}: {
  db: TestDb;
  organizationId: string;
}): Promise<string> => {
  const rows = await db
    .select({ id: accounts.id, parentId: accounts.parentId, type: accounts.type })
    .from(accounts)
    .where(eq(accounts.organizationId, organizationId));
  const parentIds = new Set(rows.map(({ parentId }) => parentId));
  const [leaf] = rows.filter(({ id, type }) => type === AccountType.ASSET && !parentIds.has(id));
  assertNonNullish(leaf);

  const [bankRelation] = await db
    .insert(bankRelations)
    .values({
      organizationId,
      name: "Main bank",
      iban: "CH9300762011623852957",
      currency: "CHF",
      accountId: leaf.id,
    })
    .returning();
  assertNonNullish(bankRelation);
  return bankRelation.id;
};
