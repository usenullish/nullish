import type { Result } from "@usenullish/nullish-common";
import type { Migration } from "@usenullish/nullish-schema/migration";
import type { MigrationProvider } from "@usenullish/nullish-schema/db";

export type ForeignAccountingSourceExtension = ".xlsx" | ".csv";

export interface ForeignAccountingSourceExtensions {
  accounts: ForeignAccountingSourceExtension;
  balances: ForeignAccountingSourceExtension;
  journal: ForeignAccountingSourceExtension;
  clients: ForeignAccountingSourceExtension;
  invoices: ForeignAccountingSourceExtension;
}

export interface ForeignAccountingProvider {
  get name(): MigrationProvider;
  get sourceExtensions(): ForeignAccountingSourceExtensions;

  prepareAccounts(args: {
    bytes: Uint8Array;
  }): Promise<Result<Migration["ForeignEncoded"]["Accounts"]>>;
  prepareBalances(args: {
    bytes: Uint8Array;
  }): Promise<Result<Migration["ForeignEncoded"]["Balances"]>>;
  prepareJournal(args: {
    bytes: Uint8Array;
  }): Promise<Result<Migration["ForeignEncoded"]["Journal"]>>;
  prepareClients(args: {
    bytes: Uint8Array;
  }): Promise<Result<Migration["ForeignEncoded"]["Clients"]>>;
  prepareInvoices(args: {
    bytes: Uint8Array;
  }): Promise<Result<Migration["ForeignEncoded"]["Invoices"]>>;
}

interface Factory<T> {
  create(): T;
}

export function ForeignAccounting(_constructor: Factory<ForeignAccountingProvider>) {}
