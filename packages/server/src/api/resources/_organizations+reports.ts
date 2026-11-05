import { defineGetRoute } from "./_factories/crud-route-config";
import { ApiSchema, CommonSchema, ErrorCode } from "@usenullish/nullish-schema/server";
import { Resource, type ResourceArgs, ResourceProvider } from "./_factories/resource";
import type { OpenAPIHandlerContext, Response200 } from "../types/openapi";
import {
  BigIntCodec,
  isInvalidUuid,
  type Result,
  TimestampCodec,
  encodeWithCodecs,
} from "@usenullish/nullish-common";
import {
  AccountBalancesReport,
  BalanceSheetReport,
  IncomeStatementReport,
} from "@usenullish/nullish-engine/ledger";
import type { Views } from "@usenullish/nullish-schema/views";
import type { Reports } from "@usenullish/nullish-schema/reports";
import type { Auth } from "../../../../auth/src/server/auth";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { errorResponse, toApiError } from "../_errors";
import { withRest } from "../guards/rest";
import { withPermission } from "../guards/permission";
import type { ApiCaller } from "../types/api";

const route = {
  spec: { tag: "Reports" },
  request: {
    params: {
      schema: CommonSchema.Params.RouteParentIdParamsSchema,
    },
    query: {
      schema: ApiSchema.LedgerReports.GetLedgerReportQuerySchema,
    },
  },
} as const;

const listAccountBalancesRoute = defineGetRoute({
  ...route,
  path: "/organizations/{parentId}/accounting/reports/account-balances",
  response: {
    body: {
      schema: ApiSchema.AccountBalances.GetAccountBalancesResponseSchema,
    },
    description: "Retrieves the account balances of the organization for a period",
  },
});

const listBalanceSheetRoute = defineGetRoute({
  ...route,
  path: "/organizations/{parentId}/accounting/reports/balance-sheet",
  response: {
    body: {
      schema: ApiSchema.BalanceSheet.GetBalanceSheetResponseSchema,
    },
    description: "Retrieves the balance sheet of the organization for a period",
  },
});

const listIncomeStatementRoute = defineGetRoute({
  ...route,
  path: "/organizations/{parentId}/accounting/reports/income-statement",
  response: {
    body: {
      schema: ApiSchema.IncomeStatement.GetIncomeStatementResponseSchema,
    },
    description: "Retrieves the income statement of the organization for a period",
  },
});

type ListAccountBalancesRoute = typeof listAccountBalancesRoute;
type ListBalanceSheetRoute = typeof listBalanceSheetRoute;
type ListIncomeStatementRoute = typeof listIncomeStatementRoute;

type ListArgs = Reports["Ledger"]["Args"] & {
  organizationId: string;
  connection: PostgresDbInstance;
  userId: Auth["$Infer"]["Session"]["user"]["id"];
};

@ResourceProvider
export class OrganizationsReports extends Resource {
  private constructor(args: Omit<ResourceArgs, "paths">) {
    super({ paths: [listAccountBalancesRoute.path], ...args });
  }

  static create(args: Omit<ResourceArgs, "paths">): OrganizationsReports {
    return new this(args);
  }

  override register(): void {
    this.registerRoute({
      route: listAccountBalancesRoute,
      handler: this.#defineAccountBalancesList,
    });
    this.registerRoute({ route: listBalanceSheetRoute, handler: this.#defineBalanceSheetList });
    this.registerRoute({
      route: listIncomeStatementRoute,
      handler: this.#defineIncomeStatementList,
    });
  }

  #defineAccountBalancesList = withRest<ListAccountBalancesRoute>(
    withPermission<ListAccountBalancesRoute>(async ({ context, caller }) => {
      const build = ({
        data,
      }: {
        data: Views["Ledger"]["AccountBalances"]["Select"][];
      }): Response200<ListAccountBalancesRoute> => {
        return {
          accountBalances: data.map(this.#encodeResponse),
        };
      };

      const list = async ({ connection, organizationId, userId, periodId }: ListArgs) => {
        return await AccountBalancesReport.create({
          db: connection,
          userId,
          organizationId,
        }).list({ periodId });
      };

      return await this.#defineList<
        ListAccountBalancesRoute,
        Views["Ledger"]["AccountBalances"]["Select"]
      >({
        context,
        caller,
        list,
        build,
      });
    }),
  );

  #defineBalanceSheetList = withRest<ListBalanceSheetRoute>(
    withPermission<ListBalanceSheetRoute>(async ({ context, caller }) => {
      const build = ({
        data,
      }: {
        data: Views["Ledger"]["BalanceSheet"]["Select"][];
      }): Response200<ListBalanceSheetRoute> => {
        return {
          balanceSheet: data.map(this.#encodeResponse),
        };
      };

      const list = async ({ connection, organizationId, userId, periodId }: ListArgs) => {
        return await BalanceSheetReport.create({
          db: connection,
          userId,
          organizationId,
        }).list({ periodId });
      };

      return await this.#defineList<
        ListBalanceSheetRoute,
        Views["Ledger"]["BalanceSheet"]["Select"]
      >({ context, caller, list, build });
    }),
  );

  #defineIncomeStatementList = withRest<ListIncomeStatementRoute>(
    withPermission<ListIncomeStatementRoute>(async ({ context, caller }) => {
      const build = ({
        data,
      }: {
        data: Views["Ledger"]["IncomeStatement"]["Select"][];
      }): Response200<ListIncomeStatementRoute> => {
        return {
          incomeStatement: data.map(this.#encodeResponse),
        };
      };

      const list = async ({ connection, organizationId, userId, periodId }: ListArgs) => {
        return await IncomeStatementReport.create({
          db: connection,
          userId,
          organizationId,
        }).list({ periodId });
      };

      return await this.#defineList<
        ListIncomeStatementRoute,
        Views["Ledger"]["IncomeStatement"]["Select"]
      >({
        context,
        caller,
        list,
        build,
      });
    }),
  );

  #defineList = async <
    Route extends ListAccountBalancesRoute | ListBalanceSheetRoute | ListIncomeStatementRoute,
    Data,
  >({
    context,
    caller,
    list,
    build,
  }: {
    context: OpenAPIHandlerContext<Route>;
    caller: ApiCaller;
    list: (args: ListArgs) => Promise<Result<Data[]>>;
    build: (args: { data: Data[] }) => Response200<Route>;
  }) => {
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

    const result = await list({
      ...parsedQuery.data,
      organizationId: parentId,
      connection,
      userId: caller.userId,
    });

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

    return context.json(build({ data: result.result }), 200);
  };

  #encodeResponse = (
    data:
      | Views["Ledger"]["AccountBalances"]["Select"]
      | Views["Ledger"]["BalanceSheet"]["Select"]
      | Views["Ledger"]["IncomeStatement"]["Select"],
  ) => ({
    ...data,
    totalDebit: encodeWithCodecs({ schema: BigIntCodec, value: data.totalDebit }),
    totalCredit: encodeWithCodecs({ schema: BigIntCodec, value: data.totalCredit }),
    balance: encodeWithCodecs({ schema: BigIntCodec, value: data.balance }),
    computedAt: encodeWithCodecs({ schema: TimestampCodec, value: data.computedAt }),
  });
}
