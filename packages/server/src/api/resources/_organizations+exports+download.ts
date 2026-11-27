import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { StorageExportService } from "@usenullish/nullish-engine/core";
import { defineDownloadRoute } from "./_factories/download-route-config";
import { errorResponse } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

const route = {
  path: "/organizations/{parentId}/exports/{id}/download",
  spec: { tag: "Organizations" },
} as const;

const getDownloadRoute = defineDownloadRoute({
  ...route,
  request: {
    params: {
      schema: CommonSchema.Params.ChildRouteIdParamsSchema,
    },
  },
  response: {
    description: "Download the export of the organization",
    contentType: "application/gzip",
  },
});

type GetDownloadRoute = typeof getDownloadRoute;

@ResourceProvider
export class OrganizationsExportsDownloadHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [route.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): OrganizationsExportsDownloadHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: getDownloadRoute, handler: this.#downloadExport });
  }

  #downloadExport = withRest<GetDownloadRoute>(
    withPermission<GetDownloadRoute>(async ({ context, caller }) => {
      const {
        req,
        var: {
          db: { connection },
          workers: { storage },
        },
      } = context;

      const parentId = req.param("parentId");

      if (isInvalidUuid(parentId)) {
        return errorResponse({
          context,
          error: "Bad Request",
          code: ErrorCode.VALIDATION,
          status: 400,
        });
      }

      const id = req.param("id");

      if (isInvalidUuid(id)) {
        return errorResponse({
          context,
          error: "Bad Request",
          code: ErrorCode.VALIDATION,
          status: 400,
        });
      }

      const result = await StorageExportService.create({
        db: connection,
        storage,
        userId: caller.userId,
        organizationId: parentId,
      }).stream({ exportId: id });

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          error: "Export not found",
          code: ErrorCode.NOT_FOUND,
          status: 404,
        });
      }

      const { stream } = result.result;

      context.header("Content-Type", "application/gzip");
      context.header("Content-Disposition", `attachment; filename="export-${parentId}.tar.gz"`);

      return context.body(stream, 200);
    }),
  );
}
