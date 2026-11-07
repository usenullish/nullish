import type { LoaderFunctionArgs } from "react-router";
import { ServerLoader } from "~/context/server/_server";
import { MigrationDatasetSummariesService } from "~/lib/services/migration-dataset-summaries.services";
import type { Api } from "@usenullish/nullish-schema/server";
import type { Option } from "@usenullish/nullish-common";
import { MigrationStatus } from "@usenullish/nullish-schema/db";

export class MigrationDatasetSummariesServer extends ServerLoader {
  #service = MigrationDatasetSummariesService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): MigrationDatasetSummariesServer {
    return new MigrationDatasetSummariesServer({ context: "migration-dataset-summaries" });
  }

  async listAlreadyImportedDatasets(
    args: LoaderFunctionArgs,
  ): Promise<Option<Api["MigrationDatasetSummaries"]["Client"]["GetDatasetSummariesResponse"]>> {
    return await this._loadNested({
      args,
      errorFallbackMsg: "Unexpected error while loading the imported files",
      loaderWithOrgIdFn: (params) =>
        this.#service.listAll({
          ...params,
          filters: { status: MigrationStatus.SUCCEEDED },
        }),
    });
  }
}
