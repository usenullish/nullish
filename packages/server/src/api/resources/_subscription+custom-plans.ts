import { encodeWithCodecs } from "@usenullish/nullish-common";
import { DbCustomPlans } from "@usenullish/nullish-engine/subscription";
import { ApiSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { defineGetRoute } from "./_factories/crud-route-config";
import type { OpenAPIHandlerContext } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";

const getRoute = defineGetRoute({
  spec: { tag: "Subscriptions" },
  path: "/subscription/custom-plans",
  response: {
    body: { schema: ApiSchema.CustomPlans.GetCustomPlansResponseSchema },
    description: "Returns the custom plans offered on request, with their prices",
  },
});

type GetRoute = typeof getRoute;

@ResourceProvider
export class CustomPlansHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [getRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): CustomPlansHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: getRoute, handler: this.#get });
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

    const result = await DbCustomPlans.create({
      db: connection,
      userId: caller.userId,
    }).list();

    if (result.status === "error") {
      console.error(result.err);
      return errorResponse({
        context,
        ...toApiError({
          err: result.err,
          fallback: "Failed to list the custom plans",
        }),
      });
    }

    return context.json(
      encodeWithCodecs({
        schema: ApiSchema.CustomPlans.GetCustomPlansResponseSchema,
        value: { customPlans: result.result },
      }),
      200,
    );
  };
}
