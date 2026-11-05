import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import { isInvalidUuid, encodeWithCodecs } from "@usenullish/nullish-common";
import { VatDeclarationReport } from "@usenullish/nullish-engine/core";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { defineActionWithRequestBodyRoute } from "./_factories/action-route-config";
import type { Response200 } from "../types/openapi";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

const declarationRoute = defineActionWithRequestBodyRoute({
  path: "/organizations/{parentId}/accounting/reports/vat/declaration",
  spec: { tag: "Reports" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    body: { schema: ApiSchema.VatReports.GenerateVatDeclarationRequestSchema },
  },
  response: {
    body: { schema: ApiSchema.VatReports.GenerateVatDeclarationResponseSchema },
    description: "Generates the VAT declaration report for the organization and VAT period",
  },
});

type DeclarationRoute = typeof declarationRoute;

@ResourceProvider
export class OrganizationsReportsVat extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [declarationRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): OrganizationsReportsVat {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: declarationRoute, handler: this.#defineDeclaration });
  }

  #defineDeclaration = withRest<DeclarationRoute>(
    withPermission<DeclarationRoute>(async ({ context, caller }) => {
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

      const values = req.valid("json");

      const result = await VatDeclarationReport.create({
        db: connection,
        userId: caller.userId,
        organizationId: parentId,
      }).generate(values);

      if (result.status === "error") {
        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: "Failed to generate VAT declaration",
          }),
        });
      }

      const build = (): Response200<DeclarationRoute> =>
        encodeWithCodecs({
          schema: ApiSchema.VatReports.GenerateVatDeclarationResponseSchema,
          value: result.result,
        });

      return context.json(build(), 200);
    }),
  );
}
