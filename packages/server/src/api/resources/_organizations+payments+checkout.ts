import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid, isNullish, tryCatch } from "@usenullish/nullish-common";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { defineActionWithRequestBodyRoute } from "./_factories/action-route-config";
import type { OpenAPIHandlerContext, Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";

const actionRoute = defineActionWithRequestBodyRoute({
  path: "/organizations/{parentId}/payments/checkout",
  spec: { tag: "Payments" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.PaymentsCheckout.CheckoutPaymentsRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.PaymentsCheckout.CheckoutPaymentsResponseSchema },
    description:
      "Start the checkout of a subscription for an organization. Only admins check out. Returns the URL of the payment page.",
  },
});

type ActionRoute = typeof actionRoute;

@ResourceProvider
export class PaymentsCheckoutHandlers extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [actionRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): PaymentsCheckoutHandlers {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: actionRoute, handler: this.#defineCheckout });
  }

  #defineCheckout = async (context: OpenAPIHandlerContext<ActionRoute>) => {
    const {
      req,
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

    const parentId = context.req.param("parentId");

    if (isInvalidUuid(parentId)) {
      return errorResponse({
        context,
        error: "Bad Request",
        code: ErrorCode.VALIDATION,
        status: 400,
      });
    }

    const { priceId, billingPeriod } = req.valid("json");

    const result = await tryCatch(async () => {
      return await payments.checkout({
        userId: caller.userId,
        organizationId: parentId,
        priceId,
        billingPeriod,
      });
    });

    if (result.status === "error") {
      console.error(result.err);
      return errorResponse({
        context,
        ...toApiError({
          err: result.err,
          fallback: "Failed to start the checkout",
        }),
      });
    }

    const build = (): Response200<ActionRoute> => result.result;

    return context.json(build(), 200);
  };
}
