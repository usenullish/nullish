import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiMigrationDatasetSummariesSsr } from "~/lib/api/migration-dataset-summaries.ssr.api";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import { Service } from "./_services";

export class MigrationDatasetSummariesService extends Service {
  private constructor() {
    super();
  }

  static create(): MigrationDatasetSummariesService {
    return new this();
  }

  listAll = async ({
    cookie,
    orgId,
    filters,
  }: {
    cookie: Cookie;
    filters: Api["MigrationDatasetSummaries"]["Client"]["GetDatasetSummariesFilters"];
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["MigrationDatasetSummaries"]["Client"]["GetDatasetSummariesResponse"]>
  > => {
    return await tryCatch(async () => {
      const api = ApiMigrationDatasetSummariesSsr.create({ cookie });

      const datasetSummaries = await this._listAll({
        listFn: async (query) => {
          const { datasetSummaries } = await api.list({ orgId, query, filters });
          return datasetSummaries;
        },
      });

      return { datasetSummaries };
    });
  };
}
