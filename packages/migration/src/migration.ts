import type { Tx } from "@usenullish/nullish-db";
import { nonNullish } from "@usenullish/nullish-common";
import { MigrationDatasetType } from "@usenullish/nullish-schema/db";
import { type Migration, MigrationSchema } from "@usenullish/nullish-schema/migration";
import type { Records } from "@usenullish/nullish-schema/records";
import { MigrationContext, type MigrationContextArgs } from "./_context";
import { MigrateAccountsService } from "./services/accounts.migrate";
import { MigrateBalancesService } from "./services/balances.migrate";
import { MigrateClientsService } from "./services/clients.migrate";
import { MigrateContactsService } from "./services/contacts.migrate";
import { MigrateInvoicesService } from "./services/invoices.migrate";
import { MigrateJournalService } from "./services/journal.migrate";
import { MigratePeriodsService } from "./services/periods.migrate";
import { MigrateVatMethodsService } from "./services/vat-methods.migrate";

type Dataset = Pick<Records["Migration"]["Datasets"]["Select"], "type" | "data">;

interface ForeignData {
  accounts?: Migration["Foreign"]["Accounts"];
  opening?: Migration["Foreign"]["OpeningBalances"];
  journal?: Migration["Foreign"]["Journal"];
  clients?: Migration["Foreign"]["Clients"];
  invoices?: Migration["Foreign"]["Invoices"];
}

export class MigrationService extends MigrationContext {
  private constructor(args: MigrationContextArgs) {
    super(args);
  }

  static create(args: MigrationContextArgs): MigrationService {
    return new this(args);
  }

  async run({ tx, datasets }: { tx: Tx; datasets: Dataset[] }): Promise<void> {
    const { accounts, opening, journal, clients, invoices } = this.#parseDatasets({ datasets });

    const args = { organizationId: this._organizationId };

    if (nonNullish(accounts)) {
      await MigrateAccountsService.create(args).migrate({ tx, accounts });
    }

    if (nonNullish(clients)) {
      await MigrateClientsService.create(args).migrate({ tx, clients });
      await MigrateContactsService.create(args).migrate({ tx, clients });
    }

    if (nonNullish(journal)) {
      await MigratePeriodsService.create(args).migrate({ tx, journal });
      await MigrateVatMethodsService.create(args).migrate({ tx, journal });
    }

    if (nonNullish(opening)) {
      await MigrateBalancesService.create(args).migrate({ tx, ...opening });
    }

    if (nonNullish(journal)) {
      await MigrateJournalService.create(args).migrate({ tx, journal });
    }

    if (nonNullish(invoices)) {
      await MigrateInvoicesService.create(args).migrate({ tx, invoices });
    }
  }

  #parseDatasets({ datasets }: { datasets: Dataset[] }): ForeignData {
    return datasets.reduce<ForeignData>((acc, { type, data }) => {
      switch (type) {
        case MigrationDatasetType.ACCOUNTS:
          return { ...acc, accounts: MigrationSchema.Foreign.ForeignAccountsSchema.parse(data) };
        case MigrationDatasetType.BALANCES:
          return {
            ...acc,
            opening: MigrationSchema.Foreign.ForeignOpeningBalancesSchema.parse(data),
          };
        case MigrationDatasetType.JOURNAL:
          return {
            ...acc,
            journal: [
              ...(acc.journal ?? []),
              ...MigrationSchema.Foreign.ForeignJournalSchema.parse(data),
            ],
          };
        case MigrationDatasetType.CLIENTS:
          return { ...acc, clients: MigrationSchema.Foreign.ForeignClientsSchema.parse(data) };
        case MigrationDatasetType.INVOICES:
          return { ...acc, invoices: MigrationSchema.Foreign.ForeignInvoicesSchema.parse(data) };
      }
    }, {});
  }
}
