import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { encodeWithCodecs, isInvalidUuid } from "@usenullish/nullish-common";
import {
  DbCollectionDatasets,
  DbDatasets,
  UploadDatasetsService,
} from "@usenullish/nullish-engine/migration";
import {
  ApiSchema,
  CommonSchema,
  ErrorCode,
  MIGRATION_DATASET_FILE_MAX_SIZE,
} from "@usenullish/nullish-schema/server";
import { bodyLimit } from "hono/body-limit";
import { defineActionWithFormDataRequestBodyRoute } from "./_factories/action-route-config";
import { defineDeleteRoute, defineListRoute } from "./_factories/crud-route-config";
import { defineDeleteHandler } from "../handlers/root/delete";
import { defineChildListHandler } from "../handlers/child/list";
import type { Records } from "@usenullish/nullish-schema/records";
import type { OpenAPIFormDataHandlerContext, Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";
import { RATE_LIMITS, userRateLimitMiddleware } from "../middlewares/rate-limit";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

const actionRoute = defineActionWithFormDataRequestBodyRoute({
  path: "/migrations/{parentId}/datasets",
  spec: { tag: "Migrations" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.MigrationsDatasets.UploadDatasetRequestSchema },
  },
  response: {
    body: {
      schema: ApiSchema.MigrationsDatasets.UploadDatasetResponseSchema,
    },
    description: "Dataset read from the file and added to the draft migration",
  },
});

type ActionRoute = typeof actionRoute;

const replaceRoute = defineActionWithFormDataRequestBodyRoute({
  path: "/migrations/{parentId}/datasets/{id}/replace",
  spec: { tag: "Migrations" },
  request: {
    params: {
      schema: CommonSchema.Params.ChildRouteIdParamsSchema,
    },
    body: { schema: ApiSchema.MigrationsDatasets.UploadDatasetRequestSchema },
  },
  response: {
    body: {
      schema: ApiSchema.MigrationsDatasets.UploadDatasetResponseSchema,
    },
    description: "Dataset of the draft migration replaced by the one read from the file",
  },
});

type ReplaceRoute = typeof replaceRoute;

const listRoute = defineListRoute({
  path: "/migrations/{parentId}/datasets",
  spec: { tag: "Migrations" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: { schema: ApiSchema.MigrationsDatasets.GetDatasetsResponseSchema },
    description: "Retrieve the datasets of a migration, without their data",
  },
});

type ListRoute = typeof listRoute;

const deleteRoute = defineDeleteRoute({
  path: "/migrations/datasets",
  spec: { tag: "Migrations" },
  response: {
    description: "Delete a dataset of a migration that has not succeeded",
  },
});

type DeleteRoute = typeof deleteRoute;

type Dataset = Records["Migration"]["Datasets"]["Select"];

@ResourceProvider
export class MigrationsDatasetsHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [actionRoute.path, replaceRoute.path, deleteRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): MigrationsDatasetsHandlers {
    return new this(args);
  }

  override useCustomMiddleware() {
    [actionRoute.path, replaceRoute.path].forEach((path) => {
      this.app.on(
        "POST",
        this._toHonoPath(path),
        userRateLimitMiddleware({ limit: RATE_LIMITS.datasetsUpload }),
      );

      this.app.on(
        "POST",
        this._toHonoPath(path),
        bodyLimit({
          maxSize: MIGRATION_DATASET_FILE_MAX_SIZE,
          onError: (context) =>
            errorResponse({
              context,
              error: "The file is too large",
              code: ErrorCode.LIMITED,
              status: 413,
            }),
        }),
      );
    });
  }

  override register(): void {
    this.registerFormDataRoute({ route: actionRoute, handler: this.#defineUpload });
    this.registerFormDataRoute({ route: replaceRoute, handler: this.#defineReplace });
    this.registerRoute({ route: listRoute, handler: this.#list });
    this.registerRoute({ route: deleteRoute, handler: this.#delete });
  }

  #defineUpload = withRest<ActionRoute, OpenAPIFormDataHandlerContext<ActionRoute>>(
    withPermission<ActionRoute, OpenAPIFormDataHandlerContext<ActionRoute>>(
      async ({ context, caller }) => {
        const {
          req,
          var: {
            db: { connection },
          },
        } = context;

        const parentId = context.req.param("parentId");

        if (isInvalidUuid(parentId)) {
          return errorResponse({
            context,
            error: "Bad Request",
            code: ErrorCode.VALIDATION,
            status: 400,
          });
        }

        const { file, ...rest } = req.valid("form");

        const result = await UploadDatasetsService.create({
          db: connection,
          userId: caller.userId,
          migrationId: parentId,
        }).upload({ ...rest, file: await file.bytes(), name: file.name });

        if (result.status === "error") {
          console.error(result.err);
          return errorResponse({
            context,
            ...toApiError({
              err: result.err,
              fallback: "Failed to upload dataset",
            }),
          });
        }

        const build = (): Response200<ActionRoute> =>
          encodeWithCodecs({
            schema: ApiSchema.MigrationsDatasets.UploadDatasetResponseSchema,
            value: { dataset: result.result },
          });

        return context.json(build(), 200);
      },
    ),
  );

  #defineReplace = withRest<ReplaceRoute, OpenAPIFormDataHandlerContext<ReplaceRoute>>(
    withPermission<ReplaceRoute, OpenAPIFormDataHandlerContext<ReplaceRoute>>(
      async ({ context, caller }) => {
        const {
          req,
          var: {
            db: { connection },
          },
        } = context;

        const parentId = context.req.param("parentId");

        if (isInvalidUuid(parentId)) {
          return errorResponse({
            context,
            error: "Bad Request",
            code: ErrorCode.VALIDATION,
            status: 400,
          });
        }

        const id = context.req.param("id");

        if (isInvalidUuid(id)) {
          return errorResponse({
            context,
            error: "Bad Request",
            code: ErrorCode.VALIDATION,
            status: 400,
          });
        }

        const { file, ...rest } = req.valid("form");

        const result = await UploadDatasetsService.create({
          db: connection,
          userId: caller.userId,
          migrationId: parentId,
        }).replace({ ...rest, datasetId: id, file: await file.bytes(), name: file.name });

        if (result.status === "error") {
          console.error(result.err);
          return errorResponse({
            context,
            ...toApiError({
              err: result.err,
              fallback: "Failed to replace dataset",
            }),
          });
        }

        const build = (): Response200<ReplaceRoute> =>
          encodeWithCodecs({
            schema: ApiSchema.MigrationsDatasets.UploadDatasetResponseSchema,
            value: { dataset: result.result },
          });

        return context.json(build(), 200);
      },
    ),
  );

  readonly #list = defineChildListHandler<ListRoute, Dataset>({
    store: (args) => DbCollectionDatasets.create(args),
    resourceKey: "datasets",
    build: ({ result: datasets }) =>
      encodeWithCodecs({
        schema: ApiSchema.MigrationsDatasets.GetDatasetsResponseSchema,
        value: { datasets },
      }),
  });

  readonly #delete = defineDeleteHandler<DeleteRoute, Dataset, Dataset["id"]>({
    store: (args) => DbDatasets.create(args),
    resourceKey: "dataset",
    pKeySchema: ApiSchema.MigrationsDatasets.DatasetSchema.shape.id,
  });
}
