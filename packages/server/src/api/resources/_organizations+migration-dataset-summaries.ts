import { DbCollectionDatasetSummaries } from "@usenullish/nullish-engine/migration";
import {
  ApiSchema,
  CommonSchema,
  encodeDatasetSummaryResponse,
} from "@usenullish/nullish-schema/server";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineListRoute } from "./_factories/crud-route-config";
import { _defineListHandler } from "../handlers/_list";

type SelectDatasetSummaries = Composites["DatasetSummaries"]["Select"];
type FilterDatasetSummaries = Composites["DatasetSummaries"]["Filter"];

const listRoute = defineListRoute({
  spec: { tag: "Migrations" },
  path: "/organizations/{parentId}/migration-dataset-summaries",
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: {
      filters: {
        schema: ApiSchema.MigrationDatasetSummaries.GetDatasetSummariesFiltersQuerySchema,
      },
    },
  },
  response: {
    body: { schema: ApiSchema.MigrationDatasetSummaries.GetDatasetSummariesResponseSchema },
    description: "Retrieve a list of the migration files of an organization with their migration",
  },
});

type ListRoute = typeof listRoute;

@ResourceProvider
export class MigrationDatasetSummariesHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [listRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): MigrationDatasetSummariesHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listRoute, handler: this.#list });
  }

  readonly #list = _defineListHandler<ListRoute, SelectDatasetSummaries, FilterDatasetSummaries>({
    query: async ({ db, userId, context, pagination, sort, filters }) => {
      const parentId = context.req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return { status: "error", err: new Error("Bad Request") };
      }

      return await DbCollectionDatasetSummaries.create({
        db,
        userId,
        foreignKeyId: parentId,
      }).list({ pagination, sort, filters });
    },
    resourceKey: "datasetSummaries",
    filtersSchema: ApiSchema.MigrationDatasetSummaries.GetDatasetSummariesFiltersQuerySchema,
    build: ({ result: datasetSummaries }) => ({
      datasetSummaries: datasetSummaries.map(encodeDatasetSummaryResponse),
    }),
  });
}
