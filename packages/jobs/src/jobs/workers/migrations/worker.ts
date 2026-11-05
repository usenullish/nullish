import { DbUserContext, type Tx } from "@usenullish/nullish-db";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { MigrationService } from "@usenullish/nullish-migration";
import {
  MigrationDatasetType,
  MigrationStatus,
  type PostgresDbInstance,
} from "@usenullish/nullish-schema/db";
import type { Jobs } from "@usenullish/nullish-schema/jobs";
import type { Records } from "@usenullish/nullish-schema/records";
import { refreshAccountBalances } from "./_helpers/reports";
import { getMigration, updateMigrationStatus } from "./_helpers/migrations";
import { listDatasets } from "./_helpers/datasets";

type Migration = Records["Migration"]["Migrations"]["Select"];
type Dataset = Records["Migration"]["Datasets"]["Select"];

const REFRESH_BALANCES_DATASET_TYPES: readonly MigrationDatasetType[] = [
  MigrationDatasetType.BALANCES,
  MigrationDatasetType.JOURNAL,
];

export class MigrationsWorker extends DbUserContext {
  readonly #db: PostgresDbInstance;
  readonly #migrationId: Jobs["Migrations"]["Payload"]["migrationId"];

  private constructor({
    db,
    payload: { userId, migrationId },
  }: {
    db: PostgresDbInstance;
    payload: Jobs["Migrations"]["Payload"];
  }) {
    super({ db, userId });

    this.#db = db;
    this.#migrationId = migrationId;
  }

  static create(args: {
    db: PostgresDbInstance;
    payload: Jobs["Migrations"]["Payload"];
  }): MigrationsWorker {
    return new this(args);
  }

  run(): Promise<Result<void>> {
    return tryCatch(async () => {
      const { imported, refreshBalances } = await this._withAuth(async (tx) => {
        const migration = await getMigration({
          tx,
          id: this.#migrationId,
          lock: "no key update",
        });

        this.#assertRunnable({ migration });

        const datasets = await listDatasets({ tx, migrationId: migration.id });

        const result = await this.#import({ tx, migration, datasets });

        await updateMigrationStatus({
          tx,
          id: migration.id,
          status: result.status === "success" ? MigrationStatus.SUCCEEDED : MigrationStatus.FAILED,
        });

        return {
          imported: result,
          refreshBalances: datasets.some(({ type }) =>
            REFRESH_BALANCES_DATASET_TYPES.includes(type),
          ),
        };
      });

      if (imported.status === "error") {
        throw imported.err;
      }

      if (!refreshBalances) {
        return;
      }

      await refreshAccountBalances({ db: this.#db });
    });
  }

  // The import runs in a savepoint so that, when it fails, only the import is rolled back and the
  // migration can still be marked as failed in the same transaction.
  #import({
    tx,
    migration: { organizationId },
    datasets,
  }: {
    tx: Tx;
    migration: Migration;
    datasets: Dataset[];
  }): Promise<Result<void>> {
    return tryCatch(async () => {
      await tx.transaction(async (savepoint) => {
        await MigrationService.create({ organizationId }).run({ tx: savepoint, datasets });
      });
    });
  }

  #assertRunnable({ migration: { id, status } }: { migration: Migration }) {
    if (status === MigrationStatus.SUCCEEDED) {
      throw new Error(`Migration ${id} has already succeeded and cannot be run again`);
    }
  }
}
