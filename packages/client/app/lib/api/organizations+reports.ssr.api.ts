import { ApiSsr } from "~/lib/api/_api.ssr";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Cookie } from "~/lib/schemas/cookie";
import { API_URL } from "~/env";
import { assertNotEmptyString } from "@usenullish/nullish-common";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type { ApiListArgs } from "~/lib/api/_api";
import { encodeJsonBody } from "~/lib/utils/json";

export class ApiOrganizationsReportsSsr extends ApiSsr {
  static create(args: { cookie: Cookie }): ApiOrganizationsReportsSsr {
    const apiUrl = API_URL;

    assertNotEmptyString(apiUrl, "API_URL");

    return new this({ apiUrl, ...args });
  }

  listAccountBalances = async ({
    orgId,
    query,
  }: ApiOrganizationsGetByIdArgs & {
    query: Api["LedgerReports"]["Client"]["GetLedgerReportQuery"];
  }): Promise<Api["AccountBalances"]["Client"]["GetAccountBalancesResponse"]> => {
    const searchParams = new URLSearchParams(query);

    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/reports/account-balances?${searchParams}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/accounting/reports/account-balances`,
      });
    }

    return ApiSchema.AccountBalances.GetAccountBalancesResponseSchema.parse(await response.json());
  };

  listAccountLedger = async ({
    orgId,
    query,
    filters,
    ...ledger
  }: ApiOrganizationsGetByIdArgs &
    Api["AccountLedger"]["Client"]["GetAccountLedgerQuery"] &
    ApiListArgs<Api["AccountLedger"]["Client"]["GetAccountLedgerFilters"]>): Promise<
    Api["AccountLedger"]["Client"]["GetAccountLedgerResponse"]
  > => {
    const searchParams = new URLSearchParams([
      ...this.listSearchParams({
        query,
        filters: {
          values: filters,
          schema: ApiSchema.AccountLedger.GetAccountLedgerFiltersQuerySchema,
        },
      }),
      ...Object.entries(ledger),
    ]);

    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/reports/account-ledger?${searchParams}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/accounting/reports/account-ledger`,
      });
    }

    return ApiSchema.AccountLedger.GetAccountLedgerResponseSchema.parse(await response.json());
  };

  listActiveAccounts = async ({
    orgId,
    query,
  }: ApiOrganizationsGetByIdArgs & {
    query: Api["LedgerReports"]["Client"]["GetLedgerReportQuery"];
  }): Promise<Api["ActiveAccounts"]["Client"]["GetActiveAccountsResponse"]> => {
    const searchParams = new URLSearchParams(query);

    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/reports/active-accounts?${searchParams}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/accounting/reports/active-accounts`,
      });
    }

    return ApiSchema.ActiveAccounts.GetActiveAccountsResponseSchema.parse(await response.json());
  };

  listBalanceSheet = async ({
    orgId,
    query,
  }: ApiOrganizationsGetByIdArgs & {
    query: Api["LedgerReports"]["Client"]["GetLedgerReportQuery"];
  }): Promise<Api["BalanceSheet"]["Client"]["GetBalanceSheetResponse"]> => {
    const searchParams = new URLSearchParams(query);

    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/reports/balance-sheet?${searchParams}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/accounting/reports/balance-sheet`,
      });
    }

    return ApiSchema.BalanceSheet.GetBalanceSheetResponseSchema.parse(await response.json());
  };

  listIncomeStatement = async ({
    orgId,
    query,
  }: ApiOrganizationsGetByIdArgs & {
    query: Api["LedgerReports"]["Client"]["GetLedgerReportQuery"];
  }): Promise<Api["IncomeStatement"]["Client"]["GetIncomeStatementResponse"]> => {
    const searchParams = new URLSearchParams(query);

    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/reports/income-statement?${searchParams}`,
      {
        headers: {
          ...this.cookieHeader(),
        },
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot get /organizations/${orgId}/accounting/reports/income-statement`,
      });
    }

    return ApiSchema.IncomeStatement.GetIncomeStatementResponseSchema.parse(await response.json());
  };

  generateVatDeclaration = async ({
    orgId,
    body,
  }: ApiOrganizationsGetByIdArgs & {
    body: Api["VatReports"]["Client"]["GenerateVatDeclarationRequest"];
  }): Promise<Api["VatReports"]["Client"]["GenerateVatDeclarationResponse"]> => {
    const response = await fetch(
      `${this.apiUrl}/organizations/${orgId}/accounting/reports/vat/declaration`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.cookieHeader(),
        },
        body: encodeJsonBody({
          schema: ApiSchema.VatReports.GenerateVatDeclarationRequestSchema,
          body,
        }),
      },
    );

    if (!response.ok) {
      return await this.throwError({
        response,
        message: `Cannot post /organizations/${orgId}/accounting/reports/vat/declaration`,
      });
    }

    return ApiSchema.VatReports.GenerateVatDeclarationResponseSchema.parse(await response.json());
  };
}
