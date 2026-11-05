import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import { isInvalidUuid, type Result } from "@usenullish/nullish-common";
import type { RouteConfig } from "@hono/zod-openapi";
import { ErrorCode } from "@usenullish/nullish-schema/server";
import type { DefineOpenAPIHandler, Response200 } from "../../types/openapi";
import { errorResponse, toApiError } from "../../_errors";
import { withRest } from "../../guards/rest";
import { withPermission } from "../../guards/permission";

export function defineJobStateHandler<R extends RouteConfig>({
  jobState,
  resourceKey,
}: {
  jobState: (
    args: DbStoreInitArgs & { jobs: TriggerJobs; parentId: string; jobId: string },
  ) => Promise<Result<Response200<R>>>;
  resourceKey: string;
}): DefineOpenAPIHandler<R> {
  return withRest<R>(
    withPermission<R>(async ({ context, caller }) => {
      const {
        req,
        var: {
          db: { connection },
          workers: { jobs },
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

      const result = await jobState({
        db: connection,
        userId: caller.userId,
        jobs,
        parentId,
        jobId: id,
      });

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: `Failed to retrieve the ${resourceKey}`,
          }),
        });
      }

      return context.json(result.result, 200);
    }),
  );
}
