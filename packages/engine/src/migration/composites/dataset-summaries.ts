import { DbUserContext } from "@usenullish/nullish-db";
import { isNullish, type Result, tryCatch } from "@usenullish/nullish-common";
import { DbSchema, queryArgsSchema } from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { type Composites, CompositesSchema } from "@usenullish/nullish-schema/composites";
import { getColumns } from "drizzle-orm";
import type { DbCollectionStoreInitArgs, DbListArgs } from "../../store";
import { parseQueryArgs } from "../../_query/helpers";
import { listDatasetSummaries } from "../_helpers/dataset-summaries";

type DatasetSummary = Composites["DatasetSummaries"]["Select"];
type FilterDatasetSummaries = Composites["DatasetSummaries"]["Filter"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbCollectionDatasetSummaries extends DbUserContext {
  readonly #organizationId: SelectOrganizations["id"];
  readonly #queryArgsSchema = queryArgsSchema(
    Object.keys(getColumns(DbSchema.Migration.Datasets.DatasetsSchema)) as [string, ...string[]],
  );

  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super(args);

    this.#organizationId = args.foreignKeyId;
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionDatasetSummaries {
    return new this(args);
  }

  list({
    filters,
    pagination,
    sort,
  }: DbListArgs<string, FilterDatasetSummaries>): Promise<Result<DatasetSummary[]>> {
    return tryCatch(async () => {
      const queryArgs = parseQueryArgs({
        args: { pagination, sort },
        schema: this.#queryArgsSchema,
        table: DbSchema.Migration.Datasets.DatasetsSchema,
        pKey: DbSchema.Migration.Datasets.DatasetsSchema.id,
      });

      const parsedFilters = isNullish(filters)
        ? undefined
        : CompositesSchema.DatasetSummariesSchema.FilterDatasetSummariesSchema.parse(filters);

      return await this._withAuth<DatasetSummary[]>(
        async (tx) =>
          await listDatasetSummaries({
            tx,
            organizationId: this.#organizationId,
            filters: parsedFilters,
            ...queryArgs,
          }),
      );
    });
  }
}
