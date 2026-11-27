import { defineGetRoute } from "./_factories/crud-route-config";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import type { Response200 } from "../types/openapi";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { OnboardingReport } from "@usenullish/nullish-engine/core";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

const getOnboardingRoute = defineGetRoute({
  path: "/organizations/{parentId}/reports/onboarding",
  spec: { tag: "Reports" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.Onboarding.GetOnboardingResponseSchema,
    },
    description:
      "Retrieves whether the organization has clients, invoices, bank accounts and bank statements",
  },
});

type Route = typeof getOnboardingRoute;

@ResourceProvider
export class OrganizationsReportsOnboarding extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [getOnboardingRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): OrganizationsReportsOnboarding {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: getOnboardingRoute, handler: this.#defineOnboardingGet });
  }

  #defineOnboardingGet = withRest<Route>(
    withPermission<Route>(async ({ context, caller }) => {
      const {
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

      const result = await OnboardingReport.create({
        db: connection,
        userId: caller.userId,
        organizationId: parentId,
      }).generate();

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: "Failed to fetch report data",
          }),
        });
      }

      const build = (): Response200<Route> => result.result;

      return context.json(build(), 200);
    }),
  );
}
