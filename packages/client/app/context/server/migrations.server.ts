import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { MigrationsService } from "~/lib/services/migrations.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";

export class MigrationsServer extends ServerLoader {
  #service = MigrationsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): MigrationsServer {
    return new MigrationsServer({ context: "migrations" });
  }

  async listMigrations(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Migrations"]["Client"]["GetMigrationsResponse"]>> {
    return await this._loadListNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the migrations",
      defaultSort: { field: "createdAt", direction: "desc" },
      loaderWithOrgIdFn: this.#service.list,
    });
  }

  async getMigration(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["Migrations"]["Client"]["GetMigrationResponse"]>> {
    return await this._loadNestedWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the migration",
        missingId: "Missing migration ID",
      },
      loaderWithIdsFn: this.#service.getById,
    });
  }

  async listDatasets(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["MigrationsDatasets"]["Client"]["GetDatasetsResponse"]>> {
    return await this._loadListWithId({
      args,
      errorFallbackMsgs: {
        load: "Unexpected error while loading the files of the migration",
        missingId: "Missing migration ID",
      },
      defaultSort: { field: "createdAt", direction: "asc" },
      loaderWithIdFn: this.#service.listDatasets,
    });
  }
}
