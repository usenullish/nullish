import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { ApiSchema, CommonSchema } from "@usenullish/nullish-schema/server";
import { JobsExportService } from "@usenullish/nullish-engine/core";
import { defineGetByIdRoute } from "./_factories/crud-route-config";
import { defineJobStateHandler } from "../handlers/jobs/state";

const route = {
  path: "/organizations/{parentId}/exports/jobs",
  spec: { tag: "Organizations" },
} as const;

const getByIdRoute = defineGetByIdRoute({
  ...route,
  request: {
    params: {
      schema: CommonSchema.Params.ChildRouteIdParamsSchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.Exports.ExportJobStateResponseSchema,
    },
    description: "Export job status",
  },
});

type GetByIdRoute = typeof getByIdRoute;

@ResourceProvider
export class OrganizationsExportsJobsHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [route.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): OrganizationsExportsJobsHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: getByIdRoute, handler: this.#getJobStatus });
  }

  readonly #getJobStatus = defineJobStateHandler<GetByIdRoute>({
    jobState: ({ db, userId, jobs, parentId, jobId }) =>
      JobsExportService.create({ db, jobs, userId, organizationId: parentId }).jobState({ jobId }),
    resourceKey: "export job",
  });
}
