import { encodeWithCodecs } from "@usenullish/nullish-common";
import { LlmUsageReport } from "@usenullish/nullish-engine/metering";
import { ApiSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineGetRoute } from "./_factories/crud-route-config";
import type { OpenAPIHandlerContext } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";

const getRoute = defineGetRoute({
  spec: { tag: "Reports" },
  path: "/user/reports/llm-usage",
  response: {
    body: { schema: ApiSchema.LlmUsage.GetLlmUsageResponseSchema },
    description: "Returns the LLM usage of the signed-in user this month, per model",
  },
});

type GetRoute = typeof getRoute;

@ResourceProvider
export class UserReportsLlmUsage extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [getRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): UserReportsLlmUsage {
    return new this(args);
  }

  override register(): void {
    this.app.openapi(getRoute, this.#get);
  }

  #get = async (context: OpenAPIHandlerContext<GetRoute>) => {
    const {
      var: {
        db: { connection },
        caller,
      },
    } = context;

    if (caller?.type !== "user") {
      return errorResponse({
        context,
        error: "Unauthorized",
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
      });
    }

    // TODO: shall we use date-fns
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const result = await LlmUsageReport.create({
      db: connection,
      userId: caller.userId,
    }).generate({ from });

    if (result.status === "error") {
      console.error(result.err);
      return errorResponse({
        context,
        ...toApiError({
          err: result.err,
          fallback: "Failed to generate the LLM usage report",
        }),
      });
    }

    return context.json(
      encodeWithCodecs({
        schema: ApiSchema.LlmUsage.GetLlmUsageResponseSchema,
        value: { llmUsage: result.result },
      }),
      200,
    );
  };
}
