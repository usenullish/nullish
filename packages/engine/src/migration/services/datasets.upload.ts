import type { DbUserContextArgs } from "@usenullish/nullish-db";
import { encodeWithCodecs, type Result, tryCatch } from "@usenullish/nullish-common";
import { createForeignAccountingProvider } from "@usenullish/nullish-migration";
import { MigrationDatasetType, MigrationStatus } from "@usenullish/nullish-schema/db";
import { MigrationSchema } from "@usenullish/nullish-schema/migration";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Services } from "@usenullish/nullish-schema/services";
import { EngineError } from "../../errors";
import { ServiceContext } from "../../_service/service";
import { getMigration } from "../_helpers/migrations";
import { getDataset, insertDataset, updateDataset } from "../_helpers/datasets";

type Migration = Records["Migration"]["Migrations"]["Select"];
type Dataset = Records["Migration"]["Datasets"]["Select"];
type InsertDatasets = Records["Migration"]["Datasets"]["Insert"];
type UploadDatasetArgs = Services["Migration"]["UploadDataset"]["Args"];
type UploadDatasetResult = Services["Migration"]["UploadDataset"]["Result"];

export type UploadDatasetsServiceArgs = DbUserContextArgs & {
  migrationId: Migration["id"];
};

class MigrationNotDraftError extends EngineError {}
class MigrationFileUnreadableError extends EngineError {}
class MigrationDatasetTypeMismatchError extends EngineError {}

export class UploadDatasetsService extends ServiceContext {
  readonly #migrationId: Migration["id"];

  private constructor({ migrationId, ...rest }: UploadDatasetsServiceArgs) {
    super(rest);

    this.#migrationId = migrationId;
  }

  static create(args: UploadDatasetsServiceArgs): UploadDatasetsService {
    return new this(args);
  }

  upload(args: UploadDatasetArgs): Promise<Result<UploadDatasetResult>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const migration = await getMigration({ tx, id: this.#migrationId });

        this.#assertDraft({ migration });

        const data = await this.#parse({ migration, args });

        const { type, name } = args;

        const { data: _data, ...uploaded } = await insertDataset({
          tx,
          migration,
          values: { type, name, data },
        });

        return uploaded;
      });
    });
  }

  replace({
    datasetId,
    ...args
  }: { datasetId: Dataset["id"] } & UploadDatasetArgs): Promise<Result<UploadDatasetResult>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const migration = await getMigration({ tx, id: this.#migrationId });

        this.#assertDraft({ migration });

        const dataset = await getDataset({ tx, migrationId: migration.id, id: datasetId });

        this.#assertSameType({ dataset, args });

        const data = await this.#parse({ migration, args });

        const { data: _data, ...replaced } = await updateDataset({
          tx,
          id: dataset.id,
          values: { name: args.name, data },
        });

        return replaced;
      });
    });
  }

  async #parse({
    migration: { provider },
    args,
  }: {
    migration: Migration;
    args: UploadDatasetArgs;
  }): Promise<InsertDatasets["data"]> {
    const providerResult = createForeignAccountingProvider({ provider });

    if (providerResult.status === "error") {
      throw providerResult.err;
    }

    const { result: foreignAccounting } = providerResult;

    const prepareBalances = async ({
      file,
      validOn,
    }: Pick<
      Extract<UploadDatasetArgs, { type: MigrationDatasetType.BALANCES }>,
      "file" | "validOn"
    >): Promise<Result<InsertDatasets["data"]>> => {
      const balances = await foreignAccounting.prepareBalances({
        bytes: file,
      });

      if (balances.status === "error") {
        return balances;
      }

      return {
        status: "success",
        result: encodeWithCodecs({
          schema: MigrationSchema.Foreign.ForeignOpeningBalancesSchema,
          value: { validOn, balances: balances.result },
        }),
      };
    };

    const prepare = async (): Promise<Result<InsertDatasets["data"]>> => {
      switch (args.type) {
        case MigrationDatasetType.ACCOUNTS:
          return foreignAccounting.prepareAccounts({ bytes: args.file });
        case MigrationDatasetType.BALANCES:
          return prepareBalances({ file: args.file, validOn: args.validOn });
        case MigrationDatasetType.JOURNAL:
          return foreignAccounting.prepareJournal({ bytes: args.file });
        case MigrationDatasetType.CLIENTS:
          return foreignAccounting.prepareClients({ bytes: args.file });
        case MigrationDatasetType.INVOICES:
          return foreignAccounting.prepareInvoices({ bytes: args.file });
      }
    };

    const parsed = await prepare();

    if (parsed.status === "error") {
      console.error(parsed.err);
      throw new MigrationFileUnreadableError(
        `The file ${args.name} could not be read as ${args.type}`,
      );
    }

    return parsed.result;
  }

  #assertSameType({ dataset: { id, type }, args }: { dataset: Dataset; args: UploadDatasetArgs }) {
    if (type !== args.type) {
      throw new MigrationDatasetTypeMismatchError(
        `Dataset ${id} holds ${type}, it cannot be replaced by ${args.type}`,
      );
    }
  }

  #assertDraft({ migration: { id, status } }: { migration: Migration }) {
    if (status !== MigrationStatus.DRAFT) {
      throw new MigrationNotDraftError(
        `Migration ${id} is ${status}, files can only be added while it is a draft`,
      );
    }
  }
}
