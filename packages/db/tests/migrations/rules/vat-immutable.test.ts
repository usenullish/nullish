import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import {
  AccountType,
  EXCHANGE_RATE_ONE,
  VatPaymentMethod,
  VatRemunerationMethod,
  VatType,
} from "@usenullish/nullish-schema/db";
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
  leafAccountId,
  postings,
  resetDb,
  seedUsers,
  vatMethods,
  vatRates,
  vatSettings,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

beforeAll(async () => {
  await resetDb(db);
  await seedUsers(db);
});

afterAll(async () => {
  await client.close();
});

describe("check_organization_immutable on vat_settings", () => {
  let organizationId: string;

  beforeEach(async () => {
    organizationId = await createOrganization(db);
  });

  test("rejects changing organization_id once set", async () => {
    const vatSettingsId = await createVatSettings(db, organizationId);
    const otherOrganizationId = await createOrganization(db);

    const error = await db
      .update(vatSettings)
      .set({ organizationId: otherOrganizationId })
      .where(eq(vatSettings.id, vatSettingsId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });
});

describe("check_vat_methods_immutable", () => {
  let organizationId: string;
  let clientId: string;
  let vatMethodsId: string;

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    clientId = await createClient(db, organizationId);
    await createVatSettings(db, organizationId);
    const periodId = await createPeriod(db, organizationId, {
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-12-31"),
    });
    vatMethodsId = await createVatMethods(db, organizationId, { periodId });
  });

  test("allows changing methods before any invoice of the year uses VAT", async () => {
    const [updated] = await db
      .update(vatMethods)
      .set({ remunerationMethod: VatRemunerationMethod.RECEIVED })
      .where(eq(vatMethods.id, vatMethodsId))
      .returning();

    expect(updated?.remunerationMethod).toBe(VatRemunerationMethod.RECEIVED);
  });

  test("rejects changing methods once an invoice of the year uses VAT", async () => {
    const vatRateId = await createVatRate(db, organizationId);
    await createDraftInvoice(db, organizationId, clientId, {
      vatRateId,
      issueOn: new Date("2026-06-15"),
    });

    const error = await db
      .update(vatMethods)
      .set({
        paymentMethod: VatPaymentMethod.EFFECTIVE,
        remunerationMethod: VatRemunerationMethod.RECEIVED,
      })
      .where(eq(vatMethods.id, vatMethodsId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "remuneration_method/payment_method cannot be changed once invoices or journal entries of the period use VAT",
    );
  });

  test("rejects changing methods once a journal entry of the year uses VAT", async () => {
    const journalEntryId = await createJournalEntry(db, organizationId, new Date("2026-06-15"));
    const vatRateId = await createVatRate(db, organizationId);
    const debitAccountId = await leafAccountId(db, organizationId, AccountType.ASSET);
    const creditAccountId = await leafAccountId(db, organizationId, AccountType.INCOME);
    await db.transaction((tx) =>
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

    const error = await db
      .update(vatMethods)
      .set({ remunerationMethod: VatRemunerationMethod.RECEIVED })
      .where(eq(vatMethods.id, vatMethodsId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "remuneration_method/payment_method cannot be changed once invoices or journal entries of the period use VAT",
    );
  });

  test("allows changing methods when only invoices of another year use VAT", async () => {
    const vatRateId = await createVatRate(db, organizationId);
    await createDraftInvoice(db, organizationId, clientId, {
      vatRateId,
      issueOn: new Date("2027-02-01"),
    });

    const [updated] = await db
      .update(vatMethods)
      .set({ paymentMethod: VatPaymentMethod.EFFECTIVE })
      .where(eq(vatMethods.id, vatMethodsId))
      .returning();

    expect(updated?.paymentMethod).toBe(VatPaymentMethod.EFFECTIVE);
  });
});

describe("check_vat_rates_immutable", () => {
  let organizationId: string;
  let clientId: string;

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    clientId = await createClient(db, organizationId);
  });

  test("rejects changing organization_id once set", async () => {
    const vatRateId = await createVatRate(db, organizationId);
    const otherOrganizationId = await createOrganization(db);

    const error = await db
      .update(vatRates)
      .set({ organizationId: otherOrganizationId })
      .where(eq(vatRates.id, vatRateId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
  });

  test("allows changing rate before any invoice uses it", async () => {
    const vatRateId = await createVatRate(db, organizationId, { rate: 0 });

    const [updated] = await db
      .update(vatRates)
      .set({ rate: 8.1 })
      .where(eq(vatRates.id, vatRateId))
      .returning();

    expect(updated?.rate).toBe(8.1);
  });

  test("rejects changing rate once an invoice uses it", async () => {
    const vatRateId = await createVatRate(db, organizationId, { rate: 0 });
    await createDraftInvoice(db, organizationId, clientId, { vatRateId });

    const error = await db
      .update(vatRates)
      .set({ rate: 8.1 })
      .where(eq(vatRates.id, vatRateId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "type/rate/netRate cannot be changed once an invoice uses this rate",
    );
  });

  test("rejects changing type once an invoice uses it", async () => {
    const vatRateId = await createVatRate(db, organizationId, {
      type: VatType.NON_TAXABLE_TURNOVER,
    });
    await createDraftInvoice(db, organizationId, clientId, { vatRateId });

    const error = await db
      .update(vatRates)
      .set({ type: VatType.NON_CONSIDERATION })
      .where(eq(vatRates.id, vatRateId))
      .catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(
      "type/rate/netRate cannot be changed once an invoice uses this rate",
    );
  });
});
