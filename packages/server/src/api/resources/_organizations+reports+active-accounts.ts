import { defineGetRoute } from "./_factories/crud-route-config";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import type { Response200 } from "../types/openapi";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { ActiveAccountsReport } from "@usenullish/nullish-engine/ledger";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

const listActiveAccountsRoute = defineGetRoute({
  path: "/organizations/{parentId}/accounting/reports/active-accounts",
  spec: { tag: "Reports" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: {
      schema: ApiSchema.LedgerReports.GetLedgerReportQuerySchema,
    },
  },
  response: {
    body: {
      schema: ApiSchema.ActiveAccounts.GetActiveAccountsResponseSchema,
    },
    description: "Retrieves the accounts of the organization that have postings in a period",
  },
});

type Route = typeof listActiveAccountsRoute;

@ResourceProvider
export class OrganizationsReportsActiveAccounts extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [listActiveAccountsRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): OrganizationsReportsActiveAccounts {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listActiveAccountsRoute, handler: this.#defineActiveAccountsList });
  }

  #defineActiveAccountsList = withRest<Route>(
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

      const parsedQuery = ApiSchema.LedgerReports.GetLedgerReportQuerySchema.safeParse(
        context.req.query(),
      );

      if (!parsedQuery.success) {
        return errorResponse({
          context,
          error: "Bad Request",
          code: ErrorCode.VALIDATION,
          status: 400,
        });
      }

      const result = await ActiveAccountsReport.create({
        db: connection,
        userId: caller.userId,
        organizationId: parentId,
      }).list(parsedQuery.data);

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

      const { result: accountIds } = result;

      const build = (): Response200<Route> => {
        return { accountIds };
      };

      return context.json(build(), 200);
    }),
  );
}
