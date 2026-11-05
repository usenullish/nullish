import { defineListRoute } from "./_factories/crud-route-config";
import {
  ApiSchema,
  CommonSchema,
  ErrorCode,
  encodeAccountLedgerResponse,
} from "@usenullish/nullish-schema/server";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import type { Response200 } from "../types/openapi";
import { isInvalidUuid } from "@usenullish/nullish-common";
import { AccountLedgerReport } from "@usenullish/nullish-engine/ledger";
import * as z from "zod";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";

const AccountLedgerQuerySchema = ApiSchema.AccountLedger.GetAccountLedgerQuerySchema.extend(
  ApiSchema.AccountLedger.GetAccountLedgerFiltersQuerySchema.shape,
);

const listAccountLedgerRoute = defineListRoute({
  path: "/organizations/{parentId}/accounting/reports/account-ledger",
  spec: { tag: "Reports" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: {
      filters: { schema: AccountLedgerQuerySchema },
    },
  },
  response: {
    body: {
      schema: ApiSchema.AccountLedger.GetAccountLedgerResponseSchema,
    },
    description: "Retrieves the postings of an account of the organization for a period",
  },
});

type Route = typeof listAccountLedgerRoute;

@ResourceProvider
export class OrganizationsReportsAccountLedger extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [listAccountLedgerRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): OrganizationsReportsAccountLedger {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({ route: listAccountLedgerRoute, handler: this.#defineAccountLedgerList });
  }

  #defineAccountLedgerList = withRest<Route>(
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

      const { limit, offset, sort, direction, ...params } = context.req.query();

      const parsedListQuery = CommonSchema.Query.ListQuerySchema.safeParse({
        limit,
        offset,
        sort,
        direction,
      });

      const parsedQuery = AccountLedgerQuerySchema.safeParse(params);

      if (!parsedListQuery.success || !parsedQuery.success) {
        return errorResponse({
          context,
          error: "Bad Request",
          code: ErrorCode.VALIDATION,
          status: 400,
        });
      }

      const { periodId, accountId, ...filters } = parsedQuery.data;

      const result = await AccountLedgerReport.create({
        db: connection,
        userId: caller.userId,
        organizationId: parentId,
      }).list({ periodId, accountId, filters, ...parsedListQuery.data });

      if (result.status === "error") {
        if (result.err instanceof z.ZodError) {
          return errorResponse({
            context,
            error: "Bad Request",
            code: ErrorCode.VALIDATION,
            status: 400,
          });
        }

        console.error(result.err);
        return errorResponse({
          context,
          ...toApiError({
            err: result.err,
            fallback: "Failed to fetch report data",
          }),
        });
      }

      const build = (): Response200<Route> => encodeAccountLedgerResponse(result.result);

      return context.json(build(), 200);
    }),
  );
}
