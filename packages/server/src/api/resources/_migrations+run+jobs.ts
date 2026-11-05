import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { ApiSchema, CommonSchema } from "@usenullish/nullish-schema/server";
import { JobsMigrationService } from "@usenullish/nullish-engine/migration";
import { defineGetByIdRoute } from "./_factories/crud-route-config";
import { defineJobStateHandler } from "../handlers/jobs/state";

const route = {
  path: "/migrations/{parentId}/run/jobs",
  spec: { tag: "Migrations" },
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
      schema: ApiSchema.MigrationsRun.RunMigrationJobStateResponseSchema,
    },
    description: "Migration run job status",
  },
});

type GetByIdRoute = typeof getByIdRoute;

@ResourceProvider
export class MigrationsRunJobsHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [route.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): MigrationsRunJobsHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: getByIdRoute, handler: this.#getJobStatus });
  }

  readonly #getJobStatus = defineJobStateHandler<GetByIdRoute>({
    jobState: ({ db, userId, jobs, parentId, jobId }) =>
      JobsMigrationService.create({ db, jobs, userId, migrationId: parentId }).jobState({ jobId }),
    resourceKey: "migration job",
  });
}
