import { type Result, tryCatchSync } from "@usenullish/nullish-common";
import { Bexio } from "./providers/bexio";
import type { Migration } from "@usenullish/nullish-schema/migration";
import { MigrationProvider } from "@usenullish/nullish-schema/db";

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

export const createForeignAccountingProvider = ({
  provider,
}: {
  provider: MigrationProvider;
}): Result<ForeignAccountingProvider> => {
  const create = (): ForeignAccountingProvider => {
    switch (provider) {
      case MigrationProvider.BEXIO: {
        return Bexio.create();
      }
      default:
        throw new Error("Unsupported provider.");
    }
  };

  return tryCatchSync(create);
};
