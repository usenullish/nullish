import { encodeWithCodecs, isNullish, tryCatch } from "@usenullish/nullish-common";
import { ApiSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineGetRoute } from "./_factories/crud-route-config";
import type { OpenAPIHandlerContext } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";

const getRoute = defineGetRoute({
  spec: { tag: "Subscriptions" },
  path: "/subscription/external-plans",
  response: {
    body: { schema: ApiSchema.ExternalPlans.GetExternalPlansResponseSchema },
    description: "Returns the plans that can be subscribed to, with their prices",
  },
});

type GetRoute = typeof getRoute;

@ResourceProvider
export class ExternalPlansHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [getRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): ExternalPlansHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: getRoute, handler: this.#get });
  }

  #get = async (context: OpenAPIHandlerContext<GetRoute>) => {
    const {
      var: {
        workers: { payments },
        caller,
      },
    } = context;

    if (isNullish(payments)) {
      return errorResponse({
        context,
        error: "The payments are not enabled on this instance.",
        code: ErrorCode.REJECTED,
        status: 503,
      });
    }

    if (caller?.type !== "user") {
      return errorResponse({
        context,
        error: "Unauthorized",
        code: ErrorCode.UNAUTHORIZED,
        status: 401,
      });
    }

    const result = await tryCatch(async () => {
      return await payments.listPlans();
    });

    if (result.status === "error") {
      console.error(result.err);
      return errorResponse({
        context,
        ...toApiError({
          err: result.err,
          fallback: "Failed to list the plans",
        }),
      });
    }

    return context.json(
      encodeWithCodecs({
        schema: ApiSchema.ExternalPlans.GetExternalPlansResponseSchema,
        value: { externalPlans: result.result },
      }),
      200,
    );
  };
}
