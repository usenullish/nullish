import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import {
  DbCollectionMovementJournal,
  DbCollectionMovements,
  DbCollectionStatements,
} from "@usenullish/nullish-engine/banking";
import {
  DbCollectionClients,
  DbCollectionContacts,
  DbCollectionInvoiceJournal,
  DbCollectionInvoices,
  DbCollectionLines,
} from "@usenullish/nullish-engine/billing";
import {
  DbCollectionAccountingSettings,
  DbCollectionBankRelations,
  DbCollectionBillingSettings,
  DbCollectionVatMethods,
  DbCollectionVatPeriods,
  DbCollectionVatRates,
  DbCollectionVatSettings,
} from "@usenullish/nullish-engine/core";
import {
  DbCollectionAccounts,
  DbCollectionPeriodJournal,
  DbCollectionPeriods,
  DbCollectionPostingManualVatPostings,
  DbCollectionSystemAccounts,
} from "@usenullish/nullish-engine/ledger";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Jobs, JobsSchema } from "@usenullish/nullish-schema/jobs";
import type { Records } from "@usenullish/nullish-schema/records";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import type { PgTable } from "drizzle-orm/pg-core";
import type * as z from "zod";
import { listAll, listChildren } from "./list";

interface ExportCollection<T> {
  table: PgTable;
  schema: z.ZodType<T>;
}

export interface ExportTable<T = unknown, TChild = unknown> {
  collection: ExportCollection<T> & { build: () => Promise<T[]> };
  childCollection?: ExportCollection<TChild> & { build(parents: T[]): Promise<TChild[]> };
}

type SelectClients = Records["Billing"]["Clients"]["Select"];
type SelectInvoices = Records["Billing"]["Invoices"]["Select"];
type SelectBankRelations = Records["Core"]["BankRelations"]["Select"];

const { ExportsSchema } = JobsSchema;

export const buildExportTables = ({
  storeArgs,
  organizationId,
}: {
  storeArgs: DbStoreInitArgs;
  organizationId: Jobs["Exports"]["Payload"]["organizationId"];
}): ExportTable[] => {
  const args = { ...storeArgs, foreignKeyId: organizationId };

  return [
    {
      collection: {
        table: DbSchema.Core.Accounting.AccountingSettingsSchema,
        schema: ApiSchema.AccountingSettings.AccountingSettingsResponseSchema,
        build: () =>
          listAll({ list: (query) => DbCollectionAccountingSettings.create(args).list(query) }),
      },
    },
    {
      collection: {
        table: DbSchema.Core.Billing.BillingSettingsSchema,
        schema: ApiSchema.BillingSettings.BillingSettingsResponseSchema,
        build: () =>
          listAll({ list: (query) => DbCollectionBillingSettings.create(args).list(query) }),
      },
    },
    {
      collection: {
        table: DbSchema.Core.Vat.VatSettingsSchema,
        schema: ApiSchema.VatSettings.VatSettingsResponseSchema,
        build: () => listAll({ list: (query) => DbCollectionVatSettings.create(args).list(query) }),
      },
    },
    {
      collection: {
        table: DbSchema.Core.Vat.VatMethodsSchema,
        schema: ApiSchema.VatMethods.VatMethodsResponseSchema,
        build: () => listAll({ list: (query) => DbCollectionVatMethods.create(args).list(query) }),
      },
    },
    {
      collection: {
        table: DbSchema.Core.Vat.VatRatesSchema,
        schema: ApiSchema.VatRates.VatRatesResponseSchema,
        build: () => listAll({ list: (query) => DbCollectionVatRates.create(args).list(query) }),
      },
    },
    {
      collection: {
        table: DbSchema.Core.Vat.VatPeriodsSchema,
        schema: ApiSchema.VatPeriods.VatPeriodsResponseSchema,
        build: () => listAll({ list: (query) => DbCollectionVatPeriods.create(args).list(query) }),
      },
    },
    {
      collection: {
        table: DbSchema.Ledger.Accounts.AccountsSchema,
        schema: ApiSchema.Accounts.AccountsResponseSchema,
        build: () => listAll({ list: (query) => DbCollectionAccounts.create(args).list(query) }),
      },
    },
    {
      collection: {
        table: DbSchema.Ledger.SystemAccounts.SystemAccountsSchema,
        schema: ApiSchema.SystemAccounts.SystemAccountSchema,
        build: () =>
          listAll({ list: (query) => DbCollectionSystemAccounts.create(args).list(query) }),
      },
    },
    {
      collection: {
        table: DbSchema.Ledger.Periods.PeriodsSchema,
        schema: ApiSchema.Periods.PeriodsResponseSchema,
        build: () => listAll({ list: (query) => DbCollectionPeriods.create(args).list(query) }),
      },
    },
    {
      collection: {
        table: DbSchema.Ledger.PeriodJournal.PeriodJournalEntriesSchema,
        schema: ExportsSchema.ExportPeriodJournalEntriesSchema,
        build: () =>
          listAll({ list: (query) => DbCollectionPeriodJournal.create(args).list(query) }),
      },
    },
    {
      collection: {
        table: DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema,
        schema: ExportsSchema.ExportPostingManualVatPostingsSchema,
        build: () =>
          listAll({
            list: (query) => DbCollectionPostingManualVatPostings.create(args).list(query),
          }),
      },
    },
    {
      collection: {
        table: DbSchema.Billing.Clients.ClientsSchema,
        schema: ApiSchema.Clients.ClientsResponseSchema,
        build: () => listAll({ list: (query) => DbCollectionClients.create(args).list(query) }),
      },
      childCollection: {
        table: DbSchema.Billing.Clients.ContactsSchema,
        schema: ApiSchema.Contacts.ContactsResponseSchema,
        build: (parents: SelectClients[]) =>
          listChildren({
            parents,
            list:
              ({ id }) =>
              (query) =>
                DbCollectionContacts.create({ ...storeArgs, foreignKeyId: id }).list(query),
          }),
      },
    },
    {
      collection: {
        table: DbSchema.Billing.Invoices.InvoicesSchema,
        schema: ApiSchema.Invoices.InvoiceSchema,
        build: () => listAll({ list: (query) => DbCollectionInvoices.create(args).list(query) }),
      },
      childCollection: {
        table: DbSchema.Billing.Invoices.LinesSchema,
        schema: ApiSchema.Lines.LinesResponseSchema,
        build: (parents: SelectInvoices[]) =>
          listChildren({
            parents,
            list:
              ({ id }) =>
              (query) =>
                DbCollectionLines.create({ ...storeArgs, foreignKeyId: id }).list(query),
          }),
      },
    },
    {
      collection: {
        table: DbSchema.Billing.InvoiceJournal.InvoiceJournalEntriesSchema,
        schema: ExportsSchema.ExportInvoiceJournalEntriesSchema,
        build: () =>
          listAll({ list: (query) => DbCollectionInvoiceJournal.create(args).list(query) }),
      },
    },
    {
      collection: {
        table: DbSchema.Core.Bank.BankRelationsSchema,
        schema: ApiSchema.BankRelations.BankRelationsResponseSchema,
        build: () =>
          listAll({ list: (query) => DbCollectionBankRelations.create(args).list(query) }),
      },
      childCollection: {
        table: DbSchema.Banking.Movements.MovementsSchema,
        schema: ApiSchema.BankMovements.BankMovementSchema,
        build: (parents: SelectBankRelations[]) =>
          listChildren({
            parents,
            list:
              ({ id }) =>
              (query) =>
                DbCollectionMovements.create({ ...storeArgs, foreignKeyId: id }).list(query),
          }),
      },
    },
    {
      collection: {
        table: DbSchema.Banking.Statements.StatementsSchema,
        schema: ExportsSchema.ExportStatementsSchema,
        build: () => listAll({ list: (query) => DbCollectionStatements.create(args).list(query) }),
      },
    },
    {
      collection: {
        table: DbSchema.Banking.MovementJournal.MovementJournalEntriesSchema,
        schema: ExportsSchema.ExportMovementJournalEntriesSchema,
        build: () =>
          listAll({ list: (query) => DbCollectionMovementJournal.create(args).list(query) }),
      },
    },
  ];
};
